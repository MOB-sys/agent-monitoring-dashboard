// Main client
export { MonitoringClient } from './client.js';

// Types
export type {
  MonitoringConfig,
  AgentRegistration,
  TrackLLMCallParams,
  TrackToolCallParams,
  ReportActivityParams,
  StartTraceOptions,
  AddTraceStepParams,
  ModelCostRate,
  RawLLMCallEvent,
  RawToolCallEvent,
  RawActivityEvent,
  RawTraceEvent,
  RawTraceStep,
  RawEvent,
} from './types.js';

// Tracing
export { TraceHandle, StepHandle } from './tracing/trace-manager.js';

// Transport
export type { TransportAdapter } from './transport/base.js';
export { RestTransport } from './transport/rest.js';
export { WebSocketTransport } from './transport/websocket.js';

// Utilities
export { CostCalculator } from './metrics/cost-calculator.js';
export { MetricsAggregator } from './metrics/aggregator.js';
export { BatchQueue } from './utils/batch-queue.js';
export { generateId, generateTraceId, generateStepId } from './utils/id-generator.js';
