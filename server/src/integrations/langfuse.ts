import type { Trace, TraceStep } from '../types.js';

interface LangfuseConfig {
  host: string;
  publicKey: string;
  secretKey: string;
  enabled: boolean;
}

export class LangfuseIntegration {
  private config: LangfuseConfig = {
    host: '',
    publicKey: '',
    secretKey: '',
    enabled: false,
  };

  getConfig(): Omit<LangfuseConfig, 'secretKey'> & { secretKey: string } {
    return {
      ...this.config,
      secretKey: this.config.secretKey ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '',
    };
  }

  updateConfig(updates: Partial<LangfuseConfig>) {
    this.config = { ...this.config, ...updates };
  }

  isConfigured(): boolean {
    return !!(this.config.enabled && this.config.host && this.config.publicKey && this.config.secretKey);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'Langfuse is not configured' };
    }

    try {
      const res = await fetch(`${this.config.host}/api/public/health`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        return { success: true, message: 'Connected to Langfuse successfully' };
      }
      return { success: false, message: `Connection failed: ${res.status} ${res.statusText}` };
    } catch (err: any) {
      return { success: false, message: `Connection error: ${err.message}` };
    }
  }

  async fetchTraces(limit = 20): Promise<Trace[]> {
    if (!this.isConfigured()) return [];

    try {
      const res = await fetch(`${this.config.host}/api/public/traces?limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map(this.transformTrace);
    } catch {
      return [];
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.config.publicKey}:${this.config.secretKey}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  private transformTrace(raw: any): Trace {
    return {
      id: raw.id || `lf-${Date.now()}`,
      agentId: raw.metadata?.agentId || 'external',
      agentName: raw.name || 'Langfuse Trace',
      startTime: raw.timestamp || new Date().toISOString(),
      endTime: raw.endTime || null,
      status: raw.status === 'ERROR' ? 'failed' : 'completed',
      totalDuration: raw.latency || null,
      totalTokens: (raw.usage?.input || 0) + (raw.usage?.output || 0),
      totalCost: raw.calculatedTotalCost || 0,
      steps: (raw.observations || []).map((obs: any): TraceStep => ({
        id: obs.id || `step-${Date.now()}`,
        type: obs.type === 'GENERATION' ? 'llm_call' : obs.type === 'SPAN' ? 'processing' : 'tool_call',
        name: obs.name || 'Unknown Step',
        startTime: obs.startTime || new Date().toISOString(),
        endTime: obs.endTime || null,
        duration: obs.latency || null,
        status: obs.status === 'ERROR' ? 'failed' : 'completed',
        input: typeof obs.input === 'string' ? obs.input : JSON.stringify(obs.input || ''),
        output: typeof obs.output === 'string' ? obs.output : JSON.stringify(obs.output || ''),
        tokensInput: obs.usage?.input || 0,
        tokensOutput: obs.usage?.output || 0,
        cost: obs.calculatedCost || 0,
        model: obs.model || null,
        error: obs.statusMessage || null,
      })),
    };
  }
}
