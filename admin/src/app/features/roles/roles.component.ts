import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
}

interface PermissionRow {
  id: string;
  name: string;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Roles & Permissions</h1>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">{{ error() }}</div>
      }

      <form class="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/5 md:grid-cols-3" (ngSubmit)="saveRole()">
        <input class="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-transparent" [(ngModel)]="form.name" name="name" placeholder="Role name" required />
        <input class="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-transparent" [(ngModel)]="form.description" name="description" placeholder="Description" />
        <button class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" type="submit">{{ editingRoleId() ? 'Update role' : 'Create role' }}</button>
      </form>

      <div class="grid gap-4 xl:grid-cols-2">
        @for (role of roles(); track role.id) {
          <article class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/5">
            <div class="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">{{ role.name }}</h3>
                <p class="text-sm text-gray-500">{{ role.description || 'No description' }}</p>
              </div>
              <div class="space-x-2">
                <button class="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700" (click)="editRole(role)">Edit</button>
                <button class="rounded border border-error-300 px-2 py-1 text-xs text-error-600" (click)="deleteRole(role.id)">Delete</button>
              </div>
            </div>

            <div class="space-y-2">
              @for (permission of permissions(); track permission.id) {
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    [checked]="hasPermission(role.id, permission.id)"
                    (change)="togglePermission(role.id, permission.id, $any($event.target).checked)"
                  />
                  {{ permission.name }}
                </label>
              }
            </div>
          </article>
        }
      </div>
    </div>
  `,
})
export class RolesComponent {
  private readonly supabaseService = inject(SupabaseService);

  readonly roles = signal<RoleRow[]>([]);
  readonly permissions = signal<PermissionRow[]>([]);
  readonly rolePermissionMap = signal<Record<string, Set<string>>>({});
  readonly error = signal<string | null>(null);
  readonly editingRoleId = signal<string | null>(null);
  readonly form: { name: string; description: string } = { name: '', description: '' };

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    const [rolesResult, permissionsResult, rolePermissionsResult] = await Promise.all([
      this.supabaseService.client.from('roles').select('id, name, description').order('name'),
      this.supabaseService.client.from('permissions').select('id, name').order('name'),
      this.supabaseService.client.from('role_permissions').select('role_id, permission_id'),
    ]);

    const firstError = rolesResult.error ?? permissionsResult.error ?? rolePermissionsResult.error;
    if (firstError) {
      this.error.set(firstError.message);
      return;
    }

    const map: Record<string, Set<string>> = {};
    (rolePermissionsResult.data ?? []).forEach((item: any) => {
      if (!map[item.role_id]) {
        map[item.role_id] = new Set<string>();
      }
      map[item.role_id].add(item.permission_id);
    });

    this.roles.set((rolesResult.data as RoleRow[]) ?? []);
    this.permissions.set((permissionsResult.data as PermissionRow[]) ?? []);
    this.rolePermissionMap.set(map);
  }

  hasPermission(roleId: string, permissionId: string): boolean {
    return this.rolePermissionMap()[roleId]?.has(permissionId) ?? false;
  }

  editRole(role: RoleRow): void {
    this.editingRoleId.set(role.id);
    this.form.name = role.name;
    this.form.description = role.description ?? '';
  }

  async saveRole(): Promise<void> {
    this.error.set(null);

    if (this.editingRoleId()) {
      const { error } = await this.supabaseService.client
        .from('roles')
        .update({ name: this.form.name, description: this.form.description })
        .eq('id', this.editingRoleId()!);

      if (error) {
        this.error.set(error.message);
        return;
      }
    } else {
      const { error } = await this.supabaseService.client
        .from('roles')
        .insert({ name: this.form.name, description: this.form.description });

      if (error) {
        this.error.set(error.message);
        return;
      }
    }

    this.editingRoleId.set(null);
    this.form.name = '';
    this.form.description = '';
    await this.loadData();
  }

  async deleteRole(roleId: string): Promise<void> {
    this.error.set(null);
    const { error } = await this.supabaseService.client.from('roles').delete().eq('id', roleId);

    if (error) {
      this.error.set(error.message);
      return;
    }

    await this.loadData();
  }

  async togglePermission(roleId: string, permissionId: string, checked: boolean): Promise<void> {
    this.error.set(null);

    const query = this.supabaseService.client.from('role_permissions');
    const { error } = checked
      ? await query.insert({ role_id: roleId, permission_id: permissionId })
      : await query.delete().eq('role_id', roleId).eq('permission_id', permissionId);

    if (error) {
      this.error.set(error.message);
      return;
    }

    await this.loadData();
  }
}
