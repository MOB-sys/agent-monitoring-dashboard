import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import { formatCost } from '../../lib/utils';
import type { CostSummary, CostByModel, CostByAgent } from '../../types';

const API_BASE = 'http://localhost:3001/api/cost';

const MODEL_COLORS: Record<string, string> = {
  'claude-opus': '#8b5cf6',
  'claude-sonnet': '#3b82f6',
  'claude-haiku': '#10b981',
};

function getModelColor(model: string): string {
  const key = model.toLowerCase();
  for (const [k, v] of Object.entries(MODEL_COLORS)) {
    if (key.includes(k.replace('claude-', ''))) return v;
  }
  return '#8b5cf6';
}

interface ForecastPoint {
  day: string;
  projected: number;
  optimistic: number;
  pessimistic: number;
}

function CostTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCost(entry.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm text-slate-100">{payload[0].name}</p>
      <p className="text-sm" style={{ color: payload[0].payload.fill }}>
        {formatCost(payload[0].value)} ({payload[0].payload.percentage?.toFixed(1)}%)
      </p>
    </div>
  );
}

export const CostDashboard = memo(function CostDashboard() {
  const token = useMonitoringStore((s) => s.token);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [byModel, setByModel] = useState<CostByModel[]>([]);
  const [byAgent, setByAgent] = useState<CostByAgent[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, modelRes, agentRes, forecastRes] = await Promise.all([
        fetch(`${API_BASE}/summary`, { headers }),
        fetch(`${API_BASE}/by-model`, { headers }),
        fetch(`${API_BASE}/by-agent`, { headers }),
        fetch(`${API_BASE}/forecast`, { headers }),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (modelRes.ok) setByModel(await modelRes.json());
      if (agentRes.ok) setByAgent(await agentRes.json());
      if (forecastRes.ok) {
        const data = await forecastRes.json();
        setForecast(data.forecast ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch cost data:', err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const sortedAgents = useMemo(
    () => [...byAgent].sort((a, b) => b.cost - a.cost),
    [byAgent]
  );

  const maxAgentCost = useMemo(
    () => sortedAgents.length > 0 ? sortedAgents[0].cost : 0,
    [sortedAgents]
  );

  const minAgentCost = useMemo(
    () => sortedAgents.length > 0 ? sortedAgents[sortedAgents.length - 1].cost : 0,
    [sortedAgents]
  );

  const pieData = useMemo(
    () => byModel.map((m) => ({
      name: m.model,
      value: m.cost,
      percentage: m.percentage,
      fill: getModelColor(m.model),
    })),
    [byModel]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-100">Cost Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-xl border border-slate-800 p-5 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-800 rounded w-20 mb-2" />
              <div className="h-3 bg-slate-800 rounded w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-xl border border-slate-800 p-5 animate-pulse h-[350px]" />
          ))}
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      title: 'Total Cost',
      icon: DollarSign,
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-400/10',
      value: summary ? formatCost(summary.totalCost) : '--',
    },
    {
      title: 'Cost/Request',
      icon: Receipt,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-400/10',
      value: summary ? `$${summary.costPerRequest.toFixed(4)}` : '--',
    },
    {
      title: 'Projected Daily',
      icon: TrendingUp,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-400/10',
      value: summary ? formatCost(summary.projectedDaily) : '--',
    },
    {
      title: 'Projected Monthly',
      icon: Calendar,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-400/10',
      value: summary ? formatCost(summary.projectedMonthly) : '--',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-100">Cost Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-slate-900 rounded-xl border border-slate-800 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">{card.title}</span>
                <div className={`p-2 rounded-lg ${card.iconBg}`}>
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Model - Pie Chart */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-100">Cost by Model</h3>
            <p className="text-xs text-slate-400">Distribution across models</p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
              No model data available
            </div>
          ) : (
            <>
              <div className="h-[200px] md:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-5 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-xs text-slate-400">
                      {entry.name} ({entry.percentage?.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cost by Agent - Bar Chart */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-100">Cost by Agent</h3>
            <p className="text-xs text-slate-400">Per-agent cost breakdown</p>
          </div>
          {sortedAgents.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
              No agent data available
            </div>
          ) : (
            <div className="h-[220px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedAgents}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  tickFormatter={(value: number) => formatCost(value)}
                />
                <YAxis
                  type="category"
                  dataKey="agentName"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  width={100}
                />
                <Tooltip content={<CostTooltip />} />
                <Bar dataKey="cost" name="Cost" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {sortedAgents.map((agent) => (
                    <Cell key={agent.agentId} fill={getModelColor(agent.model)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-100">7-Day Cost Forecast</h3>
          <p className="text-xs text-slate-400">Projected, optimistic, and pessimistic estimates</p>
        </div>
        {forecast.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
            No forecast data available
          </div>
        ) : (
          <div className="h-[220px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="forecastProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastOptimistic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastPessimistic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(value: number) => formatCost(value)}
              />
              <Tooltip content={<CostTooltip />} />
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
              <Area
                type="monotone"
                dataKey="pessimistic"
                name="Pessimistic"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#forecastPessimistic)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#forecastProjected)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="optimistic"
                name="Optimistic"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#forecastOptimistic)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Agent Efficiency Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-100">Agent Efficiency</h3>
          <p className="text-xs text-slate-400">Cost and performance breakdown by agent</p>
        </div>
        {sortedAgents.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
            No agent data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Agent</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Model</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Cost</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Requests</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Success Rate</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Cost/Request</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Token Efficiency</th>
                  <th className="pb-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedAgents.map((agent) => {
                  const costRange = maxAgentCost - minAgentCost;
                  const costRatio = costRange > 0 ? (agent.cost - minAgentCost) / costRange : 0;
                  const rowTint = costRatio > 0.7
                    ? 'bg-red-500/5'
                    : costRatio < 0.3
                      ? 'bg-emerald-500/5'
                      : '';
                  const modelColor = getModelColor(agent.model);

                  return (
                    <tr key={agent.agentId} className={`${rowTint} hover:bg-slate-800/30`}>
                      <td className="py-3 text-sm text-slate-200 font-medium">{agent.agentName}</td>
                      <td className="py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium border"
                          style={{
                            backgroundColor: `${modelColor}20`,
                            color: modelColor,
                            borderColor: `${modelColor}30`,
                          }}
                        >
                          {agent.model}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-100 text-right font-mono">
                        {formatCost(agent.cost)}
                      </td>
                      <td className="py-3 text-sm text-slate-300 text-right">{agent.requests}</td>
                      <td className="py-3 text-sm text-right">
                        <span
                          className={
                            agent.successRate >= 95
                              ? 'text-emerald-400'
                              : agent.successRate >= 85
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }
                        >
                          {agent.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-300 text-right font-mono">
                        ${agent.costPerRequest.toFixed(4)}
                      </td>
                      <td className="py-3 text-sm text-slate-300 text-right">
                        {agent.tokenEfficiency.toFixed(2)}
                      </td>
                      <td className="py-3 text-sm text-slate-300 text-right">
                        {agent.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
