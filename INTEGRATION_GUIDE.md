# 외부 에이전트 연동 가이드

Agent Monitoring Dashboard에 외부 AI 에이전트를 연동하는 방법을 설명합니다.

---

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [서버 설정](#서버-설정)
3. [데이터 모드](#데이터-모드)
4. [REST API로 직접 연동](#rest-api로-직접-연동)
5. [Node.js SDK 사용](#nodejs-sdk-사용)
6. [Python 연동 (raw HTTP)](#python-연동-raw-http)
7. [WebSocket 연동](#websocket-연동)
8. [API 레퍼런스](#api-레퍼런스)
9. [트러블슈팅](#트러블슈팅)

---

## 아키텍처 개요

```
외부 에이전트 (SDK/HTTP)  →  REST / WebSocket  →  서버 수집 API  →  LiveDataManager
                                                                       ↓
시뮬레이터 (내장)  ────────→  ModeManager (simulator/live/hybrid)  →  MetricsSnapshot
                                                                       ↓
                                                        Socket.IO broadcast → 대시보드
```

- **simulator 모드**: 내장 시뮬레이터가 가짜 데이터 생성 (기본값)
- **live 모드**: 외부 에이전트의 실제 데이터만 표시
- **hybrid 모드**: 시뮬레이터 + 실제 데이터 병합 표시

---

## 서버 설정

### 시작

```bash
cd server
npm install
npm run dev
```

서버가 시작되면 자동으로 API 키가 생성되어 콘솔에 출력됩니다:

```
Agent Monitoring Server running on http://localhost:3001
Data mode: simulator
Ingest API key: amp_c5f249ca48d3ce03d400e114285bea97fc235d1a23c5db86
```

### 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `INGEST_API_KEY` | 고정 API 키 지정 | 자동 생성 |
| `DATA_MODE` | 초기 데이터 모드 (`simulator`, `live`, `hybrid`) | `simulator` |

```bash
# 예: live 모드로 시작하며 고정 API 키 사용
INGEST_API_KEY=my-secret-key DATA_MODE=live npm run dev
```

### 현재 모드 및 API 키 확인

```bash
curl http://localhost:3001/api/mode
```

```json
{
  "mode": "simulator",
  "liveAgents": 0,
  "apiKey": "amp_c5f249ca..."
}
```

---

## 데이터 모드

### 모드 전환

```bash
# live 모드로 전환
curl -X PUT http://localhost:3001/api/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "live"}'

# hybrid 모드로 전환
curl -X PUT http://localhost:3001/api/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "hybrid"}'

# simulator 모드로 복귀
curl -X PUT http://localhost:3001/api/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "simulator"}'
```

### 모드별 동작

| 모드 | 시뮬레이터 | 라이브 데이터 | 용도 |
|------|-----------|-------------|------|
| `simulator` | O | X | 데모, 개발 |
| `live` | X | O | 운영 환경 |
| `hybrid` | O | O | 테스트, 비교 |

---

## REST API로 직접 연동

모든 수집 API는 `X-API-Key` 헤더가 필요합니다.

### 1단계: 에이전트 등록

```bash
curl -X POST http://localhost:3001/api/ingest/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "agentId": "my-agent-1",
    "name": "My AI Agent",
    "model": "Claude Sonnet",
    "description": "Production code generation agent"
  }'
```

### 2단계: 에이전트 상태 설정

```bash
curl -X POST http://localhost:3001/api/ingest/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "agentId": "my-agent-1",
    "status": "running",
    "currentTask": "Generating API endpoints"
  }'
```

상태 값: `idle`, `running`, `error`, `stopped`

### 3단계: 이벤트 배치 전송

```bash
curl -X POST http://localhost:3001/api/ingest/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "events": [
      {
        "type": "llm_call",
        "agentId": "my-agent-1",
        "timestamp": "2026-02-22T10:00:00Z",
        "model": "Claude Sonnet",
        "tokensInput": 1200,
        "tokensOutput": 800,
        "latencyMs": 450,
        "success": true
      },
      {
        "type": "tool_call",
        "agentId": "my-agent-1",
        "timestamp": "2026-02-22T10:00:01Z",
        "toolName": "GitHub API",
        "latencyMs": 120,
        "success": true
      }
    ]
  }'
```

### 4단계: 활동 전송

```bash
curl -X POST http://localhost:3001/api/ingest/activity \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "agentId": "my-agent-1",
    "activityType": "task_complete",
    "message": "Completed: API endpoint generation",
    "metadata": {"quality": 95}
  }'
```

활동 타입: `task_start`, `task_complete`, `task_fail`, `tool_call`, `llm_call`, `handoff`, `error`

### 5단계: 트레이스 전송

```bash
curl -X POST http://localhost:3001/api/ingest/trace \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "agentId": "my-agent-1",
    "traceId": "trace-001",
    "timestamp": "2026-02-22T10:00:00Z",
    "status": "completed",
    "steps": [
      {
        "id": "step-1",
        "type": "llm_call",
        "name": "Analyze requirements",
        "startTime": "2026-02-22T10:00:00Z",
        "endTime": "2026-02-22T10:00:01Z",
        "duration": 850,
        "status": "completed",
        "input": "Analyze the following spec...",
        "output": "Found 3 endpoints to generate",
        "tokensInput": 1000,
        "tokensOutput": 500,
        "cost": 0.0105,
        "model": "Claude Sonnet"
      },
      {
        "id": "step-2",
        "type": "tool_call",
        "name": "Write files",
        "startTime": "2026-02-22T10:00:01Z",
        "endTime": "2026-02-22T10:00:01Z",
        "duration": 50,
        "status": "completed",
        "input": "Create src/routes/users.ts",
        "output": "File created (85 lines)"
      }
    ],
    "totalTokens": 1500,
    "totalCost": 0.0105
  }'
```

스텝 타입: `llm_call`, `tool_call`, `retrieval`, `processing`

---

## Node.js SDK 사용

### 설치

```bash
cd sdk
npm install
```

### 기본 사용법

```typescript
import { MonitoringClient } from '@agent-monitor/sdk';

const client = new MonitoringClient({
  serverUrl: 'http://localhost:3001',
  apiKey: 'YOUR_API_KEY',
  transport: 'rest',      // 'rest' 또는 'websocket'
  batchSize: 10,           // 배치 크기 (기본: 10)
  flushIntervalMs: 1000,   // 배치 전송 간격 (기본: 1000ms)
  debug: false,
});

// 1. 연결
await client.connect();

// 2. 에이전트 등록
await client.registerAgent({
  agentId: 'my-agent',
  name: 'My Agent',
  model: 'Claude Sonnet',
  description: 'Code generation agent',
});

// 3. 상태 설정
await client.setStatus('running', 'Processing task');

// 4. LLM 호출 추적
client.trackLLMCall({
  model: 'Claude Sonnet',
  tokensInput: 1200,
  tokensOutput: 800,
  latencyMs: 450,
  success: true,
  // cost는 모델에 따라 자동 계산됨
});

// 5. 도구 호출 추적
client.trackToolCall({
  toolName: 'GitHub API',
  latencyMs: 120,
  success: true,
});

// 6. 활동 보고
await client.reportActivity('task_complete', 'Code generation done');

// 7. 종료
await client.flush();
await client.disconnect();
```

### wrapLLMCall - 자동 시간 측정

LLM 호출 함수를 래핑하면 레이턴시가 자동 측정됩니다:

```typescript
const result = await client.wrapLLMCall(async () => {
  // 실제 LLM API 호출
  const response = await callLLM(prompt);
  return {
    tokensInput: response.usage.input_tokens,
    tokensOutput: response.usage.output_tokens,
    model: 'Claude Sonnet',
  };
});
```

성공 시 자동으로 `trackLLMCall`이 호출되며, 예외 발생 시 `success: false`로 기록됩니다.

### 트레이스 생성

```typescript
const trace = client.startTrace({ name: 'Code review workflow' });

// 스텝 1: LLM 호출
const step1 = trace.addStep({
  type: 'llm_call',
  name: 'Analyze code',
  input: 'Review the following code...',
  model: 'Claude Sonnet',
});
// ... 작업 수행 ...
step1.end({
  output: 'Found 2 issues',
  tokensInput: 1000,
  tokensOutput: 500,
  cost: 0.0105,
});

// 스텝 2: 도구 호출
const step2 = trace.addStep({
  type: 'tool_call',
  name: 'Post review comment',
  input: '{"pr": 123, "comment": "..."}',
});
step2.end({ output: 'Comment posted' });

// 트레이스 완료 (자동으로 서버에 전송)
trace.end();

// 에러 시
// trace.end({ error: 'Something went wrong' });
```

### 커스텀 모델 비용 등록

내장되지 않은 모델의 비용을 등록할 수 있습니다:

```typescript
// 1K 토큰당 비용 (input, output)
client.registerModelCost('my-custom-model', 0.01, 0.03);
```

내장 모델: `Claude Opus`, `Claude Sonnet`, `Claude Haiku`, `GPT-4`, `GPT-4o`, `GPT-4o-mini`, `GPT-3.5-Turbo`

### 토큰 추정

텍스트에서 대략적인 토큰 수를 추정합니다 (~4자 = 1토큰):

```typescript
const tokens = MonitoringClient.estimateTokens('Hello, world!');
// => 4
```

### 로컬 메트릭 확인

서버에 보내지 않고 로컬에서 집계된 메트릭을 확인할 수 있습니다:

```typescript
const metrics = client.getLocalMetrics();
console.log(metrics.successRate);      // 98.5
console.log(metrics.latency.p50);      // 320
console.log(metrics.latency.p95);      // 780
console.log(metrics.totals.cost);      // 1.234
console.log(metrics.totals.requests);  // 150
```

---

## Python 연동 (raw HTTP)

SDK 없이 HTTP 요청으로 직접 연동하는 예제입니다.

```python
import json
import time
import urllib.request

SERVER = "http://localhost:3001"
API_KEY = "YOUR_API_KEY"

def post(path, data):
    req = urllib.request.Request(
        f"{SERVER}{path}",
        data=json.dumps(data).encode(),
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
        },
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# 에이전트 등록
post("/api/ingest/register", {
    "agentId": "py-agent",
    "name": "Python Agent",
    "model": "GPT-4o",
})

# 상태 설정
post("/api/ingest/status", {
    "agentId": "py-agent",
    "status": "running",
    "currentTask": "Data analysis",
})

# LLM 호출 이벤트 전송
post("/api/ingest/batch", {
    "events": [{
        "type": "llm_call",
        "agentId": "py-agent",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": "GPT-4o",
        "tokensInput": 1500,
        "tokensOutput": 800,
        "latencyMs": 620,
        "success": True,
    }],
})

# 활동 보고
post("/api/ingest/activity", {
    "agentId": "py-agent",
    "activityType": "task_complete",
    "message": "Analysis completed",
})
```

전체 예제: `sdk/examples/python-agent.py`

---

## WebSocket 연동

실시간 스트리밍이 필요한 경우 Socket.IO를 통해 연결할 수 있습니다.

### SDK로 WebSocket 사용

```typescript
const client = new MonitoringClient({
  serverUrl: 'http://localhost:3001',
  apiKey: 'YOUR_API_KEY',
  transport: 'websocket',  // WebSocket 모드
});

await client.connect();
// 이후 사용법은 REST와 동일
```

### 직접 Socket.IO 연결

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/ingest', {
  auth: { apiKey: 'YOUR_API_KEY' },
  transports: ['websocket'],
});

socket.on('connect', () => {
  // 에이전트 등록
  socket.emit('agent:register', {
    agentId: 'ws-agent',
    name: 'WebSocket Agent',
    model: 'Claude Sonnet',
  }, (response) => {
    console.log('Registered:', response);
  });

  // 이벤트 배치 전송
  socket.emit('events:batch', {
    events: [
      { type: 'llm_call', agentId: 'ws-agent', ... },
    ],
  }, (response) => {
    console.log('Sent:', response);
  });

  // 활동 보고
  socket.emit('activity:report', {
    agentId: 'ws-agent',
    activityType: 'task_start',
    message: 'Starting work',
  });

  // 상태 변경
  socket.emit('agent:status', {
    agentId: 'ws-agent',
    status: 'running',
    currentTask: 'Processing',
  });
});
```

---

## API 레퍼런스

### 수집 엔드포인트

모든 엔드포인트에 `X-API-Key` 헤더 필요.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/ingest/register` | 에이전트 등록 |
| `POST` | `/api/ingest/batch` | 이벤트 배치 수신 |
| `POST` | `/api/ingest/activity` | 활동 즉시 전송 |
| `POST` | `/api/ingest/status` | 에이전트 상태 변경 |
| `POST` | `/api/ingest/trace` | 트레이스 전송 |
| `POST` | `/api/ingest/keys` | API 키 생성 |
| `GET` | `/api/ingest/keys` | API 키 목록 |

### 모드 관리 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/mode` | 현재 모드, 라이브 에이전트 수, API 키 조회 |
| `PUT` | `/api/mode` | 모드 전환 (`{"mode": "live"}`) |

### WebSocket 이벤트 (`/ingest` 네임스페이스)

연결 시 `auth: { apiKey }` 필요.

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `agent:register` | client → server | 에이전트 등록 |
| `events:batch` | client → server | 이벤트 배치 전송 |
| `activity:report` | client → server | 활동 보고 |
| `agent:status` | client → server | 상태 변경 |

### 이벤트 타입

#### LLM Call Event

```json
{
  "type": "llm_call",
  "agentId": "string",
  "timestamp": "ISO 8601",
  "model": "string",
  "tokensInput": 0,
  "tokensOutput": 0,
  "latencyMs": 0,
  "success": true,
  "error": "optional string",
  "cost": 0.0
}
```

#### Tool Call Event

```json
{
  "type": "tool_call",
  "agentId": "string",
  "timestamp": "ISO 8601",
  "toolName": "string",
  "latencyMs": 0,
  "success": true,
  "error": "optional string"
}
```

#### Activity Event

```json
{
  "type": "activity",
  "agentId": "string",
  "timestamp": "ISO 8601",
  "activityType": "task_start | task_complete | task_fail | tool_call | llm_call | handoff | error",
  "message": "string",
  "metadata": {}
}
```

#### Trace Event

```json
{
  "type": "trace",
  "agentId": "string",
  "traceId": "string",
  "timestamp": "ISO 8601",
  "status": "running | completed | failed",
  "steps": [],
  "totalTokens": 0,
  "totalCost": 0.0
}
```

### 내장 모델 비용 (per 1K tokens)

| 모델 | Input | Output |
|------|-------|--------|
| Claude Opus | $0.015 | $0.075 |
| Claude Sonnet | $0.003 | $0.015 |
| Claude Haiku | $0.00025 | $0.00125 |
| GPT-4 | $0.030 | $0.060 |
| GPT-4o | $0.005 | $0.015 |
| GPT-4o-mini | $0.00015 | $0.0006 |
| GPT-3.5-Turbo | $0.0005 | $0.0015 |

등록되지 않은 모델은 `cost` 필드를 직접 전달하거나, SDK의 `registerModelCost()`로 등록하세요.

---

## 트러블슈팅

### "Invalid or missing API key" 오류

`X-API-Key` 헤더가 누락되었거나 잘못된 키입니다.

```bash
# 현재 유효한 키 확인
curl http://localhost:3001/api/mode
# apiKey 필드에 현재 키가 표시됩니다

# 또는 환경변수로 고정 키 사용
INGEST_API_KEY=my-key npm run dev
```

### 대시보드에 라이브 에이전트가 안 보임

1. 현재 모드가 `live` 또는 `hybrid`인지 확인:
   ```bash
   curl http://localhost:3001/api/mode
   ```
2. `simulator` 모드이면 전환:
   ```bash
   curl -X PUT http://localhost:3001/api/mode \
     -H "Content-Type: application/json" \
     -d '{"mode": "hybrid"}'
   ```

### 에이전트가 stopped로 표시됨

30초 이상 이벤트가 없으면 자동으로 `stopped` 상태가 됩니다. 주기적으로 이벤트를 전송하거나 상태를 업데이트하세요:

```bash
curl -X POST http://localhost:3001/api/ingest/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"agentId": "my-agent", "status": "running"}'
```

### SDK WebSocket 연결 실패

- 서버가 실행 중인지 확인
- CORS 설정 확인 (기본: `localhost:5173`, `localhost:5174`)
- `transport: 'rest'`로 변경하여 REST 방식으로 먼저 테스트
