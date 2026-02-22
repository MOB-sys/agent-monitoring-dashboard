import { Router } from 'express';
import type { LangfuseIntegration } from '../integrations/langfuse.js';

export function createIntegrationRouter(langfuse: LangfuseIntegration): Router {
  const router = Router();

  // Langfuse config
  router.get('/langfuse', (_req, res) => {
    res.json(langfuse.getConfig());
  });

  router.put('/langfuse', (req, res) => {
    langfuse.updateConfig(req.body);
    res.json(langfuse.getConfig());
  });

  router.post('/langfuse/test', async (_req, res) => {
    const result = await langfuse.testConnection();
    res.json(result);
  });

  router.get('/langfuse/traces', async (_req, res) => {
    const traces = await langfuse.fetchTraces();
    res.json(traces);
  });

  // OTLP receiver endpoint (accepts traces in OTLP JSON format)
  router.post('/otlp/v1/traces', (req, res) => {
    const { resourceSpans } = req.body;
    if (!resourceSpans) {
      return res.status(400).json({ error: 'Invalid OTLP trace format' });
    }
    // Log received spans (in production, would process and store)
    console.log(`Received OTLP traces: ${resourceSpans.length} resource span(s)`);
    res.json({ status: 'ok', received: resourceSpans.length });
  });

  return router;
}
