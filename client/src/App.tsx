import { useSocket } from './hooks/useSocket';
import { useMonitoringStore } from './store/useMonitoringStore';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { AgentDetailView } from './components/agents/AgentDetailView';
import { TraceDetailView } from './components/traces/TraceDetailView';
import { AlertPanel } from './components/alerts/AlertPanel';
import { IntegrationSettings } from './components/settings/IntegrationSettings';
import { LoginPage } from './components/auth/LoginPage';
import { CostDashboard } from './components/cost/CostDashboard';
import { AnomalyView } from './components/anomaly/AnomalyView';
import { AuditLog } from './components/audit/AuditLog';
import { OrchestrationView } from './components/orchestration/OrchestrationView';
import { BottomTabBar } from './components/layout/BottomTabBar';

function AuthenticatedApp() {
  useSocket();
  const currentView = useMonitoringStore((s) => s.currentView);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          {currentView === 'overview' && <OverviewDashboard />}
          {currentView === 'agents' && <AgentDetailView />}
          {currentView === 'traces' && <TraceDetailView />}
          {currentView === 'alerts' && <AlertPanel />}
          {currentView === 'settings' && <IntegrationSettings />}
          {currentView === 'cost' && <CostDashboard />}
          {currentView === 'anomaly' && <AnomalyView />}
          {currentView === 'audit' && <AuditLog />}
          {currentView === 'orchestration' && <OrchestrationView />}
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}

export default function App() {
  const isAuthenticated = useMonitoringStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}
