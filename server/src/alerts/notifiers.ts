import type { AlertEvent, NotificationChannel } from './types.js';

export async function sendSlackNotification(event: AlertEvent, channel: NotificationChannel): Promise<boolean> {
  const webhookUrl = channel.config.webhookUrl;
  if (!webhookUrl) return false;

  const color = event.severity === 'critical' ? '#ef4444' : event.severity === 'warning' ? '#f59e0b' : '#3b82f6';
  const emoji = event.status === 'firing' ? '\u{1F6A8}' : '\u2705';

  const payload = {
    attachments: [{
      color,
      title: `${emoji} Alert ${event.status.toUpperCase()}: ${event.ruleName}`,
      text: event.message,
      fields: [
        { title: 'Metric', value: event.metric, short: true },
        { title: 'Current Value', value: String(event.currentValue.toFixed(2)), short: true },
        { title: 'Threshold', value: String(event.threshold), short: true },
        { title: 'Severity', value: event.severity, short: true },
      ],
      ts: Math.floor(Date.now() / 1000),
    }],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error('Slack notification failed:', err);
    return false;
  }
}

export async function sendPagerDutyNotification(event: AlertEvent, channel: NotificationChannel): Promise<boolean> {
  const routingKey = channel.config.routingKey;
  if (!routingKey) return false;

  const payload = {
    routing_key: routingKey,
    event_action: event.status === 'firing' ? 'trigger' : 'resolve',
    dedup_key: `agent-monitor-${event.ruleId}`,
    payload: {
      summary: `${event.ruleName}: ${event.message}`,
      severity: event.severity === 'critical' ? 'critical' : event.severity === 'warning' ? 'warning' : 'info',
      source: 'agent-monitoring-dashboard',
      component: event.metric,
      custom_details: {
        currentValue: event.currentValue,
        threshold: event.threshold,
      },
    },
  };

  try {
    const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error('PagerDuty notification failed:', err);
    return false;
  }
}

export async function sendWebhookNotification(event: AlertEvent, channel: NotificationChannel): Promise<boolean> {
  const url = channel.config.url;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(channel.config.authHeader ? { Authorization: channel.config.authHeader } : {}),
      },
      body: JSON.stringify({
        type: 'alert',
        event,
        timestamp: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Webhook notification failed:', err);
    return false;
  }
}

export async function dispatchNotification(event: AlertEvent, channel: NotificationChannel): Promise<boolean> {
  switch (channel.type) {
    case 'slack': return sendSlackNotification(event, channel);
    case 'pagerduty': return sendPagerDutyNotification(event, channel);
    case 'webhook': return sendWebhookNotification(event, channel);
    default: return false;
  }
}
