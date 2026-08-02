import axios from "axios";
import type { IStreamAPIService, ApiResponse } from "./IStreamAPIService";
import type { MatchStream, StreamInput } from "../../models/stream/StreamTypes";
import { readItem } from "../../helpers/local_storage";

const BASE = import.meta.env.VITE_API_URL;

const authHeader = () => {
  const token = readItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const makeError = <T>(fallback: string): ApiResponse<T> => ({
  success: false,
  message: fallback,
  data: undefined,
});

export const streamApi: IStreamAPIService = {
  async getForMatch(gameId) {
    return axios
      .get<ApiResponse<MatchStream[]>>(`${BASE}matches/${gameId}/streams`)
      .then((r) => r.data)
      .catch(() => makeError<MatchStream[]>("Failed to load streams"));
  },

  async getAllForMatch(gameId) {
    return axios
      .get<ApiResponse<MatchStream[]>>(`${BASE}matches/${gameId}/streams/all`, { headers: authHeader() })
      .then((r) => r.data)
      .catch(() => makeError<MatchStream[]>("Failed to load streams"));
  },

  async create(gameId, input: StreamInput) {
    return axios
      .post<ApiResponse<MatchStream>>(`${BASE}matches/${gameId}/streams`, input, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => makeError<MatchStream>(e?.response?.data?.message ?? "Failed to add stream"));
  },

  async update(streamId, input: StreamInput) {
    return axios
      .put<ApiResponse<null>>(`${BASE}streams/${streamId}`, input, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => makeError<null>(e?.response?.data?.message ?? "Failed to update stream"));
  },

  async remove(streamId) {
    return axios
      .delete<ApiResponse<null>>(`${BASE}streams/${streamId}`, { headers: authHeader() })
      .then((r) => r.data)
      .catch((e) => makeError<null>(e?.response?.data?.message ?? "Failed to delete stream"));
  },
};
