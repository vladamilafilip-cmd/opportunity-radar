// worker/src/utils/apiKeyManager.ts
// Encrypted API key storage and retrieval for LIVE trading
// Keys are stored locally and never transmitted

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // Required for some exchanges like OKX
  subaccount?: string;
}

interface EncryptedStore {
  version: number;
  salt: string;
  iv: string;
  data: string;
  exchanges: string[]; // List of stored exchanges (not encrypted)
}

const STORE_PATH = path.join(process.cwd(), '.autopilot-keys.enc');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION_ITERATIONS = 100000;

export class ApiKeyManager {
  private passphrase: string | null = null;
  private decryptedKeys: Map<string, ExchangeCredentials> = new Map();

  /**
   * Initialize with passphrase (must be called before any operations)
   */
  async initialize(passphrase: string): Promise<boolean> {
    this.passphrase = passphrase;
    
    if (!this.storeExists()) {
      // First time - create empty store
      await this.saveStore({});
      return true;
    }

    // Try to decrypt existing store
    try {
      const keys = await this.loadStore();
      this.decryptedKeys = new Map(Object.entries(keys));
      return true;
    } catch {
      this.passphrase = null;
      return false;
    }
  }

  /**
   * Check if store file exists
   */
  storeExists(): boolean {
    return fs.existsSync(STORE_PATH);
  }

  /**
   * Set credentials for an exchange
   */
  async setCredentials(exchange: string, credentials: ExchangeCredentials): Promise<void> {
    if (!this.passphrase) {
      throw new Error('ApiKeyManager not initialized');
    }

    this.decryptedKeys.set(exchange.toLowerCase(), credentials);
    await this.saveStore(Object.fromEntries(this.decryptedKeys));
  }

  /**
   * Get credentials for an exchange
   */
  getCredentials(exchange: string): ExchangeCredentials | null {
    return this.decryptedKeys.get(exchange.toLowerCase()) || null;
  }

  /**
   * Remove credentials for an exchange
   */
  async removeCredentials(exchange: string): Promise<void> {
    if (!this.passphrase) {
      throw new Error('ApiKeyManager not initialized');
    }

    this.decryptedKeys.delete(exchange.toLowerCase());
    await this.saveStore(Object.fromEntries(this.decryptedKeys));
  }

  /**
   * List configured exchanges (without exposing keys)
   */
  listExchanges(): string[] {
    return Array.from(this.decryptedKeys.keys());
  }

  /**
   * Check if exchange has credentials configured
   */
  hasCredentials(exchange: string): boolean {
    return this.decryptedKeys.has(exchange.toLowerCase());
  }

  /**
   * Clear all keys from memory (call on shutdown)
   */
  clearFromMemory(): void {
    this.decryptedKeys.clear();
    this.passphrase = null;
  }

  // === PRIVATE METHODS ===

  private deriveKey(passphrase: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      passphrase,
      salt,
      KEY_DERIVATION_ITERATIONS,
      32,
      'sha256'
    );
  }

  private async saveStore(data: Record<string, ExchangeCredentials>): Promise<void> {
    if (!this.passphrase) {
      throw new Error('No passphrase set');
    }

    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const key = this.deriveKey(this.passphrase, salt);

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const jsonData = JSON.stringify(data);
    
    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    const store: EncryptedStore = {
      version: 1,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      data: encrypted + ':' + authTag.toString('base64'),
      exchanges: Object.keys(data),
    };

    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), { mode: 0o600 });
  }

  private async loadStore(): Promise<Record<string, ExchangeCredentials>> {
    if (!this.passphrase) {
      throw new Error('No passphrase set');
    }

    const storeContent = fs.readFileSync(STORE_PATH, 'utf8');
    const store: EncryptedStore = JSON.parse(storeContent);

    if (store.version !== 1) {
      throw new Error('Unsupported store version');
    }

    const salt = Buffer.from(store.salt, 'base64');
    const iv = Buffer.from(store.iv, 'base64');
    const [encryptedData, authTagStr] = store.data.split(':');
    const authTag = Buffer.from(authTagStr, 'base64');

    const key = this.deriveKey(this.passphrase, salt);

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

// Singleton instance
let instance: ApiKeyManager | null = null;

export function getApiKeyManager(): ApiKeyManager {
  if (!instance) {
    instance = new ApiKeyManager();
  }
  return instance;
}
