import { Router } from 'express';
import type { MetricsSnapshot } from '../types.js';

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'Claude Opus': { input: 0.015, output: 0.075 },
  'Claude Sonnet': { input: 0.003, output: 0.015 },
  'Claude Haiku': { input: 0.00025, output: 0.00125 },
};

export interface MetricsSnapshotProvider {
  getMetricsSnapshot(): MetricsSnapshot;
}

export function createCostRouter(provider: MetricsSnapshotProvider): Router {
  const router = Router();

  router.get('/summary', (_req, res) => {
    const snapshot = provider.getMetricsSnapshot();
    const agents = snapshot.agents;
    const totalCost = agents.reduce((sum, a) => sum + a.metrics.totalCost, 0);
    const totalRequests = agents.reduce((sum, a) => sum + a.metrics.totalRequests, 0);
    const totalTokens = agents.reduce((sum, a) => sum + a.metrics.totalTokensInput + a.metrics.totalTokensOutput, 0);

    res.json({
      totalCost,
      totalRequests,
      totalTokens,
      costPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      costPerToken: totalTokens > 0 ? totalCost / totalTokens * 1000 : 0, // per 1K tokens
      projectedDaily: totalCost * (86400 / Math.max(process.uptime(), 1)),
      projectedMonthly: totalCost * (86400 * 30 / Math.max(process.uptime(), 1)),
    });
  });

  router.get('/by-model', (_req, res) => {
    const snapshot = provider.getMetricsSnapshot();
    const modelMap = new Map<string, { cost: number; requests: number; tokensInput: number; tokensOutput: number }>();

    for (const agent of snapshot.agents) {
      const model = agent.model;
      const existing = modelMap.get(model) || { cost: 0, requests: 0, tokensInput: 0, tokensOutput: 0 };
      existing.cost += agent.metrics.totalCost;
      existing.requests += agent.metrics.totalRequests;
      existing.tokensInput += agent.metrics.totalTokensInput;
      existing.tokensOutput += agent.metrics.totalTokensOutput;
      modelMap.set(model, existing);
    }

    const totalCost = snapshot.agents.reduce((sum, a) => sum + a.metrics.totalCost, 0);
    const result = Array.from(modelMap.entries()).map(([model, data]) => ({
      model,
      ...data,
      percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
      rates: MODEL_RATES[model] || { input: 0, output: 0 },
    }));

    res.json(result);
  });

  router.get('/by-agent', (_req, res) => {
    const snapshot = provider.getMetricsSnapshot();
    const totalCost = snapshot.agents.reduce((sum, a) => sum + a.metrics.totalCost, 0);

    const result = snapshot.agents.map(agent => ({
      agentId: agent.id,
      agentName: agent.name,
      model: agent.model,
      cost: agent.metrics.totalCost,
      requests: agent.metrics.totalRequests,
      successRate: agent.metrics.successRate,
      tokensInput: agent.metrics.totalTokensInput,
      tokensOutput: agent.metrics.totalTokensOutput,
      costPerRequest: agent.metrics.totalRequests > 0 ? agent.metrics.totalCost / agent.metrics.totalRequests : 0,
      tokenEfficiency: agent.metrics.totalTokensInput > 0 ? agent.metrics.totalTokensOutput / agent.metrics.totalTokensInput : 0,
      percentage: totalCost > 0 ? (agent.metrics.totalCost / totalCost) * 100 : 0,
    }));

    res.json(result);
  });

  router.get('/forecast', (_req, res) => {
    const snapshot = provider.getMetricsSnapshot();
    const costTrend = snapshot.costTrend;
    const uptimeSeconds = Math.max(process.uptime(), 1);
    const totalCost = snapshot.agents.reduce((sum, a) => sum + a.metrics.totalCost, 0);
    const costPerSecond = totalCost / uptimeSeconds;

    // Simple linear forecast for next 7 days
    const forecast = [];
    for (let day = 1; day <= 7; day++) {
      forecast.push({
        day: `Day ${day}`,
        projected: totalCost + costPerSecond * 86400 * day,
        optimistic: (totalCost + costPerSecond * 86400 * day) * 0.85,
        pessimistic: (totalCost + costPerSecond * 86400 * day) * 1.25,
      });
    }

    res.json({ currentTrend: costTrend, forecast });
  });

  return router;
}
