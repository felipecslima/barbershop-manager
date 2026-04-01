import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Organization {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly organizationsSignal = signal<Organization[]>([]);
  private readonly currentOrganizationSignal = signal<Organization | null>(null);

  readonly organizations = this.organizationsSignal.asReadonly();
  readonly currentOrganization = this.currentOrganizationSignal.asReadonly();
  readonly currentOrganizationId = computed(
    () => this.currentOrganizationSignal()?.id ?? null
  );

  constructor(private readonly supabaseService: SupabaseService) {}

  async loadOrganizationsForUser(userId: string): Promise<void> {
    const { data } = await this.supabaseService.client
      .from('memberships')
      .select('organization_id, organizations(id, name)')
      .eq('user_id', userId);

    const organizations =
      data
        ?.map((item: any) => item.organizations)
        .filter(Boolean)
        .map((item: any) => ({ id: item.id, name: item.name })) ?? [];

    this.organizationsSignal.set(organizations);

    if (!this.currentOrganizationSignal() && organizations.length > 0) {
      this.currentOrganizationSignal.set(organizations[0]);
    }
  }

  setCurrentOrganization(organizationId: string): void {
    const selected = this.organizationsSignal().find((org) => org.id === organizationId) ?? null;
    this.currentOrganizationSignal.set(selected);
  }
}
