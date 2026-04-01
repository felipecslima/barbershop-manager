import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { DynamicFormComponent } from '../../shared/formly/dynamic-form.component';
import { OrganizationService } from '../../core/services/organization.service';
import { ProjectRepository } from '@core/repositories/project.repository';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-projects-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DynamicFormComponent],
  template: `
    <div class="max-w-2xl space-y-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ projectId() ? 'Edit project' : 'Create project' }}</h1>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">{{ error() }}</div>
      }

      <app-dynamic-form
        [form]="form"
        [fields]="fields"
        [model]="model"
        [loading]="loading()"
        [submitLabel]="projectId() ? 'Update project' : 'Create project'"
        (submitted)="saveProject()"
      />
    </div>
  `,
})
export class ProjectsFormComponent {
  private readonly projectRepo = inject(ProjectRepository);
  private readonly organizationService = inject(OrganizationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly projectId = input<string | null>(null);
  readonly form = new FormGroup({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly model: { name?: string; description?: string } = {};

  readonly fields: FormlyFieldConfig[] = [
    {
      key: 'name',
      type: 'input',
      props: { label: 'Name', placeholder: 'Project name', required: true },
    },
    {
      key: 'description',
      type: 'textarea',
      props: { label: 'Description', placeholder: 'Project description' },
    },
  ];

  async ngOnInit(): Promise<void> {
    if (this.projectId()) {
      await this.loadProject(this.projectId()!);
    }
  }

  private async loadProject(projectId: string): Promise<void> {
    try {
      const project = await this.projectRepo.getById(projectId);
      this.model.name = project.name;
      this.model.description = project.description ?? '';
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao carregar projeto.');
    }
  }

  async saveProject(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const organizationId = this.organizationService.currentOrganizationId();
    if (!organizationId) {
      this.error.set('Selecione uma organização antes de salvar projetos.');
      this.loading.set(false);
      return;
    }

    const user = this.authService.user();
    if (!user) {
      this.error.set('Você precisa estar autenticado.');
      this.loading.set(false);
      return;
    }

    try {
      if (this.projectId()) {
        await this.projectRepo.update(this.projectId()!, {
          name: this.model.name,
          description: this.model.description,
        });
      } else {
        await this.projectRepo.create({
          name: this.model.name!,
          description: this.model.description,
          organization_id: organizationId,
          owner_id: user.id,
        });
      }
      await this.router.navigateByUrl('/projects');
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao salvar projeto.');
    } finally {
      this.loading.set(false);
    }
  }
}
