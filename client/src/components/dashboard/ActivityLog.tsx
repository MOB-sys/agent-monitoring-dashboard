import { memo, useMemo } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Wrench,
  Cpu,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import type { Activity } from '../../types';

const ACTIVITY_ICON_MAP: Record<
  Activity['type'],
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

function ActivityRow({ activity }: { activity: Activity }) {
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
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/50">
      <div className="mt-0.5 flex-shrink-0">
        <Icon className={`w-4 h-4 ${config.colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-200">{activity.agentName}</span>
        <p className="text-sm text-slate-400 truncate">{activity.message}</p>
      </div>
      <span className="text-xs text-slate-500 flex-shrink-0 mt-0.5 tabular-nums">
        {formattedTime}
      </span>
    </div>
  );
}

export const ActivityLog = memo(function ActivityLog() {
  const activities = useMonitoringStore((s) => s.activities);

  const displayActivities = useMemo(() => activities.slice(0, 50), [activities]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-100">Activity Log</h3>
        <p className="text-xs text-slate-400">Real-time agent events</p>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {displayActivities.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            No activity yet
          </div>
        ) : (
          displayActivities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
});
