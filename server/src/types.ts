export interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  model: string;
  description: string;
  currentTask: string | null;
  metrics: AgentMetrics;
}

export interface AgentMetrics {
  successRate: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  totalRequests: number;
  failedRequests: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  agents: Agent[];
  overall: OverallMetrics;
  latencyTrend: LatencyPoint[];
  tokenTrend: TokenPoint[];
  costTrend: CostPoint[];
  errorsByType: ErrorTypeCount[];
  taskQueue: TaskQueueItem[];
}

export interface OverallMetrics {
  activeAgents: number;
  successRate: number;
  avgLatency: number;
  totalCost: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  throughput: number;
  errorRate: number;
}

export interface LatencyPoint {
  time: string;
  p50: number;
  p95: number;
  p99: number;
}

export interface TokenPoint {
  time: string;
  input: number;
  output: number;
}

export interface CostPoint {
  time: string;
  cost: number;
}

export interface ErrorTypeCount {
  type: string;
  count: number;
  percentage: number;
}

export interface TaskQueueItem {
  status: 'queued' | 'running' | 'completed' | 'failed';
  count: number;
}

export interface Activity {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  type: 'task_start' | 'task_complete' | 'task_fail' | 'tool_call' | 'llm_call' | 'handoff' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface Trace {
  id: string;
  agentId: string;
  agentName: string;
  startTime: string;
  endTime: string | null;
  status: 'running' | 'completed' | 'failed';
  totalDuration: number | null;
  totalTokens: number;
  totalCost: number;
  steps: TraceStep[];
}

export interface TraceStep {
  id: string;
  type: 'llm_call' | 'tool_call' | 'retrieval' | 'processing';
  name: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  status: 'running' | 'completed' | 'failed';
  input: string;
  output: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  model: string | null;
  error: string | null;
}
