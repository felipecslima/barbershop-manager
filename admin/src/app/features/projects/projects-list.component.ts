import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectRepository } from '@core/repositories/project.repository';
import { OrganizationService } from '../../core/services/organization.service';
import { Project } from '@shared/models/project.model';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Projects</h1>
        <a routerLink="/projects/new" class="inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">New project</a>
      </div>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">{{ error() }}</div>
      }

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5">
        <table class="min-w-full">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @for (project of projects(); track project.id) {
              <tr class="border-b border-gray-200 last:border-b-0 dark:border-gray-800">
                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ project.name }}</td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ project.description || '-' }}</td>
                <td class="px-4 py-3 text-right">
                  <a [routerLink]="['/projects', project.id, 'edit']" class="mr-2 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">Edit</a>
                  <button class="rounded border border-error-300 px-2 py-1 text-xs text-error-600" (click)="deleteProject(project.id)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="3" class="px-4 py-8 text-center text-sm text-gray-500">No projects found</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ProjectsListComponent {
  private readonly projectRepo = inject(ProjectRepository);
  private readonly organizationService = inject(OrganizationService);

  readonly projects = signal<Project[]>([]);
  readonly error = signal<string | null>(null);
  readonly organizationId = computed(() => this.organizationService.currentOrganizationId());

  constructor() {
    effect(() => {
      const orgId = this.organizationId();
      if (orgId) void this.loadProjects(orgId);
    });
  }

  async loadProjects(organizationId: string): Promise<void> {
    try {
      this.projects.set(await this.projectRepo.getByOrg(organizationId));
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao carregar projetos.');
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.projectRepo.delete(projectId);
      const orgId = this.organizationId();
      if (orgId) await this.loadProjects(orgId);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao remover projeto.');
    }
  }
}
