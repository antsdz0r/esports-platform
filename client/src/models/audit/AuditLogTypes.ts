export interface AuditLogDto {
  id: number;
  userId: number | null;
  action: string;
  entity: string | null;
  entityId: number | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
