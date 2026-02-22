import { memo, useMemo } from 'react';
import { Bot, CheckCircle2, Timer, DollarSign } from 'lucide-react';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import { formatLatency, formatCost, formatNumber } from '../../lib/utils';

export const SummaryCards = memo(function SummaryCards() {
  const overall = useMonitoringStore((s) => s.metrics?.overall);
  const firstAgent = useMonitoringStore((s) => s.metrics?.agents?.[0]);

  const cards = useMemo(() => {
    const successRate = overall?.successRate ?? 0;
    const successRateColor =
      successRate >= 95
        ? 'text-emerald-400'
        : successRate >= 85
          ? 'text-amber-400'
          : 'text-red-400';

    const totalTokens = (overall?.totalTokensInput ?? 0) + (overall?.totalTokensOutput ?? 0);

    const p99Display = firstAgent
      ? `P99: ${firstAgent.metrics.p99Latency.toFixed(0)}ms`
      : overall
        ? `P99: ${(overall.avgLatency * 2.5).toFixed(0)}ms`
        : 'P99: --';

    return [
      {
        title: 'Active Agents',
        icon: Bot,
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-400/10',
        value: overall?.activeAgents ?? '--',
        subtitle: 'of 5 agents',
        secondary: overall ? `${overall.throughput} req/min` : '-- req/min',
      },
      {
        title: 'Success Rate',
        icon: CheckCircle2,
        iconColor: successRateColor,
        iconBg:
          successRate >= 95
            ? 'bg-emerald-400/10'
            : successRate >= 85
              ? 'bg-amber-400/10'
              : 'bg-red-400/10',
        value: overall ? `${overall.successRate.toFixed(1)}%` : '--%',
        valueColor: successRateColor,
        subtitle: 'Target: 95%',
        secondary: overall ? `${overall.errorRate.toFixed(1)}% errors` : '--% errors',
      },
      {
        title: 'Avg Latency',
        icon: Timer,
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-400/10',
        value: overall ? formatLatency(overall.avgLatency) : '--',
        subtitle: 'P50 response time',
        secondary: p99Display,
      },
      {
        title: 'Total Cost',
        icon: DollarSign,
        iconColor: 'text-violet-400',
        iconBg: 'bg-violet-400/10',
        value: overall ? formatCost(overall.totalCost) : '--',
        subtitle: 'Accumulated cost',
        secondary: overall ? `${formatNumber(totalTokens)} tokens` : '-- tokens',
      },
    ];
  }, [overall, firstAgent]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
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
            <div className={`text-2xl font-bold mb-1 ${card.valueColor ?? 'text-slate-100'}`}>
              {card.value}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{card.subtitle}</span>
              <span className="text-xs text-slate-400">{card.secondary}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
