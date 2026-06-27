"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./shared/auth";
import { ApiError } from "./shared/api";

export default function HomePage() {
  const { session, login, loading, error } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (session) router.replace("/system/user");
  }, [session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      await login(username, password);
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  if (session) return null;

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-copy">
          <h1>RuoYi Next Admin</h1>
          <p>FastAPI RBAC 权限后台</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>账号<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
          <label>密码<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" /></label>
          {loading && <div className="form-hint">正在恢复登录状态...</div>}
          {error && <div className="form-error">{error}</div>}
          {loginError && <div className="form-error">{loginError}</div>}
          <button className="primary-button" disabled={busy || loading}>{busy ? "登录中..." : "登录"}</button>
        </form>
      </section>
    </main>
  );
}
