from fastapi import APIRouter
from datetime import datetime
import httpx
import xml.etree.ElementTree as ET
import re

router = APIRouter()

# 한국 주요 언론사 RSS 피드
RSS_FEEDS = {
    "정치": "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml",
    "경제": "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml",
    "사회": "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml",
    "국제": "https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml",
    "IT/과학": "https://www.chosun.com/arc/outboundfeeds/rss/category/technology/?outputType=xml",
}

# 백업용 연합뉴스 RSS
BACKUP_RSS = "https://www.yna.co.kr/rss/news.xml"

def clean_html(text):
    """HTML 태그 제거"""
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', '', text)
    clean = clean.replace('&quot;', '"').replace('&amp;', '&')
    clean = clean.replace('&lt;', '<').replace('&gt;', '>')
    clean = clean.replace('&nbsp;', ' ').strip()
    return clean[:500] if len(clean) > 500 else clean

async def fetch_rss(url: str, category: str, limit: int = 5):
    """RSS 피드에서 뉴스 가져오기"""
    news_list = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, follow_redirects=True)
            if response.status_code != 200:
                return []
            
            root = ET.fromstring(response.content)
            items = root.findall('.//item')[:limit]
            
            for idx, item in enumerate(items):
                title = item.find('title')
                description = item.find('description')
                link = item.find('link')
                pub_date = item.find('pubDate')
                
                news_list.append({
                    "id": hash(link.text if link is not None else str(idx)) % 100000,
                    "title": clean_html(title.text) if title is not None else "제목 없음",
                    "summary": clean_html(description.text) if description is not None else "",
                    "category": category,
                    "source": "조선일보" if "chosun" in url else "연합뉴스",
                    "link": link.text if link is not None else "",
                    "published_at": pub_date.text if pub_date is not None else datetime.now().isoformat(),
                    "ai_summary": ""
                })
    except Exception as e:
        print(f"RSS 가져오기 실패 ({category}): {e}")
    
    return news_list

@router.get("/")
async def get_news_list():
    """모든 카테고리의 최신 뉴스 가져오기"""
    all_news = []
    
    for category, url in RSS_FEEDS.items():
        news = await fetch_rss(url, category, limit=3)
        all_news.extend(news)
    
    # RSS 실패 시 백업
    if not all_news:
        news = await fetch_rss(BACKUP_RSS, "종합", limit=10)
        all_news.extend(news)
    
    # 샘플 데이터 (RSS 실패 시)
    if not all_news:
        all_news = [
            {
                "id": 1,
                "title": "정부, 2026년 경제 성장률 전망 2.5%로 상향 조정",
                "summary": "기획재정부가 올해 경제 성장률 전망치를 상향 조정했다.",
                "category": "경제",
                "source": "샘플",
                "link": "",
                "published_at": datetime.now().isoformat(),
                "ai_summary": ""
            }
        ]
    
    return {"items": all_news, "total": len(all_news)}

@router.get("/today")
async def get_today_briefing():
    """오늘의 브리핑"""
    result = await get_news_list()
    return {"date": datetime.now().isoformat(), "items": result["items"][:10]}

@router.get("/trending")
async def get_trending():
    """트렌딩 토픽"""
    return {"topics": [
        {"keyword": "경제", "count": 1250, "category": "경제"},
        {"keyword": "정치", "count": 980, "category": "정치"},
        {"keyword": "기술", "count": 756, "category": "IT/과학"},
        {"keyword": "사회", "count": 540, "category": "사회"}
    ]}

@router.get("/{news_id}")
async def get_news_detail(news_id: int):
    """뉴스 상세"""
    result = await get_news_list()
    for n in result["items"]:
        if n["id"] == news_id:
            return n
    return {"error": "뉴스를 찾을 수 없습니다"}
