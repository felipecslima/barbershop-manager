import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrgRepository } from '@core/repositories/org.repository';
import { AuthService } from '@core/auth/auth.service';
import { Org } from '@shared/models/org.model';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Organizations</h1>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {{ error() }}
        </div>
      }

      <form class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/5" (ngSubmit)="saveOrganization()">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="md:col-span-2 space-y-1">
            <input
              class="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
              placeholder="Organization name"
              [(ngModel)]="form.name"
              name="name"
              required
              (ngModelChange)="onNameChange($event)"
            />
            <p class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <span>Slug:</span>
              <span class="font-mono text-gray-600 dark:text-gray-300">{{ form.slug || '—' }}</span>
            </p>
          </div>
          <button class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" type="submit">
            {{ editingId() ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5">
        <table class="min-w-full">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Slug</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @for (organization of organizations(); track organization.id) {
              <tr class="border-b border-gray-200 last:border-b-0 dark:border-gray-800">
                <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ organization.name }}</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ organization.slug }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="mr-2 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700" (click)="editOrganization(organization)">Edit</button>
                  <button class="rounded border border-error-300 px-2 py-1 text-xs text-error-600" (click)="deleteOrganization(organization.id)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="px-4 py-8 text-center text-sm text-gray-500">No organizations available.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class OrganizationsComponent {
  private readonly orgRepo = inject(OrgRepository);
  private readonly authService = inject(AuthService);

  readonly organizations = signal<Org[]>([]);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly form: { name: string; slug: string } = { name: '', slug: '' };

  async ngOnInit(): Promise<void> {
    await this.loadOrganizations();
  }

  async loadOrganizations(): Promise<void> {
    try {
      this.organizations.set(await this.orgRepo.getAll());
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao carregar organizações.');
    }
  }

  onNameChange(name: string): void {
    // Só auto-gera o slug se for criação (não edição)
    if (!this.editingId()) {
      this.form.slug = this.toSlug(name);
    }
  }

  private toSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // remove acentos
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')      // remove caracteres especiais
      .replace(/\s+/g, '-')              // espaços → hífens
      .replace(/-+/g, '-');              // hífens duplos → simples
  }

  editOrganization(org: Org): void {
    this.editingId.set(org.id);
    this.form.name = org.name;
    this.form.slug = org.slug;
  }

  async saveOrganization(): Promise<void> {
    this.error.set(null);
    try {
      if (this.editingId()) {
        await this.orgRepo.update(this.editingId()!, { name: this.form.name, slug: this.form.slug });
      } else {
        const user = this.authService.user();
        if (!user) {
          this.error.set('Você precisa estar autenticado para criar organizações.');
          return;
        }
        await this.orgRepo.create({ name: this.form.name, slug: this.form.slug, created_by: user.id });
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao salvar organização.');
      return;
    }
    this.editingId.set(null);
    this.form.name = '';
    this.form.slug = '';
    await this.loadOrganizations();
  }

  async deleteOrganization(id: string): Promise<void> {
    this.error.set(null);
    try {
      await this.orgRepo.delete(id);
      await this.loadOrganizations();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao remover organização.');
    }
  }
}
