// SDK configuration
export interface MonitoringConfig {
  serverUrl: string;
  apiKey: string;
  transport?: 'rest' | 'websocket';
  batchSize?: number;       // default: 10
  flushIntervalMs?: number; // default: 1000
  debug?: boolean;
}

// Agent registration
export interface AgentRegistration {
  agentId: string;
  name: string;
  model: string;
  description?: string;
}

// Tracking parameters
export interface TrackLLMCallParams {
  model?: string;          // override agent default
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  success?: boolean;       // default: true
  error?: string;
  cost?: number;           // SDK calculates if not provided
}

export interface TrackToolCallParams {
  toolName: string;
  latencyMs: number;
  success?: boolean;       // default: true
  error?: string;
}

export interface ReportActivityParams {
  type: 'task_start' | 'task_complete' | 'task_fail' | 'tool_call' | 'llm_call' | 'handoff' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

// Tracing
export interface StartTraceOptions {
  name?: string;
}

export interface AddTraceStepParams {
  type: 'llm_call' | 'tool_call' | 'retrieval' | 'processing';
  name: string;
  input?: string;
  model?: string;
}

// Raw event types (sent to server)
export interface RawLLMCallEvent {
  type: 'llm_call';
  agentId: string;
  timestamp: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  cost?: number;
}

export interface RawToolCallEvent {
  type: 'tool_call';
  agentId: string;
  timestamp: string;
  toolName: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface RawActivityEvent {
  type: 'activity';
  agentId: string;
  timestamp: string;
  activityType: 'task_start' | 'task_complete' | 'task_fail' | 'tool_call' | 'llm_call' | 'handoff' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface RawTraceEvent {
  type: 'trace';
  agentId: string;
  traceId: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  steps: RawTraceStep[];
  totalTokens?: number;
  totalCost?: number;
}

export interface RawTraceStep {
  id: string;
  type: 'llm_call' | 'tool_call' | 'retrieval' | 'processing';
  name: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  status: 'running' | 'completed' | 'failed';
  input?: string;
  output?: string;
  tokensInput?: number;
  tokensOutput?: number;
  cost?: number;
  model?: string;
  error?: string | null;
}

export type RawEvent = RawLLMCallEvent | RawToolCallEvent | RawActivityEvent | RawTraceEvent;

// Model cost rates
export interface ModelCostRate {
  input: number;  // cost per 1K tokens
  output: number; // cost per 1K tokens
}
