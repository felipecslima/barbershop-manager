// Schema real: organization_id, role_id (uuid) — não role string direto
export interface Member {
  readonly id: string;
  readonly organization_id: string;
  readonly user_id: string;
  readonly role_id: string;
  readonly role_name: string | null;
  readonly status: 'active' | 'invited' | 'suspended';
  readonly email: string | null;
  readonly full_name: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
