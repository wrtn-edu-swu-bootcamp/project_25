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

interface AnalysisResult {
  summary?: string;
  comparison?: string;
  context?: string;
  factcheck?: string;
  error?: string;
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyBrief, setDailyBrief] = useState<string>("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [analysisMap, setAnalysisMap] = useState<Record<number, AnalysisResult>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<Record<number, string>>({});
  const [expandedNews, setExpandedNews] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/news/")
      .then(res => res.json())
      .then(data => {
        setNews(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 오늘의 시사 브리핑 생성
  const generateDailyBrief = async () => {
    if (news.length === 0) return;
    setBriefLoading(true);
    
    const headlines = news.slice(0, 8).map(n => `[${n.category}] ${n.title}`).join("\n");
    
    try {
      const res = await fetch("/api/analysis/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `오늘의 주요 뉴스 헤드라인입니다. 이 뉴스들을 종합하여 오늘의 시사 트렌드와 2030세대가 알아야 할 핵심 포인트를 정리해주세요:\n\n${headlines}`
        })
      });
      const data = await res.json();
      setDailyBrief(data.summary || data.error || "분석 실패");
    } catch {
      setDailyBrief("분석 중 오류가 발생했습니다.");
    }
    setBriefLoading(false);
  };

  // 개별 뉴스 AI 분석
  const analyzeNews = async (newsItem: NewsItem, type: string) => {
    setLoadingAnalysis(prev => ({ ...prev, [newsItem.id]: type }));
    
    const endpoints: Record<string, string> = {
      summary: "/api/analysis/summary",
      compare: "/api/analysis/compare", 
      context: "/api/analysis/context",
      factcheck: "/api/analysis/factcheck"
    };

    try {
      const res = await fetch(endpoints[type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${newsItem.title}\n\n${newsItem.summary}` })
      });
      const data = await res.json();
      
      setAnalysisMap(prev => ({
        ...prev,
        [newsItem.id]: {
          ...prev[newsItem.id],
          [type === "summary" ? "summary" : type === "compare" ? "comparison" : type === "context" ? "context" : "factcheck"]: 
            data.summary || data.comparison || data.context || data.factcheck || data.error
        }
      }));
    } catch {
      setAnalysisMap(prev => ({
        ...prev,
        [newsItem.id]: { ...prev[newsItem.id], error: "분석 실패" }
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

        {/* 오늘의 시사 브리핑 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">📊</span> 오늘의 시사 브리핑
            </h2>
            {!dailyBrief && !briefLoading && (
              <button
                onClick={generateDailyBrief}
                disabled={loading || news.length === 0}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                AI 브리핑 생성
              </button>
            )}
          </div>
          
          {briefLoading ? (
            <div className="flex items-center gap-3 text-white/80">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>오늘의 뉴스를 분석하고 있습니다...</span>
            </div>
          ) : dailyBrief ? (
            <div className="bg-white/10 rounded-xl p-4 text-white/90 whitespace-pre-wrap leading-relaxed">
              {dailyBrief}
            </div>
          ) : (
            <p className="text-white/70 text-sm">
              버튼을 클릭하면 AI가 오늘의 주요 뉴스를 분석하여 시사 트렌드와 핵심 포인트를 정리해드립니다.
            </p>
          )}
        </div>

        {/* 뉴스 목록 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <span className="text-2xl">📰</span> 오늘의 뉴스
          </h2>

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
                  
                  {item.link ? (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline block"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.title}
                    </h3>
                  )}
                  
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
                    
                    <button
                      onClick={() => analyzeNews(item, "context")}
                      disabled={!!loadingAnalysis[item.id]}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {loadingAnalysis[item.id] === "context" ? (
                        <><span className="animate-spin">⏳</span> 분석중...</>
                      ) : (
                        <><span>📚</span> 배경지식</>
                      )}
                    </button>
                    
                    <button
                      onClick={() => analyzeNews(item, "compare")}
                      disabled={!!loadingAnalysis[item.id]}
                      className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {loadingAnalysis[item.id] === "compare" ? (
                        <><span className="animate-spin">⏳</span> 분석중...</>
                      ) : (
                        <><span>⚖️</span> 관점비교</>
                      )}
                    </button>
                    
                    <button
                      onClick={() => analyzeNews(item, "factcheck")}
                      disabled={!!loadingAnalysis[item.id]}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {loadingAnalysis[item.id] === "factcheck" ? (
                        <><span className="animate-spin">⏳</span> 분석중...</>
                      ) : (
                        <><span>✅</span> 팩트체크</>
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
                  {analysisMap[item.id] && (expandedNews === item.id || Object.keys(analysisMap[item.id]).length > 0) && (
                    <div className="mt-4 space-y-3">
                      {analysisMap[item.id].summary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <span>🤖</span> AI 요약 (핵심 포인트 & 시사점)
                          </h4>
                          <p className="text-blue-900 text-sm whitespace-pre-wrap leading-relaxed">{analysisMap[item.id].summary}</p>
                        </div>
                      )}
                      
                      {analysisMap[item.id].context && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                            <span>📚</span> 배경지식 (이해를 위한 사전 정보)
                          </h4>
                          <p className="text-green-900 text-sm whitespace-pre-wrap leading-relaxed">{analysisMap[item.id].context}</p>
                        </div>
                      )}
                      
                      {analysisMap[item.id].comparison && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                          <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                            <span>⚖️</span> 관점 비교 (다양한 시각)
                          </h4>
                          <p className="text-purple-900 text-sm whitespace-pre-wrap leading-relaxed">{analysisMap[item.id].comparison}</p>
                        </div>
                      )}
                      
                      {analysisMap[item.id].factcheck && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                          <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                            <span>✅</span> 팩트체크 (주장 검증)
                          </h4>
                          <p className="text-orange-900 text-sm whitespace-pre-wrap leading-relaxed">{analysisMap[item.id].factcheck}</p>
                        </div>
                      )}
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
