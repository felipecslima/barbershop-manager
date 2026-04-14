import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OrgRepository } from '@core/repositories/org.repository';
import { ProjectRepository } from '@core/repositories/project.repository';
import { MemberRepository } from '@core/repositories/member.repository';
import { AuditRepository } from '@core/repositories/audit.repository';
import { OrganizationService } from '../../../core/services/organization.service';
import { Project } from '@shared/models/project.model';
import { AuditEntry } from '@shared/models/audit.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './ecommerce.component.html',
})
export class EcommerceComponent {
  private readonly orgRepo = inject(OrgRepository);
  private readonly projectRepo = inject(ProjectRepository);
  private readonly memberRepo = inject(MemberRepository);
  private readonly auditRepo = inject(AuditRepository);
  private readonly organizationService = inject(OrganizationService);

  readonly currentOrgId = computed(() => this.organizationService.currentOrganizationId());

  // Métricas
  readonly totalOrgs = signal<number>(0);
  readonly totalProjects = signal<number>(0);
  readonly totalMembers = signal<number>(0);
  readonly loadingMetrics = signal(true);
  readonly errorMetrics = signal<string | null>(null);

  // Projetos recentes
  readonly recentProjects = signal<Project[]>([]);
  readonly loadingProjects = signal(true);
  readonly errorProjects = signal<string | null>(null);

  // Feed de atividade
  readonly recentActivity = signal<AuditEntry[]>([]);
  readonly loadingActivity = signal(true);
  readonly errorActivity = signal<string | null>(null);

  constructor() {
    effect(() => {
      const orgId = this.currentOrgId();
      this.loadMetrics(orgId);
      this.loadRecentProjects(orgId);
      this.loadRecentActivity(orgId);
    });
  }

  async loadMetrics(orgId: string | null = null): Promise<void> {
    this.loadingMetrics.set(true);
    this.errorMetrics.set(null);
    try {
      if (orgId) {
        const [orgs, projects, members] = await Promise.all([
          this.orgRepo.count(),
          this.projectRepo.countByOrg(orgId),
          this.memberRepo.countByOrg(orgId),
        ]);
        this.totalOrgs.set(orgs);
        this.totalProjects.set(projects);
        this.totalMembers.set(members);
      } else {
        const orgs = await this.orgRepo.count();
        this.totalOrgs.set(orgs);
        this.totalProjects.set(0);
        this.totalMembers.set(0);
      }
    } catch {
      this.errorMetrics.set('Erro ao carregar métricas.');
    } finally {
      this.loadingMetrics.set(false);
    }
  }

  async loadRecentProjects(orgId: string | null = null): Promise<void> {
    this.loadingProjects.set(true);
    this.errorProjects.set(null);
    try {
      const projects = orgId ? await this.projectRepo.getRecent(orgId, 5) : [];
      this.recentProjects.set(projects);
    } catch {
      this.errorProjects.set('Erro ao carregar projetos recentes.');
    } finally {
      this.loadingProjects.set(false);
    }
  }

  async loadRecentActivity(orgId: string | null = null): Promise<void> {
    this.loadingActivity.set(true);
    this.errorActivity.set(null);
    try {
      const activity = orgId ? await this.auditRepo.getRecent(orgId, 10) : [];
      this.recentActivity.set(activity);
    } catch {
      this.errorActivity.set('Erro ao carregar atividade recente.');
    } finally {
      this.loadingActivity.set(false);
    }
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      insert: 'Criou',
      update: 'Atualizou',
      delete: 'Removeu',
    };
    return map[action] ?? action;
  }

  actionColor(action: string): string {
    const map: Record<string, string> = {
      insert: 'bg-success-100 text-success-700 dark:bg-success-500/10 dark:text-success-400',
      update: 'bg-warning-100 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
      delete: 'bg-error-100 text-error-700 dark:bg-error-500/10 dark:text-error-400',
    };
    return map[action] ?? 'bg-gray-100 text-gray-700';
  }
}
