// Schema real: actor_id (não user_id), sem updated_at
export interface AuditEntry {
  readonly id: string;
  readonly organization_id: string | null;
  readonly actor_id: string | null;
  readonly action: 'insert' | 'update' | 'delete';
  readonly table_name: string;
  readonly record_id: string | null;
  readonly old_data: Record<string, unknown> | null;
  readonly new_data: Record<string, unknown> | null;
  readonly created_at: string;
}
