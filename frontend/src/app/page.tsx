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

  // 뉴스 가져오기 함수
  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/news/");
      const data = await res.json();
      const items = data.items || [];
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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            뉴스 리터러시 플랫폼
          </h1>
          <p className="text-xl text-white/80">
            2030세대를 위한 AI 뉴스 분석 서비스
          </p>
        </header>

        {/* 뉴스 목록 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📰</span> 오늘의 뉴스
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                refreshing || loading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-md hover:shadow-lg"
              }`}
            >
              <span className={`text-lg ${refreshing ? "animate-spin" : ""}`}>
                🔄
              </span>
              {refreshing ? "불러오는 중..." : "다른 기사 보기"}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <div 
                  key={item.id} 
                  className={`border-l-4 ${getCategoryBorder(item.category)} pl-4 py-4 bg-gray-50 rounded-r-lg transition-all`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-500">{item.source}</span>
                  </div>
                  
                  {/* 제목 영역 */}
                  <div className="mb-2">
                    {/* AI 수정 제목 또는 원문 제목 */}
                    {titleRewrites[item.id]?.loading ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm">AI가 제목을 분석중...</span>
                      </div>
                    ) : (
                      <>
                        {/* 메인 제목 */}
                        {item.link ? (
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline block"
                          >
                            {showOriginalTitle[item.id] || !titleRewrites[item.id]?.rewrittenTitle
                              ? item.title
                              : titleRewrites[item.id].rewrittenTitle}
                          </a>
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900">
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
                              className="text-xs px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md transition-colors flex items-center gap-1"
                            >
                              <span>🔍</span> 제목 Clickbait 분석
                            </button>
                          ) : titleRewrites[item.id].rewrittenTitle === item.title ? (
                            /* 객관적인 제목인 경우 (수정 불필요) */
                            <button
                              onClick={() => toggleTitleView(item.id)}
                              className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors flex items-center gap-1"
                            >
                              <span>✅</span> 제목 분석 결과 보기
                            </button>
                          ) : (
                            /* Clickbait 제목인 경우 */
                            <button
                              onClick={() => toggleTitleView(item.id)}
                              className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors flex items-center gap-1"
                            >
                              {showOriginalTitle[item.id] ? (
                                <><span>🤖</span> AI 수정 제목 보기</>
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
                  
                  <p className="text-gray-600 text-sm mt-1 mb-3">{item.summary}</p>
                  
                  {/* AI 분석 버튼들 */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => {
                        setExpandedNews(expandedNews === item.id ? null : item.id);
                        if (!analysisMap[item.id]?.summary) {
                          analyzeNews(item, "summary");
                        }
                      }}
                      disabled={loadingAnalysis[item.id] === "summary"}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {loadingAnalysis[item.id] === "summary" ? (
                        <><span className="animate-spin">⏳</span> 분석중...</>
                      ) : (
                        <><span>🤖</span> AI 요약</>
                      )}
                    </button>

                    {item.link && (
                      <a 
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <span>🔗</span> 원문보기
                      </a>
                    )}
                  </div>

                  {/* AI 분석 결과 표시 */}
                  {analysisMap[item.id]?.summary && (
                    <div className="mt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                          <span>🤖</span> AI 요약 (핵심 포인트 & 시사점)
                        </h4>
                        <p className="text-blue-900 text-sm whitespace-pre-wrap leading-relaxed">{analysisMap[item.id].summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-12 text-center text-white/60 text-sm">
          뉴스 리터러시 플랫폼 - 균형 잡힌 시사 이해를 돕습니다
        </footer>
      </div>
    </div>
  );
}
