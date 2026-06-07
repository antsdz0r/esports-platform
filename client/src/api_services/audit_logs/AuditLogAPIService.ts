import axios from "axios";
import type { IAuditLogAPIService, PaginatedResponse } from "./IAuditLogAPIService";
import type { AuditLogDto } from "../../models/audit/AuditLogTypes";
import { readItem } from "../../helpers/local_storage";

const BASE = import.meta.env.VITE_API_URL + "audits";

const authHeader = () => {
  const token = readItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const makeError = <T>(fallback: string): PaginatedResponse<T> => ({
  success: false,
  message: fallback,
  data: undefined as T,
});

export const auditLogApi: IAuditLogAPIService = {
  async getAll(page, limit) {
    return axios
      .get<PaginatedResponse<AuditLogDto[]>>(`${BASE}/logs`, {
        params: { page, limit },
        headers: authHeader(),
      })
      .then((r) => r.data)
      .catch(() => makeError<AuditLogDto[]>("Neuspešno učitavanje audit loga"));
  },
};
