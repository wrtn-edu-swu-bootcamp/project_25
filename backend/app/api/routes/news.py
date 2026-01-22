from fastapi import APIRouter
from datetime import datetime
import httpx
import xml.etree.ElementTree as ET
import re

router = APIRouter()

# 한국 주요 언론사 RSS 피드 (3개 분야만)
RSS_FEEDS = {
    "정치": "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml",
    "경제": "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml",
    "사회": "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml",
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, follow_redirects=True)
            if response.status_code != 200:
                return []
            
            root = ET.fromstring(response.content)
            items = root.findall('.//item')[:limit]
            
            for idx, item in enumerate(items):
                title = item.find('title')
                description = item.find('description')
                link = item.find('link')
                guid = item.find('guid')  # 일부 RSS는 guid에 실제 링크가 있음
                pub_date = item.find('pubDate')
                
                # 링크 추출: link 또는 guid 사용
                article_link = ""
                if link is not None and link.text:
                    article_link = link.text.strip()
                elif guid is not None and guid.text:
                    article_link = guid.text.strip()
                
                # 디버그 로그
                if article_link:
                    print(f"[RSS] 기사 링크 파싱: {article_link[:80]}")
                
                news_list.append({
                    "id": hash(article_link if article_link else str(idx)) % 100000,
                    "title": clean_html(title.text) if title is not None else "제목 없음",
                    "summary": clean_html(description.text) if description is not None else "",
                    "category": category,
                    "source": "조선일보" if "chosun" in url else "연합뉴스",
                    "link": article_link,
                    "published_at": pub_date.text if pub_date is not None else datetime.now().isoformat(),
                    "ai_summary": ""
                })
    except Exception as e:
        print(f"RSS 가져오기 실패 ({category}): {e}")
    
    return news_list

@router.get("/")
async def get_news_list():
    """모든 카테고리의 최신 뉴스 가져오기 (분야당 1개씩, 총 3개)"""
    all_news = []
    
    # RSS 피드에서 실제 뉴스 가져오기 (분야당 1개씩)
    try:
        for category, url in RSS_FEEDS.items():
            news = await fetch_rss(url, category, limit=1)
            all_news.extend(news)
    except Exception as e:
        print(f"RSS 피드 가져오기 실패: {e}")
    
    # RSS 실패 시 백업 - 연합뉴스
    if len(all_news) < 3:
        try:
            backup_news = await fetch_rss(BACKUP_RSS, "종합", limit=3)
            all_news.extend(backup_news)
        except Exception as e:
            print(f"백업 RSS 실패: {e}")
    
    # 모든 RSS 실패 시 샘플 데이터
    if not all_news:
        all_news = [
            {
                "id": 1,
                "title": "RSS 피드 연결 실패 - 샘플 데이터",
                "summary": "현재 뉴스 피드를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
                "category": "공지",
                "source": "시스템",
                "link": "",
                "published_at": datetime.now().isoformat(),
                "ai_summary": ""
            }
        ]
    
    return {"items": all_news[:3], "total": len(all_news[:3])}

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
