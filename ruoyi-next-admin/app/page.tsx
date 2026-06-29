"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./shared/auth";
import { api, ApiError } from "./shared/api";

export default function HomePage() {
  const { session, login, loading, error } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [code, setCode] = useState("");
  const [uuid, setUuid] = useState("");
  const [captchaImg, setCaptchaImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (session) router.replace("/system/user");
  }, [session, router]);

  useEffect(() => { fetchCaptcha(); }, []);

  async function fetchCaptcha() {
    try {
      const res = await api.get("/captchaImage") as Record<string, unknown>;
      setCaptchaImg(String(res.img ?? ""));
      setUuid(String(res.uuid ?? ""));
    } catch { /* ignore */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      await login(username, password, code || undefined, uuid || undefined);
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : "登录失败");
      fetchCaptcha();
      setCode("");
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
          <label>
            验证码
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} style={{ width: 130 }} />
              {captchaImg && <img src={captchaImg} alt="验证码" style={{ height: 38, cursor: "pointer", border: "1px solid var(--line)", borderRadius: 4 }} onClick={fetchCaptcha} />}
              <span style={{ fontSize: 12, color: "var(--primary)", cursor: "pointer", whiteSpace: "nowrap" }} onClick={fetchCaptcha}>换一张</span>
            </div>
          </label>
          {loading && <div className="form-hint">正在恢复登录状态...</div>}
          {error && <div className="form-error">{error}</div>}
          {loginError && <div className="form-error">{loginError}</div>}
          <button className="primary-button" disabled={busy || loading}>{busy ? "登录中..." : "登录"}</button>
        </form>
      </section>
    </main>
  );
}
