import React, { createContext, useState, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import type { AuthContextType } from "../../types/auth/AuthContext";
import type { AuthUser } from "../../types/auth/AuthUser";
import type { JwtTokenClaims } from "../../types/auth/JwtTokenClaims";

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const KEY = "authToken";

const decode = (token: string): JwtTokenClaims | null => {
  try {
    const d = jwtDecode<JwtTokenClaims>(token);
    return d?.id ? d : null;
  } catch {
    return null;
  }
};

const expired = (token: string): boolean => {
  try {
    const d = jwtDecode<{ exp?: number }>(token);
    return !d?.exp || d.exp < Date.now() / 1000;
  } catch {
    return true;
  }
};

const getInitialAuth = () => {
  const saved = localStorage.getItem(KEY);

  if (saved && !expired(saved)) {
    const claims = decode(saved);
    if (claims) {
      return {
        token: saved,
        user: { id: claims.id, username: claims.gamerTag, role: claims.role, profilePicture: null } as AuthUser,
      };
    }
  }

  if (saved) localStorage.removeItem(KEY);

  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initial = getInitialAuth();

  const [token, setToken] = useState<string | null>(initial.token);
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [isLoading] = useState(false);

  const login = (t: string) => {
    const claims = decode(t);
    if (!claims || expired(t)) return;

    setToken(t);
    setUser({ id: claims.id, username: claims.gamerTag, role: claims.role, profilePicture: null });
    localStorage.setItem(KEY, t);
    // Fetch profile picture asynchronously
    fetch(`${import.meta.env.VITE_API_URL}users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.profilePicture) {
          setUser(u => u ? { ...u, profilePicture: data.data.profilePicture } : u);
        }
      })
      .catch(() => {});
  };

  const updateProfilePicture = (url: string) => {
    setUser(u => u ? { ...u, profilePicture: url } : u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateProfilePicture, isAuthenticated: !!user && !!token, isLoading}}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;