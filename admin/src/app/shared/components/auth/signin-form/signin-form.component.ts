import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { AuthService } from '../../../../core/services/auth.service';
import { DynamicFormComponent } from '../../../formly/dynamic-form.component';
import { OrganizationService } from '../../../../core/services/organization.service';
import { RbacService } from '../../../../core/services/rbac.service';

@Component({
  selector: 'app-signin-form',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormlyModule,
    DynamicFormComponent,
  ],
  templateUrl: './signin-form.component.html',
})
export class SigninFormComponent {
  private readonly authService = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly rbacService = inject(RbacService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = new FormGroup({});
  readonly model: { email?: string; password?: string } = {};

  readonly fields: FormlyFieldConfig[] = [
    {
      key: 'email',
      type: 'input',
      props: {
        label: 'Email',
        type: 'email',
        placeholder: 'info@gmail.com',
        required: true,
      },
      validators: {
        validation: ['email'],
      },
    },
    {
      key: 'password',
      type: 'input',
      props: {
        label: 'Password',
        type: 'password',
        placeholder: 'Enter your password',
        required: true,
      },
    },
  ];

  async onSignIn(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);

    const error = await this.authService.login(
      this.model.email ?? '',
      this.model.password ?? ''
    );

    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
      return;
    }

    const userId = this.authService.getUser()?.id;
    if (userId) {
      await this.organizationService.loadOrganizationsForUser(userId);
      const organizationId = this.organizationService.currentOrganizationId();
      if (organizationId) {
        await this.rbacService.loadForOrganization(userId, organizationId);
      }
    }

    this.loading.set(false);
    await this.router.navigateByUrl('/');
  }
}
