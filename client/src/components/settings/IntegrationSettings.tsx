import { useState, useEffect } from 'react';
import {
  Settings,
  Link,
  Activity,
  BarChart3,
  Bell,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import type { NotificationChannel } from '../../types';

const API_BASE = 'http://localhost:3001/api';

const CHANNEL_TYPES = [
  { value: 'slack', label: 'Slack' },
  { value: 'pagerduty', label: 'PagerDuty' },
  { value: 'webhook', label: 'Webhook' },
] as const;

function channelTypeBadge(type: 'slack' | 'pagerduty' | 'webhook') {
  const colors = {
    slack: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    pagerduty: 'bg-green-500/20 text-green-400 border border-green-500/30',
    webhook: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[type]}`}>
      {type}
    </span>
  );
}

function getConfigFieldsForType(type: string): { key: string; label: string; placeholder: string }[] {
  switch (type) {
    case 'slack':
      return [
        { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
        { key: 'channel', label: 'Channel', placeholder: '#alerts' },
      ];
    case 'pagerduty':
      return [
        { key: 'routingKey', label: 'Routing Key', placeholder: 'Your PagerDuty routing key' },
        { key: 'severity', label: 'Default Severity', placeholder: 'critical' },
      ];
    case 'webhook':
      return [
        { key: 'url', label: 'URL', placeholder: 'https://your-endpoint.com/webhook' },
        { key: 'secret', label: 'Secret (optional)', placeholder: 'Webhook signing secret' },
      ];
    default:
      return [];
  }
}

export function IntegrationSettings() {
  // Langfuse state
  const [langfuseHost, setLangfuseHost] = useState('');
  const [langfusePublicKey, setLangfusePublicKey] = useState('');
  const [langfuseSecretKey, setLangfuseSecretKey] = useState('');
  const [langfuseEnabled, setLangfuseEnabled] = useState(false);
  const [langfuseTestResult, setLangfuseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [langfuseTesting, setLangfuseTesting] = useState(false);
  const [langfuseSaving, setLangfuseSaving] = useState(false);

  // Notification channels
  const channels = useMonitoringStore((s) => s.channels);
  const setChannels = useMonitoringStore((s) => s.setChannels);

  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelForm, setChannelForm] = useState<{
    name: string;
    type: 'slack' | 'pagerduty' | 'webhook';
    config: Record<string, string>;
    enabled: boolean;
  }>({
    name: '',
    type: 'slack',
    config: {},
    enabled: true,
  });

  useEffect(() => {
    // Fetch Langfuse config on mount
    fetch(`${API_BASE}/integrations/langfuse`)
      .then((res) => res.json())
      .then((data) => {
        if (data.host) setLangfuseHost(data.host);
        if (data.publicKey) setLangfusePublicKey(data.publicKey);
        if (data.secretKey) setLangfuseSecretKey(data.secretKey);
        if (data.enabled !== undefined) setLangfuseEnabled(data.enabled);
      })
      .catch(console.error);
  }, []);

  async function testLangfuseConnection() {
    setLangfuseTesting(true);
    setLangfuseTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/integrations/langfuse/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: langfuseHost,
          publicKey: langfusePublicKey,
          secretKey: langfuseSecretKey,
        }),
      });
      const result = await res.json();
      setLangfuseTestResult(result);
    } catch (err) {
      setLangfuseTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setLangfuseTesting(false);
    }
  }

  async function saveLangfuseConfig() {
    setLangfuseSaving(true);
    try {
      await fetch(`${API_BASE}/integrations/langfuse`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: langfuseHost,
          publicKey: langfusePublicKey,
          secretKey: langfuseSecretKey,
          enabled: langfuseEnabled,
        }),
      });
    } catch (err) {
      console.error('Failed to save Langfuse config:', err);
    } finally {
      setLangfuseSaving(false);
    }
  }

  async function fetchChannels() {
    try {
      const res = await fetch(`${API_BASE}/alerts/channels`);
      const data = await res.json();
      setChannels(data);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  }

  async function handleChannelSubmit() {
    try {
      if (editingChannelId) {
        await fetch(`${API_BASE}/alerts/channels/${editingChannelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(channelForm),
        });
      } else {
        await fetch(`${API_BASE}/alerts/channels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(channelForm),
        });
      }
      await fetchChannels();
      resetChannelForm();
    } catch (err) {
      console.error('Failed to save channel:', err);
    }
  }

  async function handleDeleteChannel(id: string) {
    try {
      await fetch(`${API_BASE}/alerts/channels/${id}`, { method: 'DELETE' });
      await fetchChannels();
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  }

  function startEditChannel(channel: NotificationChannel) {
    setEditingChannelId(channel.id);
    setChannelForm({
      name: channel.name,
      type: channel.type,
      config: { ...channel.config },
      enabled: channel.enabled,
    });
    setShowChannelForm(true);
  }

  function resetChannelForm() {
    setShowChannelForm(false);
    setEditingChannelId(null);
    setChannelForm({ name: '', type: 'slack', config: {}, enabled: true });
  }

  const configFields = getConfigFieldsForType(channelForm.type);

  return (
    <div className="space-y-6">
      {/* Langfuse Integration */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-100">Langfuse Integration</h2>
          <button
            onClick={() => setLangfuseEnabled(!langfuseEnabled)}
            className={`ml-auto w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
              langfuseEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                langfuseEnabled ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Host URL</label>
            <input
              type="text"
              value={langfuseHost}
              onChange={(e) => setLangfuseHost(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              placeholder="https://cloud.langfuse.com"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Public Key</label>
            <input
              type="text"
              value={langfusePublicKey}
              onChange={(e) => setLangfusePublicKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              placeholder="pk-..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Secret Key</label>
            <input
              type="password"
              value={langfuseSecretKey}
              onChange={(e) => setLangfuseSecretKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              placeholder="sk-..."
            />
          </div>

          {langfuseTestResult && (
            <div
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                langfuseTestResult.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {langfuseTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {langfuseTestResult.message}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={testLangfuseConnection}
              disabled={langfuseTesting}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {langfuseTesting && <Loader2 className="w-4 h-4 animate-spin" />}
              Test Connection
            </button>
            <button
              onClick={saveLangfuseConfig}
              disabled={langfuseSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {langfuseSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* OpenTelemetry Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">OpenTelemetry</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">OTLP Traces Endpoint</label>
            <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 border border-slate-700">
              POST http://localhost:3001/api/integrations/otlp/v1/traces
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Example: Send traces via curl</label>
            <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 border border-slate-700 overflow-x-auto">
              <pre className="whitespace-pre">{`curl -X POST http://localhost:3001/api/integrations/otlp/v1/traces \\
  -H "Content-Type: application/json" \\
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "stringValue": "my-agent" } }
        ]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "abc123",
          "spanId": "def456",
          "name": "llm-call",
          "startTimeUnixNano": 1700000000000000000,
          "endTimeUnixNano": 1700000001000000000
        }]
      }]
    }]
  }'`}</pre>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Configure your OpenTelemetry SDK to export traces to the endpoint above.
            The server accepts OTLP/HTTP JSON format and converts spans into the internal trace format.
          </p>
        </div>
      </div>

      {/* Prometheus Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-100">Prometheus</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Metrics Endpoint</label>
            <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 border border-slate-700">
              GET http://localhost:3001/metrics
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Prometheus Scrape Config</label>
            <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm text-slate-300 border border-slate-700 overflow-x-auto">
              <pre className="whitespace-pre">{`scrape_configs:
  - job_name: 'agent-monitor'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'`}</pre>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Add the configuration above to your prometheus.yml to scrape metrics from the monitoring server.
            Available metrics include agent success rates, latencies, token usage, and cost data.
          </p>
        </div>
      </div>

      {/* Notification Channels Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-slate-100">Notification Channels</h2>
            <span className="text-sm text-slate-500">
              {channels.length} channel{channels.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => {
              resetChannelForm();
              setShowChannelForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </button>
        </div>

        {/* Channel Form */}
        {showChannelForm && (
          <div className="mb-6 bg-slate-800/50 rounded-lg border border-slate-700 p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-200">
              {editingChannelId ? 'Edit Channel' : 'New Notification Channel'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Channel name..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  value={channelForm.type}
                  onChange={(e) =>
                    setChannelForm({
                      ...channelForm,
                      type: e.target.value as 'slack' | 'pagerduty' | 'webhook',
                      config: {},
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  {CHANNEL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {configFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-slate-400 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={channelForm.config[field.key] || ''}
                    onChange={(e) =>
                      setChannelForm({
                        ...channelForm,
                        config: { ...channelForm.config, [field.key]: e.target.value },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleChannelSubmit}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {editingChannelId ? 'Update Channel' : 'Create Channel'}
              </button>
              <button
                onClick={resetChannelForm}
                className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Channels List */}
        {channels.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Settings className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No notification channels configured</p>
            <p className="text-xs mt-1">Add a channel to receive alert notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      channel.enabled ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {channel.name}
                      </span>
                      {channelTypeBadge(channel.type)}
                      {channel.enabled ? (
                        <span className="text-xs text-emerald-400">Active</span>
                      ) : (
                        <span className="text-xs text-slate-600">Disabled</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEditChannel(channel)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteChannel(channel.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
