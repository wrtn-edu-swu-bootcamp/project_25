from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from openai import OpenAI
from app.config import settings

router = APIRouter()

client = None
if settings.OPENAI_API_KEY:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

class TextInput(BaseModel):
    text: str

@router.post("/summary")
async def summarize_news(input: TextInput):
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 2030세대를 위한 뉴스 분석 전문가입니다. 뉴스를 쉽고 명확하게 3가지 포인트로 요약해주세요: 1) 핵심 내용 2) 왜 중요한지 3) 나에게 미치는 영향. 한국어로 응답하세요."},
                {"role": "user", "content": f"다음 뉴스를 요약해주세요:\n{input.text}"}
            ],
            max_tokens=500
        )
        return {"summary": response.choices[0].message.content, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.post("/compare")
async def compare_viewpoints(input: TextInput):
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 미디어 분석 전문가입니다. 이 주제에 대한 보수와 진보 언론의 관점 차이를 분석하고, 균형잡힌 시각을 제시해주세요. 한국어로 응답하세요."},
                {"role": "user", "content": input.text}
            ],
            max_tokens=800
        )
        return {"comparison": response.choices[0].message.content, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.post("/context")
async def get_context(input: TextInput):
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 시사 교육 전문가입니다. 이 뉴스를 이해하기 위해 필요한 배경지식을 설명해주세요: 1) 주요 용어 해설 2) 역사적 맥락 3) 알아야 할 사전지식. 한국어로 응답하세요."},
                {"role": "user", "content": input.text}
            ],
            max_tokens=800
        )
        return {"context": response.choices[0].message.content, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.post("/factcheck")
async def fact_check(input: TextInput):
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 팩트체크 전문가입니다. 이 뉴스의 주요 주장을 검증하고 신뢰도를 평가해주세요. 각 주장에 대해 사실/거짓/부분적사실 여부를 판단하고 근거를 제시하세요. 한국어로 응답하세요."},
                {"role": "user", "content": input.text}
            ],
            max_tokens=800
        )
        return {"factcheck": response.choices[0].message.content, "analyzed_at": datetime.now().isoformat()}
    except Exception as e:
        return {"error": str(e)}

@router.get("/test")
async def test_openai():
    if not client:
        return {"status": "error", "message": "OpenAI API key not configured"}
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "안녕하세요!"}],
            max_tokens=50
        )
        return {"status": "success", "response": response.choices[0].message.content}
    except Exception as e:
        return {"status": "error", "message": str(e)}
