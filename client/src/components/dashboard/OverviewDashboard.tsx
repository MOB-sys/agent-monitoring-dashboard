import { memo } from 'react';
import { SummaryCards } from './SummaryCards';
import { SuccessRateGauge } from './SuccessRateGauge';
import { LatencyChart } from './LatencyChart';
import { TokenConsumptionChart } from './TokenConsumptionChart';
import { CostChart } from './CostChart';
import { ErrorMonitor } from './ErrorMonitor';
import { TaskQueue } from './TaskQueue';
import { ActivityLog } from './ActivityLog';

export const OverviewDashboard = memo(function OverviewDashboard() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Row 1: Summary Cards */}
      <SummaryCards />

      {/* Row 2: Success Rate Gauge + Latency Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SuccessRateGauge />
        <div className="lg:col-span-2">
          <LatencyChart />
        </div>
      </div>

      {/* Row 3: Token Consumption + Cost Estimation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TokenConsumptionChart />
        <CostChart />
      </div>

      {/* Row 4: Error Monitor + Task Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorMonitor />
        <TaskQueue />
      </div>

      {/* Row 5: Activity Log */}
      <ActivityLog />
    </div>
  );
});
