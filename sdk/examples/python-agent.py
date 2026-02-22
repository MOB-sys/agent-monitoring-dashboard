"""
Example: Python agent using raw HTTP to send metrics to the monitoring server.

Usage:
    python sdk/examples/python-agent.py

Make sure the monitoring server is running first:
    cd server && npm run dev

Set the API key from the server startup log:
    INGEST_API_KEY=amp_... python sdk/examples/python-agent.py
"""

import os
import time
import json
import random
import urllib.request
import urllib.error

SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3001")
API_KEY = os.environ.get("INGEST_API_KEY", "amp_dev_key")
AGENT_ID = "python-example-agent"

def api_request(path: str, data: dict) -> dict:
    """Send a POST request to the monitoring server."""
    url = f"{SERVER_URL}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}")
        raise


def main():
    # 1. Register the agent
    print("Registering agent...")
    result = api_request("/api/ingest/register", {
        "agentId": AGENT_ID,
        "name": "Python Example Agent",
        "model": "GPT-4o",
        "description": "A Python agent using raw HTTP calls",
    })
    print(f"  Registered: {result}")

    # 2. Set status to running
    api_request("/api/ingest/status", {
        "agentId": AGENT_ID,
        "status": "running",
        "currentTask": "Analyzing dataset",
    })
    print("Status set to running")

    # 3. Send some LLM call events as a batch
    print("\nSending LLM call events...")
    events = []
    for i in range(10):
        latency = random.randint(200, 1200)
        tokens_in = random.randint(500, 3000)
        tokens_out = random.randint(200, 2000)
        success = random.random() > 0.1  # 90% success

        events.append({
            "type": "llm_call",
            "agentId": AGENT_ID,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "model": "GPT-4o",
            "tokensInput": tokens_in,
            "tokensOutput": tokens_out,
            "latencyMs": latency,
            "success": success,
            "error": "Rate limit exceeded" if not success else None,
        })
        print(f"  LLM call #{i+1}: {tokens_in} in / {tokens_out} out, {latency}ms, {'ok' if success else 'FAIL'}")
        time.sleep(0.3)

    result = api_request("/api/ingest/batch", {"events": events})
    print(f"  Batch sent: {result}")

    # 4. Send an activity
    print("\nSending activity...")
    api_request("/api/ingest/activity", {
        "agentId": AGENT_ID,
        "activityType": "task_start",
        "message": "Starting data analysis pipeline",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "metadata": {"dataset": "sales_q4_2025", "rows": 50000},
    })
    print("  Activity sent")

    # 5. Send a tool call event
    print("\nSending tool call...")
    api_request("/api/ingest/batch", {
        "events": [{
            "type": "tool_call",
            "agentId": AGENT_ID,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "toolName": "PostgreSQL - execute query",
            "latencyMs": 85,
            "success": True,
        }],
    })
    print("  Tool call sent")

    # 6. Send a trace
    print("\nSending trace...")
    trace_id = f"py-trace-{int(time.time())}"
    api_request("/api/ingest/trace", {
        "agentId": AGENT_ID,
        "traceId": trace_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "status": "completed",
        "steps": [
            {
                "id": f"{trace_id}-step-1",
                "type": "llm_call",
                "name": "Analyze data schema",
                "startTime": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "duration": 650,
                "status": "completed",
                "input": "Analyze the following data schema...",
                "output": "Schema has 12 tables, 3 relationships",
                "tokensInput": 800,
                "tokensOutput": 300,
                "cost": 0.0085,
                "model": "GPT-4o",
            },
            {
                "id": f"{trace_id}-step-2",
                "type": "tool_call",
                "name": "Query database",
                "startTime": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "duration": 120,
                "status": "completed",
                "input": '{"query": "SELECT COUNT(*) FROM sales"}',
                "output": "50000 rows",
            },
            {
                "id": f"{trace_id}-step-3",
                "type": "llm_call",
                "name": "Generate insights",
                "startTime": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "duration": 1100,
                "status": "completed",
                "input": "Based on the data analysis...",
                "output": "Generated 5 key insights with visualizations",
                "tokensInput": 2200,
                "tokensOutput": 1800,
                "cost": 0.038,
                "model": "GPT-4o",
            },
        ],
        "totalTokens": 5100,
        "totalCost": 0.0465,
    })
    print(f"  Trace sent: {trace_id}")

    # 7. Complete and set idle
    api_request("/api/ingest/activity", {
        "agentId": AGENT_ID,
        "activityType": "task_complete",
        "message": "Data analysis pipeline completed successfully",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    })

    api_request("/api/ingest/status", {
        "agentId": AGENT_ID,
        "status": "idle",
    })
    print("\nAgent set to idle. Done!")
    print(f"\nCheck the dashboard at http://localhost:5173")
    print(f"Switch to 'live' or 'hybrid' mode: curl -X PUT {SERVER_URL}/api/mode -H 'Content-Type: application/json' -d '{{\"mode\":\"hybrid\"}}'")


if __name__ == "__main__":
    main()
