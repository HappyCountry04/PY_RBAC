"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, Search, X } from "lucide-react";
import { api, ApiError } from "../api";
import TreeSelect from "./tree-select";
import { toOptions, toCsv, readRowValue, parseDate, showToast, sexOptions, statusOptions } from "../utils";

// ---- UserEditModal ----
export function UserEditModal({ mode, userId, onClose, onSaved }: { mode: "create" | "edit"; userId?: number; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({}); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(mode === "edit");
  const [roleOptions, setRoleOptions] = useState<{ label: string; value: string }[]>([]); const [postOptions, setPostOptions] = useState<{ label: string; value: string }[]>([]); const [deptNodes, setDeptNodes] = useState<{ id: string | number; label: string; children?: { id: string | number; label: string }[] }[]>([]); const [initPwd, setInitPwd] = useState("123456");
  useEffect(() => { (async () => { try { const [rolesRes, postsRes, deptTreeRes, pwdRes] = await Promise.all([api.get("/system/role/optionselect"), api.get("/system/post/list?pageNum=1&pageSize=200"), api.get("/system/user/deptTree"), api.get("/system/config/configKey/sys.user.initPassword")]); setRoleOptions(toOptions((rolesRes as any).data, "roleId", "roleName")); setPostOptions(toOptions((postsRes as any).rows ?? (postsRes as any).data ?? [], "postId", "postName")); const tree = ((deptTreeRes as any).data ?? []) as any[]; setDeptNodes(tree.map((n: any) => ({ id: n.id, label: n.label, children: n.children }))); setInitPwd(String((pwdRes as any).msg ?? "123456")); if (mode === "edit" && userId) { const detail = await api.get(`/system/user/${userId}`) as any; const d = detail as any; const data = (d.data ?? d) as any; const init: any = {}; for (const f of ["nickName","deptId","phonenumber","email","userName","sex","status","remark"]) init[f] = String(readRowValue(data, f) ?? ""); if (d.roleIds) init.roleIds = toCsv(d.roleIds); if (d.postIds) init.postIds = toCsv(d.postIds); setValues(init); } } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); } finally { setLoading(false); } })(); }, [mode, userId]);
  useEffect(() => { if (mode === "create" && !loading && roleOptions.length > 0) setValues({ password: initPwd }); }, [mode, loading, initPwd, roleOptions.length]);
  async function submit(e: React.FormEvent) { e.preventDefault(); setError(""); if (!values.nickName?.trim()) { setError("用户昵称不能为空"); return; } if (!values.deptId) { setError("请选择归属部门"); return; } if (mode === "create" && !values.userName?.trim()) { setError("用户名称不能为空"); return; } if (values.phonenumber && !/^1[3-9]\d{9}$/.test(values.phonenumber)) { setError("请输入正确的手机号码"); return; } if (values.email && !/\S+@\S+\.\S+/.test(values.email)) { setError("请输入正确的邮箱地址"); return; } setBusy(true); const body: any = { ...values }; if (body.deptId !== undefined && body.deptId !== "") body.deptId = Number(body.deptId); for (const key of ["roleIds", "postIds"]) { if (body[key] !== undefined) body[key] = String(body[key]).split(",").filter(Boolean).map(Number); } if (mode === "edit" && userId) body.userId = userId; try { if (mode === "edit") { await api.put("/system/user", body); showToast("修改成功", "success"); } else { await api.post("/system/user", body); showToast("新增成功", "success"); } onSaved(); } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); } finally { setBusy(false); } }
  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;

  return (
    <div className="modal-mask">
      <form className="modal-panel" style={{ width: "min(580px, 100%)" }} onSubmit={submit}>
        <div className="modal-head">
          <h2>{mode === "edit" ? "修改用户" : "添加用户"}</h2>
          <button type="button" className="text-button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <label><span className="form-label-text">用户昵称 <em className="required">*</em></span><input value={values.nickName ?? ""} onChange={(e) => setValues((p) => ({ ...p, nickName: e.target.value }))} maxLength={30} /></label>
          <label><span className="form-label-text">归属部门 <em className="required">*</em></span><TreeSelect value={values.deptId ?? ""} options={deptNodes} placeholder="请选择归属部门" onChange={(v) => setValues((p) => ({ ...p, deptId: v }))} /></label>
          <label><span className="form-label-text">手机号码</span><input value={values.phonenumber ?? ""} onChange={(e) => setValues((p) => ({ ...p, phonenumber: e.target.value }))} maxLength={11} /></label>
          <label><span className="form-label-text">邮箱</span><input value={values.email ?? ""} onChange={(e) => setValues((p) => ({ ...p, email: e.target.value }))} maxLength={50} /></label>
          {mode === "create" && <label><span className="form-label-text">用户名称 <em className="required">*</em></span><input value={values.userName ?? ""} onChange={(e) => setValues((p) => ({ ...p, userName: e.target.value }))} maxLength={30} /></label>}
          {mode === "create" && <label><span className="form-label-text">用户密码</span><input type="password" value={values.password ?? ""} onChange={(e) => setValues((p) => ({ ...p, password: e.target.value }))} maxLength={20} /></label>}
          <label><span className="form-label-text">用户性别</span><div className="radio-group">{sexOptions.map((o) => <label key={o.value} className="radio-label"><input type="radio" name="sex" value={o.value} checked={(values.sex || "0") === o.value} onChange={(e) => setValues((p) => ({ ...p, sex: e.target.value }))} />{o.label}</label>)}</div></label>
          <label><span className="form-label-text">状态</span><div className="radio-group">{statusOptions.map((o) => <label key={o.value} className="radio-label"><input type="radio" name="status" value={o.value} checked={(values.status || "0") === o.value} onChange={(e) => setValues((p) => ({ ...p, status: e.target.value }))} />{o.label}</label>)}</div></label>
          <label>
            <span className="form-label-text" style={{ alignSelf: "flex-start", paddingTop: 12 }}>角色</span>
            <div style={{ flex: 1 }}>
              <select value={(values.roleIds ?? "").split(",").filter(Boolean)} onChange={(e) => { const v = Array.from(e.target.selectedOptions, (o) => o.value).join(","); setValues((p) => ({ ...p, roleIds: v })); }} multiple style={{ width: "100%", minHeight: 90 }}>{roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>按住 Ctrl 或 Cmd 可多选</div>
            </div>
          </label>
          <label>
            <span className="form-label-text" style={{ alignSelf: "flex-start", paddingTop: 12 }}>岗位</span>
            <div style={{ flex: 1 }}>
              <select value={(values.postIds ?? "").split(",").filter(Boolean)} onChange={(e) => { const v = Array.from(e.target.selectedOptions, (o) => o.value).join(","); setValues((p) => ({ ...p, postIds: v })); }} multiple style={{ width: "100%", minHeight: 90 }}>{postOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>按住 Ctrl 或 Cmd 可多选</div>
            </div>
          </label>
          <label><span className="form-label-text">备注</span><textarea value={values.remark ?? ""} onChange={(e) => setValues((p) => ({ ...p, remark: e.target.value }))} /></label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>取消</button>
          <button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button>
        </div>
      </form>
    </div>
  );
}

// ---- UserViewDrawer ----
export function UserViewDrawer({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const res = await api.get(`/system/user/${userId}`) as any; setInfo((res.data ?? res) as any); } catch { showToast("获取用户信息失败", "error"); } finally { setLoading(false); } })(); }, [userId]);
  const dept = info?.dept as Record<string, unknown> | undefined;
  return <div className="modal-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-panel" style={{ width: "min(760px, 100%)" }} onClick={(e) => e.stopPropagation()}><div className="modal-head"><h2>用户信息详情</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>{loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>加载中...</div> : info ? <div><h4 className="section-header">基本信息</h4><div className="detail-grid"><div className="detail-item"><span>用户名称</span><strong>{String(info.userName ?? "")}</strong></div><div className="detail-item"><span>用户昵称</span><strong>{String(info.nickName ?? "")}</strong></div><div className="detail-item"><span>归属部门</span><strong>{dept?.deptName ? String(dept.deptName) : ""}</strong></div><div className="detail-item"><span>手机号码</span><strong>{String(info.phonenumber ?? "")}</strong></div><div className="detail-item"><span>邮箱</span><strong>{String(info.email ?? "")}</strong></div><div className="detail-item"><span>用户状态</span><strong><span className={`status-tag ${info.status === "0" ? "normal" : "disabled"}`}>{info.status === "0" ? "正常" : "停用"}</span></strong></div><div className="detail-item"><span>用户性别</span><strong>{info.sex === "0" ? "男" : info.sex === "1" ? "女" : "-"}</strong></div><div className="detail-item"><span>岗位</span><strong>{String(info.postNames ?? "无岗位")}</strong></div><div className="detail-item"><span>角色</span><strong>{String(info.roleNames ?? "无角色")}</strong></div></div><h4 className="section-header">其他信息</h4><div className="detail-grid"><div className="detail-item"><span>创建者</span><strong>{String(info.createBy ?? "")}</strong></div><div className="detail-item"><span>创建时间</span><strong>{parseDate(info.createTime)}</strong></div><div className="detail-item"><span>更新者</span><strong>{String(info.updateBy ?? "")}</strong></div><div className="detail-item"><span>更新时间</span><strong>{parseDate(info.updateTime)}</strong></div></div></div> : <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>无数据</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>关闭</button></div></div></div>;
}

// ---- ImportDialog ----
export function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [updateSupport, setUpdateSupport] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function downloadTemplate() { try { const blob = await api.blob("/system/user/importTemplate"); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "user_import_template.xlsx"; a.click(); URL.revokeObjectURL(url); } catch { showToast("下载失败", "error"); } }
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!file) { setError("请选择文件"); return; } setBusy(true); setError(""); try { const fd = new FormData(); fd.append("file", file); const res = await api.upload(`/system/user/importData?updateSupport=${updateSupport}`, fd) as any; showToast(String(res.msg ?? "导入成功"), "success"); onImported(); } catch (err) { setError(err instanceof ApiError ? err.message : "导入失败"); } finally { setBusy(false); } }
  return <div className="modal-mask"><form className="modal-panel" onSubmit={submit}><div className="modal-head"><h2>用户导入</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div><div className="form-grid"><label className="wide-field">选择文件<input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><label className="wide-field check-item"><input type="checkbox" checked={updateSupport} onChange={(e) => setUpdateSupport(e.target.checked)} /><span>是否更新已经存在的用户数据</span></label><div className="wide-field"><button type="button" className="ghost-button" onClick={downloadTemplate}><Download size={14} />下载模板</button></div></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "导入中..." : "开始导入"}</button></div></form></div>;
}

// ---- ResetPwdModal ----
export function ResetPwdModal({ user, onSubmit, onClose }: { user: Record<string, unknown>; onSubmit: (pwd: string) => Promise<void>; onClose: () => void }) {
  const [pwd, setPwd] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!pwd || pwd.length < 5) { setError("密码长度不能少于5位"); return; } setBusy(true); setError(""); try { await onSubmit(pwd); } catch (err) { setError(err instanceof ApiError ? err.message : "重置失败"); } finally { setBusy(false); } }
  return <div className="modal-mask"><form className="modal-panel" style={{ width: "min(460px, 100%)" }} onSubmit={submit}><div className="modal-head"><h2>重置密码</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div><div className="form-grid"><label><span className="form-label-text">新密码</span><input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus /></label></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div></form></div>;
}

// ---- AuthRoleModal ----
export function AuthRoleModal({ userId, userName, nickName, onClose, onSaved }: { userId: number; userName: string; nickName: string; onClose: () => void; onSaved: () => void }) {
  const [roles, setRoles] = useState<Record<string, unknown>[]>([]); const [selected, setSelected] = useState<Set<number>>(new Set()); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [pageNum, setPageNum] = useState(1); const pageSize = 8;
  useEffect(() => { (async () => { try { const res = await api.get(`/system/user/authRole/${userId}`) as any; const roleList = (res.roles ?? []) as any[]; setRoles(roleList); setSelected(new Set(roleList.filter((r: any) => r.flag).map((r: any) => Number(r.roleId)))); } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); } finally { setLoading(false); } })(); }, [userId]);
  function toggleRole(roleId: number, selectable: boolean) { if (!selectable) return; const n = new Set(selected); n.has(roleId) ? n.delete(roleId) : n.add(roleId); setSelected(n); }
  async function submit() { setBusy(true); setError(""); try { await api.put(`/system/user/authRole?userId=${userId}&roleIds=${[...selected].join(",")}`, {}); onSaved(); } catch (err) { setError(err instanceof ApiError ? err.message : "授权失败"); } finally { setBusy(false); } }
  const totalPages = Math.ceil(roles.length / pageSize); const paged = roles.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  return <div className="modal-mask"><div className="modal-panel assign-panel"><div className="modal-head"><h2>分配角色</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div><h4 className="section-header">基本信息</h4><div className="form-grid"><label><span className="form-label-text">用户昵称</span><input value={nickName} disabled /></label><label><span className="form-label-text">登录账号</span><input value={userName} disabled /></label></div><h4 className="section-header">角色信息</h4>{loading ? <div style={{ padding: 24, textAlign: "center" }}>加载中...</div> : <><div className="table-wrap" style={{ padding: "0 18px" }}><table><thead><tr><th>序号</th><th className="select-cell"><input type="checkbox" checked={selected.size > 0 && paged.every((r) => r.status === "0" && selected.has(Number(r.roleId)))} onChange={(e) => { const c = e.target.checked; const n = new Set(selected); paged.filter((r) => r.status === "0").forEach((r) => c ? n.add(Number(r.roleId)) : n.delete(Number(r.roleId))); setSelected(n); }} /></th><th>角色编号</th><th>角色名称</th><th>权限字符</th><th>创建时间</th></tr></thead><tbody>{paged.map((r, idx) => { const rid = Number(r.roleId); const sel = r.status === "0"; return <tr key={rid} onClick={() => toggleRole(rid, sel)} style={{ cursor: sel ? "pointer" : "default", opacity: sel ? 1 : 0.5 }}><td>{(pageNum - 1) * pageSize + idx + 1}</td><td className="select-cell"><input type="checkbox" checked={selected.has(rid)} disabled={!sel} onChange={() => toggleRole(rid, sel)} /></td><td>{rid}</td><td>{String(r.roleName)}</td><td>{String(r.roleKey)}</td><td>{parseDate(r.createTime)}</td></tr>; })}</tbody></table></div>{roles.length > pageSize && <div className="pager"><span style={{ color: "var(--muted)", fontSize: 13 }}>第 {pageNum}/{totalPages} 页 共 {roles.length} 条</span><button className="ghost-button" disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}>上一页</button><button className="ghost-button" disabled={pageNum >= totalPages} onClick={() => setPageNum((p) => p + 1)}>下一页</button></div>}</>}{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" onClick={submit} disabled={busy}>{busy ? "保存中..." : "确定"}</button></div></div></div>;
}
