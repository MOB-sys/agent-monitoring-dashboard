import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Activity,
  Settings,
  Shield,
  Save,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import type { AnomalyConfig } from '../../types';

const API_BASE = 'http://localhost:3001/api/anomaly';

const SEVERITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const SEVERITY_BADGE_CLASSES: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.fill || entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export const AnomalyView = memo(function AnomalyView() {
  const anomalies = useMonitoringStore((s) => s.anomalies);
  const token = useMonitoringStore((s) => s.token);

  const [config, setConfig] = useState<AnomalyConfig | null>(null);
  const [editConfig, setEditConfig] = useState<AnomalyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/config`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch anomaly config:', err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveConfig = useCallback(async () => {
    if (!editConfig) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditConfig(data);
      }
    } catch (err) {
      console.error('Failed to save anomaly config:', err);
    } finally {
      setSaving(false);
    }
  }, [editConfig, headers]);

  const highCount = useMemo(
    () => anomalies.filter((a) => a.severity === 'high').length,
    [anomalies]
  );

  const metricCounts = useMemo(() => {
    const counts: Record<string, { high: number; medium: number; low: number }> = {};
    for (const a of anomalies) {
      if (!counts[a.metric]) counts[a.metric] = { high: 0, medium: 0, low: 0 };
      counts[a.metric][a.severity]++;
    }
    return Object.entries(counts).map(([metric, sevs]) => ({
      metric,
      high: sevs.high,
      medium: sevs.medium,
      low: sevs.low,
    }));
  }, [anomalies]);

  const severityDistribution = useMemo(() => {
    const dist = { high: 0, medium: 0, low: 0 };
    for (const a of anomalies) dist[a.severity]++;
    return [
      { name: 'High', value: dist.high, fill: SEVERITY_COLORS.high },
      { name: 'Medium', value: dist.medium, fill: SEVERITY_COLORS.medium },
      { name: 'Low', value: dist.low, fill: SEVERITY_COLORS.low },
    ];
  }, [anomalies]);

  const sortedAnomalies = useMemo(
    () => [...anomalies].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [anomalies]
  );

  const AVAILABLE_METRICS = ['latency', 'errorRate', 'tokenUsage', 'cost', 'throughput', 'successRate'];

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-100">Anomaly Detection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-xl border border-slate-800 p-5 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-800 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-100">Anomaly Detection</h2>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Total Anomalies</span>
            <div className="p-2 rounded-lg bg-amber-400/10">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{anomalies.length}</div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">High Severity</span>
            <div className="p-2 rounded-lg bg-red-400/10">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400">{highCount}</div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Monitored Metrics</span>
            <div className="p-2 rounded-lg bg-blue-400/10">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{config?.metrics.length ?? 0}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly by Metric */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-100">Anomalies by Metric</h3>
            <p className="text-xs text-slate-400">Count grouped by metric and severity</p>
          </div>
          {metricCounts.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
              No anomaly data available
            </div>
          ) : (
            <div className="h-[220px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  content={({ payload }: any) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="flex items-center justify-center gap-5 mt-2">
                        {payload.map((entry: any) => (
                          <div key={entry.value} className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-slate-400">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="high" name="High" fill={SEVERITY_COLORS.high} stackId="stack" isAnimationActive={false} />
                <Bar dataKey="medium" name="Medium" fill={SEVERITY_COLORS.medium} stackId="stack" isAnimationActive={false} />
                <Bar dataKey="low" name="Low" fill={SEVERITY_COLORS.low} stackId="stack" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-100">Severity Distribution</h3>
            <p className="text-xs text-slate-400">Breakdown by severity level</p>
          </div>
          {anomalies.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
              No anomaly data available
            </div>
          ) : (
            <>
              <div className="h-[200px] md:h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-sm" style={{ color: payload[0].payload.fill }}>
                            {payload[0].name}: {payload[0].value}
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-5 mt-2">
                {severityDistribution.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-xs text-slate-400">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-100">Detection Settings</h3>
        </div>

        {editConfig && (
          <div className="space-y-5">
            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-slate-200">Detection Enabled</label>
                <p className="text-xs text-slate-500">Toggle anomaly detection on or off</p>
              </div>
              <button
                onClick={() => setEditConfig({ ...editConfig, enabled: !editConfig.enabled })}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                  editConfig.enabled ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    editConfig.enabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Z-Score Threshold */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Z-Score Threshold ({editConfig.zScoreThreshold.toFixed(1)})
                </label>
                <input
                  type="range"
                  min="1.5"
                  max="5.0"
                  step="0.1"
                  value={editConfig.zScoreThreshold}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, zScoreThreshold: parseFloat(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>1.5</span>
                  <span>5.0</span>
                </div>
              </div>

              {/* Window Size */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Window Size (seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={editConfig.windowSize}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, windowSize: Number(e.target.value) })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Metrics Checkboxes */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">Monitored Metrics</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_METRICS.map((metric) => (
                  <label
                    key={metric}
                    className="flex items-center gap-2 cursor-pointer py-1"
                  >
                    <input
                      type="checkbox"
                      checked={editConfig.metrics.includes(metric)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...editConfig.metrics, metric]
                          : editConfig.metrics.filter((m) => m !== metric);
                        setEditConfig({ ...editConfig, metrics: updated });
                      }}
                      className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-300">{metric}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Anomaly Timeline */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-medium text-slate-100">Anomaly Timeline</h3>
          <span className="text-sm text-slate-500">
            {anomalies.length} event{anomalies.length !== 1 ? 's' : ''}
          </span>
        </div>

        {sortedAnomalies.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No anomalies detected</p>
            <p className="text-xs mt-1">Anomaly events will appear here when detected</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {sortedAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="flex items-start gap-3 py-3 px-3 rounded-lg bg-slate-800/50 border border-slate-800"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      SEVERITY_BADGE_CLASSES[anomaly.severity]
                    }`}
                  >
                    {anomaly.severity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">{anomaly.metric}</span>
                    <span className="text-xs text-slate-500">
                      Z-Score: {anomaly.zScore.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{anomaly.message}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-slate-500">
                      Expected: {anomaly.expectedMin.toFixed(2)} - {anomaly.expectedMax.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500">
                      Actual: <span className="text-slate-300">{anomaly.value.toFixed(2)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {format(new Date(anomaly.timestamp), 'MMM d, HH:mm:ss')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
