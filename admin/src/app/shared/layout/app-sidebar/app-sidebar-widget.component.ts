import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { RbacService } from '../../../core/services/rbac.service';

@Component({
  selector: 'app-sidebar-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (organizations().length > 0) {
      <div class="mx-auto mb-6 w-full max-w-60 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Organização
        </p>
        <p class="mb-3 truncate text-sm font-medium text-gray-800 dark:text-white">
          {{ currentOrganization()?.name ?? '—' }}
        </p>

        @if (organizations().length > 1) {
          <select
            class="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            [value]="currentOrganization()?.id ?? ''"
            (change)="switchOrg($any($event.target).value)"
          >
            @for (org of organizations(); track org.id) {
              <option [value]="org.id">{{ org.name }}</option>
            }
          </select>
        }
      </div>
    }
  `,
})
export class SidebarWidgetComponent {
  private readonly organizationService = inject(OrganizationService);
  private readonly authService = inject(AuthService);
  private readonly rbacService = inject(RbacService);

  readonly organizations = this.organizationService.organizations;
  readonly currentOrganization = this.organizationService.currentOrganization;

  async switchOrg(organizationId: string): Promise<void> {
    this.organizationService.setCurrentOrganization(organizationId);
    const userId = this.authService.user()?.id;
    if (userId && organizationId) {
      await this.rbacService.loadForOrganization(userId, organizationId);
    }
  }
}
