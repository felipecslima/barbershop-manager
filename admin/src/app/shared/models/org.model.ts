export interface Org {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateOrgDto {
  name: string;
  slug: string;
}

export interface UpdateOrgDto {
  name?: string;
  slug?: string;
}
