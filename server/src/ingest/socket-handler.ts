import type { Server } from 'socket.io';
import type { ApiKeyManager } from './api-keys.js';
import type { LiveDataManager } from './live-data-manager.js';
import type {
  AgentRegistration,
  RawEvent,
  RawLLMCallEvent,
  RawToolCallEvent,
  RawActivityEvent,
  RawTraceEvent,
  AgentStatusUpdate,
} from './types.js';

export function setupIngestNamespace(
  io: Server,
  liveDataManager: LiveDataManager,
  apiKeyManager: ApiKeyManager,
  onActivity?: (activity: any) => void,
  onTrace?: (trace: any) => void,
): void {
  const ingestNs = io.of('/ingest');

  // Auth middleware for the namespace
  ingestNs.use((socket, next) => {
    const apiKey = socket.handshake.auth?.apiKey as string | undefined;
    if (!apiKey || !apiKeyManager.validate(apiKey)) {
      next(new Error('Invalid API key'));
      return;
    }
    next();
  });

  ingestNs.on('connection', (socket) => {
    console.log(`[Ingest] SDK connected: ${socket.id}`);

    // Agent registration
    socket.on('agent:register', (data: AgentRegistration, ack?: (res: any) => void) => {
      if (!data.agentId || !data.name || !data.model) {
        ack?.({ error: 'agentId, name, and model are required' });
        return;
      }
      const agent = liveDataManager.registerAgent(data);
      ack?.({ ok: true, agent });
    });

    // Batch events
    socket.on('events:batch', (data: { events: RawEvent[] }, ack?: (res: any) => void) => {
      if (!Array.isArray(data?.events)) {
        ack?.({ error: 'events must be an array' });
        return;
      }

      let processed = 0;
      for (const event of data.events) {
        processEvent(liveDataManager, event, onActivity, onTrace);
        processed++;
      }
      ack?.({ ok: true, processed });
    });

    // Activity report
    socket.on('activity:report', (data: RawActivityEvent, ack?: (res: any) => void) => {
      if (!data.agentId || !data.activityType || !data.message) {
        ack?.({ error: 'agentId, activityType, and message are required' });
        return;
      }
      if (!data.timestamp) data.timestamp = new Date().toISOString();
      const activity = liveDataManager.processActivity(data.agentId, data);
      if (activity && onActivity) onActivity(activity);
      ack?.({ ok: true });
    });

    // Agent status update
    socket.on('agent:status', (data: AgentStatusUpdate, ack?: (res: any) => void) => {
      if (!data.agentId || !data.status) {
        ack?.({ error: 'agentId and status are required' });
        return;
      }
      liveDataManager.updateAgentStatus(data.agentId, data);
      ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      console.log(`[Ingest] SDK disconnected: ${socket.id}`);
    });
  });
}

function processEvent(
  liveDataManager: LiveDataManager,
  event: RawEvent,
  onActivity?: (activity: any) => void,
  onTrace?: (trace: any) => void,
): void {
  switch (event.type) {
    case 'llm_call':
      liveDataManager.processLLMCall(event.agentId, event as RawLLMCallEvent);
      break;
    case 'tool_call':
      liveDataManager.processToolCall(event.agentId, event as RawToolCallEvent);
      break;
    case 'activity': {
      const activity = liveDataManager.processActivity(event.agentId, event as RawActivityEvent);
      if (activity && onActivity) onActivity(activity);
      break;
    }
    case 'trace': {
      const trace = liveDataManager.processTrace(event.agentId, event as RawTraceEvent);
      if (trace && onTrace) onTrace(trace);
      break;
    }
  }
}
