import { LayoutDashboard, Bot, GitBranch, Bell, Settings, DollarSign, Radar, FileText, Network } from 'lucide-react';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import { cn } from '../../lib/utils';

const allNavItems = [
  { id: 'overview' as const, icon: LayoutDashboard, label: 'Overview' },
  { id: 'agents' as const, icon: Bot, label: 'Agents' },
  { id: 'traces' as const, icon: GitBranch, label: 'Traces' },
  { id: 'alerts' as const, icon: Bell, label: 'Alerts', minRole: 'operator' as const },
  { id: 'settings' as const, icon: Settings, label: 'Settings', minRole: 'operator' as const },
  { id: 'cost' as const, icon: DollarSign, label: 'Cost' },
  { id: 'anomaly' as const, icon: Radar, label: 'Anomaly' },
  { id: 'audit' as const, icon: FileText, label: 'Audit', minRole: 'admin' as const },
  { id: 'orchestration' as const, icon: Network, label: 'Orchestration' },
];

export function Sidebar() {
  const currentView = useMonitoringStore((s) => s.currentView);
  const setCurrentView = useMonitoringStore((s) => s.setCurrentView);
  const metrics = useMonitoringStore((s) => s.metrics);
  const alertEvents = useMonitoringStore((s) => s.alertEvents);
  const user = useMonitoringStore((s) => s.user);

  const activeAgents = metrics?.overall.activeAgents ?? 0;
  const firingCount = alertEvents.filter((e) => e.status === 'firing').length;

  return (
    <aside className="hidden md:flex w-16 bg-slate-900 border-r border-slate-800 flex-col items-center py-4 justify-between">
      <nav className="flex flex-col items-center gap-2">
        {allNavItems
          .filter((item) => {
            if (item.minRole === 'admin' && user?.role !== 'admin') return false;
            if (item.minRole === 'operator' && user?.role === 'viewer') return false;
            return true;
          })
          .map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                isActive
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.id === 'alerts' && firingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {firingCount > 9 ? '9+' : firingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <span className="text-xs font-mono text-slate-400">{activeAgents}</span>
        </div>
        <span className="text-[10px] text-slate-600">agents</span>
      </div>
    </aside>
  );
}
