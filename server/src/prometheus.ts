import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

// Agent metrics
export const agentRequestsTotal = new Counter({
  name: 'agent_requests_total',
  help: 'Total requests processed by agents',
  labelNames: ['agent_id', 'agent_name', 'status'] as const,
  registers: [register],
});

export const agentLatencyHistogram = new Histogram({
  name: 'agent_latency_seconds',
  help: 'Agent response latency in seconds',
  labelNames: ['agent_id', 'agent_name'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const agentTokensTotal = new Counter({
  name: 'agent_tokens_total',
  help: 'Total tokens consumed by agents',
  labelNames: ['agent_id', 'agent_name', 'direction'] as const,
  registers: [register],
});

export const agentCostTotal = new Counter({
  name: 'agent_cost_dollars_total',
  help: 'Total cost in dollars by agent',
  labelNames: ['agent_id', 'agent_name'] as const,
  registers: [register],
});

export const agentStatus = new Gauge({
  name: 'agent_status',
  help: 'Agent status (1=running, 0=idle, -1=error, -2=stopped)',
  labelNames: ['agent_id', 'agent_name'] as const,
  registers: [register],
});

// Overall metrics
export const overallSuccessRate = new Gauge({
  name: 'monitoring_success_rate',
  help: 'Overall agent success rate percentage',
  registers: [register],
});

export const overallActiveAgents = new Gauge({
  name: 'monitoring_active_agents',
  help: 'Number of currently active agents',
  registers: [register],
});

export const overallErrorRate = new Gauge({
  name: 'monitoring_error_rate',
  help: 'Overall error rate percentage',
  registers: [register],
});

export const overallThroughput = new Gauge({
  name: 'monitoring_throughput_per_minute',
  help: 'Requests processed per minute',
  registers: [register],
});

// Alert metrics
export const alertsFiring = new Gauge({
  name: 'monitoring_alerts_firing',
  help: 'Number of currently firing alerts',
  registers: [register],
});

export const alertsTotal = new Counter({
  name: 'monitoring_alerts_total',
  help: 'Total alerts triggered',
  labelNames: ['severity'] as const,
  registers: [register],
});

// Function to update Prometheus metrics from simulator snapshot
export function updatePrometheusMetrics(snapshot: any) {
  // Update overall
  overallSuccessRate.set(snapshot.overall.successRate);
  overallActiveAgents.set(snapshot.overall.activeAgents);
  overallErrorRate.set(snapshot.overall.errorRate);
  overallThroughput.set(snapshot.overall.throughput);

  // Update per-agent metrics
  for (const agent of snapshot.agents) {
    const labels = { agent_id: agent.id, agent_name: agent.name };

    const statusMap: Record<string, number> = { running: 1, idle: 0, error: -1, stopped: -2 };
    agentStatus.set(labels, statusMap[agent.status] ?? 0);
  }
}
