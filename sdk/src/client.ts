import type {
  MonitoringConfig,
  AgentRegistration,
  TrackLLMCallParams,
  TrackToolCallParams,
  ReportActivityParams,
  StartTraceOptions,
  RawLLMCallEvent,
  RawToolCallEvent,
  RawActivityEvent,
  RawEvent,
} from './types.js';
import type { TransportAdapter } from './transport/base.js';
import { RestTransport } from './transport/rest.js';
import { WebSocketTransport } from './transport/websocket.js';
import { BatchQueue } from './utils/batch-queue.js';
import { CostCalculator } from './metrics/cost-calculator.js';
import { MetricsAggregator } from './metrics/aggregator.js';
import { TraceHandle } from './tracing/trace-manager.js';

export class MonitoringClient {
  private readonly config: Required<MonitoringConfig>;
  private transport: TransportAdapter;
  private batchQueue: BatchQueue<RawEvent>;
  private costCalculator: CostCalculator;
  private aggregator: MetricsAggregator;
  private agentId: string | null = null;
  private agentModel: string | null = null;

  constructor(config: MonitoringConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
      transport: config.transport || 'rest',
      batchSize: config.batchSize || 10,
      flushIntervalMs: config.flushIntervalMs || 1000,
      debug: config.debug || false,
    };

    // Create transport
    if (this.config.transport === 'websocket') {
      this.transport = new WebSocketTransport(this.config.serverUrl, this.config.apiKey, this.config.debug);
    } else {
      this.transport = new RestTransport(this.config.serverUrl, this.config.apiKey, this.config.debug);
    }

    // Create batch queue
    this.batchQueue = new BatchQueue<RawEvent>({
      maxSize: this.config.batchSize,
      intervalMs: this.config.flushIntervalMs,
      onFlush: async (events) => {
        await this.transport.sendBatch(events);
      },
    });

    this.costCalculator = new CostCalculator();
    this.aggregator = new MetricsAggregator();
  }

  async connect(): Promise<void> {
    await this.transport.connect();
    if (this.config.debug) console.log('[SDK] Connected');
  }

  async disconnect(): Promise<void> {
    await this.batchQueue.flush();
    await this.transport.disconnect();
    this.batchQueue.destroy();
    if (this.config.debug) console.log('[SDK] Disconnected');
  }

  async registerAgent(registration: AgentRegistration): Promise<void> {
    this.agentId = registration.agentId;
    this.agentModel = registration.model;
    await this.transport.registerAgent(registration);
    if (this.config.debug) console.log(`[SDK] Agent registered: ${registration.agentId}`);
  }

  trackLLMCall(params: TrackLLMCallParams): void {
    if (!this.agentId) throw new Error('Agent not registered. Call registerAgent() first.');

    const model = params.model || this.agentModel || 'unknown';
    const success = params.success !== false;
    const cost = params.cost ?? this.costCalculator.calculate(model, params.tokensInput, params.tokensOutput);

    const event: RawLLMCallEvent = {
      type: 'llm_call',
      agentId: this.agentId,
      timestamp: new Date().toISOString(),
      model,
      tokensInput: params.tokensInput,
      tokensOutput: params.tokensOutput,
      latencyMs: params.latencyMs,
      success,
      error: params.error,
      cost,
    };

    this.batchQueue.push(event);
    this.aggregator.recordRequest(params.latencyMs, success, params.tokensInput, params.tokensOutput, cost);
  }

  /**
   * Wraps an async function to automatically measure latency and track the LLM call.
   * The function should return { tokensInput, tokensOutput, model? }.
   */
  async wrapLLMCall<T extends { tokensInput: number; tokensOutput: number; model?: string }>(
    fn: () => Promise<T>,
    params?: { model?: string },
  ): Promise<T> {
    if (!this.agentId) throw new Error('Agent not registered. Call registerAgent() first.');

    const startMs = Date.now();
    let result: T;
    try {
      result = await fn();
      const latencyMs = Date.now() - startMs;
      this.trackLLMCall({
        model: params?.model || result.model,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        latencyMs,
        success: true,
      });
      return result;
    } catch (err) {
      const latencyMs = Date.now() - startMs;
      this.trackLLMCall({
        model: params?.model,
        tokensInput: 0,
        tokensOutput: 0,
        latencyMs,
        success: false,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  trackToolCall(params: TrackToolCallParams): void {
    if (!this.agentId) throw new Error('Agent not registered. Call registerAgent() first.');

    const event: RawToolCallEvent = {
      type: 'tool_call',
      agentId: this.agentId,
      timestamp: new Date().toISOString(),
      toolName: params.toolName,
      latencyMs: params.latencyMs,
      success: params.success !== false,
      error: params.error,
    };

    this.batchQueue.push(event);
  }

  async reportActivity(type: ReportActivityParams['type'], message: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.agentId) throw new Error('Agent not registered. Call registerAgent() first.');

    const event: RawActivityEvent = {
      type: 'activity',
      agentId: this.agentId,
      timestamp: new Date().toISOString(),
      activityType: type,
      message,
      metadata,
    };

    // Activities are sent immediately (not batched)
    await this.transport.sendActivity(event);
  }

  async setStatus(status: 'idle' | 'running' | 'error' | 'stopped', currentTask?: string): Promise<void> {
    if (!this.agentId) throw new Error('Agent not registered. Call registerAgent() first.');
    await this.transport.updateStatus(this.agentId, status, currentTask);
  }

  startTrace(options?: StartTraceOptions): TraceHandle {
    if (!this.agentId) throw new Error('Agent not registered. Call registerAgent() first.');

    const trace = new TraceHandle(this.agentId, (event) => {
      this.transport.sendTrace(event).catch((err) => {
        if (this.config.debug) console.error('[SDK] Failed to send trace:', err);
      });
    });

    return trace;
  }

  /** Register a custom model cost rate */
  registerModelCost(model: string, inputPer1K: number, outputPer1K: number): void {
    this.costCalculator.registerModel(model, { input: inputPer1K, output: outputPer1K });
  }

  /** Estimate token count from text (rough: ~4 chars per token) */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /** Get local aggregated metrics */
  getLocalMetrics() {
    return {
      successRate: this.aggregator.getSuccessRate(),
      latency: this.aggregator.getLatencyPercentiles(),
      totals: this.aggregator.getTotals(),
    };
  }

  get isConnected(): boolean {
    return this.transport.isConnected();
  }

  /** Flush pending events */
  async flush(): Promise<void> {
    await this.batchQueue.flush();
  }
}
