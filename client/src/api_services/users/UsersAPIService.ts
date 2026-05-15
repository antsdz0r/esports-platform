import axios from "axios";
import type { IUsersAPIService, ApiResponse } from "./IUsersAPIService";
import type { UserDto } from "../../models/user/UserTypes";
import { readItem } from "../../helpers/local_storage";

const BASE = import.meta.env.VITE_API_URL + "users";

const authHeader = () => {
  const token = readItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const makeError = <T>(fallback: string): ApiResponse<T> => ({
  success: false,
  message: fallback,
  data: undefined as T,
});

export const usersApi: IUsersAPIService = {
  async getAll() {
    return axios.get<ApiResponse<UserDto[]>>(BASE, { headers: authHeader() })
      .then(r => r.data).catch(() => makeError("Failed to load users"));
  },
  async getById(id) {
    return axios.get<ApiResponse<UserDto>>(`${BASE}/${id}`, { headers: authHeader() })
      .then(r => r.data).catch(() => makeError("Failed to load user"));
  },
  async deactivate(id) {
    return axios.patch<ApiResponse<void>>(`${BASE}/${id}/deactivate`, {}, { headers: authHeader() })
      .then(r => r.data).catch(() => makeError<void>("Failed to deactivate user"))
  },
};
