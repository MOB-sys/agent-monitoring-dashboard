import { create } from 'zustand';
import type { MetricsSnapshot, Activity, Trace, AlertRule, AlertEvent, NotificationChannel, User, AnomalyEvent, OrchestrationState } from '../types';

interface MonitoringState {
  connected: boolean;
  metrics: MetricsSnapshot | null;
  activities: Activity[];
  traces: Trace[];
  currentView: 'overview' | 'agents' | 'traces' | 'alerts' | 'settings' | 'cost' | 'anomaly' | 'audit' | 'orchestration';
  selectedAgentId: string | null;
  selectedTraceId: string | null;
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
  channels: NotificationChannel[];

  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Anomaly
  anomalies: AnomalyEvent[];

  // Orchestration
  orchestration: OrchestrationState | null;

  // Mobile UI
  moreMenuOpen: boolean;
}

interface MonitoringActions {
  setConnected: (connected: boolean) => void;
  updateMetrics: (metrics: MetricsSnapshot) => void;
  addActivity: (activity: Activity) => void;
  addTrace: (trace: Trace) => void;
  updateTrace: (trace: Trace) => void;
  setCurrentView: (view: MonitoringState['currentView']) => void;
  setSelectedAgentId: (id: string | null) => void;
  setSelectedTraceId: (id: string | null) => void;
  setAlertRules: (rules: AlertRule[]) => void;
  addAlertEvent: (event: AlertEvent) => void;
  updateAlertEvent: (event: AlertEvent) => void;
  setChannels: (channels: NotificationChannel[]) => void;

  // Auth
  setAuth: (user: User, token: string) => void;
  logout: () => void;

  // Anomaly
  addAnomaly: (event: AnomalyEvent) => void;

  // Orchestration
  updateOrchestration: (state: OrchestrationState) => void;

  // Mobile UI
  setMoreMenuOpen: (open: boolean) => void;
}

export const useMonitoringStore = create<MonitoringState & MonitoringActions>((set) => ({
  connected: false,
  metrics: null,
  activities: [],
  traces: [],
  currentView: 'overview',
  selectedAgentId: null,
  selectedTraceId: null,
  alertRules: [],
  alertEvents: [],
  channels: [],

  // Auth - check localStorage on init
  user: (() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('auth_token'),
  isAuthenticated: !!localStorage.getItem('auth_token'),

  anomalies: [],
  orchestration: null,
  moreMenuOpen: false,

  setConnected: (connected) => set({ connected }),
  updateMetrics: (metrics) => set({ metrics }),
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities].slice(0, 100),
  })),
  addTrace: (trace) => set((state) => ({
    traces: [trace, ...state.traces].slice(0, 50),
  })),
  updateTrace: (trace) => set((state) => ({
    traces: state.traces.map((t) => (t.id === trace.id ? trace : t)),
  })),
  setCurrentView: (currentView) => set({ currentView, selectedAgentId: null, selectedTraceId: null, moreMenuOpen: false }),
  setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
  setSelectedTraceId: (selectedTraceId) => set({ selectedTraceId }),
  setAlertRules: (alertRules) => set({ alertRules }),
  addAlertEvent: (event) => set((state) => ({
    alertEvents: [event, ...state.alertEvents].slice(0, 200),
  })),
  updateAlertEvent: (event) => set((state) => ({
    alertEvents: state.alertEvents.map((e) => e.id === event.id ? event : e),
  })),
  setChannels: (channels) => set({ channels }),

  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  addAnomaly: (event) => set((state) => ({
    anomalies: [event, ...state.anomalies].slice(0, 200),
  })),
  updateOrchestration: (orchestration) => set({ orchestration }),
  setMoreMenuOpen: (moreMenuOpen) => set({ moreMenuOpen }),
}));
