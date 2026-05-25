import axios from "axios";
import type { AuthResponse } from "../../types/auth/AuthResponse";
import type { IAuthAPIService } from "./IAuthAPIService";

const BASE = import.meta.env.VITE_API_URL + "auth";

const makeError = (fallback: string): AuthResponse => ({
  success: false,
  message: fallback,
});

export const authApi: IAuthAPIService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    return axios
      .post<AuthResponse>(`${BASE}/login`, { gamerTag: username, password })
      .then((r: { data: AuthResponse }) => r.data)
      .catch(() => makeError("Login failed"));
      
  },

async register(username: string, email: string, password: string, fullName: string): Promise<AuthResponse> {
  return axios
    .post<AuthResponse>(`${BASE}/register`, { gamerTag: username, email, password, fullName })
    .then((r: { data: AuthResponse }) => r.data)
    .catch(() => makeError("Registration failed"));
},
};