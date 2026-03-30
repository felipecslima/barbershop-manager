import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { DynamicFormComponent } from '../../shared/formly/dynamic-form.component';
import { OrganizationService } from '../../core/services/organization.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-projects-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DynamicFormComponent],
  template: `
    <div class="max-w-2xl space-y-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Create project</h1>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {{ error() }}
        </div>
      }

      <app-dynamic-form
        [form]="form"
        [fields]="fields"
        [model]="model"
        [loading]="loading()"
        submitLabel="Create project"
        (submitted)="createProject()"
      />
    </div>
  `,
})
export class ProjectsCreateComponent {
  private readonly supabaseService = inject(SupabaseService);
  private readonly organizationService = inject(OrganizationService);
  private readonly router = inject(Router);

  readonly form = new FormGroup({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly model: { name?: string; description?: string } = {};

  readonly fields: FormlyFieldConfig[] = [
    {
      key: 'name',
      type: 'input',
      props: {
        label: 'Name',
        placeholder: 'Project name',
        required: true,
      },
    },
    {
      key: 'description',
      type: 'textarea',
      props: {
        label: 'Description',
        placeholder: 'Project description',
      },
    },
  ];

  async createProject(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const organizationId = this.organizationService.currentOrganizationId();
    if (!organizationId) {
      this.error.set('Select an organization before creating a project.');
      this.loading.set(false);
      return;
    }

    const { error } = await this.supabaseService.client.from('projects').insert({
      name: this.model.name,
      description: this.model.description,
      organization_id: organizationId,
    });

    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
      return;
    }

    this.loading.set(false);
    await this.router.navigateByUrl('/projects');
  }
}
