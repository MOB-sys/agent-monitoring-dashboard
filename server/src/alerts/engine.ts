import type { AlertRule, AlertEvent, NotificationChannel } from './types.js';
import { dispatchNotification } from './notifiers.js';
import type { MetricsSnapshot } from '../types.js';
import { alertsFiring, alertsTotal } from '../prometheus.js';

export class AlertEngine {
  private rules: AlertRule[] = [];
  private channels: NotificationChannel[] = [];
  private events: AlertEvent[] = [];
  private firingState: Map<string, { startedAt: number; notified: boolean }> = new Map();
  private eventCounter = 0;
  private onAlert: ((event: AlertEvent) => void) | null = null;

  constructor() {
    // Default rules
    this.rules = [
      {
        id: 'rule-1',
        name: 'Low Success Rate',
        metric: 'successRate',
        condition: 'below',
        threshold: 90,
        duration: 10,
        severity: 'critical',
        enabled: true,
        channels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule-2',
        name: 'High Latency',
        metric: 'avgLatency',
        condition: 'above',
        threshold: 1000,
        duration: 15,
        severity: 'warning',
        enabled: true,
        channels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule-3',
        name: 'High Error Rate',
        metric: 'errorRate',
        condition: 'above',
        threshold: 10,
        duration: 10,
        severity: 'critical',
        enabled: true,
        channels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule-4',
        name: 'Cost Spike',
        metric: 'totalCost',
        condition: 'above',
        threshold: 100,
        duration: 30,
        severity: 'warning',
        enabled: true,
        channels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  setAlertCallback(cb: (event: AlertEvent) => void) {
    this.onAlert = cb;
  }

  // CRUD for rules
  getRules(): AlertRule[] { return this.rules; }

  addRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.rules.push(newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.rules[idx] = { ...this.rules[idx], ...updates, updatedAt: new Date().toISOString() };
    return this.rules[idx];
  }

  deleteRule(id: string): boolean {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    this.firingState.delete(id);
    return true;
  }

  // CRUD for channels
  getChannels(): NotificationChannel[] { return this.channels; }

  addChannel(channel: Omit<NotificationChannel, 'id'>): NotificationChannel {
    const newChannel: NotificationChannel = {
      ...channel,
      id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.channels.push(newChannel);
    return newChannel;
  }

  updateChannel(id: string, updates: Partial<NotificationChannel>): NotificationChannel | null {
    const idx = this.channels.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.channels[idx] = { ...this.channels[idx], ...updates };
    return this.channels[idx];
  }

  deleteChannel(id: string): boolean {
    const idx = this.channels.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.channels.splice(idx, 1);
    return true;
  }

  // Get alert history
  getHistory(): AlertEvent[] { return this.events; }

  // Get current metric value from snapshot
  private getMetricValue(snapshot: MetricsSnapshot, metric: string): number {
    switch (metric) {
      case 'successRate': return snapshot.overall.successRate;
      case 'avgLatency': return snapshot.overall.avgLatency;
      case 'errorRate': return snapshot.overall.errorRate;
      case 'totalCost': return snapshot.overall.totalCost;
      case 'tokenUsage': return snapshot.overall.totalTokensInput + snapshot.overall.totalTokensOutput;
      case 'throughput': return snapshot.overall.throughput;
      default: return 0;
    }
  }

  // Check if condition is met
  private isConditionMet(value: number, condition: 'above' | 'below', threshold: number): boolean {
    return condition === 'above' ? value > threshold : value < threshold;
  }

  // Main evaluation loop - call this every tick
  evaluate(snapshot: MetricsSnapshot) {
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const value = this.getMetricValue(snapshot, rule.metric);
      const conditionMet = this.isConditionMet(value, rule.condition, rule.threshold);
      const state = this.firingState.get(rule.id);

      if (conditionMet) {
        if (!state) {
          // Start tracking
          this.firingState.set(rule.id, { startedAt: now, notified: false });
        } else if (!state.notified && (now - state.startedAt) >= rule.duration * 1000) {
          // Duration exceeded, fire alert
          state.notified = true;
          const event = this.createEvent(rule, value, 'firing');
          this.events.unshift(event);
          if (this.events.length > 200) this.events.pop();
          this.notifyChannels(event, rule.channels);
          this.onAlert?.(event);
          alertsTotal.inc({ severity: rule.severity });
        }
      } else if (state?.notified) {
        // Condition no longer met, resolve
        this.firingState.delete(rule.id);
        const event = this.createEvent(rule, value, 'resolved');
        this.events.unshift(event);
        if (this.events.length > 200) this.events.pop();
        this.notifyChannels(event, rule.channels);
        this.onAlert?.(event);
      } else {
        // Condition not met and not firing, reset
        this.firingState.delete(rule.id);
      }
    }

    // Update Prometheus gauge
    alertsFiring.set(this.firingState.size);
  }

  private createEvent(rule: AlertRule, value: number, status: 'firing' | 'resolved'): AlertEvent {
    this.eventCounter++;
    const conditionText = rule.condition === 'above' ? 'exceeded' : 'dropped below';
    return {
      id: `evt-${this.eventCounter}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue: value,
      threshold: rule.threshold,
      severity: rule.severity,
      status,
      startedAt: new Date().toISOString(),
      resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
      message: status === 'firing'
        ? `${rule.name}: ${rule.metric} ${conditionText} threshold (${value.toFixed(2)} ${rule.condition} ${rule.threshold})`
        : `${rule.name}: resolved - ${rule.metric} back to normal (${value.toFixed(2)})`,
    };
  }

  private async notifyChannels(event: AlertEvent, channelIds: string[]) {
    const channels = this.channels.filter(c => channelIds.includes(c.id) && c.enabled);
    for (const channel of channels) {
      await dispatchNotification(event, channel);
    }
  }
}
