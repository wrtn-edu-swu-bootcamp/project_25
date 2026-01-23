from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from app.config import settings
import asyncio
import json

# Google Gemini API (새로운 google-genai 패키지)
from google import genai

router = APIRouter()

# Gemini 클라이언트 설정
client = None
MODEL_NAME = "gemini-2.5-flash"

if settings.GEMINI_API_KEY:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    print(f"[STARTUP] Gemini client initialized with model: {MODEL_NAME}")

class TextInput(BaseModel):
    text: str

class TitleRewriteInput(BaseModel):
    title: str
    content: str

async def generate_with_gemini(prompt: str) -> str:
    """Gemini API 호출 (비동기)"""
    if not client:
        raise Exception("Gemini API key not configured")
    
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=MODEL_NAME,
        contents=prompt
    )
    return response.text

@router.post("/summary")
async def summarize_news(input: TextInput):
    if not client:
        return {"error": "Gemini API key not configured"}
    
    try:
        prompt = f"""당신은 2030세대를 위한 뉴스 분석 전문가입니다. 뉴스를 쉽고 명확하게 3가지 포인트로 요약해주세요:
1) 핵심 내용
2) 왜 중요한지
3) 나에게 미치는 영향

한국어로 응답하세요.

다음 뉴스를 요약해주세요:
{input.text}"""
        
        result = await generate_with_gemini(prompt)
        return {"summary": result, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.post("/compare")
async def compare_viewpoints(input: TextInput):
    if not client:
        return {"error": "Gemini API key not configured"}
    
    try:
        prompt = f"""당신은 미디어 분석 전문가입니다. 이 주제에 대한 보수와 진보 언론의 관점 차이를 분석하고, 균형잡힌 시각을 제시해주세요. 한국어로 응답하세요.

{input.text}"""
        
        result = await generate_with_gemini(prompt)
        return {"comparison": result, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.post("/context")
async def get_context(input: TextInput):
    if not client:
        return {"error": "Gemini API key not configured"}
    
    try:
        prompt = f"""당신은 시사 교육 전문가입니다. 이 뉴스를 이해하기 위해 필요한 배경지식을 설명해주세요:
1) 주요 용어 해설
2) 역사적 맥락
3) 알아야 할 사전지식

한국어로 응답하세요.

{input.text}"""
        
        result = await generate_with_gemini(prompt)
        return {"context": result, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.post("/factcheck")
async def fact_check(input: TextInput):
    if not client:
        return {"error": "Gemini API key not configured"}
    
    try:
        prompt = f"""당신은 팩트체크 전문가입니다. 이 뉴스의 주요 주장을 검증하고 신뢰도를 평가해주세요. 각 주장에 대해 사실/거짓/부분적사실 여부를 판단하고 근거를 제시하세요. 한국어로 응답하세요.

{input.text}"""
        
        result = await generate_with_gemini(prompt)
        return {"factcheck": result, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.post("/rewrite-title")
async def rewrite_title(input: TitleRewriteInput):
    """기사 내용을 분석하여 clickbait 제목을 객관적인 제목으로 재작성"""
    if not client:
        return {"error": "Gemini API key not configured"}
    
    try:
        prompt = f"""당신은 뉴스 리터러시 전문가입니다. 뉴스 기사의 제목을 분석하고 재작성하는 역할을 합니다.

많은 뉴스 제목이 클릭을 유도하기 위해 과장되거나, 자극적이거나, 내용을 왜곡하는 'clickbait' 형태입니다. 
당신의 임무는:
1. 기사 내용을 정확히 반영하는 객관적이고 사실에 기반한 제목으로 재작성
2. 원래 제목이 왜 clickbait인지 간결하게 설명 (과장, 자극적 표현, 내용 왜곡 등)

응답은 반드시 다음 JSON 형식으로만 해주세요:
{{"rewrittenTitle": "수정된 제목", "clickbaitReason": "원래 제목이 clickbait인 이유 (1-2문장)"}}

만약 원래 제목이 이미 객관적이라면:
{{"rewrittenTitle": "원래 제목 그대로", "clickbaitReason": "이 제목은 객관적이며 clickbait 요소가 없습니다."}}

원래 제목: {input.title}

기사 내용:
{input.content}"""
        
        result_text = await generate_with_gemini(prompt)
        result_text = result_text.strip()
        
        # JSON 블록 추출 (```json ... ``` 형태일 경우)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        try:
            result = json.loads(result_text)
            return {
                "rewrittenTitle": result.get("rewrittenTitle", input.title),
                "clickbaitReason": result.get("clickbaitReason", "분석 결과 없음"),
                "originalTitle": input.title,
                "analyzed_at": datetime.now().isoformat()
            }
        except json.JSONDecodeError:
            # JSON 파싱 실패 시 원문 그대로 반환
            return {
                "rewrittenTitle": input.title,
                "clickbaitReason": result_text,
                "originalTitle": input.title,
                "analyzed_at": datetime.now().isoformat()
            }
    except Exception as e:
        return {"error": str(e)}

@router.get("/test")
async def test_gemini():
    """Gemini API 연결 테스트"""
    if not client:
        return {"status": "error", "message": "Gemini API key not configured"}
    try:
        result = await generate_with_gemini("안녕하세요! 간단히 인사해주세요.")
        return {"status": "success", "response": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
