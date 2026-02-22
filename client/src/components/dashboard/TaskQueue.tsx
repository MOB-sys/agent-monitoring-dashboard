import { memo, useMemo } from 'react';
import { useMonitoringStore } from '../../store/useMonitoringStore';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgClass: string; dotClass: string }> = {
  queued: { label: 'Queued', color: 'bg-amber-500', bgClass: 'bg-amber-500/10', dotClass: 'bg-amber-400' },
  running: { label: 'Running', color: 'bg-blue-500', bgClass: 'bg-blue-500/10', dotClass: 'bg-blue-400' },
  completed: { label: 'Completed', color: 'bg-emerald-500', bgClass: 'bg-emerald-500/10', dotClass: 'bg-emerald-400' },
  failed: { label: 'Failed', color: 'bg-red-500', bgClass: 'bg-red-500/10', dotClass: 'bg-red-400' },
};

const STATUS_ORDER = ['queued', 'running', 'completed', 'failed'] as const;

export const TaskQueue = memo(function TaskQueue() {
  const taskQueueData = useMonitoringStore((s) => s.metrics?.taskQueue);
  const taskQueue = useMemo(() => taskQueueData ?? [], [taskQueueData]);

  const statusMap = useMemo(() => new Map(taskQueue.map((item) => [item.status, item.count])), [taskQueue]);
  const total = useMemo(() => taskQueue.reduce((sum, item) => sum + item.count, 0), [taskQueue]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-100">Task Queue</h3>
        <p className="text-xs text-slate-400">Current pipeline status</p>
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden bg-slate-800 flex mb-5">
        {total === 0 ? (
          <div className="w-full bg-slate-800" />
        ) : (
          STATUS_ORDER.map((status) => {
            const count = statusMap.get(status) ?? 0;
            if (count === 0) return null;
            const widthPct = (count / total) * 100;
            const config = STATUS_CONFIG[status];
            return (
              <div
                key={status}
                className={`${config.color} transition-all`}
                style={{ width: `${widthPct}%` }}
              />
            );
          })
        )}
      </div>

      {/* 2x2 stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status];
          const count = statusMap.get(status) ?? 0;
          return (
            <div
              key={status}
              className="rounded-lg bg-slate-800/50 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                <span className="text-xs text-slate-400">{config.label}</span>
              </div>
              <div className="text-xl font-bold text-slate-100">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
