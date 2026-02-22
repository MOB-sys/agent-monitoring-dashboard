import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ApiKeyManager } from './api-keys.js';
import type { LiveDataManager } from './live-data-manager.js';
import type {
  RawLLMCallEvent,
  RawToolCallEvent,
  RawActivityEvent,
  RawTraceEvent,
  RawEvent,
  AgentRegistration,
  AgentStatusUpdate,
  IngestBatchRequest,
} from './types.js';

function apiKeyMiddleware(apiKeyManager: ApiKeyManager) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.headers['x-api-key'] as string | undefined;
    if (!key || !apiKeyManager.validate(key)) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }
    next();
  };
}

export function createIngestRouter(
  liveDataManager: LiveDataManager,
  apiKeyManager: ApiKeyManager,
  onActivity?: (activity: any) => void,
  onTrace?: (trace: any) => void,
): Router {
  const router = Router();

  // Apply API key auth to all ingest routes
  router.use(apiKeyMiddleware(apiKeyManager));

  // POST /api/ingest/register - Register an agent
  router.post('/register', (req: Request, res: Response) => {
    const body = req.body as AgentRegistration;
    if (!body.agentId || !body.name || !body.model) {
      res.status(400).json({ error: 'agentId, name, and model are required' });
      return;
    }
    const agent = liveDataManager.registerAgent(body);
    res.json({ ok: true, agent });
  });

  // POST /api/ingest/batch - Receive a batch of events
  router.post('/batch', (req: Request, res: Response) => {
    const { events } = req.body as IngestBatchRequest;
    if (!Array.isArray(events)) {
      res.status(400).json({ error: 'events must be an array' });
      return;
    }

    let processed = 0;
    for (const event of events) {
      processEvent(liveDataManager, event, onActivity, onTrace);
      processed++;
    }

    res.json({ ok: true, processed });
  });

  // POST /api/ingest/activity - Send a single activity
  router.post('/activity', (req: Request, res: Response) => {
    const event = req.body as RawActivityEvent;
    if (!event.agentId || !event.activityType || !event.message) {
      res.status(400).json({ error: 'agentId, activityType, and message are required' });
      return;
    }

    if (!event.timestamp) event.timestamp = new Date().toISOString();
    const activity = liveDataManager.processActivity(event.agentId, event);
    if (activity && onActivity) onActivity(activity);
    res.json({ ok: true, activity });
  });

  // POST /api/ingest/status - Update agent status
  router.post('/status', (req: Request, res: Response) => {
    const update = req.body as AgentStatusUpdate;
    if (!update.agentId || !update.status) {
      res.status(400).json({ error: 'agentId and status are required' });
      return;
    }
    liveDataManager.updateAgentStatus(update.agentId, update);
    res.json({ ok: true });
  });

  // POST /api/ingest/trace - Send a complete trace
  router.post('/trace', (req: Request, res: Response) => {
    const event = req.body as RawTraceEvent;
    if (!event.agentId || !event.traceId) {
      res.status(400).json({ error: 'agentId and traceId are required' });
      return;
    }

    if (!event.timestamp) event.timestamp = new Date().toISOString();
    const trace = liveDataManager.processTrace(event.agentId, event);
    if (trace && onTrace) onTrace(trace);
    res.json({ ok: true, trace });
  });

  // POST /api/ingest/keys - Create a new API key
  router.post('/keys', (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    const record = apiKeyManager.createKey(name || 'unnamed');
    res.json({ ok: true, key: record.key, name: record.name, createdAt: record.createdAt });
  });

  // GET /api/ingest/keys - List API keys
  router.get('/keys', (_req: Request, res: Response) => {
    res.json(apiKeyManager.listKeys());
  });

  return router;
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
