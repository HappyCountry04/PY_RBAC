"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../shared/api";
import { useAuth } from "../shared/auth";
import SidebarLayout from "../shared/components/sidebar";
import { showToast, parseDate, sexOptions } from "../shared/utils";

export default function ProfilePage() {
  const { session } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"info" | "pwd">("info");

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  useEffect(() => { void loadProfile(); }, []);

  if (!session) return null;

  async function loadProfile() {
    setLoading(true);
    try { const res = await api.get("/system/user/profile") as Record<string, unknown>; setProfile(res); }
    catch { showToast("获取个人信息失败", "error"); }
    finally { setLoading(false); }
  }

  if (!session) return null;

  if (loading) return <SidebarLayout currentPaths={["profile"]}><div style={{ padding: 40, textAlign: "center" }}>加载中...</div></SidebarLayout>;

  const user = (profile?.data ?? profile ?? session.user) as Record<string, unknown>;
  const dept = user?.dept as Record<string, unknown> | undefined;
  const roleGroup = String(profile?.roleGroup ?? session.roles.join(", ") ?? "无角色");
  const postGroup = String(profile?.postGroup ?? "无岗位");
  const avatarUrl = user?.avatar ? `http://127.0.0.1:8000${user.avatar}` : null;

  return (
    <SidebarLayout currentPaths={["profile"]}>
      <div style={{ margin: 20, display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 20, alignItems: "start", flex: 1, minHeight: 0 }}>
        <div style={{ background: "#fff", border: "1px solid var(--line)" }}>
          <div style={{ borderBottom: "1px solid var(--line)", padding: 16 }}><strong>个人信息</strong></div>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ width: 100, height: 100, margin: "0 auto 16px", borderRadius: "50%", background: "#eef4ff", overflow: "hidden", display: "grid", placeItems: "center" }}>
              {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <UserRound size={48} color="var(--primary)" />}
            </div>
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <InfoRow label="用户名称" value={String(user.userName ?? "")} />
            <InfoRow label="手机号码" value={String(user.phonenumber ?? "")} />
            <InfoRow label="用户邮箱" value={String(user.email ?? "")} />
            <InfoRow label="所属部门" value={dept?.deptName ? `${String(dept.deptName)} / ${postGroup}` : postGroup} />
            <InfoRow label="所属角色" value={roleGroup} />
            <InfoRow label="创建日期" value={parseDate(user.createTime)} last />
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--line)" }}>
          <div style={{ borderBottom: "1px solid var(--line)", padding: "0 16px", display: "flex", gap: 0 }}>
            <button className="text-button" style={{ padding: "14px 16px", borderBottom: tab === "info" ? "2px solid var(--primary)" : "2px solid transparent", color: tab === "info" ? "var(--primary)" : "var(--text)", borderRadius: 0 }} onClick={() => setTab("info")}>基本资料</button>
            <button className="text-button" style={{ padding: "14px 16px", borderBottom: tab === "pwd" ? "2px solid var(--primary)" : "2px solid transparent", color: tab === "pwd" ? "var(--primary)" : "var(--text)", borderRadius: 0 }} onClick={() => setTab("pwd")}>修改密码</button>
          </div>
          <div style={{ padding: 20 }}>
            {tab === "info" ? <ProfileInfoForm user={user} onSaved={loadProfile} /> : <ProfilePwdForm />}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: last ? "none" : "1px solid #f0f0f0" }}><span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span><span style={{ fontSize: 13 }}>{value}</span></div>;
}

function ProfileInfoForm({ user, onSaved }: { user: Record<string, unknown>; onSaved: () => void }) {
  const [nickName, setNickName] = useState(String(user.nickName ?? ""));
  const [phonenumber, setPhonenumber] = useState(String(user.phonenumber ?? ""));
  const [email, setEmail] = useState(String(user.email ?? ""));
  const [sex, setSex] = useState(String(user.sex ?? "0"));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      if (!nickName.trim()) { setError("用户昵称不能为空"); setBusy(false); return; }
      if (email && !/\S+@\S+\.\S+/.test(email)) { setError("请输入正确的邮箱地址"); setBusy(false); return; }
      if (phonenumber && !/^1[3-9]\d{9}$/.test(phonenumber)) { setError("请输入正确的手机号码"); setBusy(false); return; }
      await api.put("/system/user/profile", { nickName, phonenumber, email, sex });
      if (avatarFile) { const fd = new FormData(); fd.append("avatarfile", avatarFile); await api.upload("/system/user/profile/avatar", fd); }
      setSuccess("修改成功"); onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); }
    finally { setBusy(false); }
  }

  return (<form onSubmit={submit}>{success && <div className="form-success">{success}</div>}{error && <div className="form-error">{error}</div>}<div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>用户昵称<span style={{ color: "var(--danger)" }}>*</span><input value={nickName} onChange={(e) => setNickName(e.target.value)} maxLength={30} style={{ height: 40, border: "1px solid var(--line)", padding: "0 12px" }} /></label>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>手机号码<input value={phonenumber} onChange={(e) => setPhonenumber(e.target.value)} maxLength={11} style={{ height: 40, border: "1px solid var(--line)", padding: "0 12px" }} /></label>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>邮箱<input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={50} style={{ height: 40, border: "1px solid var(--line)", padding: "0 12px" }} /></label>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>性别<div className="radio-group">{sexOptions.map((o) => <label key={o.value} className="radio-label"><input type="radio" name="sex" value={o.value} checked={sex === o.value} onChange={(e) => setSex(e.target.value)} />{o.label}</label>)}</div></label>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>头像<input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} /></label>
    <div><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "保存"}</button></div>
  </div></form>);
}

function ProfilePwdForm() {
  const [oldPwd, setOldPwd] = useState(""); const [newPwd, setNewPwd] = useState(""); const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPwd) { setError("旧密码不能为空"); return; }
    if (!newPwd || newPwd.length < 5) { setError("新密码长度不能少于5位"); return; }
    if (newPwd !== confirmPwd) { setError("两次输入的密码不一致"); return; }
    setBusy(true); setError(""); setSuccess("");
    try { await api.put("/system/user/profile/updatePwd", { oldPassword: oldPwd, newPassword: newPwd }); setSuccess("修改成功"); setOldPwd(""); setNewPwd(""); setConfirmPwd(""); }
    catch (err) { setError(err instanceof ApiError ? err.message : "修改失败"); }
    finally { setBusy(false); }
  }
  return (<form onSubmit={submit}>{success && <div className="form-success">{success}</div>}{error && <div className="form-error">{error}</div>}<div style={{ display: "grid", gap: 16, maxWidth: 400 }}>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>旧密码<input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} style={{ height: 40, border: "1px solid var(--line)", padding: "0 12px" }} /></label>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>新密码<input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={{ height: 40, border: "1px solid var(--line)", padding: "0 12px" }} /></label>
    <label style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--muted)" }}>确认密码<input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} style={{ height: 40, border: "1px solid var(--line)", padding: "0 12px" }} /></label>
    <div><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "保存"}</button></div>
  </div></form>);
}
