# 뉴스 리터러시 플랫폼 - 진행상황

## 프로젝트 개요
2030세대를 위한 AI 뉴스 분석 서비스. Clickbait 제목 분석 및 뉴스 요약 기능 제공.

---

## 현재 상태 (2026-01-23)

### 완료된 작업
- [x] 프론트엔드/백엔드 기본 구조 구축
- [x] RSS 피드로 실시간 뉴스 가져오기 (조선일보, 연합뉴스)
- [x] OpenAI API에서 Google Gemini API로 전환 (비용 절감)
- [x] 기능 간소화 (분야 3개, 기사 각 1개)
- [x] GitHub 푸시 완료
- [x] google-genai 최신 패키지로 마이그레이션
- [x] gemini-2.5-flash 모델로 업그레이드 (quota 문제 해결)

### 정상 동작 확인
- [x] 백엔드 서버 (포트 8000)
- [x] 프론트엔드 서버 (포트 3000)
- [x] Gemini API 연결 테스트 성공

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Next.js 14, React, TailwindCSS |
| 백엔드 | FastAPI, Python |
| AI API | Google Gemini (gemini-2.5-flash) |
| 뉴스 소스 | 조선일보/연합뉴스 RSS |

---

## 서버 실행 방법

### 1. 백엔드 서버 (포트 8000)
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### 2. 프론트엔드 서버 (포트 3000)
```bash
cd frontend
npm run dev
```

### 3. 접속
http://localhost:3000

---

## 주요 파일 구조

```
project_25/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 진입점
│   │   ├── config.py            # 환경변수 설정 (GEMINI_API_KEY)
│   │   └── api/routes/
│   │       ├── analysis.py      # AI 분석 엔드포인트
│   │       └── news.py          # 뉴스 RSS 가져오기
│   ├── .env                     # API 키 저장 (git 제외)
│   └── requirements.txt
├── frontend/
│   └── src/app/
│       └── page.tsx             # 메인 UI
└── PROGRESS.md                  # 이 파일
```

---

## API 엔드포인트

| 엔드포인트 | 설명 |
|------------|------|
| GET /api/news/ | 뉴스 목록 (3개) |
| POST /api/analysis/summary | AI 요약 |
| POST /api/analysis/rewrite-title | 제목 Clickbait 분석 |
| GET /api/analysis/test | API 연결 테스트 |

---

## 환경 설정

### backend/.env 파일
```
GEMINI_API_KEY=AIzaSyBEl0r5cq7H3aerxqkE2DzxRCJSZ_w9tmU
```

### Gemini API 키 발급
1. https://aistudio.google.com/app/apikey 접속
2. Google 로그인 → "Create API Key" 클릭
3. 키를 .env 파일에 저장

---

## 현재 이슈

### Gemini API Rate Limit
- **문제**: API 일일 한도 소진 (limit: 0)
- **해결**: 시간이 지나면 자동 초기화 (UTC 자정 기준)
- **대안**: 새 API 키 발급

---

## 다음 작업 (TODO)

1. Gemini API 한도 초기화 후 테스트
2. UI 개선 (필요시)
3. 추가 기능 구현 (필요시)

---

## Git 정보

- **저장소**: https://github.com/wrtn-edu-swu-bootcamp/project_25
- **브랜치**: main
- **최신 커밋**: refactor: Switch to Gemini API and simplify features
