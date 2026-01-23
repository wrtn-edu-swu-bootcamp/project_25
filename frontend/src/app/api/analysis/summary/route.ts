import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const MODEL_NAME = "llama-3.3-70b-versatile";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "Groq API key not configured" });
  }
  
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: "Text is required" });
    }
    
    const groq = new Groq({ apiKey });
    
    const prompt = `당신은 2030세대를 위한 뉴스 분석 전문가입니다. 뉴스를 쉽고 명확하게 3가지 포인트로 요약해주세요:
1) 핵심 내용
2) 왜 중요한지
3) 나에게 미치는 영향

한국어로 응답하세요.

다음 뉴스를 요약해주세요:
${text}`;
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: MODEL_NAME,
      temperature: 0.7,
      max_tokens: 1024,
    });
    
    return NextResponse.json({
      summary: completion.choices[0]?.message?.content || "분석 결과를 가져올 수 없습니다.",
      analyzed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Groq API error:", error);
    return NextResponse.json({ error: String(error) });
  }
}
