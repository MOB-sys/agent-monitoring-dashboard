import { io, type Socket } from 'socket.io-client';
import type { TransportAdapter } from './base.js';
import type { RawEvent, RawActivityEvent, RawTraceEvent, AgentRegistration } from '../types.js';

export class WebSocketTransport implements TransportAdapter {
  private readonly serverUrl: string;
  private readonly apiKey: string;
  private readonly debug: boolean;
  private socket: Socket | null = null;

  constructor(serverUrl: string, apiKey: string, debug = false) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.debug = debug;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(`${this.serverUrl}/ingest`, {
        auth: { apiKey: this.apiKey },
        transports: ['websocket'],
      });

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        if (this.debug) console.log('[SDK/WS] Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${err.message}`));
      });

      if (this.debug) {
        this.socket.on('disconnect', (reason) => {
          console.log(`[SDK/WS] Disconnected: ${reason}`);
        });
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.debug) console.log('[SDK/WS] Disconnected');
  }

  async sendBatch(events: RawEvent[]): Promise<void> {
    return this.emit('events:batch', { events });
  }

  async sendActivity(event: RawActivityEvent): Promise<void> {
    return this.emit('activity:report', event);
  }

  async sendTrace(event: RawTraceEvent): Promise<void> {
    // Traces go through batch channel
    return this.emit('events:batch', { events: [event] });
  }

  async registerAgent(registration: AgentRegistration): Promise<void> {
    return this.emit('agent:register', registration);
  }

  async updateStatus(agentId: string, status: string, currentTask?: string | null): Promise<void> {
    return this.emit('agent:status', { agentId, status, currentTask });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private emit(event: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      if (this.debug) console.log(`[SDK/WS] Emit: ${event}`);

      this.socket.emit(event, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });

      // Timeout for ack
      setTimeout(() => resolve(), 5000);
    });
  }
}
