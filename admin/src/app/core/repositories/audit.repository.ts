import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { AuditEntry } from '@shared/models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditRepository {
  private readonly db = inject(SupabaseService).client;

  async getRecent(organizationId: string, limit = 10): Promise<AuditEntry[]> {
    const { data, error } = await this.db
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  async getAll(organizationId: string): Promise<AuditEntry[]> {
    const { data, error } = await this.db
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
}
