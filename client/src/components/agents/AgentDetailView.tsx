import {
  Bot,
  Activity,
  Timer,
  DollarSign,
  Hash,
  Play,
  CheckCircle2,
  XCircle,
  Wrench,
  Cpu,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
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
import { formatLatency, formatCost, formatNumber, cn, getStatusBgColor } from '../../lib/utils';
import type { Activity as ActivityType } from '../../types';

const ACTIVITY_ICON_MAP: Record<
  ActivityType['type'],
  { icon: React.ElementType; colorClass: string }
> = {
  task_start: { icon: Play, colorClass: 'text-blue-400' },
  task_complete: { icon: CheckCircle2, colorClass: 'text-emerald-400' },
  task_fail: { icon: XCircle, colorClass: 'text-red-400' },
  tool_call: { icon: Wrench, colorClass: 'text-amber-400' },
  llm_call: { icon: Cpu, colorClass: 'text-violet-400' },
  handoff: { icon: ArrowRightLeft, colorClass: 'text-cyan-400' },
  error: { icon: AlertTriangle, colorClass: 'text-red-400' },
};

function AgentLatencyChart() {
  const metrics = useMonitoringStore((s) => s.metrics);
  const data = metrics?.latencyTrend ?? [];

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-slate-500 text-sm">
        No latency data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
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
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#f1f5f9',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
        />
        <Line
          type="monotone"
          dataKey="p50"
          name="P50"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="p95"
          name="P95"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="p99"
          name="P99"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AgentDetailView() {
  const metrics = useMonitoringStore((s) => s.metrics);
  const activities = useMonitoringStore((s) => s.activities);
  const selectedAgentId = useMonitoringStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useMonitoringStore((s) => s.setSelectedAgentId);

  const agents = metrics?.agents ?? [];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  const agentActivities = selectedAgent
    ? activities.filter((a) => a.agentName === selectedAgent.name).slice(0, 20)
    : [];

  const statusDotColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-emerald-400';
      case 'idle': return 'bg-slate-400';
      case 'error': return 'bg-red-400';
      case 'stopped': return 'bg-slate-600';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left panel: Agent list */}
      <div className="w-full md:w-80 max-h-[40vh] md:max-h-none border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">Agents</h2>
          <p className="text-xs text-slate-500">{agents.length} registered</p>
        </div>
        {agents.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No agents available</div>
        ) : (
          agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors',
                selectedAgentId === agent.id && 'bg-slate-800/50'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${statusDotColor(agent.status)}`} />
                <span className="text-sm font-medium text-slate-200 truncate">{agent.name}</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {agent.model}
                </span>
                <span className="text-xs text-slate-500">
                  {agent.metrics.successRate.toFixed(1)}%
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Right panel: Agent details */}
      <div className="flex-1 overflow-y-auto">
        {!selectedAgent ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Bot className="w-12 h-12 mb-3 text-slate-700" />
            <p className="text-sm">Select an agent to view details</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-6">
            {/* Agent header */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-400/10">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-100">{selectedAgent.name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{selectedAgent.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedAgent.model}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${getStatusBgColor(selectedAgent.status)}`}
                  >
                    {selectedAgent.status}
                  </span>
                  {selectedAgent.currentTask && (
                    <span className="text-xs text-slate-500 truncate max-w-[200px]">
                      Task: {selectedAgent.currentTask}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Activity,
                  iconColor: 'text-emerald-400',
                  label: 'Success Rate',
                  value: `${selectedAgent.metrics.successRate.toFixed(1)}%`,
                },
                {
                  icon: Timer,
                  iconColor: 'text-blue-400',
                  label: 'Avg Latency',
                  value: formatLatency(selectedAgent.metrics.avgLatency),
                },
                {
                  icon: Hash,
                  iconColor: 'text-amber-400',
                  label: 'Total Requests',
                  value: formatNumber(selectedAgent.metrics.totalRequests),
                },
                {
                  icon: DollarSign,
                  iconColor: 'text-violet-400',
                  label: 'Total Cost',
                  value: formatCost(selectedAgent.metrics.totalCost),
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-slate-800/50 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                      <span className="text-xs text-slate-400">{stat.label}</span>
                    </div>
                    <div className="text-lg font-bold text-slate-100">{stat.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Latency chart */}
            <div className="bg-slate-800/30 rounded-xl border border-slate-800 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-100">Latency Trend</h3>
                <p className="text-xs text-slate-400">Response time percentiles for {selectedAgent.name}</p>
              </div>
              <AgentLatencyChart />
            </div>

            {/* Recent activities */}
            <div className="bg-slate-800/30 rounded-xl border border-slate-800 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-100">Recent Activities</h3>
                <p className="text-xs text-slate-400">Latest events from {selectedAgent.name}</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {agentActivities.length === 0 ? (
                  <div className="text-sm text-slate-500 py-4 text-center">
                    No recent activity
                  </div>
                ) : (
                  agentActivities.map((activity) => {
                    const config = ACTIVITY_ICON_MAP[activity.type] ?? {
                      icon: AlertTriangle,
                      colorClass: 'text-slate-400',
                    };
                    const Icon = config.icon;
                    let formattedTime: string;
                    try {
                      formattedTime = format(new Date(activity.timestamp), 'HH:mm:ss');
                    } catch {
                      formattedTime = '--:--:--';
                    }
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 py-2.5 border-b border-slate-800/50"
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          <Icon className={`w-4 h-4 ${config.colorClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300 truncate">{activity.message}</p>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0 mt-0.5 tabular-nums">
                          {formattedTime}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
