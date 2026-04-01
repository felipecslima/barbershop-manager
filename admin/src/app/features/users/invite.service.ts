import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase/supabase.service';

export interface InviteUserDto {
  email: string;
  organization_id: string;
  role_id?: string;
}

export interface InviteResult {
  success: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class InviteService {
  private readonly supabase = inject(SupabaseService).client;

  async invite(dto: InviteUserDto): Promise<InviteResult> {
    const { data, error } = await this.supabase.functions.invoke('invite-user', {
      body: dto,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if ((data as any)?.error) {
      return { success: false, error: (data as any).error };
    }

    return { success: true, error: null };
  }
}
