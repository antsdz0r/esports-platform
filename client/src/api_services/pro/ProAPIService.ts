import axios from "axios";
import { readItem } from "../../helpers/local_storage";
import type { ProMatch, ProStreamAdmin } from "../../models/pro/ProTypes";

export interface AddProStreamData {
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  language: string;
}

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

  async getMatchStreams(matchId: number): Promise<ApiResp<ProStreamAdmin[]>> {
    return axios
      .get<ApiResp<ProStreamAdmin[]>>(`${BASE}pro/matches/${matchId}/streams`, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => ({ success: false, message: e?.response?.data?.message ?? "Neuspešno učitavanje streamova" }));
  },

  async addStream(matchId: number, data: AddProStreamData): Promise<ApiResp<ProStreamAdmin>> {
    return axios
      .post<ApiResp<ProStreamAdmin>>(`${BASE}pro/matches/${matchId}/streams`, data, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => ({ success: false, message: e?.response?.data?.message ?? "Neuspešno dodavanje streama" }));
  },

  async removeStream(streamId: number): Promise<ApiResp<unknown>> {
    return axios
      .delete<ApiResp<unknown>>(`${BASE}pro/streams/${streamId}`, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => ({ success: false, message: e?.response?.data?.message ?? "Neuspešno brisanje streama" }));
  },
};
