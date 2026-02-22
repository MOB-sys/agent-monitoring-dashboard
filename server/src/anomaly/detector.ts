import type { AnomalyEvent, AnomalyConfig } from './types.js';
import type { MetricsSnapshot } from '../types.js';

export class AnomalyDetector {
  private history: Map<string, number[]> = new Map();
  private events: AnomalyEvent[] = [];
  private eventCounter = 0;
  private config: AnomalyConfig = {
    enabled: true,
    zScoreThreshold: 2.5,
    windowSize: 60,
    metrics: ['successRate', 'avgLatency', 'errorRate', 'throughput'],
  };
  private onAnomaly: ((event: AnomalyEvent) => void) | null = null;

  setCallback(cb: (event: AnomalyEvent) => void) { this.onAnomaly = cb; }
  getConfig(): AnomalyConfig { return { ...this.config }; }
  updateConfig(updates: Partial<AnomalyConfig>) { this.config = { ...this.config, ...updates }; }
  getHistory(): AnomalyEvent[] { return this.events; }

  evaluate(snapshot: MetricsSnapshot) {
    if (!this.config.enabled) return;

    const metricsMap: Record<string, number> = {
      successRate: snapshot.overall.successRate,
      avgLatency: snapshot.overall.avgLatency,
      errorRate: snapshot.overall.errorRate,
      throughput: snapshot.overall.throughput,
      totalCost: snapshot.overall.totalCost,
      tokenUsage: snapshot.overall.totalTokensInput + snapshot.overall.totalTokensOutput,
    };

    for (const metric of this.config.metrics) {
      const value = metricsMap[metric];
      if (value === undefined) continue;

      if (!this.history.has(metric)) this.history.set(metric, []);
      const data = this.history.get(metric)!;
      data.push(value);
      if (data.length > this.config.windowSize) data.shift();
      if (data.length < 15) continue; // Need enough samples

      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      const variance = data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / data.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 0.001) continue;

      const zScore = Math.abs((value - mean) / stdDev);

      if (zScore > this.config.zScoreThreshold) {
        this.eventCounter++;
        const severity = zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low';
        const event: AnomalyEvent = {
          id: `anomaly-${this.eventCounter}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          metric,
          value,
          expectedMin: mean - stdDev * 2,
          expectedMax: mean + stdDev * 2,
          mean,
          stdDev,
          zScore,
          severity,
          message: `Anomaly in ${metric}: ${value.toFixed(2)} (expected ${(mean - stdDev * 2).toFixed(2)} ~ ${(mean + stdDev * 2).toFixed(2)}, z=${zScore.toFixed(1)})`,
        };
        this.events.unshift(event);
        if (this.events.length > 200) this.events.pop();
        this.onAnomaly?.(event);
      }
    }
  }
}
