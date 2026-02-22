import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { auditLogger } from '../audit/logger.js';

export function createAuditRouter(): Router {
  const router = Router();

  router.get('/logs', requireAuth, requireRole('admin'), (req, res) => {
    const filters = {
      userId: req.query.userId as string | undefined,
      method: req.query.method as string | undefined,
      path: req.query.path as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    };
    res.json(auditLogger.getEntries(filters));
  });

  router.get('/stats', requireAuth, requireRole('admin'), (_req, res) => {
    res.json(auditLogger.getStats());
  });

  return router;
}
