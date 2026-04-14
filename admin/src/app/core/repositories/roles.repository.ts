import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
}

export interface PermissionRow {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class RolesRepository {
  private readonly db = inject(SupabaseService).client;

  async getRoles(): Promise<RoleRow[]> {
    const { data, error } = await this.db
      .from('roles')
      .select('id, name, description')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getPermissions(): Promise<PermissionRow[]> {
    const { data, error } = await this.db
      .from('permissions')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getRolePermissions(): Promise<{ role_id: string; permission_id: string }[]> {
    const { data, error } = await this.db
      .from('role_permissions')
      .select('role_id, permission_id');
    if (error) throw error;
    return data ?? [];
  }

  async createRole(name: string, description: string): Promise<void> {
    const { error } = await this.db.from('roles').insert({ name, description } as Record<string, unknown>);
    if (error) throw error;
  }

  async updateRole(id: string, name: string, description: string): Promise<void> {
    const { error } = await this.db
      .from('roles')
      .update({ name, description } as Record<string, unknown>)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteRole(id: string): Promise<void> {
    const { error } = await this.db.from('roles').delete().eq('id', id);
    if (error) throw error;
  }

  async addPermission(roleId: string, permissionId: string): Promise<void> {
    const { error } = await this.db
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId } as Record<string, unknown>);
    if (error) throw error;
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const { error } = await this.db
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);
    if (error) throw error;
  }
}
