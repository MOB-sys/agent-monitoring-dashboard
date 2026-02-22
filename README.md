# AI Agent Monitoring Dashboard

> AI 에이전트 작업 실시간 모니터링 시각적 대시보드

## 1. 프로젝트 개요

AI 에이전트의 모든 작업을 실시간으로 모니터링하는 대시보드.
에이전트의 비결정적 특성(환각, 컨텍스트 손실, 도구 호출 루프, 토큰 비용 폭발)에 대응하기 위한
성능 추적, 비용 분석, 품질 보증, 워크플로 시각화를 제공한다.

---

## 2. 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| **UI 프레임워크** | React 18 + TypeScript | 컴포넌트 기반, 타입 안정성 |
| **빌드 도구** | Vite | 빠른 HMR, ESM 기반 |
| **실시간 통신** | Socket.IO | 양방향, 자동 재연결, 폴백 |
| **상태 관리** | Zustand | 경량, 고빈도 업데이트에 최적 |
| **차트** | Recharts | React 네이티브, 선언적 API |
| **UI 컴포넌트** | shadcn/ui + Tailwind CSS | 커스터마이징 용이, 다크 테마 |
| **아이콘** | Lucide React | 경량, 트리셰이킹 |
| **서버** | Node.js + Express | WebSocket 네이티브, 비동기 처리 |
| **TS 실행** | tsx | TypeScript 직접 실행 |

---

## 3. 프로젝트 구조

```
agent-monitoring-dashboard/
├── README.md
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Express + Socket.IO 서버
│       ├── types.ts              # 공유 타입 정의
│       └── simulator.ts          # 에이전트 데이터 시뮬레이터
│
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css              # Tailwind + 다크 테마 글로벌 스타일
        ├── vite-env.d.ts
        │
        ├── types/
        │   └── index.ts           # 프론트엔드 타입 (서버 타입과 동기화)
        │
        ├── lib/
        │   └── utils.ts           # cn() 유틸리티 등
        │
        ├── store/
        │   └── useMonitoringStore.ts  # Zustand 글로벌 스토어
        │
        ├── hooks/
        │   └── useSocket.ts       # Socket.IO 연결 훅
        │
        └── components/
            ├── layout/
            │   ├── Header.tsx     # 상단 바 (연결 상태, 시간 범위)
            │   └── Sidebar.tsx    # 좌측 네비게이션
            │
            ├── dashboard/
            │   ├── OverviewDashboard.tsx      # Level 1 - 요약 뷰
            │   ├── SummaryCards.tsx           # 핵심 지표 카드 4종
            │   ├── SuccessRateGauge.tsx       # 성공률 게이지
            │   ├── LatencyChart.tsx           # P50/P95/P99 추세 차트
            │   ├── TokenConsumptionChart.tsx  # 입력/출력 토큰 스택 차트
            │   ├── CostChart.tsx             # 일별 비용 추세 차트
            │   ├── ErrorMonitor.tsx           # 에러 유형별 분류 차트
            │   ├── TaskQueue.tsx              # 작업 큐 상태판
            │   └── ActivityLog.tsx            # 실시간 활동 로그
            │
            ├── agents/
            │   └── AgentDetailView.tsx  # Level 2 - 에이전트별 상세
            │
            └── traces/
                └── TraceDetailView.tsx  # Level 3 - 트레이스 상세
```

---

## 4. 핵심 모니터링 지표

### 4.1 성능 (Performance)
- **응답 레이턴시**: P50, P95, P99 백분위수 라인 차트
- **처리량**: 분당 작업 처리 수
- **성공률**: 95% 미만 시 경고 (게이지 차트)

### 4.2 비용 (Cost)
- **토큰 사용량**: Input/Output 분리 스택 차트
- **API 호출 비용**: 모델별 일일 지출 추정치
- **에이전트별 리소스 소비**: 어떤 에이전트가 가장 많이 소비하는지

### 4.3 품질 (Quality)
- **평가 점수**: 정확성, 신뢰성, 유용성
- **에러율**: 유형별 분류 (Hallucination, Timeout, Tool Error 등)

### 4.4 워크플로 (Workflow)
- **에이전트 간 핸드오프**: 전환 추적
- **작업 큐 상태**: 대기/처리 중/완료/실패 비율

---

## 5. 시뮬레이션 에이전트 목록

| 에이전트 | 역할 | 사용 모델 |
|----------|------|-----------|
| Code Generator | 코드 생성 | Claude Opus |
| Code Reviewer | 코드 리뷰 | Claude Sonnet |
| Test Runner | 테스트 실행 | Claude Haiku |
| Documentation | 문서 생성 | Claude Sonnet |
| DevOps Agent | 배포/인프라 | Claude Opus |

---

## 6. 대시보드 계층 구조

### Level 1 - Overview (요약 뷰)
```
┌─────────────────────────────────────────────────────────┐
│ [Header: 타이틀 | 연결 상태 | 시간 범위 선택]            │
├────────┬────────────────────────────────────────────────┤
│        │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  Side  │ │Active│ │Succ %│ │ Avg  │ │Total │          │
│  bar   │ │Agents│ │ Rate │ │Laten.│ │ Cost │          │
│        │ └──────┘ └──────┘ └──────┘ └──────┘          │
│ ● Over │ ┌──────────────┐ ┌──────────────────┐        │
│   view │ │ Success Rate │ │ Latency Trend    │        │
│ ○ Agent│ │   Gauge      │ │ (P50/P95/P99)    │        │
│ ○ Trace│ └──────────────┘ └──────────────────┘        │
│        │ ┌──────────────┐ ┌──────────────────┐        │
│        │ │ Token Usage  │ │ Cost Estimation  │        │
│        │ │ Stack Chart  │ │ Trend Chart      │        │
│        │ └──────────────┘ └──────────────────┘        │
│        │ ┌──────────────┐ ┌──────────────────┐        │
│        │ │ Error Monitor│ │ Task Queue       │        │
│        │ └──────────────┘ └──────────────────┘        │
│        │ ┌─────────────────────────────────────┐      │
│        │ │ Activity Log (실시간 타임라인)        │      │
│        │ └─────────────────────────────────────┘      │
└────────┴────────────────────────────────────────────────┘
```

### Level 2 - Agent Detail (에이전트 상세)
- 개별 에이전트 토큰 사용량, 레이턴시, 에러 패턴
- 최근 작업 이력 테이블
- 성능 추세 개별 차트

### Level 3 - Trace Detail (트레이스 상세)
- 개별 요청의 전체 실행 경로 타임라인
- LLM 호출, 도구 사용, 입출력 데이터
- 스텝별 레이턴시 및 토큰 소비

---

## 7. 실시간 데이터 처리 전략

### WebSocket 통신
- **Socket.IO** 기반 양방향 실시간 통신
- 서버: 1초 간격 메트릭 업데이트, 이벤트 기반 활동 로그 push
- 클라이언트: Zustand 스토어로 수신 데이터 관리

### 프론트엔드 성능 최적화
- **배치 업데이트**: `useRef` 버퍼링 후 `requestAnimationFrame`으로 반영
- **메모이제이션**: `React.memo`, `useMemo`로 차트 리렌더링 방지
- **데이터 윈도우**: 최신 60개 데이터 포인트만 유지 (차트용)
- **가상화**: 활동 로그는 최신 100건만 표시

### 연결 안정성
- 지수 백오프 재연결 (1s → 2s → 4s → 8s → 최대 30s)
- 30초 간격 heartbeat/ping
- 연결 상태 UI 표시 (Connected / Reconnecting / Disconnected)

---

## 8. 디자인 시스템

### 테마
- **다크 테마** 기본 (모니터링 대시보드 표준)
- 배경: `slate-950` / 카드: `slate-900` / 보더: `slate-800`

### 색상 코드
| 용도 | 색상 | Tailwind |
|------|------|----------|
| 정상/성공 | 초록 | `emerald-500` |
| 경고 | 노랑 | `amber-500` |
| 위험/실패 | 빨강 | `red-500` |
| 정보/기본 | 파랑 | `blue-500` |
| 보라 (보조) | 보라 | `violet-500` |

### 성공률 임계값
- ≥ 95%: 초록 (정상)
- 85-95%: 노랑 (주의)
- < 85%: 빨강 (위험)

---

## 9. 서버 이벤트 스키마

### Socket.IO 이벤트

| 이벤트명 | 방향 | 설명 |
|----------|------|------|
| `metrics:update` | Server → Client | 1초 간격 전체 메트릭 스냅샷 |
| `agent:activity` | Server → Client | 개별 에이전트 활동 이벤트 |
| `agent:status` | Server → Client | 에이전트 상태 변경 (idle/running/error) |
| `trace:new` | Server → Client | 새 트레이스 생성 |
| `trace:update` | Server → Client | 트레이스 스텝 추가/완료 |
| `alert:trigger` | Server → Client | 임계값 초과 알림 |

---

## 10. 구현 순서

### Step 1: 프로젝트 초기화
- [ ] `server/` 디렉터리: package.json, tsconfig.json
- [ ] `client/` 디렉터리: package.json, Vite, Tailwind, PostCSS 설정
- [ ] 의존성 설치

### Step 2: 공통 타입 정의
- [ ] `server/src/types.ts` - Agent, Metric, Trace, Activity 타입
- [ ] `client/src/types/index.ts` - 동일 타입 프론트엔드 복사

### Step 3: 백엔드 서버
- [ ] `server/src/simulator.ts` - 5개 에이전트 시뮬레이션 데이터 생성
- [ ] `server/src/index.ts` - Express + Socket.IO 서버, 이벤트 발행

### Step 4: 프론트엔드 코어
- [ ] `client/src/lib/utils.ts` - cn() 유틸리티
- [ ] `client/src/store/useMonitoringStore.ts` - Zustand 스토어
- [ ] `client/src/hooks/useSocket.ts` - Socket.IO 연결 훅
- [ ] `client/src/index.css` - Tailwind + 다크 테마 스타일

### Step 5: 레이아웃 컴포넌트
- [ ] `Header.tsx` - 상단 바
- [ ] `Sidebar.tsx` - 좌측 네비게이션
- [ ] `App.tsx` - 라우팅 + 레이아웃 조합

### Step 6: 대시보드 컴포넌트 (Level 1)
- [ ] `SummaryCards.tsx` - 4개 핵심 지표 카드
- [ ] `SuccessRateGauge.tsx` - 성공률 게이지 (Recharts RadialBarChart)
- [ ] `LatencyChart.tsx` - P50/P95/P99 라인 차트
- [ ] `TokenConsumptionChart.tsx` - Input/Output 스택 바 차트
- [ ] `CostChart.tsx` - 일별 비용 에어리어 차트
- [ ] `ErrorMonitor.tsx` - 에러 유형별 파이/바 차트
- [ ] `TaskQueue.tsx` - 상태별 색상 코드 작업 목록
- [ ] `ActivityLog.tsx` - 실시간 활동 스트림
- [ ] `OverviewDashboard.tsx` - 위 컴포넌트 조합 레이아웃

### Step 7: 에이전트 상세 (Level 2)
- [ ] `AgentDetailView.tsx` - 개별 에이전트 메트릭 + 작업 이력

### Step 8: 트레이스 상세 (Level 3)
- [ ] `TraceDetailView.tsx` - 실행 경로 타임라인 + 스텝 상세

### Step 9: 통합 테스트
- [ ] 서버 기동 → 클라이언트 연결 → 실시간 데이터 흐름 확인
- [ ] 모든 차트 렌더링 확인
- [ ] 페이지 전환 (Overview → Agent → Trace) 확인

---

## 11. 실행 방법

```bash
# 서버 실행
cd server && npm install && npm run dev

# 클라이언트 실행 (별도 터미널)
cd client && npm install && npm run dev
```

- 서버: http://localhost:3001
- 클라이언트: http://localhost:5173
