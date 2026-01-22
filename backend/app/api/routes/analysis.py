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

class TitleRewriteInput(BaseModel):
    title: str
    content: str

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

@router.post("/rewrite-title")
async def rewrite_title(input: TitleRewriteInput):
    """기사 내용을 분석하여 clickbait 제목을 객관적인 제목으로 재작성"""
    if not client:
        return {"error": "OpenAI API key not configured"}
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """당신은 뉴스 리터러시 전문가입니다. 뉴스 기사의 제목을 분석하고 재작성하는 역할을 합니다.

많은 뉴스 제목이 클릭을 유도하기 위해 과장되거나, 자극적이거나, 내용을 왜곡하는 'clickbait' 형태입니다. 
당신의 임무는:
1. 기사 내용을 정확히 반영하는 객관적이고 사실에 기반한 제목으로 재작성
2. 원래 제목이 왜 clickbait인지 간결하게 설명 (과장, 자극적 표현, 내용 왜곡 등)

응답은 반드시 다음 JSON 형식으로만 해주세요:
{"rewrittenTitle": "수정된 제목", "clickbaitReason": "원래 제목이 clickbait인 이유 (1-2문장)"}

만약 원래 제목이 이미 객관적이라면:
{"rewrittenTitle": "원래 제목 그대로", "clickbaitReason": "이 제목은 객관적이며 clickbait 요소가 없습니다."}"""},
                {"role": "user", "content": f"원래 제목: {input.title}\n\n기사 내용:\n{input.content}"}
            ],
            max_tokens=300
        )
        
        # JSON 파싱 시도
        import json
        result_text = response.choices[0].message.content.strip()
        
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
