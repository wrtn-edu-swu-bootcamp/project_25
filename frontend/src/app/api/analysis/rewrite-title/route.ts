import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const MODEL_NAME = "llama-3.3-70b-versatile";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "Groq API key not configured" });
  }
  
  try {
    const { title, content } = await request.json();
    
    if (!title) {
      return NextResponse.json({ error: "Title is required" });
    }
    
    const groq = new Groq({ apiKey });
    
    const prompt = `당신은 뉴스 리터러시 전문가입니다. 뉴스 기사의 제목을 분석하고 재작성하는 역할을 합니다.

많은 뉴스 제목이 클릭을 유도하기 위해 과장되거나, 자극적이거나, 내용을 왜곡하는 'clickbait' 형태입니다. 
당신의 임무는:
1. 기사 내용을 정확히 반영하는 객관적이고 사실에 기반한 제목으로 재작성
2. 원래 제목이 왜 clickbait인지 간결하게 설명 (과장, 자극적 표현, 내용 왜곡 등)

응답은 반드시 다음 JSON 형식으로만 해주세요:
{"rewrittenTitle": "수정된 제목", "clickbaitReason": "원래 제목이 clickbait인 이유 (1-2문장)"}

만약 원래 제목이 이미 객관적이라면:
{"rewrittenTitle": "원래 제목 그대로", "clickbaitReason": "이 제목은 객관적이며 clickbait 요소가 없습니다."}

원래 제목: ${title}

기사 내용:
${content || "내용 없음"}`;
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: MODEL_NAME,
      temperature: 0.7,
      max_tokens: 512,
      response_format: { type: "json_object" }
    });
    
    let resultText = completion.choices[0]?.message?.content?.trim() || "";
    
    // JSON 블록 추출
    if (resultText.includes("```json")) {
      resultText = resultText.split("```json")[1].split("```")[0].trim();
    } else if (resultText.includes("```")) {
      resultText = resultText.split("```")[1].split("```")[0].trim();
    }
    
    try {
      const result = JSON.parse(resultText);
      return NextResponse.json({
        rewrittenTitle: result.rewrittenTitle || title,
        clickbaitReason: result.clickbaitReason || "분석 결과 없음",
        originalTitle: title,
        analyzed_at: new Date().toISOString()
      });
    } catch {
      return NextResponse.json({
        rewrittenTitle: title,
        clickbaitReason: resultText,
        originalTitle: title,
        analyzed_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Groq API error:", error);
    return NextResponse.json({ error: String(error) });
  }
}
