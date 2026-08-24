import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { reconnectSocketWithAuth } from "../services/socket";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("bitm_user");
    const token = localStorage.getItem("bitm_token");
    if (raw && token) {
      setUser(JSON.parse(raw));
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("bitm_token", res.data.token);
      localStorage.setItem("bitm_user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      reconnectSocketWithAuth();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Login failed. Check your credentials.");
      throw e;
    }
  }

  function logout() {
    localStorage.removeItem("bitm_token");
    localStorage.removeItem("bitm_user");
    setUser(null);
    reconnectSocketWithAuth();
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
