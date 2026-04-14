import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesRepository, RoleRow, PermissionRow } from '@core/repositories/roles.repository';

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
  private readonly rolesRepo = inject(RolesRepository);

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
    try {
      const [roles, permissions, rolePermissions] = await Promise.all([
        this.rolesRepo.getRoles(),
        this.rolesRepo.getPermissions(),
        this.rolesRepo.getRolePermissions(),
      ]);

      const map: Record<string, Set<string>> = {};
      rolePermissions.forEach((item) => {
        if (!map[item.role_id]) map[item.role_id] = new Set<string>();
        map[item.role_id].add(item.permission_id);
      });

      this.roles.set(roles);
      this.permissions.set(permissions);
      this.rolePermissionMap.set(map);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao carregar dados.');
    }
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
    try {
      if (this.editingRoleId()) {
        await this.rolesRepo.updateRole(this.editingRoleId()!, this.form.name, this.form.description);
      } else {
        await this.rolesRepo.createRole(this.form.name, this.form.description);
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao salvar role.');
      return;
    }
    this.editingRoleId.set(null);
    this.form.name = '';
    this.form.description = '';
    await this.loadData();
  }

  async deleteRole(roleId: string): Promise<void> {
    this.error.set(null);
    try {
      await this.rolesRepo.deleteRole(roleId);
      await this.loadData();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao remover role.');
    }
  }

  async togglePermission(roleId: string, permissionId: string, checked: boolean): Promise<void> {
    this.error.set(null);
    try {
      if (checked) {
        await this.rolesRepo.addPermission(roleId, permissionId);
      } else {
        await this.rolesRepo.removePermission(roleId, permissionId);
      }
      await this.loadData();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao atualizar permissão.');
    }
  }
}
