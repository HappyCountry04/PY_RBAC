"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Download, Plus, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import { can, showToast, parseDate } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

export default function RoleManagementPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showSearch, setShowSearch] = useState(true);
  const [qRoleName, setQRoleName] = useState("");
  const [qRoleKey, setQRoleKey] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [qBeginTime, setQBeginTime] = useState("");
  const [qEndTime, setQEndTime] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [editModal, setEditModal] = useState<{ mode: "create" | "edit"; roleId?: number } | null>(null);
  const [dataScopeRole, setDataScopeRole] = useState<Record<string, unknown> | null>(null);
  const [authUserRole, setAuthUserRole] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  const perms = (session?.permissions ?? []) as string[];
  const cAdd = can(perms, "system:role:add");
  const cEdit = can(perms, "system:role:edit");
  const cRemove = can(perms, "system:role:remove");
  const cExport = can(perms, "system:role:export");

  const buildQuery = useCallback(() => {
    let qs = `pageNum=${pageNum}&pageSize=${pageSize}`;
    if (qRoleName) qs += `&roleName=${encodeURIComponent(qRoleName)}`;
    if (qRoleKey) qs += `&roleKey=${encodeURIComponent(qRoleKey)}`;
    if (qStatus) qs += `&status=${qStatus}`;
    if (qBeginTime) qs += `&beginTime=${qBeginTime}`;
    if (qEndTime) qs += `&endTime=${qEndTime}`;
    return qs;
  }, [pageNum, pageSize, qRoleName, qRoleKey, qStatus, qBeginTime, qEndTime]);

  async function load() {
    setLoading(true); setError("");
    try { const res = (await api.get(`/system/role/list?${buildQuery()}`)) as TableResponse; setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]); setTotal(res.total ?? 0); }
    catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [buildQuery, session]);
  function handleSearch() { setPageNum(1); setSelectedIds(new Set()); }
  function handleReset() { setQRoleName(""); setQRoleKey(""); setQStatus(""); setQBeginTime(""); setQEndTime(""); setPageNum(1); }
  function toggleSelectAll(checked: boolean) { if (checked) setSelectedIds(new Set(rows.filter((r) => Number(r.roleId) !== 1).map((r) => Number(r.roleId)))); else setSelectedIds(new Set()); }
  function toggleSelect(rid: number) { const n = new Set(selectedIds); n.has(rid) ? n.delete(rid) : n.add(rid); setSelectedIds(n); }

  async function handleStatusChange(row: Record<string, unknown>) {
    const rid = Number(row.roleId); const ns = row.status === "0" ? "1" : "0"; const text = ns === "0" ? "启用" : "停用";
    if (!window.confirm(`确认要"${text}""${row.roleName}"角色吗？`)) return;
    try { await api.put("/system/role/changeStatus", { roleId: rid, status: ns }); showToast(`${text}成功`, "success"); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "操作失败", "error"); }
  }

  async function handleDelete(row?: Record<string, unknown>) {
    const ids = row ? [row.roleId] : [...selectedIds]; if (!ids.length) return;
    if (ids.includes(1)) { showToast("不能删除超级管理员角色", "error"); return; }
    if (!window.confirm(`是否确认删除角色编号为"${ids.join(",")}"的数据项？`)) return;
    try { await api.delete(`/system/role/${ids.join(",")}`); showToast("删除成功", "success"); setSelectedIds(new Set()); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  async function handleExport() {
    try { const blob = await api.blob(`/system/role/export?${buildQuery()}`); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `role_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url); showToast("导出成功", "success"); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "导出失败", "error"); }
  }

  const single = selectedIds.size !== 1; const multiple = selectedIds.size === 0; const totalPages = Math.ceil(total / pageSize);

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["role"]}>
      <section className="data-surface">
        {showSearch && <div className="search-bar">
          <div className="query-field"><span>角色名称</span><input value={qRoleName} onChange={(e) => setQRoleName(e.target.value)} placeholder="请输入角色名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>权限字符</span><input value={qRoleKey} onChange={(e) => setQRoleKey(e.target.value)} placeholder="请输入权限字符" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>状态</span><select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">正常</option><option value="1">停用</option></select></div>
          <div className="query-field"><span>创建时间</span><div className="date-range"><input type="date" value={qBeginTime} onChange={(e) => setQBeginTime(e.target.value)} /><span>-</span><input type="date" value={qEndTime} onChange={(e) => setQEndTime(e.target.value)} /></div></div>
          <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button><button className="ghost-button" onClick={handleReset}>重置</button>
        </div>}
        <div className="toolbar">
          {cAdd && <button className="primary-button" onClick={() => setEditModal({ mode: "create" })}><Plus size={14} />新增</button>}
          {cEdit && <button className="success-button" disabled={single} onClick={() => { const id = [...selectedIds][0]; if (id) setEditModal({ mode: "edit", roleId: id }); }}>修改</button>}
          {cRemove && <button className="danger-button" disabled={multiple} onClick={() => handleDelete()}>删除</button>}
          {cExport && <button className="ghost-button" onClick={handleExport}><Download size={14} />导出</button>}
          <div style={{ flex: 1 }} /><button className="icon-button" onClick={() => setShowSearch(!showSearch)} title="搜索"><Search size={16} /></button><button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
        </div>
        <div className="table-meta"><span>共 {total} 条</span>{error && <strong>{error}</strong>}</div>
        <div className="table-wrap"><table><thead><tr>
          <th className="select-cell"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === rows.filter((r) => Number(r.roleId) !== 1).length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
          <th>角色编号</th><th>角色名称</th><th>权限字符</th><th>显示顺序</th><th>状态</th><th>创建时间</th><th>操作</th>
        </tr></thead><tbody>
          {loading ? <tr><td colSpan={8}>加载中...</td></tr> : rows.length ? rows.map((row) => { const rid = Number(row.roleId); const isAdmin = rid === 1;
            return (<tr key={rid}><td className="select-cell">{!isAdmin && <input type="checkbox" checked={selectedIds.has(rid)} onChange={() => toggleSelect(rid)} />}</td><td>{rid}</td><td>{String(row.roleName ?? "")}</td><td>{String(row.roleKey ?? "")}</td><td>{String(row.roleSort ?? 0)}</td>
            <td>{cEdit ? <label className="switch-label"><input type="checkbox" className="switch-input" checked={row.status === "0"} onChange={() => handleStatusChange(row)} disabled={isAdmin} /><span className="switch-slider" /></label> : <span className={`status-tag ${row.status === "0" ? "normal" : "disabled"}`}>{row.status === "0" ? "正常" : "停用"}</span>}</td>
            <td>{parseDate(row.createTime)}</td>
            <td className="actions-cell">{!isAdmin && <>{cEdit && <button className="text-button" onClick={() => setEditModal({ mode: "edit", roleId: rid })}>编辑</button>}{cRemove && <button className="text-button danger" onClick={() => handleDelete(row)}>删除</button>}{cEdit && <div className="more-dropdown"><button className="text-button" style={{ color: "#667085" }}>更多 <ChevronDown size={12} style={{ display: "inline", verticalAlign: "middle" }} /></button><div className="more-menu"><button className="text-button" onClick={() => setDataScopeRole(row)}>数据权限</button><button className="text-button" onClick={() => setAuthUserRole(row)}>分配用户</button></div></div>}</>}</td></tr>);
          }) : <tr><td colSpan={8}>暂无数据</td></tr>}
        </tbody></table></div>
        {total > 0 && <div className="pager"><span style={{ color: "var(--muted)", fontSize: 13 }}>第 {pageNum}/{totalPages} 页 共 {total} 条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageNum(1); }} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px" }}><option value={10}>10条/页</option><option value={25}>25条/页</option><option value={50}>50条/页</option><option value={100}>100条/页</option></select><button className="ghost-button" disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}>上一页</button><button className="ghost-button" disabled={pageNum >= totalPages} onClick={() => setPageNum((p) => p + 1)}>下一页</button></div>}
      </section>
      {editModal && <RoleEditModal mode={editModal.mode} roleId={editModal.roleId} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); void load(); }} />}
      {dataScopeRole && <RoleDataScopeModal role={dataScopeRole} onClose={() => setDataScopeRole(null)} onSaved={() => { setDataScopeRole(null); void load(); }} />}
      {authUserRole && <RoleAuthUserModal role={authUserRole} onClose={() => setAuthUserRole(null)} />}
    </SidebarLayout>
  );
}

// Inline role modals (same as before, extracted for clarity)
import { useEffect as useEf, useMemo, useState as useS } from "react";
import { X } from "lucide-react";
import { flattenTreeOptions, statusOptions } from "../../shared/utils";

function RoleEditModal({ mode, roleId, onClose, onSaved }: { mode: "create" | "edit"; roleId?: number; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useS<Record<string, string>>({ roleSort: "0", status: "0" }); const [error, setError] = useS(""); const [busy, setBusy] = useS(false); const [loading, setLoading] = useS(mode === "edit");
  const [menuTree, setMenuTree] = useS<Record<string, unknown>[]>([]); const [menuChecked, setMenuChecked] = useS<Set<number>>(new Set()); const [menuNodeAll, setMenuNodeAll] = useS(false); const [menuStrictly, setMenuStrictly] = useS(true);
  useEf(() => { (async () => { try { const menus = await api.get("/system/menu/treeselect"); const tree = ((menus as any).data ?? []) as Record<string, unknown>[]; setMenuTree(tree); if (mode === "edit" && roleId) { const detail = await api.get(`/system/role/${roleId}`); const d = detail as any; const data = (d.data ?? d) as any; setValues({ roleName: String(data.roleName ?? ""), roleKey: String(data.roleKey ?? ""), roleSort: String(data.roleSort ?? 0), status: String(data.status ?? "0"), dataScope: String(data.dataScope ?? "1"), menuCheckStrictly: data.menuCheckStrictly ? "true" : "false", remark: String(data.remark ?? "") }); setMenuStrictly(data.menuCheckStrictly !== false); if (d.menuIds) setMenuChecked(new Set((d.menuIds as number[]).map(Number))); } } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); } finally { setLoading(false); } })(); }, [mode, roleId]);
  const flatMenus = useMemo(() => flattenTreeOptions(menuTree), [menuTree]); const allMenuIds = useMemo(() => { const ids: number[] = []; (function walk(nodes: Record<string, unknown>[]) { for (const n of nodes) { const id = n.id ?? n.menuId; if (id !== undefined) ids.push(Number(id)); if (n.children) walk(n.children as Record<string, unknown>[]); } })(menuTree); return ids; }, [menuTree]);
  function toggleMenuCheck(id: number) { const n = new Set(menuChecked); n.has(id) ? n.delete(id) : n.add(id); setMenuChecked(n); }
  function handleMenuCheckAll(checked: boolean) { setMenuChecked(checked ? new Set(allMenuIds) : new Set()); setMenuNodeAll(checked); }
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!values.roleName?.trim()) { setError("角色名称不能为空"); return; } if (!values.roleKey?.trim()) { setError("权限字符不能为空"); return; } setBusy(true); setError(""); const body: any = { ...values, menuIds: [...menuChecked], roleSort: Number(values.roleSort), menuCheckStrictly: menuStrictly }; try { if (mode === "edit" && roleId) { body.roleId = roleId; await api.put("/system/role", body); showToast("修改成功", "success"); } else { await api.post("/system/role", body); showToast("新增成功", "success"); } onSaved(); } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); } finally { setBusy(false); } }
  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;
  return (<div className="modal-mask"><form className="modal-panel" onSubmit={submit}><div className="modal-head"><h2>{mode === "edit" ? "修改角色" : "添加角色"}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div><div className="form-grid"><label>角色名称<span style={{ color: "var(--danger)" }}>*</span><input value={values.roleName ?? ""} onChange={(e) => setValues((p) => ({ ...p, roleName: e.target.value }))} /></label><label>权限字符<span style={{ color: "var(--danger)" }}>*</span><input value={values.roleKey ?? ""} onChange={(e) => setValues((p) => ({ ...p, roleKey: e.target.value }))} placeholder="如：@PreAuthorize(`@ss.hasRole('admin')`)" /></label><label>角色顺序<span style={{ color: "var(--danger)" }}>*</span><input type="number" value={values.roleSort ?? "0"} onChange={(e) => setValues((p) => ({ ...p, roleSort: e.target.value }))} /></label><label>状态<div className="radio-group">{statusOptions.map((o) => <label key={o.value} className="radio-label"><input type="radio" name="status" value={o.value} checked={(values.status || "0") === o.value} onChange={(e) => setValues((p) => ({ ...p, status: e.target.value }))} />{o.label}</label>)}</div></label><label className="wide-field">菜单权限<div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}><label className="check-item"><input type="checkbox" checked={menuNodeAll} onChange={(e) => handleMenuCheckAll(e.target.checked)} /><span>全选/全不选</span></label><label className="check-item"><input type="checkbox" checked={!menuStrictly} onChange={(e) => setMenuStrictly(!e.target.checked)} /><span>父子联动</span></label><span style={{ color: "var(--muted)", fontSize: 12 }}>（取消联动可独立选择）</span></div><div className="check-list tree-check-list" style={{ maxHeight: 260 }}>{flatMenus.map((o) => { const indent = (o.label.match(/\u00A0/g) || []).length; return <label key={o.value} className="check-item" style={{ paddingLeft: indent * 8 }}><input type="checkbox" checked={menuChecked.has(Number(o.value))} onChange={() => toggleMenuCheck(Number(o.value))} /><span>{o.label.replace(/\u00A0/g, "")}</span></label>; })}</div></label><label className="wide-field">备注<textarea value={values.remark ?? ""} onChange={(e) => setValues((p) => ({ ...p, remark: e.target.value }))} /></label></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div></form></div>);
}

function RoleDataScopeModal({ role, onClose, onSaved }: { role: Record<string, unknown>; onClose: () => void; onSaved: () => void }) {
  const [dataScope, setDataScope] = useS(String(role.dataScope ?? "1")); const [deptTree, setDeptTree] = useS<Record<string, unknown>[]>([]); const [deptChecked, setDeptChecked] = useS<Set<number>>(new Set()); const [deptNodeAll, setDeptNodeAll] = useS(false); const [deptStrictly, setDeptStrictly] = useS(true); const [loading, setLoading] = useS(true); const [busy, setBusy] = useS(false); const [error, setError] = useS("");
  useEf(() => { (async () => { try { const res = await api.get(`/system/role/deptTree/${role.roleId}`) as any; setDeptTree((res.depts ?? res.data ?? []) as Record<string, unknown>[]); if (res.checkedKeys) setDeptChecked(new Set((res.checkedKeys as number[]).map(Number))); } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); } finally { setLoading(false); } })(); }, [role.roleId]);
  const flatDepts = useMemo(() => flattenTreeOptions(deptTree), [deptTree]); const allDeptIds = useMemo(() => flatDepts.map((o) => Number(o.value)), [flatDepts]);
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { const deptIds = dataScope === "2" ? [...deptChecked] : []; await api.put("/system/role/dataScope", { roleId: role.roleId, dataScope, deptIds }); showToast("修改成功", "success"); onSaved(); } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); } finally { setBusy(false); } }
  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;
  const scopeLabels: Record<string, string> = { "1": "全部数据权限", "2": "自定数据权限", "3": "本部门数据权限", "4": "本部门及以下数据权限", "5": "仅本人数据权限" };
  return (<div className="modal-mask"><form className="modal-panel" onSubmit={submit}><div className="modal-head"><h2>分配数据权限</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div><div className="form-grid"><label>角色名称<input value={String(role.roleName ?? "")} disabled /></label><label>权限字符<input value={String(role.roleKey ?? "")} disabled /></label><label className="wide-field">权限范围<select value={dataScope} onChange={(e) => setDataScope(e.target.value)}>{Object.entries(scopeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>{dataScope === "2" && <label className="wide-field">数据权限<div style={{ display: "flex", gap: 8, marginBottom: 6 }}><label className="check-item"><input type="checkbox" checked={deptNodeAll} onChange={(e) => { setDeptNodeAll(e.target.checked); setDeptChecked(e.target.checked ? new Set(allDeptIds) : new Set()); }} /><span>全选/全不选</span></label><label className="check-item"><input type="checkbox" checked={!deptStrictly} onChange={(e) => setDeptStrictly(!e.target.checked)} /><span>父子联动</span></label></div><div className="check-list tree-check-list" style={{ maxHeight: 220 }}>{flatDepts.map((o) => { const indent = (o.label.match(/\u00A0/g) || []).length; return <label key={o.value} className="check-item" style={{ paddingLeft: indent * 8 }}><input type="checkbox" checked={deptChecked.has(Number(o.value))} onChange={() => { const n = new Set(deptChecked); n.has(Number(o.value)) ? n.delete(Number(o.value)) : n.add(Number(o.value)); setDeptChecked(n); }} /><span>{o.label.replace(/\u00A0/g, "")}</span></label>; })}</div></label>}</div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div></form></div>);
}

function RoleAuthUserModal({ role, onClose }: { role: Record<string, unknown>; onClose: () => void }) {
  const [allocated, setAllocated] = useS<Record<string, unknown>[]>([]); const [unallocated, setUnallocated] = useS<Record<string, unknown>[]>([]); const [aTotal, setATotal] = useS(0); const [uTotal, setUTotal] = useS(0); const [aPage, setAPage] = useS(1); const [uPage, setUPage] = useS(1); const [aKeyword, setAKeyword] = useS(""); const [uKeyword, setUKeyword] = useS(""); const [loading, setLoading] = useS(true); const [error, setError] = useS(""); const [aSelected, setASelected] = useS<Set<number>>(new Set()); const [uSelected, setUSelected] = useS<Set<number>>(new Set()); const [busy, setBusy] = useS(false); const roleId = Number(role.roleId); const pageSize = 10;
  useEf(() => { (async () => { setLoading(true); try { const [aRes, uRes] = await Promise.all([api.get(`/system/role/authUser/allocatedList?roleId=${roleId}&pageNum=${aPage}&pageSize=${pageSize}&userName=${encodeURIComponent(aKeyword)}`), api.get(`/system/role/authUser/unallocatedList?roleId=${roleId}&pageNum=${uPage}&pageSize=${pageSize}&userName=${encodeURIComponent(uKeyword)}`)]); setAllocated(((aRes as any).rows ?? (aRes as any).data ?? []) as any[]); setUnallocated(((uRes as any).rows ?? (uRes as any).data ?? []) as any[]); setATotal(Number((aRes as any).total ?? 0)); setUTotal(Number((uRes as any).total ?? 0)); } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); } finally { setLoading(false); } })(); }, [roleId, aPage, uPage, aKeyword, uKeyword]);
  async function cancelAuth() { if (!aSelected.size) return; setBusy(true); try { await api.delete(`/system/role/authUser/cancelAll?roleId=${roleId}&userIds=${[...aSelected].join(",")}`); showToast("取消授权成功", "success"); setASelected(new Set()); setAPage(1); } catch (err) { showToast(err instanceof ApiError ? err.message : "取消失败", "error"); } finally { setBusy(false); } }
  async function addAuth() { if (!uSelected.size) return; setBusy(true); try { await api.put(`/system/role/authUser/selectAll?roleId=${roleId}&userIds=${[...uSelected].join(",")}`, {}); showToast("授权成功", "success"); setUSelected(new Set()); setAPage(1); setUPage(1); } catch (err) { showToast(err instanceof ApiError ? err.message : "授权失败", "error"); } finally { setBusy(false); } }
  return (<div className="modal-mask"><div className="modal-panel assign-panel"><div className="modal-head"><h2>分配用户 - {String(role.roleName)}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>{error && <div className="form-error">{error}</div>}{loading ? <div style={{ padding: 40, textAlign: "center" }}>加载中...</div> : <div className="assign-grid"><div className="user-pick"><div className="user-pick-head"><span>已分配用户（{aTotal}）</span></div><div style={{ padding: "6px 8px" }}><div className="search-box" style={{ width: "100%", height: 30 }}><Search size={12} /><input value={aKeyword} onChange={(e) => setAKeyword(e.target.value)} style={{ height: 28, fontSize: 13 }} placeholder="搜索" /></div></div><div className="user-pick-list">{allocated.map((u) => { const uid = Number(u.userId); return (<label key={uid} className="user-pick-row"><input type="checkbox" checked={aSelected.has(uid)} onChange={() => { const n = new Set(aSelected); n.has(uid) ? n.delete(uid) : n.add(uid); setASelected(n); }} /><span>{String(u.userName)}</span><small>{String(u.phonenumber ?? "")}</small></label>); })}</div>{aTotal > pageSize && <div style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between" }}><button className="ghost-button" style={{ height: 28, fontSize: 12 }} disabled={aPage <= 1} onClick={() => setAPage((p) => p - 1)}>上页</button><button className="ghost-button" style={{ height: 28, fontSize: 12 }} disabled={aPage >= Math.ceil(aTotal / pageSize)} onClick={() => setAPage((p) => p + 1)}>下页</button></div>}</div><div className="assign-actions"><button className="ghost-button success" onClick={addAuth} disabled={busy}>{">"}</button><button className="ghost-button danger" onClick={cancelAuth} disabled={busy}>{"<"}</button></div><div className="user-pick"><div className="user-pick-head"><span>未分配用户（{uTotal}）</span></div><div style={{ padding: "6px 8px" }}><div className="search-box" style={{ width: "100%", height: 30 }}><Search size={12} /><input value={uKeyword} onChange={(e) => setUKeyword(e.target.value)} style={{ height: 28, fontSize: 13 }} placeholder="搜索" /></div></div><div className="user-pick-list">{unallocated.map((u) => { const uid = Number(u.userId); return (<label key={uid} className="user-pick-row"><input type="checkbox" checked={uSelected.has(uid)} onChange={() => { const n = new Set(uSelected); n.has(uid) ? n.delete(uid) : n.add(uid); setUSelected(n); }} /><span>{String(u.userName)}</span><small>{String(u.phonenumber ?? "")}</small></label>); })}</div>{uTotal > pageSize && <div style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between" }}><button className="ghost-button" style={{ height: 28, fontSize: 12 }} disabled={uPage <= 1} onClick={() => setUPage((p) => p - 1)}>上页</button><button className="ghost-button" style={{ height: 28, fontSize: 12 }} disabled={uPage >= Math.ceil(uTotal / pageSize)} onClick={() => setUPage((p) => p + 1)}>下页</button></div>}</div></div>}<div className="modal-actions"><button className="ghost-button" onClick={onClose}>关闭</button></div></div></div>);
}
