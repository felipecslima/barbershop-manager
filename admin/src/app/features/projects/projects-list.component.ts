import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { OrganizationService } from '../../core/services/organization.service';

interface Project {
  id: string;
  name: string;
  description: string | null;
}

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Projects</h1>
        <a
          routerLink="/projects/create"
          class="inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          New project
        </a>
      </div>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {{ error() }}
        </div>
      }

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5">
        <table class="min-w-full">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
            </tr>
          </thead>
          <tbody>
            @for (project of projects(); track project.id) {
              <tr class="border-b border-gray-200 last:border-b-0 dark:border-gray-800">
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ project.name }}</td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ project.description || '-' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="2" class="px-4 py-8 text-center text-sm text-gray-500">No projects found</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ProjectsListComponent {
  private readonly supabaseService = inject(SupabaseService);
  private readonly organizationService = inject(OrganizationService);

  readonly projects = signal<Project[]>([]);
  readonly error = signal<string | null>(null);
  readonly organizationId = computed(() => this.organizationService.currentOrganizationId());

  async ngOnInit(): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId) {
      this.error.set('Select an organization to view projects.');
      return;
    }

    const { data, error } = await this.supabaseService.client
      .from('projects')
      .select('id, name, description')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.projects.set((data as Project[]) ?? []);
  }
}
