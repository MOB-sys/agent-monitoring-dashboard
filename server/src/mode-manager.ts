import type { MetricsSnapshot, Agent, Activity, Trace } from './types.js';
import type { AgentSimulator } from './simulator.js';
import { LiveDataManager } from './ingest/live-data-manager.js';

export type DataMode = 'simulator' | 'live' | 'hybrid';

export class ModeManager {
  private mode: DataMode;
  private simulator: AgentSimulator;
  private liveDataManager: LiveDataManager;

  constructor(simulator: AgentSimulator, liveDataManager: LiveDataManager, initialMode?: DataMode) {
    this.simulator = simulator;
    this.liveDataManager = liveDataManager;
    this.mode = initialMode || (process.env.DATA_MODE as DataMode) || 'simulator';

    // Validate mode
    if (!['simulator', 'live', 'hybrid'].includes(this.mode)) {
      this.mode = 'simulator';
    }
  }

  getMode(): DataMode {
    return this.mode;
  }

  setMode(mode: DataMode): void {
    if (['simulator', 'live', 'hybrid'].includes(mode)) {
      this.mode = mode;
      console.log(`[ModeManager] Mode changed to: ${mode}`);
    }
  }

  getLiveDataManager(): LiveDataManager {
    return this.liveDataManager;
  }

  tick(): void {
    if (this.mode === 'simulator' || this.mode === 'hybrid') {
      this.simulator.tick();
    }
    if (this.mode === 'live' || this.mode === 'hybrid') {
      this.liveDataManager.tick();
    }
  }

  getMetricsSnapshot(): MetricsSnapshot {
    if (this.mode === 'simulator') {
      return this.simulator.getMetricsSnapshot();
    }

    if (this.mode === 'live') {
      return this.liveDataManager.getMetricsSnapshot();
    }

    // hybrid: merge both snapshots
    return this.mergeSnapshots(
      this.simulator.getMetricsSnapshot(),
      this.liveDataManager.getMetricsSnapshot(),
    );
  }

  generateActivity(): Activity | null {
    if (this.mode === 'simulator' || this.mode === 'hybrid') {
      return this.simulator.generateActivity();
    }
    return null;
  }

  generateTrace(): Trace | null {
    if (this.mode === 'simulator' || this.mode === 'hybrid') {
      return this.simulator.generateTrace();
    }
    return null;
  }

  private mergeSnapshots(simSnapshot: MetricsSnapshot, liveSnapshot: MetricsSnapshot): MetricsSnapshot {
    // Merge agents (no ID conflicts expected since sim uses fixed IDs and live uses SDK-provided IDs)
    const allAgents: Agent[] = [...simSnapshot.agents, ...liveSnapshot.agents];

    const totalAgents = allAgents.length;
    const activeAgents = allAgents.filter((a) => a.status === 'running' || a.status === 'idle').length;

    const avgSuccessRate = totalAgents > 0
      ? parseFloat((allAgents.reduce((s, a) => s + a.metrics.successRate, 0) / totalAgents).toFixed(1))
      : 0;

    const avgLatency = totalAgents > 0
      ? Math.round(allAgents.reduce((s, a) => s + a.metrics.avgLatency, 0) / totalAgents)
      : 0;

    const totalCost = parseFloat(allAgents.reduce((s, a) => s + a.metrics.totalCost, 0).toFixed(4));
    const totalTokensInput = allAgents.reduce((s, a) => s + a.metrics.totalTokensInput, 0);
    const totalTokensOutput = allAgents.reduce((s, a) => s + a.metrics.totalTokensOutput, 0);
    const totalRequests = allAgents.reduce((s, a) => s + a.metrics.totalRequests, 0);
    const totalFailed = allAgents.reduce((s, a) => s + a.metrics.failedRequests, 0);

    // Merge trend data (align by time, sum values)
    const latencyTrend = this.mergeTrends(
      simSnapshot.latencyTrend,
      liveSnapshot.latencyTrend,
      (a, b) => ({
        time: a.time,
        p50: Math.round((a.p50 + b.p50) / 2),
        p95: Math.round((a.p95 + b.p95) / 2),
        p99: Math.round((a.p99 + b.p99) / 2),
      }),
    );

    const tokenTrend = this.mergeTrends(
      simSnapshot.tokenTrend,
      liveSnapshot.tokenTrend,
      (a, b) => ({
        time: a.time,
        input: a.input + b.input,
        output: a.output + b.output,
      }),
    );

    const costTrend = this.mergeTrends(
      simSnapshot.costTrend,
      liveSnapshot.costTrend,
      (a, b) => ({
        time: a.time,
        cost: parseFloat((a.cost + b.cost).toFixed(4)),
      }),
    );

    // Merge error types
    const errorMap = new Map<string, number>();
    for (const e of [...simSnapshot.errorsByType, ...liveSnapshot.errorsByType]) {
      errorMap.set(e.type, (errorMap.get(e.type) || 0) + e.count);
    }
    const totalErrors = Array.from(errorMap.values()).reduce((s, c) => s + c, 0);
    const errorsByType = Array.from(errorMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalErrors > 0 ? parseFloat(((count / totalErrors) * 100).toFixed(1)) : 0,
    }));

    // Merge task queues
    const taskQueueMap = new Map<string, number>();
    for (const t of [...simSnapshot.taskQueue, ...liveSnapshot.taskQueue]) {
      taskQueueMap.set(t.status, (taskQueueMap.get(t.status) || 0) + t.count);
    }
    const taskQueue = Array.from(taskQueueMap.entries()).map(([status, count]) => ({
      status: status as 'queued' | 'running' | 'completed' | 'failed',
      count,
    }));

    return {
      timestamp: new Date().toISOString(),
      agents: allAgents.map((a) => ({ ...a, metrics: { ...a.metrics } })),
      overall: {
        activeAgents,
        successRate: avgSuccessRate,
        avgLatency,
        totalCost,
        totalTokensInput,
        totalTokensOutput,
        throughput: parseFloat((simSnapshot.overall.throughput + liveSnapshot.overall.throughput).toFixed(1)),
        errorRate: parseFloat(((totalFailed / Math.max(totalRequests, 1)) * 100).toFixed(2)),
      },
      latencyTrend,
      tokenTrend,
      costTrend,
      errorsByType,
      taskQueue,
    };
  }

  private mergeTrends<T extends { time: string }>(
    a: T[],
    b: T[],
    mergeFn: (a: T, b: T) => T,
  ): T[] {
    if (a.length === 0) return [...b];
    if (b.length === 0) return [...a];

    // Build a map from time -> item for list b
    const bMap = new Map<string, T>();
    for (const item of b) {
      bMap.set(item.time, item);
    }

    // Use a as the base timeline, merge matching entries
    return a.map((item) => {
      const match = bMap.get(item.time);
      if (match) return mergeFn(item, match);
      return { ...item };
    });
  }
}
