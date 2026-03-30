import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../../core/services/organization.service';
import { SupabaseService } from '../../core/services/supabase.service';

interface MembershipRow {
  id: string;
  user_id: string;
  status: string;
  role_id: string;
  profiles: { email: string | null; full_name: string | null } | null;
}

interface RoleRow {
  id: string;
  name: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Users</h1>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">{{ error() }}</div>
      }

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5">
        <table class="min-w-full">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Profile</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Membership</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Role</th>
            </tr>
          </thead>
          <tbody>
            @for (membership of memberships(); track membership.id) {
              <tr class="border-b border-gray-200 last:border-b-0 dark:border-gray-800">
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                  <div>{{ membership.profiles?.full_name || 'No name' }}</div>
                  <div class="text-xs text-gray-500">{{ membership.profiles?.email || membership.user_id }}</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ membership.status }}</td>
                <td class="px-4 py-3">
                  <select
                    class="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm dark:border-gray-700"
                    [ngModel]="membership.role_id"
                    (ngModelChange)="updateRole(membership.id, $event)"
                  >
                    @for (role of roles(); track role.id) {
                      <option [ngValue]="role.id">{{ role.name }}</option>
                    }
                  </select>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="px-4 py-8 text-center text-sm text-gray-500">No memberships found for the selected organization.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class UsersComponent {
  private readonly supabaseService = inject(SupabaseService);
  private readonly organizationService = inject(OrganizationService);

  readonly memberships = signal<MembershipRow[]>([]);
  readonly roles = signal<RoleRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly organizationId = computed(() => this.organizationService.currentOrganizationId());

  constructor() {
    effect(() => {
      const organizationId = this.organizationId();
      if (organizationId) {
        void this.loadData(organizationId);
      }
    });
  }

  async loadData(organizationId: string): Promise<void> {
    this.error.set(null);

    const [membershipResult, rolesResult] = await Promise.all([
      this.supabaseService.client
        .from('memberships')
        .select('id, user_id, status, role_id, profiles(email, full_name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      this.supabaseService.client.from('roles').select('id, name').order('name', { ascending: true }),
    ]);

    const firstError = membershipResult.error ?? rolesResult.error;
    if (firstError) {
      this.error.set(firstError.message);
      return;
    }

    this.memberships.set((membershipResult.data as MembershipRow[]) ?? []);
    this.roles.set((rolesResult.data as RoleRow[]) ?? []);
  }

  async updateRole(membershipId: string, roleId: string): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId) {
      return;
    }

    const { error } = await this.supabaseService.client
      .from('memberships')
      .update({ role_id: roleId })
      .eq('id', membershipId)
      .eq('organization_id', organizationId);

    if (error) {
      this.error.set(error.message);
      return;
    }

    await this.loadData(organizationId);
  }
}
