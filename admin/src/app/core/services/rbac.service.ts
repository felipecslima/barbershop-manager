import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class RbacService {
  private readonly rolesSignal = signal<string[]>([]);
  private readonly permissionsSignal = signal<string[]>([]);

  readonly roles = this.rolesSignal.asReadonly();
  readonly permissions = this.permissionsSignal.asReadonly();
  readonly isLoaded = computed(
    () => this.rolesSignal().length > 0 || this.permissionsSignal().length > 0
  );

  constructor(private readonly supabaseService: SupabaseService) {}

  async loadForOrganization(userId: string, organizationId: string): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('memberships')
      .select('role:roles(name, permissions(name))')
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    const roleNames = new Set<string>();
    const permissionNames = new Set<string>();

    (data ?? []).forEach((item: any) => {
      if (item.role?.name) {
        roleNames.add(item.role.name);
      }

      (item.role?.permissions ?? []).forEach((permission: any) => {
        if (permission?.name) {
          permissionNames.add(permission.name);
        }
      });
    });

    this.rolesSignal.set(Array.from(roleNames));
    this.permissionsSignal.set(Array.from(permissionNames));
  }

  hasRole(role: string): boolean {
    return this.rolesSignal().includes(role);
  }

  hasPermission(permission: string): boolean {
    return this.permissionsSignal().includes(permission);
  }
}
