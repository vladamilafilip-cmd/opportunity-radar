// worker/src/utils/auditLog.ts
// Audit logging utility for autopilot actions

import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditLevel = 'info' | 'warn' | 'error' | 'action';
export type EntityType = 'position' | 'config' | 'risk' | 'system' | 'opportunity';

interface AuditLogEntry {
  level: AuditLevel;
  action: string;
  entity_type?: EntityType | null;
  entity_id?: string | null;
  details?: Record<string, unknown>;
}

export class AuditLog {
  private supabase: SupabaseClient;
  private buffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient, flushIntervalMs: number = 5000) {
    this.supabase = supabase;
    
    // Periodic flush
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }

  async log(
    level: AuditLevel,
    action: string,
    entityType?: EntityType | null,
    entityId?: string | null,
    details?: Record<string, unknown>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      level,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      details: details ?? {},
    };

    // Log to console
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'action' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${action}] ${entityType ? `${entityType}:${entityId ?? 'n/a'}` : ''}`);
    if (details && Object.keys(details).length > 0) {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }

    // Add to buffer
    this.buffer.push(entry);

    // Flush immediately for errors
    if (level === 'error') {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const { error } = await this.supabase
        .from('autopilot_audit_log')
        .insert(entries.map(e => ({
          level: e.level,
          action: e.action,
          entity_type: e.entity_type,
          entity_id: e.entity_id,
          details: e.details,
        })));

      if (error) {
        console.error('[AuditLog] Failed to flush:', error);
        // Re-add to buffer on failure
        this.buffer.push(...entries);
      }
    } catch (err) {
      console.error('[AuditLog] Flush error:', err);
      this.buffer.push(...entries);
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}
