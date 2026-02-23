#!/bin/bash
# ============================================
# Claude Code → Agent Monitoring Dashboard Hook
# ============================================
# PostToolUse 이벤트를 받아서 모니터링 서버로 전송합니다.
# 프로젝트(CWD)별로 자동으로 에이전트를 구분합니다.

# === .env 로드 ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source "$SCRIPT_DIR/.env"
fi

# === 설정 ===
MONITOR_SERVER="${AGENT_MONITOR_URL:-http://localhost:3001}"
API_KEY="${AGENT_MONITOR_API_KEY:-}"
LOG_FILE="${AGENT_MONITOR_LOG:-/tmp/agent-monitor-hook.log}"

# API 키가 없으면 종료
if [ -z "$API_KEY" ]; then
  exit 0
fi

# stdin에서 hook 데이터 읽기
HOOK_DATA=$(cat)
if [ -z "$HOOK_DATA" ]; then
  exit 0
fi

# JSON 파싱
TOOL_NAME=$(echo "$HOOK_DATA" | jq -r '.tool_name' 2>/dev/null)
DURATION_MS=$(echo "$HOOK_DATA" | jq -r '.duration_ms // 0' 2>/dev/null)
SESSION_ID=$(echo "$HOOK_DATA" | jq -r '.session_id' 2>/dev/null)
TRANSCRIPT=$(echo "$HOOK_DATA" | jq -r '.transcript_path // ""' 2>/dev/null)
CWD=$(echo "$HOOK_DATA" | jq -r '.cwd // ""' 2>/dev/null)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# === 프로젝트별 에이전트 ID 자동 결정 ===
# CWD에서 /workspace/ 하위 첫 번째 폴더명 추출 (가장 정확)
PROJECT_NAME=""
if [ -n "$CWD" ] && [ "$CWD" != "null" ] && echo "$CWD" | grep -q "/workspace/"; then
  PROJECT_NAME=$(echo "$CWD" | sed 's|.*/workspace/||' | cut -d'/' -f1)
fi

# fallback: CWD basename
if [ -z "$PROJECT_NAME" ]; then
  PROJECT_NAME=$(basename "${CWD:-$(pwd)}")
fi

AGENT_ID="claude-code-${PROJECT_NAME}"

# === 자동 등록 (API 키 포함 — 서버 재시작 시 자동 재등록) ===
REGISTER_FLAG="/tmp/.agent-monitor-${AGENT_ID}-${API_KEY:0:16}"
if [ ! -f "$REGISTER_FLAG" ]; then
  # 이전 플래그 정리
  rm -f /tmp/.agent-monitor-${AGENT_ID}-* 2>/dev/null

  curl -s -X POST "${MONITOR_SERVER}/api/ingest/register" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d "{
      \"agentId\": \"${AGENT_ID}\",
      \"name\": \"Claude Code (${PROJECT_NAME})\",
      \"model\": \"Claude Opus 4.6\",
      \"description\": \"${CWD}\"
    }" --connect-timeout 2 --max-time 3 > /dev/null 2>&1

  touch "$REGISTER_FLAG"
fi

# 성공 여부
SUCCESS="true"
ERROR=""
if [ "$STATUS" = "error" ] || [ "$STATUS" = "failed" ]; then
  SUCCESS="false"
  ERROR=$(echo "$HOOK_DATA" | jq -r '.error // .tool.error // "Unknown error"' 2>/dev/null)
fi

# === 이벤트 전송 (백그라운드) ===
{
  # tool_call 이벤트
  curl -s -X POST "${MONITOR_SERVER}/api/ingest/batch" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d "{
      \"events\": [{
        \"type\": \"tool_call\",
        \"agentId\": \"${AGENT_ID}\",
        \"timestamp\": \"${TIMESTAMP}\",
        \"toolName\": \"${TOOL_NAME}\",
        \"latencyMs\": ${DURATION_MS:-0},
        \"success\": ${SUCCESS}
      }]
    }" --connect-timeout 2 --max-time 3 > /dev/null 2>&1

  # activity 이벤트
  ACTIVITY_MSG="Tool: ${TOOL_NAME}"
  [ "$SUCCESS" = "false" ] && ACTIVITY_MSG="[FAILED] Tool: ${TOOL_NAME}"

  curl -s -X POST "${MONITOR_SERVER}/api/ingest/activity" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d "{
      \"agentId\": \"${AGENT_ID}\",
      \"activityType\": \"tool_call\",
      \"message\": \"${ACTIVITY_MSG}\",
      \"metadata\": {
        \"toolName\": \"${TOOL_NAME}\",
        \"sessionId\": \"${SESSION_ID}\",
        \"project\": \"${PROJECT_NAME}\"
      }
    }" --connect-timeout 2 --max-time 3 > /dev/null 2>&1
} &

# 로깅
echo "[${TIMESTAMP}] [${PROJECT_NAME}] ${TOOL_NAME} (${DURATION_MS}ms) success=${SUCCESS}" >> "$LOG_FILE" 2>/dev/null

exit 0
