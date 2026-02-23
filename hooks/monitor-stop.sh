#!/bin/bash
# ============================================
# Claude Code 세션 종료 시 상태 업데이트
# ============================================

# === .env 로드 ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source "$SCRIPT_DIR/.env"
fi

MONITOR_SERVER="${AGENT_MONITOR_URL:-http://localhost:3001}"
API_KEY="${AGENT_MONITOR_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  exit 0
fi

# stdin에서 hook 데이터 읽기
HOOK_DATA=$(cat)

CWD=$(echo "$HOOK_DATA" | jq -r '.cwd // ""' 2>/dev/null)

PROJECT_NAME=""
if [ -n "$CWD" ] && [ "$CWD" != "null" ] && echo "$CWD" | grep -q "/workspace/"; then
  PROJECT_NAME=$(echo "$CWD" | sed 's|.*/workspace/||' | cut -d'/' -f1)
fi
if [ -z "$PROJECT_NAME" ]; then
  PROJECT_NAME=$(basename "${CWD:-$(pwd)}")
fi
AGENT_ID="claude-code-${PROJECT_NAME}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 상태를 idle로 변경
curl -s -X POST "${MONITOR_SERVER}/api/ingest/status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"agentId\": \"${AGENT_ID}\",
    \"status\": \"idle\",
    \"currentTask\": null
  }" --connect-timeout 2 --max-time 3 > /dev/null 2>&1

# 세션 종료 activity
curl -s -X POST "${MONITOR_SERVER}/api/ingest/activity" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"agentId\": \"${AGENT_ID}\",
    \"activityType\": \"task_complete\",
    \"message\": \"Claude Code 세션 종료 (${PROJECT_NAME})\",
    \"metadata\": {\"project\": \"${PROJECT_NAME}\"}
  }" --connect-timeout 2 --max-time 3 > /dev/null 2>&1

# 등록 플래그 정리
rm -f /tmp/.agent-monitor-${AGENT_ID}-* 2>/dev/null

echo "[${TIMESTAMP}] [${PROJECT_NAME}] Session stopped" >> "${AGENT_MONITOR_LOG:-/tmp/agent-monitor-hook.log}" 2>/dev/null

exit 0
