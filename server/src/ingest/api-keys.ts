import crypto from 'crypto';

interface ApiKeyRecord {
  key: string;
  name: string;
  createdAt: string;
  active: boolean;
}

export class ApiKeyManager {
  private keys: Map<string, ApiKeyRecord> = new Map();

  constructor() {
    // Use env var or generate a default development key
    const envKey = process.env.INGEST_API_KEY;
    if (envKey) {
      this.keys.set(envKey, {
        key: envKey,
        name: 'default (env)',
        createdAt: new Date().toISOString(),
        active: true,
      });
    } else {
      const devKey = this.generateKey();
      this.keys.set(devKey, {
        key: devKey,
        name: 'default (auto-generated)',
        createdAt: new Date().toISOString(),
        active: true,
      });
      console.log(`[Ingest] Auto-generated API key: ${devKey}`);
    }
  }

  private generateKey(): string {
    return 'amp_' + crypto.randomBytes(24).toString('hex');
  }

  createKey(name: string): ApiKeyRecord {
    const key = this.generateKey();
    const record: ApiKeyRecord = {
      key,
      name,
      createdAt: new Date().toISOString(),
      active: true,
    };
    this.keys.set(key, record);
    return record;
  }

  validate(key: string): boolean {
    const record = this.keys.get(key);
    return record !== undefined && record.active;
  }

  listKeys(): Array<{ key: string; name: string; createdAt: string; active: boolean }> {
    return Array.from(this.keys.values()).map((r) => ({
      key: r.key.slice(0, 8) + '...' + r.key.slice(-4),
      name: r.name,
      createdAt: r.createdAt,
      active: r.active,
    }));
  }

  revokeKey(keyPrefix: string): boolean {
    for (const [fullKey, record] of this.keys.entries()) {
      if (fullKey.startsWith(keyPrefix) || fullKey.endsWith(keyPrefix.slice(-4))) {
        record.active = false;
        return true;
      }
    }
    return false;
  }

  /** Returns the first active key (for display/dev purposes) */
  getDefaultKey(): string | null {
    for (const [key, record] of this.keys.entries()) {
      if (record.active) return key;
    }
    return null;
  }
}
