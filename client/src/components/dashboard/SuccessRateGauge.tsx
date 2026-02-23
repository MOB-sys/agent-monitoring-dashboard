import { memo, useMemo } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { useMonitoringStore } from '../../store/useMonitoringStore';

export const SuccessRateGauge = memo(function SuccessRateGauge() {
  const successRate = useMonitoringStore((s) => s.metrics?.overall?.successRate) ?? 0;

  const gaugeColor =
    successRate >= 95
      ? '#10b981'
      : successRate >= 85
        ? '#f59e0b'
        : '#ef4444';

  const gaugeColorLabel =
    successRate >= 95
      ? 'text-emerald-400'
      : successRate >= 85
        ? 'text-amber-400'
        : 'text-red-400';

  const data = useMemo(() => [
    {
      name: 'Success Rate',
      value: successRate,
      fill: gaugeColor,
    },
  ], [successRate, gaugeColor]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-slate-100">Success Rate</h3>
        <p className="text-xs text-slate-400">System Health</p>
      </div>

      <div className="relative h-[180px] md:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
            data={data}
            barSize={12}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: '#1e293b' }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={6}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${gaugeColorLabel}`}>
            {successRate.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-500 mt-1">of requests</span>
        </div>
      </div>

      {/* Threshold indicators */}
      <div className="flex items-center justify-between mt-2 px-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-slate-500">&lt;85%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-500">85-95%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">&ge;95%</span>
        </div>
      </div>
    </div>
  );
});
