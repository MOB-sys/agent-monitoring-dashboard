import { useState } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import type { AlertRule, AlertEvent } from '../../types';

const METRICS = [
  { value: 'successRate', label: 'Success Rate' },
  { value: 'avgLatency', label: 'Avg Latency' },
  { value: 'errorRate', label: 'Error Rate' },
  { value: 'totalCost', label: 'Total Cost' },
  { value: 'tokenUsage', label: 'Token Usage' },
  { value: 'throughput', label: 'Throughput' },
] as const;

const CONDITIONS = [
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
] as const;

const SEVERITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
] as const;

const API_BASE = 'http://localhost:3001/api/alerts';

const emptyForm: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  metric: 'successRate',
  condition: 'above',
  threshold: 0,
  duration: 60,
  severity: 'warning',
  enabled: true,
  channels: [],
};

function severityBadge(severity: 'critical' | 'warning' | 'info') {
  const colors = {
    critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[severity]}`}>
      {severity}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  switch (severity) {
    case 'critical':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'info':
      return <Shield className="w-4 h-4 text-blue-400" />;
  }
}

export function AlertPanel() {
  const alertRules = useMonitoringStore((s) => s.alertRules);
  const alertEvents = useMonitoringStore((s) => s.alertEvents);
  const setAlertRules = useMonitoringStore((s) => s.setAlertRules);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function fetchRules() {
    try {
      const res = await fetch(`${API_BASE}/rules`);
      const rules = await res.json();
      setAlertRules(rules);
    } catch (err) {
      console.error('Failed to fetch alert rules:', err);
    }
  }

  async function handleSubmit() {
    try {
      if (editingId) {
        await fetch(`${API_BASE}/rules/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`${API_BASE}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      await fetchRules();
      resetForm();
    } catch (err) {
      console.error('Failed to save alert rule:', err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`${API_BASE}/rules/${id}`, { method: 'DELETE' });
      await fetchRules();
    } catch (err) {
      console.error('Failed to delete alert rule:', err);
    }
  }

  async function handleToggle(rule: AlertRule) {
    try {
      await fetch(`${API_BASE}/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
      });
      await fetchRules();
    } catch (err) {
      console.error('Failed to toggle alert rule:', err);
    }
  }

  function startEdit(rule: AlertRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.threshold,
      duration: rule.duration,
      severity: rule.severity,
      enabled: rule.enabled,
      channels: rule.channels,
    });
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  const recentEvents = alertEvents.slice(0, 50);

  return (
    <div className="space-y-6">
      {/* Alert Rules Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-100">Alert Rules</h2>
            <span className="text-sm text-slate-500">
              {alertRules.length} rule{alertRules.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {/* Inline Form */}
        {showForm && (
          <div className="mb-6 bg-slate-800/50 rounded-lg border border-slate-700 p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-200">
              {editingId ? 'Edit Rule' : 'New Alert Rule'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Rule name..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Metric</label>
                <select
                  value={form.metric}
                  onChange={(e) =>
                    setForm({ ...form, metric: e.target.value as AlertRule['metric'] })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) =>
                    setForm({ ...form, condition: e.target.value as 'above' | 'below' })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Threshold</label>
                <input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (seconds)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Severity</label>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      severity: e.target.value as 'critical' | 'warning' | 'info',
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {editingId ? 'Update Rule' : 'Create Rule'}
              </button>
              <button
                onClick={resetForm}
                className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        {alertRules.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No alert rules configured</p>
            <p className="text-xs mt-1">Create a rule to start monitoring your agents</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {alertRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                      rule.enabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        rule.enabled ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {rule.name}
                      </span>
                      {severityBadge(rule.severity)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rule.metric} {rule.condition} {rule.threshold} for {rule.duration}s
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startEdit(rule)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
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

      {/* Alert History Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-100">Alert History</h2>
          <span className="text-sm text-slate-500">
            {recentEvents.length} event{recentEvents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No alert events yet</p>
            <p className="text-xs mt-1">Events will appear here when alerts fire or resolve</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {recentEvents.map((event: AlertEvent) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-800"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <SeverityIcon severity={event.severity} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {event.ruleName}
                    </span>
                    {event.status === 'firing' ? (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        firing
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        resolved
                      </span>
                    )}
                    {severityBadge(event.severity)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{event.message}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {format(new Date(event.startedAt), 'MMM d, HH:mm:ss')}
                    {event.resolvedAt &&
                      ` - Resolved ${format(new Date(event.resolvedAt), 'HH:mm:ss')}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
