import type { Request, Response, NextFunction } from 'express';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent: string;
}

class AuditLogger {
  private entries: AuditEntry[] = [];
  private counter = 0;

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        // Skip metrics and health endpoints to reduce noise
        if (req.path === '/metrics' || req.path === '/api/health') return;

        this.counter++;
        const entry: AuditEntry = {
          id: `audit-${this.counter}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: req.user?.userId || null,
          username: req.user?.username || null,
          role: req.user?.role || null,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime: Date.now() - start,
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        };
        this.entries.unshift(entry);
        if (this.entries.length > 1000) this.entries.pop();
      });

      next();
    };
  }

  getEntries(filters?: { userId?: string; method?: string; path?: string; limit?: number }): AuditEntry[] {
    let result = this.entries;
    if (filters?.userId) result = result.filter(e => e.userId === filters.userId);
    if (filters?.method) result = result.filter(e => e.method === filters.method);
    if (filters?.path) result = result.filter(e => e.path.includes(filters.path!));
    const limit = filters?.limit || 100;
    return result.slice(0, limit);
  }

  getStats() {
    const last100 = this.entries.slice(0, 100);
    const methods: Record<string, number> = {};
    const users: Record<string, number> = {};
    let totalResponseTime = 0;

    for (const entry of last100) {
      methods[entry.method] = (methods[entry.method] || 0) + 1;
      if (entry.username) users[entry.username] = (users[entry.username] || 0) + 1;
      totalResponseTime += entry.responseTime;
    }

    return {
      totalEntries: this.entries.length,
      avgResponseTime: last100.length > 0 ? totalResponseTime / last100.length : 0,
      methodBreakdown: methods,
      userBreakdown: users,
    };
  }
}

export const auditLogger = new AuditLogger();
