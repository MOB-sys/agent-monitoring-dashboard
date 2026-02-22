export interface AlertRule {
  id: string;
  name: string;
  metric: 'successRate' | 'avgLatency' | 'errorRate' | 'totalCost' | 'tokenUsage' | 'throughput';
  condition: 'above' | 'below';
  threshold: number;
  duration: number; // seconds condition must hold before firing
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  channels: string[]; // notification channel IDs
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

export interface AlertEngineState {
  firingAlerts: Map<string, { ruleId: string; startedAt: string; conditionMetSince: number }>;
}
