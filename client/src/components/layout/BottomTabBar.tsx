import { LayoutDashboard, Bot, DollarSign, Bell, MoreHorizontal, GitBranch, Radar, FileText, Network, Settings, X } from 'lucide-react';
import { useMonitoringStore } from '../../store/useMonitoringStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';

type ViewId = 'overview' | 'agents' | 'traces' | 'alerts' | 'settings' | 'cost' | 'anomaly' | 'audit' | 'orchestration';

interface NavItem {
  id: ViewId;
  icon: React.ElementType;
  label: string;
  minRole?: 'admin' | 'operator';
}

const primaryTabs: NavItem[] = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'cost', icon: DollarSign, label: 'Cost' },
  { id: 'alerts', icon: Bell, label: 'Alerts', minRole: 'operator' },
];

const moreTabs: NavItem[] = [
  { id: 'traces', icon: GitBranch, label: 'Traces' },
  { id: 'anomaly', icon: Radar, label: 'Anomaly' },
  { id: 'audit', icon: FileText, label: 'Audit', minRole: 'admin' },
  { id: 'orchestration', icon: Network, label: 'Orchestration' },
  { id: 'settings', icon: Settings, label: 'Settings', minRole: 'operator' },
];

export function BottomTabBar() {
  const isMobile = useIsMobile();
  const currentView = useMonitoringStore((s) => s.currentView);
  const setCurrentView = useMonitoringStore((s) => s.setCurrentView);
  const moreMenuOpen = useMonitoringStore((s) => s.moreMenuOpen);
  const setMoreMenuOpen = useMonitoringStore((s) => s.setMoreMenuOpen);
  const alertEvents = useMonitoringStore((s) => s.alertEvents);
  const user = useMonitoringStore((s) => s.user);

  if (!isMobile) return null;

  const firingCount = alertEvents.filter((e) => e.status === 'firing').length;

  const filterByRole = (item: NavItem) => {
    if (item.minRole === 'admin' && user?.role !== 'admin') return false;
    if (item.minRole === 'operator' && user?.role === 'viewer') return false;
    return true;
  };

  const visiblePrimary = primaryTabs.filter(filterByRole);
  const visibleMore = moreTabs.filter(filterByRole);
  const isMoreActive = visibleMore.some((t) => t.id === currentView);

  return (
    <>
      {/* More menu popup sheet */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMoreMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-2xl safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-medium text-slate-300">More</span>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 px-4 pb-4">
              {visibleMore.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-xl transition-colors',
                      isActive
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'text-slate-400 active:bg-slate-800'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-slate-900 border-t border-slate-800 safe-bottom md:hidden">
        <div className="flex items-center justify-around h-full px-2">
          {visiblePrimary.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-500 active:text-slate-300'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
                {item.id === 'alerts' && firingCount > 0 && (
                  <span className="absolute top-2 right-1/2 translate-x-3 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                    {firingCount > 9 ? '9+' : firingCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
              isMoreActive || moreMenuOpen ? 'text-blue-400' : 'text-slate-500 active:text-slate-300'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
