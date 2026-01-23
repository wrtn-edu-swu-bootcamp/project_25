import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = "gemini-2.5-flash";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ status: "error", message: "Gemini API key not configured" });
  }
  
  try {
    const genai = new GoogleGenAI({ apiKey });
    
    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: "안녕하세요! 간단히 인사해주세요.",
    });
    
    return NextResponse.json({
      status: "success",
      response: response.text
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ status: "error", message: String(error) });
  }
}
