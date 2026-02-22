/**
 * Example: Node.js agent using @agent-monitor/sdk
 *
 * Usage:
 *   npx tsx sdk/examples/node-agent.ts
 *
 * Make sure the monitoring server is running first:
 *   cd server && npm run dev
 *
 * Set the API key from the server startup log:
 *   INGEST_API_KEY=amp_... npx tsx sdk/examples/node-agent.ts
 */

import { MonitoringClient } from '../src/index.js';

const API_KEY = process.env.INGEST_API_KEY || 'amp_dev_key';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function main() {
  // 1. Create and connect the client
  const client = new MonitoringClient({
    serverUrl: SERVER_URL,
    apiKey: API_KEY,
    transport: 'rest',
    batchSize: 5,
    flushIntervalMs: 2000,
    debug: true,
  });

  await client.connect();
  console.log('Connected to monitoring server');

  // 2. Register the agent
  await client.registerAgent({
    agentId: 'example-node-agent',
    name: 'Example Node Agent',
    model: 'Claude Sonnet',
    description: 'An example agent demonstrating SDK usage',
  });
  console.log('Agent registered');

  // 3. Set status to running
  await client.setStatus('running', 'Processing user requests');

  // 4. Simulate some LLM calls
  for (let i = 0; i < 10; i++) {
    const latency = 200 + Math.random() * 800;
    const tokensInput = 500 + Math.floor(Math.random() * 2000);
    const tokensOutput = 200 + Math.floor(Math.random() * 1500);

    client.trackLLMCall({
      model: 'Claude Sonnet',
      tokensInput,
      tokensOutput,
      latencyMs: Math.round(latency),
      success: Math.random() > 0.05, // 95% success rate
    });

    console.log(`LLM call #${i + 1}: ${tokensInput} in / ${tokensOutput} out, ${Math.round(latency)}ms`);
    await sleep(500);
  }

  // 5. Report some activities
  await client.reportActivity('task_start', 'Generating API documentation');
  await sleep(1000);

  // 6. Track a tool call
  client.trackToolCall({
    toolName: 'GitHub API - fetch repository info',
    latencyMs: 120,
    success: true,
  });

  // 7. Create a trace
  const trace = client.startTrace({ name: 'Generate docs workflow' });

  const step1 = trace.addStep({
    type: 'llm_call',
    name: 'Analyze codebase',
    input: 'System: Analyze the following code...',
    model: 'Claude Sonnet',
  });
  await sleep(800);
  step1.end({
    output: 'Found 5 modules with 23 exported functions',
    tokensInput: 1200,
    tokensOutput: 450,
    cost: 0.0105,
  });

  const step2 = trace.addStep({
    type: 'tool_call',
    name: 'Read source files',
    input: '{ "action": "readFiles", "path": "src/" }',
  });
  await sleep(200);
  step2.end({ output: 'Read 12 files, 3400 lines total' });

  const step3 = trace.addStep({
    type: 'llm_call',
    name: 'Generate documentation',
    input: 'Generate API docs for the following modules...',
    model: 'Claude Sonnet',
  });
  await sleep(1200);
  step3.end({
    output: 'Generated documentation with 5 sections',
    tokensInput: 2800,
    tokensOutput: 3200,
    cost: 0.0564,
  });

  trace.end();
  console.log('Trace completed');

  // 8. Report completion
  await client.reportActivity('task_complete', 'API documentation generated successfully');
  await client.setStatus('idle');

  // 9. Flush and disconnect
  await client.flush();
  await sleep(1000);

  // Print local metrics
  const metrics = client.getLocalMetrics();
  console.log('\nLocal metrics summary:');
  console.log(`  Success rate: ${metrics.successRate}%`);
  console.log(`  Latency P50: ${metrics.latency.p50}ms, P95: ${metrics.latency.p95}ms, P99: ${metrics.latency.p99}ms`);
  console.log(`  Total requests: ${metrics.totals.requests}`);
  console.log(`  Total cost: $${metrics.totals.cost}`);

  await client.disconnect();
  console.log('Disconnected');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
