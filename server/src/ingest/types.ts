// Raw event types sent from SDK to server

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
  cost?: number; // SDK-calculated cost, or server will estimate
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

export interface AgentRegistration {
  agentId: string;
  name: string;
  model: string;
  description?: string;
}

export interface IngestBatchRequest {
  events: RawEvent[];
}

export interface AgentStatusUpdate {
  agentId: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  currentTask?: string | null;
}
