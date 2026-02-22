import type { TransportAdapter } from './base.js';
import type { RawEvent, RawActivityEvent, RawTraceEvent, AgentRegistration } from '../types.js';

export class RestTransport implements TransportAdapter {
  private readonly serverUrl: string;
  private readonly apiKey: string;
  private readonly debug: boolean;
  private connected = false;

  constructor(serverUrl: string, apiKey: string, debug = false) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.debug = debug;
  }

  async connect(): Promise<void> {
    // Test connection with a health check
    try {
      const res = await fetch(`${this.serverUrl}/api/health`);
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      this.connected = true;
      if (this.debug) console.log('[SDK/REST] Connected to server');
    } catch (err) {
      throw new Error(`Failed to connect to ${this.serverUrl}: ${(err as Error).message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.debug) console.log('[SDK/REST] Disconnected');
  }

  async sendBatch(events: RawEvent[]): Promise<void> {
    await this.post('/api/ingest/batch', { events });
  }

  async sendActivity(event: RawActivityEvent): Promise<void> {
    await this.post('/api/ingest/activity', event);
  }

  async sendTrace(event: RawTraceEvent): Promise<void> {
    await this.post('/api/ingest/trace', event);
  }

  async registerAgent(registration: AgentRegistration): Promise<void> {
    await this.post('/api/ingest/register', registration);
  }

  async updateStatus(agentId: string, status: string, currentTask?: string | null): Promise<void> {
    await this.post('/api/ingest/status', { agentId, status, currentTask });
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async post(path: string, body: any): Promise<any> {
    const url = `${this.serverUrl}${path}`;
    if (this.debug) console.log(`[SDK/REST] POST ${path}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`POST ${path} failed (${res.status}): ${text}`);
    }

    return res.json();
  }
}
