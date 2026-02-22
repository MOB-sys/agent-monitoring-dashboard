import { memo, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useMonitoringStore } from '../../store/useMonitoringStore';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];

export const ErrorMonitor = memo(function ErrorMonitor() {
  const errorsByType = useMonitoringStore((s) => s.metrics?.errorsByType);
  const errors = useMemo(() => errorsByType ?? [], [errorsByType]);
  const totalErrors = useMemo(() => errors.reduce((sum, e) => sum + e.count, 0), [errors]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-100">Error Monitor</h3>
        <p className="text-xs text-slate-400">Error distribution by type</p>
      </div>

      {errors.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
          No errors recorded
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {/* Pie chart */}
          <div className="flex-shrink-0" style={{ width: '40%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={errors}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {errors.map((_entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Error list */}
          <div className="flex-1 space-y-3 py-2">
            {errors.map((error, index) => {
              const color = COLORS[index % COLORS.length];
              const pct = totalErrors > 0 ? (error.count / totalErrors) * 100 : 0;
              return (
                <div key={error.type} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-slate-300 flex-1 truncate">{error.type}</span>
                    <span className="text-sm font-medium text-slate-100">{error.count}</span>
                  </div>
                  <div className="ml-4 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
