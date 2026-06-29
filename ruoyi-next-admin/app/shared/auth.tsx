"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, clearToken, getToken, setToken } from "./api";
import type { LoginResponse, RouterItem } from "./types";

export type Session = {
  user: Record<string, unknown>;
  roles: string[];
  permissions: string[];
  routers: RouterItem[];
};

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  error: string;
  login: (username: string, password: string, code?: string, uuid?: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [info, routers] = await Promise.all([
        api.get("/getInfo"),
        api.get("/getRouters"),
      ]);
      setSession({
        user: ((info as Record<string, unknown>).user as Record<string, unknown>) ?? {},
        roles: ((info as Record<string, unknown>).roles ?? []) as string[],
        permissions: ((info as Record<string, unknown>).permissions ?? []) as string[],
        routers: ((routers as Record<string, unknown>).data ?? []) as RouterItem[],
      });
    } catch (err) {
      clearToken();
      setSession(null);
      setError(err instanceof ApiError ? err.message : "后端初始化失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string, code?: string, uuid?: string) => {
    const body: Record<string, string> = { username, password };
    if (code) body.code = code;
    if (uuid) body.uuid = uuid;
    const res = (await api.post("/login", body)) as LoginResponse;
    setToken(res.token);
    await bootstrap();
  }, [bootstrap]);

  const logout = useCallback(async () => {
    try { await api.post("/logout", {}); } catch { /* ignore */ }
    clearToken();
    setSession(null);
  }, []);

  useEffect(() => {
    if (getToken()) {
      void bootstrap();
    } else {
      setLoading(false);
    }
  }, [bootstrap]);

  return (
    <AuthContext.Provider value={{ session, loading, error, login, logout, bootstrap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
