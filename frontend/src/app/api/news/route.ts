import { NextResponse } from 'next/server';

// 매번 새로운 결과를 반환하도록 설정
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 여러 언론사 RSS 피드
const RSS_FEEDS: Record<string, Array<{url: string, source: string}>> = {
  "정치": [
    {url: "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", source: "조선일보"},
    {url: "https://www.hani.co.kr/rss/politics/", source: "한겨레"},
    {url: "https://www.khan.co.kr/rss/rssdata/politic_news.xml", source: "경향신문"},
  ],
  "경제": [
    {url: "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", source: "조선일보"},
    {url: "https://www.hani.co.kr/rss/economy/", source: "한겨레"},
    {url: "https://www.khan.co.kr/rss/rssdata/economy_news.xml", source: "경향신문"},
  ],
  "사회": [
    {url: "https://www.chosun.com/arc/outboundfeeds/rss/category/national/?outputType=xml", source: "조선일보"},
    {url: "https://www.hani.co.kr/rss/society/", source: "한겨레"},
    {url: "https://www.khan.co.kr/rss/rssdata/society_news.xml", source: "경향신문"},
  ],
};

function cleanHtml(text: string | null): string {
  if (!text) return "";
  let clean = text.replace(/<[^>]+>/g, '');
  clean = clean.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  clean = clean.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  clean = clean.replace(/&nbsp;/g, ' ').trim();
  return clean.length > 500 ? clean.substring(0, 500) : clean;
}

function parseXML(xmlText: string): Array<{title: string, description: string, link: string, pubDate: string}> {
  const items: Array<{title: string, description: string, link: string, pubDate: string}> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    
    const titleMatch = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(itemContent);
    const descMatch = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i.exec(itemContent);
    const linkMatch = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i.exec(itemContent);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemContent);
    
    items.push({
      title: titleMatch ? cleanHtml(titleMatch[1]) : "제목 없음",
      description: descMatch ? cleanHtml(descMatch[1]) : "",
      link: linkMatch ? linkMatch[1].trim() : "",
      pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
    });
  }
  
  return items;
}

async function fetchRSS(url: string, category: string, source: string, limit: number = 10) {
  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) return [];
    
    const xmlText = await response.text();
    const items = parseXML(xmlText).slice(0, limit);
    
    return items.map((item, idx) => ({
      id: Math.abs(hashCode(item.link || `${source}_${idx}_${Date.now()}`)) % 100000,
      title: item.title,
      summary: item.description,
      category,
      source,
      link: item.link,
      published_at: item.pubDate,
      ai_summary: ""
    }));
  } catch (error) {
    console.error(`RSS 가져오기 실패 (${source} - ${category}):`, error);
    return [];
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function GET() {
  const allNews: Array<Record<string, unknown>> = [];
  
  for (const [category, feeds] of Object.entries(RSS_FEEDS)) {
    const shuffledFeeds = shuffleArray(feeds);
    
    for (const feed of shuffledFeeds) {
      const news = await fetchRSS(feed.url, category, feed.source, 10);
      if (news.length > 0) {
        // 랜덤으로 1개 선택
        const selected = news[Math.floor(Math.random() * news.length)];
        allNews.push(selected);
        break;
      }
    }
  }
  
  // 뉴스가 부족하면 샘플 데이터
  if (allNews.length === 0) {
    allNews.push({
      id: 1,
      title: "RSS 피드 연결 실패 - 샘플 데이터",
      summary: "현재 뉴스 피드를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
      category: "공지",
      source: "시스템",
      link: "",
      published_at: new Date().toISOString(),
      ai_summary: ""
    });
  }
  
  return NextResponse.json({ items: allNews.slice(0, 3), total: allNews.length });
}
