import type {
  Agent,
  AgentMetrics,
  MetricsSnapshot,
  OverallMetrics,
  LatencyPoint,
  TokenPoint,
  CostPoint,
  ErrorTypeCount,
  TaskQueueItem,
  Activity,
  Trace,
  TraceStep,
} from './types.js';

interface AgentConfig {
  id: string;
  name: string;
  model: string;
  description: string;
  baseLatency: number;
  baseTokensInput: number;
  baseTokensOutput: number;
}

interface ModelCostRate {
  input: number;
  output: number;
}

const MODEL_COSTS: Record<string, ModelCostRate> = {
  'Claude Opus': { input: 0.015, output: 0.075 },
  'Claude Sonnet': { input: 0.003, output: 0.015 },
  'Claude Haiku': { input: 0.00025, output: 0.00125 },
};

const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'code-generator',
    name: 'Code Generator',
    model: 'Claude Opus',
    description: 'Generates code from specifications',
    baseLatency: 600,
    baseTokensInput: 1500,
    baseTokensOutput: 1200,
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    model: 'Claude Sonnet',
    description: 'Reviews code for quality and bugs',
    baseLatency: 450,
    baseTokensInput: 1200,
    baseTokensOutput: 800,
  },
  {
    id: 'test-runner',
    name: 'Test Runner',
    model: 'Claude Haiku',
    description: 'Runs and analyzes test suites',
    baseLatency: 200,
    baseTokensInput: 800,
    baseTokensOutput: 400,
  },
  {
    id: 'documentation',
    name: 'Documentation',
    model: 'Claude Sonnet',
    description: 'Generates technical documentation',
    baseLatency: 500,
    baseTokensInput: 1000,
    baseTokensOutput: 1500,
  },
  {
    id: 'devops-agent',
    name: 'DevOps Agent',
    model: 'Claude Opus',
    description: 'Manages deployment pipelines',
    baseLatency: 700,
    baseTokensInput: 1800,
    baseTokensOutput: 600,
  },
];

const CURRENT_TASKS = [
  'Generating API endpoint',
  'Reviewing pull request #42',
  'Running unit tests',
  'Writing API docs',
  'Deploying to staging',
  'Refactoring auth module',
  'Analyzing test coverage',
  'Generating TypeScript interfaces',
  'Reviewing security patches',
  'Running integration tests',
  'Writing migration guide',
  'Deploying to production',
  'Generating database schema',
  'Reviewing dependency updates',
  'Running performance benchmarks',
  'Writing changelog entries',
  'Configuring CI/CD pipeline',
  'Generating REST API handlers',
  'Reviewing error handling',
  'Running E2E test suite',
];

const ERROR_TYPES = [
  'Hallucination',
  'Timeout',
  'Tool Error',
  'Context Overflow',
  'Rate Limit',
  'Authentication',
] as const;

const ERROR_WEIGHTS: Record<string, number> = {
  Hallucination: 10,
  Timeout: 30,
  'Tool Error': 25,
  'Context Overflow': 15,
  'Rate Limit': 12,
  Authentication: 8,
};

const ACTIVITY_TYPES: { type: Activity['type']; weight: number }[] = [
  { type: 'task_complete', weight: 30 },
  { type: 'llm_call', weight: 25 },
  { type: 'tool_call', weight: 20 },
  { type: 'task_start', weight: 15 },
  { type: 'error', weight: 5 },
  { type: 'task_fail', weight: 3 },
  { type: 'handoff', weight: 2 },
];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

let activityCounter = 0;
let traceCounter = 0;
let stepCounter = 0;

function generateId(prefix: string, counter: number): string {
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${counter}-${suffix}`;
}

export class AgentSimulator {
  private tickCount: number = 0;
  private agents: Agent[] = [];
  private latencyHistory: LatencyPoint[] = [];
  private tokenHistory: TokenPoint[] = [];
  private costHistory: CostPoint[] = [];
  private errorCounts: Map<string, number> = new Map();
  private taskCounts = { queued: 10, running: 4, completed: 0, failed: 0 };

  constructor() {
    // Initialize agents
    this.agents = AGENT_CONFIGS.map((config) => ({
      id: config.id,
      name: config.name,
      status: 'running' as const,
      model: config.model,
      description: config.description,
      currentTask: pickRandom(CURRENT_TASKS),
      metrics: {
        successRate: 96,
        avgLatency: config.baseLatency,
        p50Latency: config.baseLatency * 0.8,
        p95Latency: config.baseLatency * 1.8,
        p99Latency: config.baseLatency * 2.5,
        totalRequests: randomInt(100, 500),
        failedRequests: randomInt(2, 15),
        totalTokensInput: randomInt(50000, 200000),
        totalTokensOutput: randomInt(30000, 150000),
        totalCost: randomBetween(5, 50),
      },
    }));

    // Initialize error counts
    for (const errorType of ERROR_TYPES) {
      this.errorCounts.set(errorType, randomInt(2, 20));
    }

    // Pre-fill some history
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      const time = formatTime(new Date(now - i * 1000));
      const baseP50 = randomBetween(150, 400);
      this.latencyHistory.push({
        time,
        p50: Math.round(baseP50),
        p95: Math.round(baseP50 * 2.2),
        p99: Math.round(baseP50 * 3.1),
      });
      this.tokenHistory.push({
        time,
        input: randomInt(3000, 8000),
        output: randomInt(2000, 6000),
      });
      this.costHistory.push({
        time,
        cost: parseFloat(randomBetween(0.05, 0.25).toFixed(4)),
      });
    }
  }

  tick(): void {
    this.tickCount++;
    const now = new Date();
    const timeStr = formatTime(now);

    let tickTotalTokensInput = 0;
    let tickTotalTokensOutput = 0;
    let tickTotalCost = 0;

    // Update each agent
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      const config = AGENT_CONFIGS[i];
      const costs = MODEL_COSTS[config.model];

      // Randomly update status
      const statusRoll = Math.random();
      if (statusRoll < 0.70) {
        agent.status = 'running';
        agent.currentTask = pickRandom(CURRENT_TASKS);
      } else if (statusRoll < 0.85) {
        agent.status = 'idle';
        agent.currentTask = null;
      } else if (statusRoll < 0.95) {
        agent.status = 'error';
        agent.currentTask = null;
      } else {
        agent.status = 'stopped';
        agent.currentTask = null;
      }

      // Update metrics with sine waves + noise
      const sineVal = Math.sin(this.tickCount * 0.1 + i * 1.2);
      const noise = () => (Math.random() - 0.5) * 2;

      // Success rate: base 92-99% + sine variation + noise
      const baseSuccess = 92 + (i * 1.5);
      agent.metrics.successRate = clamp(
        parseFloat((baseSuccess + sineVal * 3 + noise()).toFixed(1)),
        85,
        99.9
      );

      // Latency based on model + variations
      const latencyVariation = sineVal * 80 + noise() * 30;
      agent.metrics.avgLatency = Math.round(
        clamp(config.baseLatency + latencyVariation, 100, 2000)
      );
      agent.metrics.p50Latency = Math.round(agent.metrics.avgLatency * 0.8);
      agent.metrics.p95Latency = Math.round(agent.metrics.avgLatency * 1.8);
      agent.metrics.p99Latency = Math.round(agent.metrics.avgLatency * 2.5);

      // Increment requests
      const newRequests = randomInt(1, 5);
      agent.metrics.totalRequests += newRequests;

      // Failed requests based on error rate
      const failRate = (100 - agent.metrics.successRate) / 100;
      const newFailed = Math.random() < failRate * newRequests ? 1 : 0;
      agent.metrics.failedRequests += newFailed;

      // Token generation per request (varies by agent and model)
      const inputTokensPerReq = randomInt(
        Math.round(config.baseTokensInput * 0.5),
        Math.round(config.baseTokensInput * 1.5)
      );
      const outputTokensPerReq = randomInt(
        Math.round(config.baseTokensOutput * 0.3),
        Math.round(config.baseTokensOutput * 1.3)
      );
      const tickInput = inputTokensPerReq * newRequests;
      const tickOutput = outputTokensPerReq * newRequests;

      agent.metrics.totalTokensInput += tickInput;
      agent.metrics.totalTokensOutput += tickOutput;

      // Cost from tokens
      const inputCost = (tickInput / 1000) * costs.input;
      const outputCost = (tickOutput / 1000) * costs.output;
      agent.metrics.totalCost = parseFloat(
        (agent.metrics.totalCost + inputCost + outputCost).toFixed(4)
      );

      tickTotalTokensInput += tickInput;
      tickTotalTokensOutput += tickOutput;
      tickTotalCost += inputCost + outputCost;
    }

    // Update latency history
    const avgP50 = Math.round(
      this.agents.reduce((sum, a) => sum + a.metrics.p50Latency, 0) / this.agents.length
    );
    const avgP95 = Math.round(
      this.agents.reduce((sum, a) => sum + a.metrics.p95Latency, 0) / this.agents.length
    );
    const avgP99 = Math.round(
      this.agents.reduce((sum, a) => sum + a.metrics.p99Latency, 0) / this.agents.length
    );
    this.latencyHistory.push({ time: timeStr, p50: avgP50, p95: avgP95, p99: avgP99 });
    if (this.latencyHistory.length > 60) this.latencyHistory.shift();

    // Update token history
    this.tokenHistory.push({ time: timeStr, input: tickTotalTokensInput, output: tickTotalTokensOutput });
    if (this.tokenHistory.length > 60) this.tokenHistory.shift();

    // Update cost history
    this.costHistory.push({ time: timeStr, cost: parseFloat(tickTotalCost.toFixed(4)) });
    if (this.costHistory.length > 60) this.costHistory.shift();

    // Randomly increment error counts
    if (Math.random() < 0.3) {
      const errorWeightItems = ERROR_TYPES.map((type) => ({
        type,
        weight: ERROR_WEIGHTS[type],
      }));
      const totalWeight = errorWeightItems.reduce((s, e) => s + e.weight, 0);
      let roll = Math.random() * totalWeight;
      for (const item of errorWeightItems) {
        roll -= item.weight;
        if (roll <= 0) {
          this.errorCounts.set(item.type, (this.errorCounts.get(item.type) || 0) + 1);
          break;
        }
      }
    }

    // Update task queue counts
    this.taskCounts.queued = clamp(
      this.taskCounts.queued + randomInt(-2, 3),
      5,
      15
    );
    this.taskCounts.running = clamp(
      this.taskCounts.running + randomInt(-1, 2),
      2,
      8
    );
    this.taskCounts.completed += randomInt(1, 3);
    if (Math.random() < 0.15) {
      this.taskCounts.failed += 1;
    }
  }

  getMetricsSnapshot(): MetricsSnapshot {
    const activeAgents = this.agents.filter(
      (a) => a.status === 'running' || a.status === 'idle'
    ).length;

    const avgSuccessRate = parseFloat(
      (
        this.agents.reduce((sum, a) => sum + a.metrics.successRate, 0) /
        this.agents.length
      ).toFixed(1)
    );

    const avgLatency = Math.round(
      this.agents.reduce((sum, a) => sum + a.metrics.avgLatency, 0) /
        this.agents.length
    );

    const totalCost = parseFloat(
      this.agents.reduce((sum, a) => sum + a.metrics.totalCost, 0).toFixed(4)
    );

    const totalTokensInput = this.agents.reduce(
      (sum, a) => sum + a.metrics.totalTokensInput,
      0
    );
    const totalTokensOutput = this.agents.reduce(
      (sum, a) => sum + a.metrics.totalTokensOutput,
      0
    );

    const totalRequests = this.agents.reduce(
      (sum, a) => sum + a.metrics.totalRequests,
      0
    );
    const totalFailed = this.agents.reduce(
      (sum, a) => sum + a.metrics.failedRequests,
      0
    );

    const overall: OverallMetrics = {
      activeAgents,
      successRate: avgSuccessRate,
      avgLatency,
      totalCost,
      totalTokensInput,
      totalTokensOutput,
      throughput: parseFloat(
        (totalRequests / Math.max(this.tickCount, 1)).toFixed(1)
      ),
      errorRate: parseFloat(
        ((totalFailed / Math.max(totalRequests, 1)) * 100).toFixed(2)
      ),
    };

    // Error distribution
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, c) => sum + c,
      0
    );
    const errorsByType: ErrorTypeCount[] = ERROR_TYPES.map((type) => {
      const count = this.errorCounts.get(type) || 0;
      return {
        type,
        count,
        percentage: totalErrors > 0
          ? parseFloat(((count / totalErrors) * 100).toFixed(1))
          : 0,
      };
    });

    // Task queue
    const taskQueue: TaskQueueItem[] = [
      { status: 'queued', count: this.taskCounts.queued },
      { status: 'running', count: this.taskCounts.running },
      { status: 'completed', count: this.taskCounts.completed },
      { status: 'failed', count: this.taskCounts.failed },
    ];

    return {
      timestamp: new Date().toISOString(),
      agents: this.agents.map((a) => ({ ...a, metrics: { ...a.metrics } })),
      overall,
      latencyTrend: [...this.latencyHistory],
      tokenTrend: [...this.tokenHistory],
      costTrend: [...this.costHistory],
      errorsByType,
      taskQueue,
    };
  }

  generateActivity(): Activity {
    const agent = pickRandom(this.agents);
    const { type } = weightedRandom(ACTIVITY_TYPES);
    activityCounter++;

    let message: string;
    const metadata: Record<string, any> = {};

    switch (type) {
      case 'task_start': {
        const task = pickRandom(CURRENT_TASKS);
        message = `Started: ${task}`;
        metadata.task = task;
        break;
      }
      case 'task_complete': {
        const tasks = [
          'Code review for auth module',
          'Unit test generation for payment service',
          'API endpoint implementation',
          'Database migration script',
          'Documentation update for SDK',
          'Refactoring of logging module',
          'Security audit for user endpoints',
        ];
        const task = pickRandom(tasks);
        const quality = randomInt(85, 99);
        message = `Completed: ${task} (quality: ${quality}%)`;
        metadata.task = task;
        metadata.quality = quality;
        break;
      }
      case 'tool_call': {
        const tools = [
          'GitHub API - fetch pull request #' + randomInt(100, 999),
          'PostgreSQL - execute query (SELECT)',
          'Redis - cache lookup (session_token)',
          'Docker - container status check',
          'npm - dependency audit',
          'ESLint - code analysis',
          'Jest - test execution',
          'AWS S3 - file upload',
        ];
        const tool = pickRandom(tools);
        message = `Called: ${tool}`;
        metadata.tool = tool;
        break;
      }
      case 'llm_call': {
        const tokens = randomInt(500, 3000);
        message = `LLM Call: ${agent.model} - ${tokens.toLocaleString()} tokens`;
        metadata.tokens = tokens;
        metadata.model = agent.model;
        break;
      }
      case 'error': {
        const errors = [
          'Context window exceeded (128K limit)',
          'Rate limit reached - retry in 30s',
          'Tool execution timeout after 60s',
          'Invalid JSON response from model',
          'Authentication token expired',
          'Memory allocation failed',
        ];
        const error = pickRandom(errors);
        message = `Error: ${error}`;
        metadata.error = error;
        break;
      }
      case 'task_fail': {
        const failures = [
          'Deployment to prod - timeout after 30s',
          'Test suite execution - 3 assertions failed',
          'Code generation - syntax errors detected',
          'API integration - endpoint unreachable',
          'Build pipeline - compilation error',
        ];
        const failure = pickRandom(failures);
        message = `Failed: ${failure}`;
        metadata.failure = failure;
        break;
      }
      case 'handoff': {
        const targets = AGENT_CONFIGS.filter((c) => c.id !== agent.id);
        const target = pickRandom(targets);
        const reasons = [
          'for quality check',
          'for test execution',
          'for documentation',
          'for deployment review',
          'for security audit',
        ];
        const reason = pickRandom(reasons);
        message = `Handoff: \u2192 ${target.name} ${reason}`;
        metadata.targetAgent = target.id;
        metadata.reason = reason;
        break;
      }
      default:
        message = 'Unknown activity';
    }

    return {
      id: generateId('act', activityCounter),
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      type,
      message,
      metadata,
    };
  }

  generateTrace(): Trace {
    const agent = pickRandom(this.agents);
    const config = AGENT_CONFIGS.find((c) => c.id === agent.id)!;
    const costs = MODEL_COSTS[config.model];
    traceCounter++;

    const numSteps = randomInt(3, 7);
    const stepTypes: TraceStep['type'][] = ['llm_call', 'tool_call', 'processing', 'retrieval'];
    const stepTypesCycle: TraceStep['type'][] = [];
    for (let i = 0; i < numSteps; i++) {
      // Cycle: llm_call -> tool_call -> processing -> llm_call -> ...
      if (i % 3 === 0) stepTypesCycle.push('llm_call');
      else if (i % 3 === 1) stepTypesCycle.push('tool_call');
      else stepTypesCycle.push('processing');
    }

    // Determine trace status
    const statusRoll = Math.random();
    let traceStatus: Trace['status'];
    if (statusRoll < 0.85) traceStatus = 'completed';
    else if (statusRoll < 0.95) traceStatus = 'running';
    else traceStatus = 'failed';

    const traceStartTime = new Date(Date.now() - randomInt(5000, 30000));
    let currentTime = traceStartTime.getTime();
    let totalTokens = 0;
    let totalCost = 0;

    const steps: TraceStep[] = [];

    const stepNames: Record<TraceStep['type'], string[]> = {
      llm_call: [
        'Generate code response',
        'Analyze requirements',
        'Summarize findings',
        'Plan execution steps',
        'Evaluate solution quality',
      ],
      tool_call: [
        'Execute GitHub API request',
        'Run database query',
        'Fetch file contents',
        'Execute shell command',
        'Call external service',
      ],
      processing: [
        'Parse response JSON',
        'Validate output schema',
        'Transform data format',
        'Merge results',
        'Filter relevant content',
      ],
      retrieval: [
        'Search vector store',
        'Retrieve document context',
        'Fetch cached results',
        'Load knowledge base',
        'Query embeddings index',
      ],
    };

    const stepInputs: Record<TraceStep['type'], string[]> = {
      llm_call: [
        'System prompt + user query (4,200 chars)',
        'Context with code snippet (8,100 chars)',
        'Conversation history (12,400 chars)',
        'Task description + constraints (3,800 chars)',
      ],
      tool_call: [
        '{ "action": "search", "query": "authentication module" }',
        '{ "command": "git diff HEAD~1", "cwd": "/app" }',
        '{ "method": "GET", "url": "/api/users" }',
        '{ "query": "SELECT * FROM tasks WHERE status = \'pending\'" }',
      ],
      processing: [
        'Raw LLM response (2,400 chars)',
        'API response payload (1,200 chars)',
        'Merged dataset (5,600 entries)',
        'Validation schema + input data',
      ],
      retrieval: [
        'Query: "How to implement OAuth2 flow"',
        'Embedding vector [0.023, -0.441, ...]',
        'Cache key: session_user_preferences',
        'Index: knowledge_base_v2',
      ],
    };

    const stepOutputs: Record<TraceStep['type'], string[]> = {
      llm_call: [
        'Generated function with 45 lines of TypeScript',
        'Analysis report with 3 issues found',
        'Summary: 5 key findings identified',
        'Execution plan with 4 steps',
      ],
      tool_call: [
        '200 OK - 15 results returned',
        'Command executed successfully (exit code 0)',
        'Response: { "users": [...], "total": 142 }',
        '3 rows affected',
      ],
      processing: [
        'Parsed object with 12 fields',
        'Validation passed - all fields valid',
        'Transformed to target format (3 records)',
        'Filtered: 24 of 156 items matched',
      ],
      retrieval: [
        '5 relevant documents (similarity > 0.85)',
        'Retrieved 3 context chunks (4,200 tokens)',
        'Cache hit - returning stored result',
        '12 matching entries found',
      ],
    };

    for (let i = 0; i < numSteps; i++) {
      stepCounter++;
      const stepType = stepTypesCycle[i];

      // Duration by type
      let duration: number;
      switch (stepType) {
        case 'llm_call':
          duration = randomInt(200, 2000);
          break;
        case 'tool_call':
          duration = randomInt(50, 500);
          break;
        case 'processing':
          duration = randomInt(10, 100);
          break;
        case 'retrieval':
          duration = randomInt(100, 1000);
          break;
        default:
          duration = randomInt(50, 500);
      }

      const stepStartTime = new Date(currentTime);
      currentTime += duration;
      const stepEndTime = new Date(currentTime);

      // Tokens and cost
      let tokensInput = 0;
      let tokensOutput = 0;
      let stepCost = 0;
      let model: string | null = null;

      if (stepType === 'llm_call') {
        tokensInput = randomInt(500, 2000);
        tokensOutput = randomInt(200, 1500);
        model = config.model;
        stepCost = parseFloat(
          ((tokensInput / 1000) * costs.input + (tokensOutput / 1000) * costs.output).toFixed(6)
        );
      }

      totalTokens += tokensInput + tokensOutput;
      totalCost += stepCost;

      const isLastStep = i === numSteps - 1;
      let stepStatus: TraceStep['status'] = 'completed';
      let error: string | null = null;

      if (isLastStep && traceStatus === 'failed') {
        stepStatus = 'failed';
        const errors = [
          'Context window exceeded maximum token limit',
          'Tool execution timed out after 60000ms',
          'Invalid response format from model',
          'Rate limit exceeded - too many requests',
          'Memory allocation error during processing',
        ];
        error = pickRandom(errors);
      } else if (isLastStep && traceStatus === 'running') {
        stepStatus = 'running';
      }

      steps.push({
        id: generateId('step', stepCounter),
        type: stepType,
        name: pickRandom(stepNames[stepType]),
        startTime: stepStartTime.toISOString(),
        endTime: stepStatus === 'running' ? null : stepEndTime.toISOString(),
        duration: stepStatus === 'running' ? null : duration,
        status: stepStatus,
        input: pickRandom(stepInputs[stepType]),
        output: stepStatus === 'failed' ? `Error: ${error}` : pickRandom(stepOutputs[stepType]),
        tokensInput,
        tokensOutput,
        cost: stepCost,
        model,
        error,
      });
    }

    const traceEndTime = traceStatus === 'completed'
      ? new Date(currentTime).toISOString()
      : null;

    const totalDuration = traceStatus === 'completed'
      ? currentTime - traceStartTime.getTime()
      : null;

    return {
      id: generateId('trace', traceCounter),
      agentId: agent.id,
      agentName: agent.name,
      startTime: traceStartTime.toISOString(),
      endTime: traceEndTime,
      status: traceStatus,
      totalDuration,
      totalTokens,
      totalCost: parseFloat(totalCost.toFixed(6)),
      steps,
    };
  }
}

export default AgentSimulator;
