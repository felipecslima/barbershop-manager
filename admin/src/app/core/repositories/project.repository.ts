import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { Project, CreateProjectDto, UpdateProjectDto } from '@shared/models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectRepository {
  private readonly db = inject(SupabaseService).client;

  async getByOrg(organizationId: string): Promise<Project[]> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getRecent(organizationId: string, limit = 5): Promise<Project[]> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  async getById(id: string): Promise<Project> {
    const { data, error } = await this.db
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const { data, error } = await this.db
      .from('projects')
      .insert(dto as unknown as Record<string, unknown>)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const { data, error } = await this.db
      .from('projects')
      .update(dto as Record<string, unknown>)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('projects').delete().eq('id', id);
    if (error) throw error;
  }

  async countByOrg(organizationId: string): Promise<number> {
    const { count, error } = await this.db
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    if (error) throw error;
    return count ?? 0;
  }
}
