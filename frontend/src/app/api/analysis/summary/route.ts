import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = "gemini-2.5-flash";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" });
  }
  
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: "Text is required" });
    }
    
    const genai = new GoogleGenAI({ apiKey });
    
    const prompt = `당신은 2030세대를 위한 뉴스 분석 전문가입니다. 뉴스를 쉽고 명확하게 3가지 포인트로 요약해주세요:
1) 핵심 내용
2) 왜 중요한지
3) 나에게 미치는 영향

한국어로 응답하세요.

다음 뉴스를 요약해주세요:
${text}`;
    
    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    
    return NextResponse.json({
      summary: response.text,
      analyzed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: String(error) });
  }
}
