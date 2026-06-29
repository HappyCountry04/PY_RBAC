"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, Phone, Save, UserRound, X } from "lucide-react";
import { api, ApiError } from "../shared/api";
import { useAuth } from "../shared/auth";
import SidebarLayout from "../shared/components/sidebar";
import { showToast, sexOptions } from "../shared/utils";

export default function ProfilePage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [postGroup, setPostGroup] = useState("");
  const [roleGroup, setRoleGroup] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [nickName, setNickName] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [email, setEmail] = useState("");
  const [sex, setSex] = useState("");

  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/system/user/profile") as Record<string, unknown>;
        const data = res.data as Record<string, unknown> ?? {};
        setProfile(data);
        setPostGroup(String(res.postGroup ?? ""));
        setRoleGroup(String(res.roleGroup ?? ""));
        setAvatarUrl(String(data.avatar ?? ""));
        setNickName(String(data.nickName ?? ""));
        setPhonenumber(String(data.phonenumber ?? ""));
        setEmail(String(data.email ?? ""));
        setSex(String(data.sex ?? "0"));
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "加载失败", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSaveInfo() {
    try {
      await api.put("/system/user/profile", { nickName, phonenumber, email, sex });
      showToast("修改成功", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "保存失败", "error");
    }
  }

  async function handleSavePwd() {
    if (newPwd !== confirmPwd) { showToast("两次密码不一致", "error"); return; }
    try {
      await api.put("/system/user/profile/updatePwd", { oldPassword: oldPwd, newPassword: newPwd });
      showToast("密码修改成功", "success");
      setPwdOpen(false);
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "修改失败", "error");
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("avatarfile", file);
    try {
      const res = await api.upload("/system/user/profile/avatar", form) as Record<string, unknown>;
      const url = String(res.imgUrl ?? "");
      setAvatarUrl(url ? `http://127.0.0.1:8000${url}` : "");
      showToast("头像上传成功", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "上传失败", "error");
    }
  }

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["user"]}>
      <section className="data-surface" style={{ maxWidth: 820 }}>
        {loading ? <p style={{ padding: 40, textAlign: "center" }}>加载中...</p> : (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 100, height: 100, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--line)", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <UserRound size={40} style={{ color: "var(--muted)" }} />
                  )}
                </div>
                <label style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--primary)", cursor: "pointer" }}>
                  更换头像
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
                </label>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0 }}>{String(profile.userName ?? "")}</h2>
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 16px" }}>
                  {roleGroup} | {postGroup}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="detail-item"><span>用户昵称</span><input value={nickName} onChange={(e) => setNickName(e.target.value)} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px", borderRadius: 4 }} /></div>
                  <div className="detail-item"><span>手机号码</span><input value={phonenumber} onChange={(e) => setPhonenumber(e.target.value)} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px", borderRadius: 4 }} /></div>
                  <div className="detail-item"><span>邮箱</span><input value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px", borderRadius: 4 }} /></div>
                  <div className="detail-item"><span>性别</span>
                    <select value={sex} onChange={(e) => setSex(e.target.value)} style={{ height: 32, border: "1px solid var(--line)", borderRadius: 4 }}>
                      {sexOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <button className="primary-small" onClick={handleSaveInfo}><Save size={14} />保存</button>
                  <button className="ghost-button" onClick={() => setPwdOpen(!pwdOpen)}><KeyRound size={14} />修改密码</button>
                </div>
              </div>
            </div>

            {pwdOpen && (
              <div style={{ marginTop: 24, padding: 20, border: "1px solid var(--line)", borderRadius: 8 }}>
                <h4 style={{ margin: "0 0 16px" }}>修改密码</h4>
                <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
                  <label style={{ fontSize: 13 }}>旧密码<input type={showPwd ? "text" : "password"} value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} style={{ display: "block", width: "100%", height: 32, marginTop: 4, border: "1px solid var(--line)", padding: "0 8px", borderRadius: 4 }} /></label>
                  <label style={{ fontSize: 13 }}>新密码<input type={showPwd ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={{ display: "block", width: "100%", height: 32, marginTop: 4, border: "1px solid var(--line)", padding: "0 8px", borderRadius: 4 }} /></label>
                  <label style={{ fontSize: 13 }}>确认密码<input type={showPwd ? "text" : "password"} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} style={{ display: "block", width: "100%", height: 32, marginTop: 4, border: "1px solid var(--line)", padding: "0 8px", borderRadius: 4 }} /></label>
                  <label style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={showPwd} onChange={() => setShowPwd(!showPwd)} />显示密码
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="primary-small" onClick={handleSavePwd}>确定</button>
                    <button className="ghost-button" onClick={() => setPwdOpen(false)}>取消</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </SidebarLayout>
  );
}
