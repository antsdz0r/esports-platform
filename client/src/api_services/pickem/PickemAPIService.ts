import axios from "axios";
import { readItem } from "../../helpers/local_storage";
import type { PickemMatch, Leaderboard, PickemSummary } from "../../models/pickem/PickemTypes";

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

export const pickemApi = {
  async getMatches(limit = 60): Promise<ApiResp<PickemMatch[]>> {
    return axios
      .get<ApiResp<PickemMatch[]>>(`${BASE}pickem/matches`, { params: { limit }, headers: authHeader() })
      .then((r) => r.data)
      .catch(() => ({ success: false, message: "Failed to load matches" }));
  },

  async getMyPredictions(limit = 100): Promise<ApiResp<PickemMatch[]>> {
    return axios
      .get<ApiResp<PickemMatch[]>>(`${BASE}pickem/predictions`, { params: { limit }, headers: authHeader() })
      .then((r) => r.data)
      .catch(() => ({ success: false, message: "Failed to load your predictions" }));
  },

  async getLeaderboard(limit = 50): Promise<ApiResp<Leaderboard>> {
    return axios
      .get<ApiResp<Leaderboard>>(`${BASE}pickem/leaderboard`, { params: { limit }, headers: authHeader() })
      .then((r) => r.data)
      .catch(() => ({ success: false, message: "Failed to load leaderboard" }));
  },

  async getSummary(): Promise<ApiResp<PickemSummary>> {
    return axios
      .get<ApiResp<PickemSummary>>(`${BASE}pickem/summary`, { headers: authHeader() })
      .then((r) => r.data)
      .catch(() => ({ success: false, message: "Failed to load your stats" }));
  },

  async predict(matchId: number, side: 1 | 2): Promise<ApiResp<unknown>> {
    return axios
      .post<ApiResp<unknown>>(`${BASE}pickem/matches/${matchId}/predict`, { side }, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => ({ success: false, message: e?.response?.data?.message ?? "Failed to save your pick" }));
  },

  async removePrediction(matchId: number): Promise<ApiResp<unknown>> {
    return axios
      .delete<ApiResp<unknown>>(`${BASE}pickem/matches/${matchId}/predict`, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => ({ success: false, message: e?.response?.data?.message ?? "Failed to remove your pick" }));
  },
};
