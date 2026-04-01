import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { DynamicFormComponent } from '../../shared/formly/dynamic-form.component';
import { OrganizationService } from '../../core/services/organization.service';
import { SupabaseService } from '../../core/services/supabase.service';

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
  private readonly supabaseService = inject(SupabaseService);
  private readonly organizationService = inject(OrganizationService);
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
    const { data, error } = await this.supabaseService.client
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .single();

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.model.name = data.name;
    this.model.description = data.description ?? '';
  }

  async saveProject(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const organizationId = this.organizationService.currentOrganizationId();
    if (!organizationId) {
      this.error.set('Select an organization before saving projects.');
      this.loading.set(false);
      return;
    }

    const {
      data: { user },
    } = await this.supabaseService.client.auth.getUser();

    if (!user) {
      this.error.set('You must be signed in.');
      this.loading.set(false);
      return;
    }

    const payload = {
      name: this.model.name,
      description: this.model.description,
      organization_id: organizationId,
      owner_id: user.id,
    };

    const { error } = this.projectId()
      ? await this.supabaseService.client.from('projects').update(payload).eq('id', this.projectId()!)
      : await this.supabaseService.client.from('projects').insert(payload);

    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
      return;
    }

    this.loading.set(false);
    await this.router.navigateByUrl('/projects');
  }
}
