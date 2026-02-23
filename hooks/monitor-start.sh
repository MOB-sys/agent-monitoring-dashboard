#!/bin/bash
# ============================================
# Claude Code 세션 시작 시 에이전트 등록 스크립트
# ============================================
# Claude Code 시작 전에 한 번 실행하여 에이전트를 등록합니다.
#
# 사용법:
#   source hooks/monitor-env.sh   # 환경변수 로드
#   bash hooks/monitor-start.sh   # 에이전트 등록

MONITOR_SERVER="${AGENT_MONITOR_URL:-http://localhost:3001}"
API_KEY="${AGENT_MONITOR_API_KEY:-}"
AGENT_ID="${AGENT_MONITOR_AGENT_ID:-claude-code-$(whoami)}"
AGENT_NAME="${AGENT_MONITOR_AGENT_NAME:-Claude Code ($(whoami))}"

echo "🔌 Agent Monitoring Dashboard 연결 중..."
echo "   Server: ${MONITOR_SERVER}"
echo "   Agent:  ${AGENT_ID}"

# 서버 상태 확인
HEALTH=$(curl -s --connect-timeout 3 "${MONITOR_SERVER}/api/health" 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "❌ 모니터링 서버에 연결할 수 없습니다."
  echo "   서버를 먼저 실행하세요: cd server && npm run dev"
  exit 1
fi

echo "✅ 서버 연결 확인"

# API 키 확인
if [ -z "$API_KEY" ]; then
  # 서버에서 API 키 가져오기
  MODE_INFO=$(curl -s "${MONITOR_SERVER}/api/mode" 2>/dev/null)
  API_KEY=$(echo "$MODE_INFO" | jq -r '.apiKey // empty' 2>/dev/null)

  if [ -z "$API_KEY" ]; then
    echo "❌ API 키를 찾을 수 없습니다."
    echo "   AGENT_MONITOR_API_KEY 환경변수를 설정하세요."
    exit 1
  fi
  echo "🔑 API 키 자동 감지: ${API_KEY:0:20}..."
  export AGENT_MONITOR_API_KEY="$API_KEY"
fi

# 에이전트 등록
REGISTER_RESULT=$(curl -s -X POST "${MONITOR_SERVER}/api/ingest/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"agentId\": \"${AGENT_ID}\",
    \"name\": \"${AGENT_NAME}\",
    \"model\": \"Claude Opus 4.6\",
    \"description\": \"Claude Code CLI agent ($(hostname))\"
  }" 2>/dev/null)

if echo "$REGISTER_RESULT" | jq -e '.ok' > /dev/null 2>&1; then
  echo "✅ 에이전트 등록 완료"
else
  echo "⚠️  에이전트 등록 결과: $REGISTER_RESULT"
fi

# 상태를 running으로 변경
curl -s -X POST "${MONITOR_SERVER}/api/ingest/status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"agentId\": \"${AGENT_ID}\",
    \"status\": \"running\",
    \"currentTask\": \"Claude Code 세션 시작\"
  }" > /dev/null 2>&1

# 모드를 live 또는 hybrid로 전환
curl -s -X PUT "${MONITOR_SERVER}/api/mode" \
  -H "Content-Type: application/json" \
  -d '{"mode":"hybrid"}' > /dev/null 2>&1

echo "✅ 모니터링 활성화 (hybrid 모드)"
echo ""
echo "📊 대시보드: http://localhost:5173"
echo "🔧 환경변수가 설정되었습니다. 이제 Claude Code를 사용하세요."
echo ""

# 환경변수 출력 (사용자가 수동으로 export 할 수 있도록)
echo "# 다른 터미널에서 사용하려면:"
echo "export AGENT_MONITOR_URL=\"${MONITOR_SERVER}\""
echo "export AGENT_MONITOR_API_KEY=\"${API_KEY}\""
echo "export AGENT_MONITOR_AGENT_ID=\"${AGENT_ID}\""
