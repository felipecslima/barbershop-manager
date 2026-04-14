import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../../core/services/organization.service';
import { SupabaseService } from '../../core/services/supabase.service';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  active: boolean;
}

const emptyForm = () => ({ name: '', description: '', price_cents: 0, duration_minutes: 30, active: true });

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">Serviços</h1>

      @if (error()) {
        <div class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {{ error() }}
        </div>
      }

      <!-- Form -->
      <form
        class="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/5 md:grid-cols-6"
        (ngSubmit)="save()"
      >
        <input
          class="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent dark:text-white"
          placeholder="Nome do serviço *"
          [(ngModel)]="form.name"
          name="name"
          required
        />
        <input
          class="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent dark:text-white"
          placeholder="Descrição"
          [(ngModel)]="form.description"
          name="description"
        />
        <div class="flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
            <input
              class="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm dark:border-gray-700 dark:bg-transparent dark:text-white"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              [ngModel]="form.price_cents / 100"
              (ngModelChange)="form.price_cents = $event * 100"
              name="price"
            />
          </div>
          <div class="relative flex-1">
            <input
              class="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm dark:border-gray-700 dark:bg-transparent dark:text-white"
              type="number"
              min="1"
              placeholder="30"
              [(ngModel)]="form.duration_minutes"
              name="duration"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
          </div>
        </div>
        <button
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          type="submit"
          [disabled]="saving()"
        >
          {{ editingId() ? 'Atualizar' : 'Adicionar' }}
        </button>
      </form>

      <!-- Table -->
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5">
        @if (loading()) {
          <div class="px-4 py-10 text-center text-sm text-gray-500">Carregando...</div>
        } @else {
          <table class="min-w-full">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/5">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Nome</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Descrição</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Preço</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Duração</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (svc of services(); track svc.id) {
                <tr class="border-b border-gray-200 last:border-b-0 dark:border-gray-800">
                  <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{{ svc.name }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ svc.description || '-' }}</td>
                  <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{{ svc.price_cents / 100 | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ svc.duration_minutes }} min</td>
                  <td class="px-4 py-3">
                    <button
                      class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      [class]="svc.active
                        ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'"
                      (click)="toggleActive(svc)"
                    >
                      {{ svc.active ? 'Ativo' : 'Inativo' }}
                    </button>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button class="mr-2 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700" (click)="edit(svc)">Editar</button>
                    <button class="rounded border border-error-300 px-2 py-1 text-xs text-error-600" (click)="remove(svc.id)">Excluir</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-4 py-10 text-center text-sm text-gray-500">Nenhum serviço cadastrado.</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class ServicesComponent {
  private readonly supabaseService = inject(SupabaseService);
  private readonly organizationService = inject(OrganizationService);

  readonly services = signal<Service[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);

  form = emptyForm();

  readonly organizationId = computed(() => this.organizationService.currentOrganizationId());

  constructor() {
    effect(() => {
      const orgId = this.organizationId();
      if (orgId) void this.load(orgId);
    });
  }

  async load(orgId: string): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.supabaseService.client
      .from('services')
      .select('id, name, description, price_cents, duration_minutes, active')
      .eq('organization_id', orgId)
      .order('name');

    if (error) { this.error.set(error.message); this.loading.set(false); return; }
    this.services.set((data as Service[]) ?? []);
    this.loading.set(false);
  }

  edit(svc: Service): void {
    this.editingId.set(svc.id);
    this.form = { name: svc.name, description: svc.description ?? '', price_cents: svc.price_cents, duration_minutes: svc.duration_minutes, active: svc.active };
  }

  async save(): Promise<void> {
    const orgId = this.organizationId();
    if (!orgId) return;
    this.saving.set(true);
    this.error.set(null);

    const payload = { ...this.form, organization_id: orgId };

    const { error } = this.editingId()
      ? await this.supabaseService.client.from('services').update(payload).eq('id', this.editingId()!)
      : await this.supabaseService.client.from('services').insert(payload);

    if (error) { this.error.set(error.message); this.saving.set(false); return; }

    this.editingId.set(null);
    this.form = emptyForm();
    this.saving.set(false);
    await this.load(orgId);
  }

  async toggleActive(svc: Service): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('services')
      .update({ active: !svc.active })
      .eq('id', svc.id);
    if (error) { this.error.set(error.message); return; }
    const orgId = this.organizationId();
    if (orgId) await this.load(orgId);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.client.from('services').delete().eq('id', id);
    if (error) { this.error.set(error.message); return; }
    const orgId = this.organizationId();
    if (orgId) await this.load(orgId);
  }
}
