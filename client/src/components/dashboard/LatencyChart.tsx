import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useMonitoringStore } from '../../store/useMonitoringStore';

const LINES = [
  { dataKey: 'p50', stroke: '#10b981', label: 'P50' },
  { dataKey: 'p95', stroke: '#f59e0b', label: 'P95' },
  { dataKey: 'p99', stroke: '#ef4444', label: 'P99' },
] as const;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm text-slate-100" style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(0)} ms
        </p>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-5 mt-2">
      {payload.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-slate-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export const LatencyChart = memo(function LatencyChart() {
  const latencyTrend = useMonitoringStore((s) => s.metrics?.latencyTrend);
  const data = useMemo(() => latencyTrend ?? [], [latencyTrend]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-100">Latency Trend</h3>
        <p className="text-xs text-slate-400">Response time percentiles (ms)</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] md:h-[300px] text-slate-500 text-sm">
          No latency data available
        </div>
      ) : (
        <div className="h-[200px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              unit=" ms"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            {LINES.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.label}
                stroke={line.stroke}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});
