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

// Alert Types
export interface AlertRule {
  id: string;
  name: string;
  metric: 'successRate' | 'avgLatency' | 'errorRate' | 'totalCost' | 'tokenUsage' | 'throughput';
  condition: 'above' | 'below';
  threshold: number;
  duration: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  channels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  status: 'firing' | 'resolved';
  startedAt: string;
  resolvedAt: string | null;
  message: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'slack' | 'pagerduty' | 'webhook';
  config: Record<string, string>;
  enabled: boolean;
}

// === Auth Types ===
export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}

// === Anomaly Types ===
export interface AnomalyEvent {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  expectedMin: number;
  expectedMax: number;
  mean: number;
  stdDev: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface AnomalyConfig {
  enabled: boolean;
  zScoreThreshold: number;
  windowSize: number;
  metrics: string[];
}

// === Audit Types ===
export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent: string;
}

// === Cost Types ===
export interface CostSummary {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  costPerRequest: number;
  costPerToken: number;
  projectedDaily: number;
  projectedMonthly: number;
}

export interface CostByModel {
  model: string;
  cost: number;
  requests: number;
  tokensInput: number;
  tokensOutput: number;
  percentage: number;
}

export interface CostByAgent {
  agentId: string;
  agentName: string;
  model: string;
  cost: number;
  requests: number;
  successRate: number;
  tokensInput: number;
  tokensOutput: number;
  costPerRequest: number;
  tokenEfficiency: number;
  percentage: number;
}

// === Orchestration Types ===
export interface AgentNode {
  id: string;
  name: string;
  model: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  currentTask: string | null;
}

export interface AgentEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  active: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'failed';
  steps: string[];
  currentStep: number;
  startedAt: string;
  progress: number;
}

export interface HandoffEvent {
  id: string;
  fromAgent: string;
  toAgent: string;
  timestamp: string;
  reason: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface OrchestrationState {
  nodes: AgentNode[];
  edges: AgentEdge[];
  pipelines: Pipeline[];
  handoffs: HandoffEvent[];
}
