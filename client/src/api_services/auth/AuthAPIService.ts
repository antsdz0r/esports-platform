import axios from "axios";
import type { AuthResponse } from "../../types/auth/AuthResponse";
import type { IAuthAPIService } from "./IAuthAPIService";

const BASE = import.meta.env.VITE_API_URL + "auth";

const err = (e: unknown, fallback: string): AuthResponse => ({
  success: false,
  message:
    axios.isAxiosError(e)
      ? (e.response?.data as { message?: string } | undefined)?.message ?? fallback
      : fallback,
});

export const authApi: IAuthAPIService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    return axios
      .post<AuthResponse>(`${BASE}/login`, { gamerTag: username, password })
      .then((r) => r.data)
      .catch((e: unknown) => err(e, "Login failed"));
  },

  async register(
    username: string,
    email: string,
    password: string,
    role: string
  ): Promise<AuthResponse> {
    return axios
      .post<AuthResponse>(`${BASE}/register`, { gamerTag: username, email, password, role })
      .then((r) => r.data)
      .catch((e: unknown) => err(e, "Registration failed"));
  },
};