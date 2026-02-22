import { format } from 'date-fns';
import {
  GitBranch,
  Clock,
  Coins,
  Hash,
  Cpu,
  Wrench,
  Database,
  Cog,
  AlertTriangle,
} from 'lucide-react';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import { cn, formatCost, formatNumber, getStatusBgColor } from '../../lib/utils';
import type { TraceStep } from '../../types';

const STEP_TYPE_CONFIG: Record<
  TraceStep['type'],
  { icon: React.ElementType; colorClass: string; borderColor: string; label: string }
> = {
  llm_call: {
    icon: Cpu,
    colorClass: 'text-violet-400',
    borderColor: 'border-violet-500',
    label: 'LLM Call',
  },
  tool_call: {
    icon: Wrench,
    colorClass: 'text-amber-400',
    borderColor: 'border-amber-500',
    label: 'Tool Call',
  },
  retrieval: {
    icon: Database,
    colorClass: 'text-blue-400',
    borderColor: 'border-blue-500',
    label: 'Retrieval',
  },
  processing: {
    icon: Cog,
    colorClass: 'text-slate-400',
    borderColor: 'border-slate-500',
    label: 'Processing',
  },
};

function StepTimeline({ steps }: { steps: TraceStep[] }) {
  if (steps.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4 text-center">
        No steps recorded
      </div>
    );
  }

  return (
    <div className="relative">
      {steps.map((step, index) => {
        const config = STEP_TYPE_CONFIG[step.type] ?? STEP_TYPE_CONFIG.processing;
        const Icon = config.icon;
        const isLast = index === steps.length - 1;

        const dotBg =
          step.status === 'failed'
            ? 'bg-red-500'
            : step.status === 'running'
              ? 'bg-blue-500'
              : step.type === 'llm_call'
                ? 'bg-violet-500'
                : step.type === 'tool_call'
                  ? 'bg-amber-500'
                  : step.type === 'retrieval'
                    ? 'bg-blue-500'
                    : 'bg-slate-500';

        return (
          <div key={step.id} className="flex gap-4">
            {/* Left: timeline connector */}
            <div className="flex flex-col items-center flex-shrink-0 w-6">
              <div className={`w-3 h-3 rounded-full ${dotBg} mt-5 z-10`} />
              {!isLast && (
                <div className={`w-0.5 flex-1 ${config.borderColor} border-l-2`} />
              )}
            </div>

            {/* Right: step card */}
            <div className="bg-slate-800/30 rounded-lg p-4 mb-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.colorClass}`} />
                  <span className="text-sm font-medium text-slate-200">{step.name}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${getStatusBgColor(step.status)}`}
                >
                  {step.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {config.label}
                </span>
                {step.duration != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {step.duration >= 1000
                      ? `${(step.duration / 1000).toFixed(1)}s`
                      : `${step.duration.toFixed(0)}ms`}
                  </span>
                )}
                {(step.tokensInput > 0 || step.tokensOutput > 0) && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {formatNumber(step.tokensInput)} in / {formatNumber(step.tokensOutput)} out
                  </span>
                )}
                {step.model && (
                  <span className="text-slate-500">{step.model}</span>
                )}
              </div>

              {step.error && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400 bg-red-400/10 rounded p-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{step.error}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TraceDetailView() {
  const traces = useMonitoringStore((s) => s.traces);
  const selectedTraceId = useMonitoringStore((s) => s.selectedTraceId);
  const setSelectedTraceId = useMonitoringStore((s) => s.setSelectedTraceId);

  const selectedTrace = traces.find((t) => t.id === selectedTraceId) ?? null;

  const statusDotColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-400';
      case 'running': return 'bg-amber-400';
      case 'failed': return 'bg-red-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex h-full">
      {/* Left panel: Trace list */}
      <div className="w-96 border-r border-slate-800 overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-100">Traces</h2>
          <p className="text-xs text-slate-500">{traces.length} recorded</p>
        </div>
        {traces.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No traces available</div>
        ) : (
          traces.map((trace) => {
            let formattedTime: string;
            try {
              formattedTime = format(new Date(trace.startTime), 'HH:mm:ss');
            } catch {
              formattedTime = '--:--:--';
            }
            return (
              <button
                key={trace.id}
                onClick={() => setSelectedTraceId(trace.id)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors',
                  selectedTraceId === trace.id && 'bg-slate-800/50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${statusDotColor(trace.status)}`} />
                  <span className="text-sm font-medium text-slate-200 truncate font-mono">
                    {trace.id.length > 20 ? trace.id.slice(0, 20) + '...' : trace.id}
                  </span>
                </div>
                <div className="ml-4 flex items-center gap-2 text-xs text-slate-500">
                  <span>{trace.agentName}</span>
                  <span className="text-slate-700">|</span>
                  <span>{formattedTime}</span>
                </div>
                <div className="ml-4 flex items-center gap-3 text-xs text-slate-500 mt-1">
                  {trace.totalDuration != null && (
                    <span>
                      {trace.totalDuration >= 1000
                        ? `${(trace.totalDuration / 1000).toFixed(1)}s`
                        : `${trace.totalDuration.toFixed(0)}ms`}
                    </span>
                  )}
                  <span>{formatNumber(trace.totalTokens)} tokens</span>
                  <span>{formatCost(trace.totalCost)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Right panel: Trace details */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTrace ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <GitBranch className="w-12 h-12 mb-3 text-slate-700" />
            <p className="text-sm">Select a trace to view details</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Trace header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <GitBranch className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-100 font-mono">
                  {selectedTrace.id}
                </h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-slate-400">{selectedTrace.agentName}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${getStatusBgColor(selectedTrace.status)}`}
                >
                  {selectedTrace.status}
                </span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Clock,
                  iconColor: 'text-blue-400',
                  label: 'Duration',
                  value:
                    selectedTrace.totalDuration != null
                      ? selectedTrace.totalDuration >= 1000
                        ? `${(selectedTrace.totalDuration / 1000).toFixed(1)}s`
                        : `${selectedTrace.totalDuration.toFixed(0)}ms`
                      : 'Running...',
                },
                {
                  icon: Hash,
                  iconColor: 'text-amber-400',
                  label: 'Total Tokens',
                  value: formatNumber(selectedTrace.totalTokens),
                },
                {
                  icon: Coins,
                  iconColor: 'text-violet-400',
                  label: 'Total Cost',
                  value: formatCost(selectedTrace.totalCost),
                },
                {
                  icon: Cog,
                  iconColor: 'text-slate-400',
                  label: 'Steps',
                  value: String(selectedTrace.steps.length),
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                      <span className="text-xs text-slate-400">{stat.label}</span>
                    </div>
                    <div className="text-lg font-bold text-slate-100">{stat.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Step timeline */}
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-100">Execution Timeline</h3>
                <p className="text-xs text-slate-400">Step-by-step trace execution</p>
              </div>
              <StepTimeline steps={selectedTrace.steps} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
