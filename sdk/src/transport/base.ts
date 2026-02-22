import type { RawEvent, RawActivityEvent, RawTraceEvent, AgentRegistration } from '../types.js';

export interface TransportAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendBatch(events: RawEvent[]): Promise<void>;
  sendActivity(event: RawActivityEvent): Promise<void>;
  sendTrace(event: RawTraceEvent): Promise<void>;
  registerAgent(registration: AgentRegistration): Promise<void>;
  updateStatus(agentId: string, status: string, currentTask?: string | null): Promise<void>;
  isConnected(): boolean;
}
