export class MetricsAggregator {
  private latencies: number[] = [];
  private totalRequests = 0;
  private failedRequests = 0;
  private totalTokensInput = 0;
  private totalTokensOutput = 0;
  private totalCost = 0;
  private readonly maxLatencyWindow: number;

  constructor(maxLatencyWindow: number = 1000) {
    this.maxLatencyWindow = maxLatencyWindow;
  }

  recordRequest(latencyMs: number, success: boolean, tokensInput: number, tokensOutput: number, cost: number): void {
    this.totalRequests++;
    if (!success) this.failedRequests++;

    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxLatencyWindow) {
      this.latencies.shift();
    }

    this.totalTokensInput += tokensInput;
    this.totalTokensOutput += tokensOutput;
    this.totalCost += cost;
  }

  getSuccessRate(): number {
    if (this.totalRequests === 0) return 100;
    return parseFloat((((this.totalRequests - this.failedRequests) / this.totalRequests) * 100).toFixed(1));
  }

  getLatencyPercentiles(): { p50: number; p95: number; p99: number; avg: number } {
    if (this.latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
    return {
      p50: Math.round(this.percentile(sorted, 50)),
      p95: Math.round(this.percentile(sorted, 95)),
      p99: Math.round(this.percentile(sorted, 99)),
      avg,
    };
  }

  getTotals(): { requests: number; failed: number; tokensInput: number; tokensOutput: number; cost: number } {
    return {
      requests: this.totalRequests,
      failed: this.failedRequests,
      tokensInput: this.totalTokensInput,
      tokensOutput: this.totalTokensOutput,
      cost: parseFloat(this.totalCost.toFixed(4)),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
