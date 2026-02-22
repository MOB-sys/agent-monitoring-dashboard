import { Router } from 'express';
import type { AlertEngine } from '../alerts/engine.js';

export function createAlertRouter(engine: AlertEngine): Router {
  const router = Router();

  // Rules CRUD
  router.get('/rules', (_req, res) => {
    res.json(engine.getRules());
  });

  router.post('/rules', (req, res) => {
    const rule = engine.addRule(req.body);
    res.status(201).json(rule);
  });

  router.put('/rules/:id', (req, res) => {
    const result = engine.updateRule(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Rule not found' });
    res.json(result);
  });

  router.delete('/rules/:id', (req, res) => {
    const deleted = engine.deleteRule(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Rule not found' });
    res.status(204).send();
  });

  // Alert history
  router.get('/history', (_req, res) => {
    res.json(engine.getHistory());
  });

  // Channels CRUD
  router.get('/channels', (_req, res) => {
    res.json(engine.getChannels());
  });

  router.post('/channels', (req, res) => {
    const channel = engine.addChannel(req.body);
    res.status(201).json(channel);
  });

  router.put('/channels/:id', (req, res) => {
    const result = engine.updateChannel(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Channel not found' });
    res.json(result);
  });

  router.delete('/channels/:id', (req, res) => {
    const deleted = engine.deleteChannel(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Channel not found' });
    res.status(204).send();
  });

  return router;
}
