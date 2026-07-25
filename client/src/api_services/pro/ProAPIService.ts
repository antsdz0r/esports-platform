import axios from "axios";
import { readItem } from "../../helpers/local_storage";
import type { ProMatch } from "../../models/pro/ProTypes";

const BASE = import.meta.env.VITE_API_URL;

const authHeader = () => {
  const token = readItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface ApiResp<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const proApi = {
  async getMatches(limit = 40): Promise<ApiResp<ProMatch[]>> {
    return axios
      .get<ApiResp<ProMatch[]>>(`${BASE}pro/matches`, { params: { limit } })
      .then((r) => r.data)
      .catch(() => ({ success: false, message: "Neuspešno učitavanje pro mečeva" }));
  },

  async sync(game?: string): Promise<ApiResp<{ synced: number }>> {
    return axios
      .post<ApiResp<{ synced: number }>>(`${BASE}pro/sync`, game ? { game } : {}, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => ({ success: false, message: e?.response?.data?.message ?? "Sinhronizacija neuspešna" }));
  },
};
