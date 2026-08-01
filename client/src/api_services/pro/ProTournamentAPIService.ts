import axios from "axios";
import { readItem } from "../../helpers/local_storage";
import type {
  ProLeagueDto, ProSerieDto, ProTournamentListDto, ProTournamentDetailDto,
} from "../../models/pro/ProTournamentTypes";

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

const fail = <T>(msg: string): ApiResp<T> => ({ success: false, message: msg });

export const proTournamentApi = {
  async getGames(): Promise<ApiResp<string[]>> {
    return axios.get<ApiResp<string[]>>(`${BASE}pro/games`).then((r) => r.data).catch(() => fail<string[]>("Greška"));
  },

  async getLeagues(gameSlug: string): Promise<ApiResp<ProLeagueDto[]>> {
    return axios.get<ApiResp<ProLeagueDto[]>>(`${BASE}pro/games/${gameSlug}/leagues`).then((r) => r.data).catch(() => fail<ProLeagueDto[]>("Greška"));
  },

  async getActive(gameSlug: string): Promise<ApiResp<ProTournamentListDto[]>> {
    return axios.get<ApiResp<ProTournamentListDto[]>>(`${BASE}pro/games/${gameSlug}/tournaments/active`).then((r) => r.data).catch(() => fail<ProTournamentListDto[]>("Greška"));
  },

  async getSeries(leagueExternalId: string): Promise<ApiResp<ProSerieDto[]>> {
    return axios.get<ApiResp<ProSerieDto[]>>(`${BASE}pro/leagues/${leagueExternalId}/series`).then((r) => r.data).catch(() => fail<ProSerieDto[]>("Greška"));
  },

  async getTournaments(serieExternalId: string): Promise<ApiResp<ProTournamentListDto[]>> {
    return axios.get<ApiResp<ProTournamentListDto[]>>(`${BASE}pro/series/${serieExternalId}/tournaments`).then((r) => r.data).catch(() => fail<ProTournamentListDto[]>("Greška"));
  },

  async getDetail(externalId: string): Promise<ApiResp<ProTournamentDetailDto>> {
    return axios.get<ApiResp<ProTournamentDetailDto>>(`${BASE}pro/tournaments/${externalId}`).then((r) => r.data).catch(() => fail<ProTournamentDetailDto>("Greška pri učitavanju turnira"));
  },

  async syncStructure(): Promise<ApiResp<{ leagues: number; series: number; tournaments: number }>> {
    return axios.post<ApiResp<{ leagues: number; series: number; tournaments: number }>>(`${BASE}pro/structure/sync`, {}, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => fail<{ leagues: number; series: number; tournaments: number }>(e?.response?.data?.message ?? "Sync neuspešan"));
  },

  // ── Favoriti (omiljeni pro turniri) ──
  async getFavoriteIds(): Promise<ApiResp<string[]>> {
    return axios.get<ApiResp<string[]>>(`${BASE}pro/favorites/ids`, { headers: authHeader() }).then((r) => r.data).catch(() => fail<string[]>("Greška"));
  },

  async listFavorites(): Promise<ApiResp<ProTournamentListDto[]>> {
    return axios.get<ApiResp<ProTournamentListDto[]>>(`${BASE}pro/favorites`, { headers: authHeader() }).then((r) => r.data).catch(() => fail<ProTournamentListDto[]>("Greška"));
  },

  async addFavorite(externalId: string): Promise<ApiResp<unknown>> {
    return axios.post<ApiResp<unknown>>(`${BASE}pro/favorites/${externalId}`, {}, { headers: authHeader() }).then((r) => r.data).catch((e) => fail<unknown>(e?.response?.data?.message ?? "Greška"));
  },

  async removeFavorite(externalId: string): Promise<ApiResp<unknown>> {
    return axios.delete<ApiResp<unknown>>(`${BASE}pro/favorites/${externalId}`, { headers: authHeader() }).then((r) => r.data).catch((e) => fail<unknown>(e?.response?.data?.message ?? "Greška"));
  },
};
