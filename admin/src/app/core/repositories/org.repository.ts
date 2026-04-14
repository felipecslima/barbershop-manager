import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { Org, CreateOrgDto, UpdateOrgDto } from '@shared/models/org.model';

@Injectable({ providedIn: 'root' })
export class OrgRepository {
  private readonly db = inject(SupabaseService).client;

  async getAll(): Promise<Org[]> {
    const { data, error } = await this.db
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getById(id: string): Promise<Org> {
    const { data, error } = await this.db
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async create(dto: CreateOrgDto & { created_by: string }): Promise<Org> {
    const { data, error } = await this.db
      .from('organizations')
      .insert(dto as unknown as Record<string, unknown>)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateOrgDto): Promise<Org> {
    const { data, error } = await this.db
      .from('organizations')
      .update(dto as Record<string, unknown>)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('organizations').delete().eq('id', id);
    if (error) throw error;
  }

  async count(): Promise<number> {
    const { count, error } = await this.db
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  }
}
