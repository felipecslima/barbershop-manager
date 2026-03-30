import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
}

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

      <form class="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/5 md:grid-cols-3" (ngSubmit)="saveOrganization()">
        <input class="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-transparent" placeholder="Organization name" [(ngModel)]="form.name" name="name" required />
        <input class="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-transparent" placeholder="Slug" [(ngModel)]="form.slug" name="slug" required />
        <button class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" type="submit">
          {{ editingId() ? 'Update' : 'Create' }}
        </button>
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
  private readonly supabaseService = inject(SupabaseService);

  readonly organizations = signal<OrganizationRow[]>([]);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly form: { name: string; slug: string } = { name: '', slug: '' };

  async ngOnInit(): Promise<void> {
    await this.loadOrganizations();
  }

  async loadOrganizations(): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('organizations')
      .select('id, name, slug')
      .order('created_at', { ascending: false });

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.organizations.set((data as OrganizationRow[]) ?? []);
  }

  editOrganization(organization: OrganizationRow): void {
    this.editingId.set(organization.id);
    this.form.name = organization.name;
    this.form.slug = organization.slug;
  }

  async saveOrganization(): Promise<void> {
    this.error.set(null);

    if (this.editingId()) {
      const { error } = await this.supabaseService.client
        .from('organizations')
        .update({ name: this.form.name, slug: this.form.slug })
        .eq('id', this.editingId()!);

      if (error) {
        this.error.set(error.message);
        return;
      }
    } else {
      const {
        data: { user },
      } = await this.supabaseService.client.auth.getUser();

      if (!user) {
        this.error.set('You must be logged in to create organizations.');
        return;
      }

      const { error } = await this.supabaseService.client.from('organizations').insert({
        name: this.form.name,
        slug: this.form.slug,
        created_by: user.id,
      });

      if (error) {
        this.error.set(error.message);
        return;
      }
    }

    this.editingId.set(null);
    this.form.name = '';
    this.form.slug = '';
    await this.loadOrganizations();
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    this.error.set(null);
    const { error } = await this.supabaseService.client.from('organizations').delete().eq('id', organizationId);

    if (error) {
      this.error.set(error.message);
      return;
    }

    await this.loadOrganizations();
  }
}
