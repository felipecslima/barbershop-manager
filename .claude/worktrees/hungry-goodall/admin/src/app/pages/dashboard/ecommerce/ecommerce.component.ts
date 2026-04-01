import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ecommerce.component.html',
})
export class EcommerceComponent {
  private readonly supabaseService = inject(SupabaseService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly totalOrganizations = signal(0);
  readonly totalUsers = signal(0);
  readonly totalProjects = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadCounts();
  }

  async loadCounts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const [organizationsResult, usersResult, projectsResult] = await Promise.all([
      this.supabaseService.client.from('organizations').select('id', { count: 'exact', head: true }),
      this.supabaseService.client.from('profiles').select('id', { count: 'exact', head: true }),
      this.supabaseService.client.from('projects').select('id', { count: 'exact', head: true }),
    ]);

    const firstError = organizationsResult.error ?? usersResult.error ?? projectsResult.error;
    if (firstError) {
      this.error.set(firstError.message);
      this.loading.set(false);
      return;
    }

    this.totalOrganizations.set(organizationsResult.count ?? 0);
    this.totalUsers.set(usersResult.count ?? 0);
    this.totalProjects.set(projectsResult.count ?? 0);
    this.loading.set(false);
  }
}
