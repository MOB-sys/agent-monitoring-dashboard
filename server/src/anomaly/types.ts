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
