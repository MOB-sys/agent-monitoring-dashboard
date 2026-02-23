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
} from '../types.js';
import type {
  AgentRegistration,
  RawLLMCallEvent,
  RawToolCallEvent,
  RawActivityEvent,
  RawTraceEvent,
  AgentStatusUpdate,
} from './types.js';

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'Claude Opus': { input: 0.015, output: 0.075 },
  'Claude Sonnet': { input: 0.003, output: 0.015 },
  'Claude Haiku': { input: 0.00025, output: 0.00125 },
  'GPT-4': { input: 0.03, output: 0.06 },
  'GPT-4o': { input: 0.005, output: 0.015 },
  'GPT-3.5-Turbo': { input: 0.0005, output: 0.0015 },
};

const ERROR_TYPES = [
  'Hallucination',
  'Timeout',
  'Tool Error',
  'Context Overflow',
  'Rate Limit',
  'Authentication',
] as const;

interface LiveAgentState {
  agent: Agent;
  latencyWindow: number[];       // sliding window for percentile calculation
  recentActivities: Activity[];
  recentTraces: Trace[];
  lastSeen: number;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function classifyError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('hallucin')) return 'Hallucination';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'Timeout';
  if (lower.includes('tool') || lower.includes('function')) return 'Tool Error';
  if (lower.includes('context') || lower.includes('token limit') || lower.includes('overflow')) return 'Context Overflow';
  if (lower.includes('rate limit') || lower.includes('throttl')) return 'Rate Limit';
  if (lower.includes('auth') || lower.includes('permission') || lower.includes('forbidden')) return 'Authentication';
  return 'Tool Error'; // default
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

let activityCounter = 0;

export class LiveDataManager {
  private agents: Map<string, LiveAgentState> = new Map();
  private latencyHistory: LatencyPoint[] = [];
  private tokenHistory: TokenPoint[] = [];
  private costHistory: CostPoint[] = [];
  private errorCounts: Map<string, number> = new Map();
  private taskCounts = { queued: 0, running: 0, completed: 0, failed: 0 };
  private tickCount = 0;

  // Accumulators for per-tick trends
  private tickTokensInput = 0;
  private tickTokensOutput = 0;
  private tickCost = 0;

  constructor() {
    for (const errType of ERROR_TYPES) {
      this.errorCounts.set(errType, 0);
    }
  }

  registerAgent(config: AgentRegistration): Agent {
    const existing = this.agents.get(config.agentId);
    if (existing) {
      // Update existing
      existing.agent.name = config.name;
      existing.agent.model = config.model;
      if (config.description) existing.agent.description = config.description;
      existing.lastSeen = Date.now();
      return { ...existing.agent, metrics: { ...existing.agent.metrics } };
    }

    const agent: Agent = {
      id: config.agentId,
      name: config.name,
      status: 'idle',
      model: config.model,
      description: config.description || '',
      currentTask: null,
      metrics: {
        successRate: 100,
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        totalRequests: 0,
        failedRequests: 0,
        totalTokensInput: 0,
        totalTokensOutput: 0,
        totalCost: 0,
      },
    };

    this.agents.set(config.agentId, {
      agent,
      latencyWindow: [],
      recentActivities: [],
      recentTraces: [],
      lastSeen: Date.now(),
    });

    this.taskCounts.queued++;

    return { ...agent, metrics: { ...agent.metrics } };
  }

  processLLMCall(agentId: string, event: RawLLMCallEvent): void {
    const state = this.agents.get(agentId);
    if (!state) return;

    const { agent, latencyWindow } = state;
    state.lastSeen = Date.now();

    // Update requests
    agent.metrics.totalRequests++;
    if (!event.success) {
      agent.metrics.failedRequests++;
      if (event.error) {
        const errorType = classifyError(event.error);
        this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
      }
    }

    // Update tokens
    agent.metrics.totalTokensInput += event.tokensInput;
    agent.metrics.totalTokensOutput += event.tokensOutput;
    this.tickTokensInput += event.tokensInput;
    this.tickTokensOutput += event.tokensOutput;

    // Update cost
    const cost = event.cost ?? this.estimateCost(event.model, event.tokensInput, event.tokensOutput);
    agent.metrics.totalCost = parseFloat((agent.metrics.totalCost + cost).toFixed(4));
    this.tickCost += cost;

    // Update latency sliding window (keep last 1000)
    latencyWindow.push(event.latencyMs);
    if (latencyWindow.length > 1000) latencyWindow.shift();

    // Recalculate percentiles
    const sorted = [...latencyWindow].sort((a, b) => a - b);
    agent.metrics.avgLatency = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
    agent.metrics.p50Latency = Math.round(calculatePercentile(sorted, 50));
    agent.metrics.p95Latency = Math.round(calculatePercentile(sorted, 95));
    agent.metrics.p99Latency = Math.round(calculatePercentile(sorted, 99));

    // Update success rate
    agent.metrics.successRate = parseFloat(
      (((agent.metrics.totalRequests - agent.metrics.failedRequests) / agent.metrics.totalRequests) * 100).toFixed(1)
    );
  }

  processToolCall(agentId: string, event: RawToolCallEvent): void {
    const state = this.agents.get(agentId);
    if (!state) return;

    const { agent, latencyWindow } = state;
    state.lastSeen = Date.now();

    // Auto-set status to running on activity
    if (agent.status === 'idle' || agent.status === 'stopped') {
      agent.status = 'running';
      agent.currentTask = `Tool: ${event.toolName}`;
    }

    // Update requests
    agent.metrics.totalRequests++;
    if (!event.success) {
      agent.metrics.failedRequests++;
      if (event.error) {
        const errorType = classifyError(event.error);
        this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
      }
    }

    // Update latency sliding window
    if (event.latencyMs > 0) {
      latencyWindow.push(event.latencyMs);
      if (latencyWindow.length > 1000) latencyWindow.shift();

      const sorted = [...latencyWindow].sort((a, b) => a - b);
      agent.metrics.avgLatency = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
      agent.metrics.p50Latency = Math.round(calculatePercentile(sorted, 50));
      agent.metrics.p95Latency = Math.round(calculatePercentile(sorted, 95));
      agent.metrics.p99Latency = Math.round(calculatePercentile(sorted, 99));
    }

    // Update success rate
    agent.metrics.successRate = parseFloat(
      (((agent.metrics.totalRequests - agent.metrics.failedRequests) / agent.metrics.totalRequests) * 100).toFixed(1)
    );
  }

  processActivity(agentId: string, event: RawActivityEvent): Activity | null {
    const state = this.agents.get(agentId);
    if (!state) return null;

    state.lastSeen = Date.now();
    activityCounter++;

    const activity: Activity = {
      id: `live-act-${activityCounter}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: event.timestamp,
      agentId,
      agentName: state.agent.name,
      type: event.activityType,
      message: event.message,
      metadata: event.metadata,
    };

    state.recentActivities.push(activity);
    if (state.recentActivities.length > 100) state.recentActivities.shift();

    // Update task counts based on activity type
    if (event.activityType === 'task_start') {
      this.taskCounts.running++;
      if (this.taskCounts.queued > 0) this.taskCounts.queued--;
    } else if (event.activityType === 'task_complete') {
      this.taskCounts.completed++;
      if (this.taskCounts.running > 0) this.taskCounts.running--;
    } else if (event.activityType === 'task_fail') {
      this.taskCounts.failed++;
      if (this.taskCounts.running > 0) this.taskCounts.running--;
    }

    return activity;
  }

  processTrace(agentId: string, event: RawTraceEvent): Trace | null {
    const state = this.agents.get(agentId);
    if (!state) return null;

    state.lastSeen = Date.now();

    const trace: Trace = {
      id: event.traceId,
      agentId,
      agentName: state.agent.name,
      startTime: event.steps.length > 0 ? event.steps[0].startTime : event.timestamp,
      endTime: event.status !== 'running'
        ? (event.steps.length > 0 ? event.steps[event.steps.length - 1].endTime : event.timestamp)
        : null,
      status: event.status,
      totalDuration: event.status !== 'running'
        ? event.steps.reduce((sum, s) => sum + (s.duration || 0), 0)
        : null,
      totalTokens: event.totalTokens ?? event.steps.reduce((sum, s) => sum + (s.tokensInput || 0) + (s.tokensOutput || 0), 0),
      totalCost: event.totalCost ?? event.steps.reduce((sum, s) => sum + (s.cost || 0), 0),
      steps: event.steps.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        status: s.status,
        input: s.input || '',
        output: s.output || '',
        tokensInput: s.tokensInput || 0,
        tokensOutput: s.tokensOutput || 0,
        cost: s.cost || 0,
        model: s.model || null,
        error: s.error || null,
      })),
    };

    state.recentTraces.push(trace);
    if (state.recentTraces.length > 50) state.recentTraces.shift();

    return trace;
  }

  updateAgentStatus(agentId: string, update: AgentStatusUpdate): void {
    const state = this.agents.get(agentId);
    if (!state) return;

    state.lastSeen = Date.now();
    state.agent.status = update.status;
    state.agent.currentTask = update.currentTask ?? null;
  }

  tick(): void {
    this.tickCount++;
    const now = new Date();
    const timeStr = formatTime(now);

    // Mark agents as stopped if not seen for 5 minutes
    const cutoff = Date.now() - 300000;
    for (const state of this.agents.values()) {
      if (state.lastSeen < cutoff && state.agent.status !== 'stopped') {
        state.agent.status = 'stopped';
        state.agent.currentTask = null;
      }
    }

    // Aggregate latency across all agents for trend
    const allAgents = Array.from(this.agents.values()).map((s) => s.agent);
    if (allAgents.length > 0) {
      const avgP50 = Math.round(allAgents.reduce((s, a) => s + a.metrics.p50Latency, 0) / allAgents.length);
      const avgP95 = Math.round(allAgents.reduce((s, a) => s + a.metrics.p95Latency, 0) / allAgents.length);
      const avgP99 = Math.round(allAgents.reduce((s, a) => s + a.metrics.p99Latency, 0) / allAgents.length);
      this.latencyHistory.push({ time: timeStr, p50: avgP50, p95: avgP95, p99: avgP99 });
    } else {
      this.latencyHistory.push({ time: timeStr, p50: 0, p95: 0, p99: 0 });
    }
    if (this.latencyHistory.length > 60) this.latencyHistory.shift();

    // Token trend
    this.tokenHistory.push({ time: timeStr, input: this.tickTokensInput, output: this.tickTokensOutput });
    if (this.tokenHistory.length > 60) this.tokenHistory.shift();

    // Cost trend
    this.costHistory.push({ time: timeStr, cost: parseFloat(this.tickCost.toFixed(4)) });
    if (this.costHistory.length > 60) this.costHistory.shift();

    // Reset per-tick accumulators
    this.tickTokensInput = 0;
    this.tickTokensOutput = 0;
    this.tickCost = 0;
  }

  getMetricsSnapshot(): MetricsSnapshot {
    const allAgents = Array.from(this.agents.values()).map((s) => s.agent);

    const activeAgents = allAgents.filter((a) => a.status === 'running' || a.status === 'idle').length;

    const avgSuccessRate = allAgents.length > 0
      ? parseFloat((allAgents.reduce((s, a) => s + a.metrics.successRate, 0) / allAgents.length).toFixed(1))
      : 100;

    const avgLatency = allAgents.length > 0
      ? Math.round(allAgents.reduce((s, a) => s + a.metrics.avgLatency, 0) / allAgents.length)
      : 0;

    const totalCost = parseFloat(allAgents.reduce((s, a) => s + a.metrics.totalCost, 0).toFixed(4));
    const totalTokensInput = allAgents.reduce((s, a) => s + a.metrics.totalTokensInput, 0);
    const totalTokensOutput = allAgents.reduce((s, a) => s + a.metrics.totalTokensOutput, 0);
    const totalRequests = allAgents.reduce((s, a) => s + a.metrics.totalRequests, 0);
    const totalFailed = allAgents.reduce((s, a) => s + a.metrics.failedRequests, 0);

    const overall: OverallMetrics = {
      activeAgents,
      successRate: avgSuccessRate,
      avgLatency,
      totalCost,
      totalTokensInput,
      totalTokensOutput,
      throughput: parseFloat((totalRequests / Math.max(this.tickCount, 1)).toFixed(1)),
      errorRate: parseFloat(((totalFailed / Math.max(totalRequests, 1)) * 100).toFixed(2)),
    };

    // Error distribution
    const totalErrors = Array.from(this.errorCounts.values()).reduce((s, c) => s + c, 0);
    const errorsByType: ErrorTypeCount[] = ERROR_TYPES.map((type) => {
      const count = this.errorCounts.get(type) || 0;
      return {
        type,
        count,
        percentage: totalErrors > 0 ? parseFloat(((count / totalErrors) * 100).toFixed(1)) : 0,
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
      agents: allAgents.map((a) => ({ ...a, metrics: { ...a.metrics } })),
      overall,
      latencyTrend: [...this.latencyHistory],
      tokenTrend: [...this.tokenHistory],
      costTrend: [...this.costHistory],
      errorsByType,
      taskQueue,
    };
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  private estimateCost(model: string, tokensInput: number, tokensOutput: number): number {
    const rates = MODEL_COSTS[model];
    if (!rates) return 0;
    return parseFloat(((tokensInput / 1000) * rates.input + (tokensOutput / 1000) * rates.output).toFixed(6));
  }
}
