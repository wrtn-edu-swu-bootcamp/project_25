"use client";
import { useState, useEffect } from "react";

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  category: string;
  source: string;
  link: string;
  published_at: string;
  ai_summary: string;
}

interface TitleRewrite {
  rewrittenTitle: string;
  clickbaitReason: string;
  originalTitle: string;
  loading?: boolean;
}

interface AnalysisResult {
  summary?: string;
  error?: string;
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisMap, setAnalysisMap] = useState<Record<number, AnalysisResult>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<Record<number, string>>({});
  const [expandedNews, setExpandedNews] = useState<number | null>(null);
  const [titleRewrites, setTitleRewrites] = useState<Record<number, TitleRewrite>>({});
  const [showOriginalTitle, setShowOriginalTitle] = useState<Record<number, boolean>>({});
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<number, boolean>>({});

  // 뉴스 가져오기 함수
  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 캐시 방지를 위해 timestamp 추가
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/news/?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      const items = data.items || [];
      
      if (items.length === 0) {
        console.warn("뉴스 데이터가 비어있습니다.");
      }
      
      setNews(items);
      
      // 새로고침 시 기존 분석 결과 초기화
      if (isRefresh) {
        setAnalysisMap({});
        setTitleRewrites({});
        setShowOriginalTitle({});
        setExpandedNews(null);
      }
    } catch (error) {
      console.error("뉴스 가져오기 실패:", error);
      // 에러 발생 시 기존 뉴스 유지하거나 빈 배열로 설정
      // setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    if (!refreshing) {
      fetchNews(true);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // 개별 기사 제목 재작성
  const rewriteTitleForItem = async (newsItem: NewsItem) => {
    setTitleRewrites(prev => ({
      ...prev,
      [newsItem.id]: { rewrittenTitle: "", clickbaitReason: "", originalTitle: newsItem.title, loading: true }
    }));

    try {
      const res = await fetch("/api/analysis/rewrite-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newsItem.title, content: newsItem.summary })
      });
      const data = await res.json();
      
      // 에러 처리 (Rate limit 등)
      if (data.error) {
        const isRateLimit = data.error.includes("429") || data.error.includes("rate_limit");
        setTitleRewrites(prev => ({
          ...prev,
          [newsItem.id]: { 
            rewrittenTitle: newsItem.title, 
            clickbaitReason: isRateLimit 
              ? "⏳ API 요청 한도 초과 - 잠시 후 다시 시도해주세요" 
              : `분석 실패: ${data.error}`, 
            originalTitle: newsItem.title, 
            loading: false 
          }
        }));
        return;
      }
      
      setTitleRewrites(prev => ({
        ...prev,
        [newsItem.id]: {
          rewrittenTitle: data.rewrittenTitle || newsItem.title,
          clickbaitReason: data.clickbaitReason || "",
          originalTitle: newsItem.title,
          loading: false
        }
      }));
    } catch {
      setTitleRewrites(prev => ({
        ...prev,
        [newsItem.id]: { rewrittenTitle: newsItem.title, clickbaitReason: "네트워크 오류 - 다시 시도해주세요", originalTitle: newsItem.title, loading: false }
      }));
    }
  };

  // 개별 뉴스 AI 요약
  const analyzeNews = async (newsItem: NewsItem, type: string) => {
    setLoadingAnalysis(prev => ({ ...prev, [newsItem.id]: type }));

    // localStorage 캐시 확인
    const cacheKey = `analysis_${newsItem.id}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { summary, timestamp } = JSON.parse(cached);
        const now = Date.now();
        const cacheAge = now - timestamp;
        const cacheValidDuration = 24 * 60 * 60 * 1000; // 24시간
        
        if (cacheAge < cacheValidDuration) {
          // 캐시 유효 - 사용
          setAnalysisMap(prev => ({
            ...prev,
            [newsItem.id]: { summary }
          }));
          setLoadingAnalysis(prev => ({ ...prev, [newsItem.id]: "" }));
          return;
        }
      } catch {
        // 캐시 파싱 실패 - 무시하고 계속
      }
    }

    try {
      const res = await fetch("/api/analysis/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${newsItem.title}\n\n${newsItem.summary}` })
      });
      const data = await res.json();
      
      // 에러 처리 (Rate limit 등)
      if (data.error) {
        const isRateLimit = data.error.includes("429") || data.error.includes("rate_limit");
        const errorMsg = isRateLimit 
          ? "⏳ API 요청 한도 초과 - 잠시 후 다시 시도해주세요" 
          : `분석 실패: ${data.error}`;
        
        setAnalysisMap(prev => ({
          ...prev,
          [newsItem.id]: { summary: errorMsg }
        }));
      } else {
        setAnalysisMap(prev => ({
          ...prev,
          [newsItem.id]: { summary: data.summary }
        }));
        
        // 성공 시 캐시에 저장
        localStorage.setItem(cacheKey, JSON.stringify({
          summary: data.summary,
          timestamp: Date.now()
        }));
      }
    } catch {
      setAnalysisMap(prev => ({
        ...prev,
        [newsItem.id]: { error: "네트워크 오류 - 다시 시도해주세요" }
      }));
    }
    
    setLoadingAnalysis(prev => ({ ...prev, [newsItem.id]: "" }));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "정치": "bg-purple-100 text-purple-800 border-purple-300",
      "경제": "bg-blue-100 text-blue-800 border-blue-300",
      "사회": "bg-green-100 text-green-800 border-green-300",
      "국제": "bg-orange-100 text-orange-800 border-orange-300",
      "IT/과학": "bg-pink-100 text-pink-800 border-pink-300",
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getCategoryBorder = (category: string) => {
    const colors: Record<string, string> = {
      "정치": "border-purple-500",
      "경제": "border-blue-500",
      "사회": "border-green-500",
      "국제": "border-orange-500",
      "IT/과학": "border-pink-500",
    };
    return colors[category] || "border-gray-500";
  };

  // 제목 토글
  const toggleTitleView = (newsId: number) => {
    setShowOriginalTitle(prev => ({
      ...prev,
      [newsId]: !prev[newsId]
    }));
  };

  // 오늘 날짜 포맷팅
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayName = dayNames[today.getDay()];
    return `${year}년 ${month}월 ${date}일 ${dayName}`;
  };

  // 발간일시 포맷팅
  const formatPublishedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}.${month}.${day} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen p-6 bg-[#f8fafc]">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-[2.5rem] font-bold text-[#1a365d] mb-2" style={{ fontFamily: 'var(--font-noto-serif)' }}>
            HOLD ON
          </h1>
          <p className="text-xl text-[#475569] mb-3" style={{ fontFamily: 'var(--font-noto-sans)' }}>
            잠깐, 다시 읽어보세요
          </p>
          <div className="text-sm text-[#475569] font-medium">
            {getTodayDate()}
          </div>
        </header>

        {/* 뉴스 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[#1a365d] flex items-center gap-2" style={{ fontFamily: 'var(--font-noto-sans)' }}>
              <span className="text-2xl">📰</span> 오늘의 뉴스
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${
                refreshing || loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#1a365d] text-white hover:bg-[#1e3a5f] shadow-sm hover:shadow"
              }`}
              style={{ fontFamily: 'var(--font-noto-sans)' }}
            >
              <span className={`text-lg ${refreshing ? "animate-spin" : ""}`}>
                🔄
              </span>
              {refreshing ? "불러오는 중..." : "다음 기사"}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a365d]"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <div 
                  key={item.id} 
                  className={`border-l-4 ${getCategoryBorder(item.category)} pl-4 py-4 bg-gray-50 rounded-r-md transition-all border border-gray-200`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getCategoryColor(item.category)}`} style={{ fontFamily: 'var(--font-noto-sans)' }}>
                      {item.category}
                    </span>
                    <span className="text-xs text-[#475569] font-medium px-1.5 py-0.5 bg-yellow-200/60 rounded-sm" style={{ fontFamily: 'var(--font-noto-sans)' }}>
                      {item.source}
                    </span>
                    {item.published_at && (
                      <span className="text-xs text-[#475569]" style={{ fontFamily: 'var(--font-noto-sans)' }}>
                        · {formatPublishedDate(item.published_at)}
                      </span>
                    )}
                  </div>
                  
                  {/* 제목 영역 */}
                  <div className="mb-2">
                    {/* AI 수정 제목 또는 원문 제목 */}
                    {titleRewrites[item.id]?.loading ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm">제목을 점검하는 중...</span>
                      </div>
                    ) : (
                      <>
                        {/* 메인 제목 */}
                        {item.link ? (
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[1.25rem] font-semibold text-[#1a365d] hover:text-[#c2410c] hover:underline block"
                            style={{ fontFamily: 'var(--font-noto-sans)' }}
                          >
                            {showOriginalTitle[item.id] || !titleRewrites[item.id]?.rewrittenTitle
                              ? item.title
                              : titleRewrites[item.id].rewrittenTitle}
                          </a>
                        ) : (
                          <h3 className="text-[1.25rem] font-semibold text-[#1a365d]" style={{ fontFamily: 'var(--font-noto-sans)' }}>
                            {showOriginalTitle[item.id] || !titleRewrites[item.id]?.rewrittenTitle
                              ? item.title
                              : titleRewrites[item.id].rewrittenTitle}
                          </h3>
                        )}

                        {/* 제목 분석 버튼 또는 결과 */}
                        <div className="mt-2">
                          {!titleRewrites[item.id]?.rewrittenTitle ? (
                            /* 아직 분석 안 된 경우: 분석 버튼 표시 */
                            <button
                              onClick={() => rewriteTitleForItem(item)}
                              className="text-xs px-2 py-1 bg-[#1a365d]/10 hover:bg-[#1a365d]/20 text-[#1a365d] rounded-md transition-colors flex items-center gap-1"
                              style={{ fontFamily: 'var(--font-noto-sans)' }}
                            >
                              <span>🔍</span> 제목 점검하기
                            </button>
                          ) : titleRewrites[item.id].rewrittenTitle === item.title ? (
                            /* 객관적인 제목인 경우 (수정 불필요) */
                            <button
                              onClick={() => toggleTitleView(item.id)}
                              className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors flex items-center gap-1"
                              style={{ fontFamily: 'var(--font-noto-sans)' }}
                            >
                              <span>✅</span> 제목 분석 결과 보기
                            </button>
                          ) : (
                            /* Clickbait 제목인 경우 */
                            <button
                              onClick={() => toggleTitleView(item.id)}
                              className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors flex items-center gap-1"
                              style={{ fontFamily: 'var(--font-noto-sans)' }}
                            >
                              {showOriginalTitle[item.id] ? (
                                <><span>📋</span> 다른 표현 보기</>
                              ) : (
                                <><span>📰</span> 원문 제목 보기</>
                              )}
                            </button>
                          )}

                          {/* 분석 결과 표시 (토글 시) */}
                          {titleRewrites[item.id]?.rewrittenTitle && showOriginalTitle[item.id] && titleRewrites[item.id]?.clickbaitReason && (
                            <div className={`mt-2 p-3 rounded-lg ${
                              titleRewrites[item.id].rewrittenTitle === item.title 
                                ? "bg-green-50 border border-green-200" 
                                : "bg-amber-50 border border-amber-200"
                            }`}>
                              <p className={`text-xs font-medium mb-1 ${
                                titleRewrites[item.id].rewrittenTitle === item.title 
                                  ? "text-green-800" 
                                  : "text-amber-800"
                              }`}>
                                {titleRewrites[item.id].rewrittenTitle === item.title 
                                  ? "✅ 제목 분석:" 
                                  : "⚠️ Clickbait 분석:"}
                              </p>
                              <p className={`text-xs ${
                                titleRewrites[item.id].rewrittenTitle === item.title 
                                  ? "text-green-700" 
                                  : "text-amber-700"
                              }`}>{titleRewrites[item.id].clickbaitReason}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <p className="text-[#475569] text-[0.95rem] mt-1 mb-3 leading-relaxed" style={{ fontFamily: 'var(--font-noto-sans)' }}>{item.summary}</p>
                  
                  {/* AI 분석 버튼들 */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => {
                        // 이미 분석 결과가 있으면 토글만, 없으면 API 호출 후 펼침
                        if (analysisMap[item.id]?.summary) {
                          setExpandedAnalysis(prev => ({
                            ...prev,
                            [item.id]: !prev[item.id]
                          }));
                        } else {
                          analyzeNews(item, "summary");
                          setExpandedAnalysis(prev => ({
                            ...prev,
                            [item.id]: true
                          }));
                        }
                      }}
                      disabled={loadingAnalysis[item.id] === "summary"}
                      className="px-3 py-1.5 bg-[#1a365d] hover:bg-[#1e3a5f] text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      style={{ fontFamily: 'var(--font-noto-sans)' }}
                    >
                      {loadingAnalysis[item.id] === "summary" ? (
                        <><span className="animate-spin">⏳</span> 분석중...</>
                      ) : expandedAnalysis[item.id] && analysisMap[item.id]?.summary ? (
                        <><span>📋</span> 접기</>
                      ) : (
                        <><span>📋</span> 읽기 도우미</>
                      )}
                    </button>

                    {item.link && (
                      <a 
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                        style={{ fontFamily: 'var(--font-noto-sans)' }}
                      >
                        <span>🔗</span> 원문보기
                      </a>
                    )}
                  </div>

                  {/* AI 분석 결과 표시 */}
                  {analysisMap[item.id]?.summary && expandedAnalysis[item.id] && (
                    <div className="mt-4">
                      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-2 italic" style={{ fontFamily: 'var(--font-noto-sans)' }}>
                          아래는 참고용 분석입니다. 최종 판단은 본인의 몫입니다.
                        </p>
                        <h4 className="font-medium text-gray-600 mb-2 flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-noto-sans)' }}>
                          <span>📋</span> 참고: 읽기 도우미
                        </h4>
                        <p className="text-[#475569] text-[0.9rem] whitespace-pre-wrap leading-relaxed mb-3" style={{ fontFamily: 'var(--font-noto-sans)' }}>{analysisMap[item.id].summary}</p>
                        <p className="text-xs text-gray-500 italic pt-2 border-t border-gray-200" style={{ fontFamily: 'var(--font-noto-sans)' }}>
                          이 분석에 동의하시나요? 다른 관점도 생각해보세요.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-12 text-center text-[#475569] text-sm" style={{ fontFamily: 'var(--font-noto-sans)' }}>
          HOLD ON - AI가 아닌 당신이 판단합니다
        </footer>
      </div>
    </div>
  );
}
