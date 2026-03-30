import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { ThemeToggleButtonComponent } from '../../components/common/theme-toggle/theme-toggle-button.component';
import { NotificationDropdownComponent } from '../../components/header/notification-dropdown/notification-dropdown.component';
import { UserDropdownComponent } from '../../components/header/user-dropdown/user-dropdown.component';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { RbacService } from '../../../core/services/rbac.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleButtonComponent,
    NotificationDropdownComponent,
    UserDropdownComponent,
  ],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly organizationService = inject(OrganizationService);
  private readonly rbacService = inject(RbacService);
  private readonly router = inject(Router);

  isApplicationMenuOpen = false;
  readonly isMobileOpen$;
  readonly user = this.authService.user;
  readonly organizations = this.organizationService.organizations;
  readonly currentOrganization = this.organizationService.currentOrganization;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(public sidebarService: SidebarService) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/signin');
  }

  async switchOrganization(organizationId: string): Promise<void> {
    this.organizationService.setCurrentOrganization(organizationId);
    const userId = this.user()?.id;
    const selectedOrganizationId = this.organizationService.currentOrganizationId();

    if (userId && selectedOrganizationId) {
      await this.rbacService.loadForOrganization(userId, selectedOrganizationId);
    }
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  };
}
