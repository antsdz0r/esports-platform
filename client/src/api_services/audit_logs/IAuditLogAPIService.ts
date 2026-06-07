import type { AuditLogDto, PaginationMeta } from "../../models/audit/AuditLogTypes";

export type PaginatedResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
};

export interface IAuditLogAPIService {
  getAll(page: number, limit: number): Promise<PaginatedResponse<AuditLogDto[]>>;
}
