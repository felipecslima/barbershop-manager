// Schema real: organization_id, não org_id. Sem campo status.
export interface Project {
  readonly id: string;
  readonly organization_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly owner_id: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateProjectDto {
  organization_id: string;
  name: string;
  description?: string;
  owner_id: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
}
