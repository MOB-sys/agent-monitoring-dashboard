import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import { formatNumber } from '../../lib/utils';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
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

export const TokenConsumptionChart = memo(function TokenConsumptionChart() {
  const tokenTrend = useMonitoringStore((s) => s.metrics?.tokenTrend);
  const data = useMemo(() => tokenTrend ?? [], [tokenTrend]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-100">Token Consumption</h3>
        <p className="text-xs text-slate-400">Input / Output tokens</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
          No token data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar
              dataKey="input"
              name="Input Tokens"
              stackId="tokens"
              fill="#3b82f6"
              isAnimationActive={false}
            />
            <Bar
              dataKey="output"
              name="Output Tokens"
              stackId="tokens"
              fill="#8b5cf6"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});
