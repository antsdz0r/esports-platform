import type { AuthUser } from "./AuthUser";

export type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  updateProfilePicture: (url: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
};
