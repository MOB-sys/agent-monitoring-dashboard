import { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useMonitoringStore } from '../../store/useMonitoringStore';

export function Header() {
  const connected = useMonitoringStore((s) => s.connected);
  const currentView = useMonitoringStore((s) => s.currentView);
  const setCurrentView = useMonitoringStore((s) => s.setCurrentView);
  const alertEvents = useMonitoringStore((s) => s.alertEvents);
  const user = useMonitoringStore((s) => s.user);
  const isAuthenticated = useMonitoringStore((s) => s.isAuthenticated);
  const logout = useMonitoringStore((s) => s.logout);
  const anomalies = useMonitoringStore((s) => s.anomalies);
  const [currentTime, setCurrentTime] = useState(new Date());

  const firingCount = alertEvents.filter((e) => e.status === 'firing').length;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const recentAnomalyCount = anomalies.filter((a) => a.timestamp > fiveMinutesAgo).length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const viewLabels: Record<string, string> = {
    overview: 'Overview',
    agents: 'Agents',
    traces: 'Traces',
    alerts: 'Alerts',
    settings: 'Settings',
    cost: 'Cost',
    anomaly: 'Anomaly',
    audit: 'Audit',
    orchestration: 'Orchestration',
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 h-14 px-3 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3">
        <Activity className="w-5 h-5 text-blue-400" />
        <h1 className="hidden sm:block text-lg font-semibold text-slate-100">AI Agent Monitor</h1>
      </div>

      <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
        <span className="text-slate-600">/</span>
        <span className="text-slate-200">{viewLabels[currentView]}</span>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {recentAnomalyCount > 0 && (
          <button
            onClick={() => setCurrentView('anomaly')}
            className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg text-orange-400 hover:bg-slate-800 transition-colors"
            title="Recent anomalies"
          >
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="hidden sm:inline text-xs font-medium">{recentAnomalyCount} anomal{recentAnomalyCount === 1 ? 'y' : 'ies'}</span>
          </button>
        )}

        <button
          onClick={() => setCurrentView('alerts')}
          className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Alerts"
        >
          <Bell className={`w-5 h-5 ${firingCount > 0 ? 'text-red-400 animate-pulse' : ''}`} />
          {firingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
              {firingCount > 9 ? '9+' : firingCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="hidden md:inline w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline text-emerald-400">Connected</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <WifiOff className="hidden md:inline w-4 h-4 text-red-400" />
              <span className="hidden md:inline text-red-400">Disconnected</span>
            </>
          )}
        </div>

        <div className="hidden md:block text-sm text-slate-400 font-mono">
          {currentTime.toLocaleTimeString('en-US', { hour12: false })}
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-sm text-slate-200 leading-tight">{user.username}</span>
              <span className={`text-[10px] font-medium uppercase leading-tight ${
                user.role === 'admin'
                  ? 'text-purple-400'
                  : user.role === 'operator'
                  ? 'text-blue-400'
                  : 'text-slate-500'
              }`}>
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
