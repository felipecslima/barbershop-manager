import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';
import { Member } from '@shared/models/member.model';

@Injectable({ providedIn: 'root' })
export class MemberRepository {
  private readonly db = inject(SupabaseService).client;

  async getByOrg(organizationId: string): Promise<Member[]> {
    const { data, error } = await this.db
      .from('memberships')
      .select(`
        id, organization_id, user_id, role_id, status, created_at, updated_at,
        profiles ( email, full_name ),
        roles ( name )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((m: any) => ({
      id: m.id,
      organization_id: m.organization_id,
      user_id: m.user_id,
      role_id: m.role_id,
      role_name: m.roles?.name ?? null,
      status: m.status,
      email: m.profiles?.email ?? null,
      full_name: m.profiles?.full_name ?? null,
      created_at: m.created_at,
      updated_at: m.updated_at,
    }));
  }

  async countByOrg(organizationId: string): Promise<number> {
    const { count, error } = await this.db
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    if (error) throw error;
    return count ?? 0;
  }

  async updateRole(memberId: string, roleId: string, organizationId: string): Promise<void> {
    const { error } = await this.db
      .from('memberships')
      .update({ role_id: roleId })
      .eq('id', memberId)
      .eq('organization_id', organizationId);
    if (error) throw error;
  }

  async remove(memberId: string): Promise<void> {
    const { error } = await this.db.from('memberships').delete().eq('id', memberId);
    if (error) throw error;
  }
}
