"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Plus, RefreshCw, Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import DeptTree from "../../shared/components/dept-tree";
import { UserEditModal, UserViewDrawer, ImportDialog, ResetPwdModal, AuthRoleModal } from "../../shared/components/user-modals";
import { modalConfirm } from "../../shared/components/modal";
import TableSkeleton from "../../shared/components/skeleton";
import DictTag from "../../shared/components/dict-tag";
import { can, showToast, parseDate } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

export default function UserManagementPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showSearch, setShowSearch] = useState(true);
  const [qUserName, setQUserName] = useState("");
  const [qPhone, setQPhone] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [qBeginTime, setQBeginTime] = useState("");
  const [qEndTime, setQEndTime] = useState("");
  const [qDeptId, setQDeptId] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [treeWidth, setTreeWidth] = useState(() => {
    if (typeof window !== "undefined") { const s = localStorage.getItem("dept-sidebar-width"); return s ? Number(s) : 240; }
    return 240;
  });

  const [editModal, setEditModal] = useState<{ mode: "create" | "edit"; userId?: number } | null>(null);
  const [viewUserId, setViewUserId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<Record<string, unknown> | null>(null);
  const [authRoleUser, setAuthRoleUser] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  const perms = (session?.permissions ?? []) as string[];
  const cAdd = can(perms, "system:user:add");
  const cEdit = can(perms, "system:user:edit");
  const cRemove = can(perms, "system:user:remove");
  const cImport = can(perms, "system:user:import");
  const cExport = can(perms, "system:user:export");
  const cResetPwd = can(perms, "system:user:resetPwd");

  const buildQuery = useCallback(() => {
    let qs = `pageNum=${pageNum}&pageSize=${pageSize}`;
    if (qUserName) qs += `&userName=${encodeURIComponent(qUserName)}`;
    if (qPhone) qs += `&phonenumber=${encodeURIComponent(qPhone)}`;
    if (qStatus) qs += `&status=${qStatus}`;
    if (qBeginTime) qs += `&beginTime=${qBeginTime}`;
    if (qEndTime) qs += `&endTime=${qEndTime}`;
    if (qDeptId) qs += `&deptId=${qDeptId}`;
    return qs;
  }, [pageNum, pageSize, qUserName, qPhone, qStatus, qBeginTime, qEndTime, qDeptId]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = (await api.get(`/system/user/list?${buildQuery()}`)) as TableResponse;
      setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
      setTotal(res.total ?? 0);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [buildQuery, session]);

  function handleSearch() { setPageNum(1); setSelectedIds(new Set()); }
  function handleReset() { setQUserName(""); setQPhone(""); setQStatus(""); setQBeginTime(""); setQEndTime(""); setQDeptId(""); setActiveDeptId(null); setPageNum(1); }

  function handleDeptSelect(id: number | null) {
    if (activeDeptId === id) { setActiveDeptId(null); setQDeptId(""); }
    else { setActiveDeptId(id); setQDeptId(id !== null ? String(id) : ""); }
    setPageNum(1);
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(rows.filter((r) => Number(r.userId) !== 1).map((r) => Number(r.userId))));
    else setSelectedIds(new Set());
  }
  function toggleSelect(uid: number) { const n = new Set(selectedIds); n.has(uid) ? n.delete(uid) : n.add(uid); setSelectedIds(n); }

  async function handleStatusChange(row: Record<string, unknown>) {
    const uid = Number(row.userId); const ns = row.status === "0" ? "1" : "0";
    const text = ns === "0" ? "启用" : "停用";
    if (!await modalConfirm(`确认要"${text}""${row.userName}"用户吗？`)) return;
    try { await api.put("/system/user/changeStatus", { userId: uid, status: ns }); showToast(`${text}成功`, "success"); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "操作失败", "error"); }
  }

  async function handleDelete(row?: Record<string, unknown>) {
    const ids = row ? [row.userId] : [...selectedIds];
    if (!ids.length) return;
    if (ids.includes(1)) { showToast("不能删除超级管理员", "error"); return; }
    if (!await modalConfirm(`是否确认删除用户编号为"${ids.join(",")}"的数据项？`)) return;
    try { await api.delete(`/system/user/${ids.join(",")}`); showToast("删除成功", "success"); setSelectedIds(new Set()); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  async function handleExport() {
    try {
      const blob = await api.blob(`/system/user/export?${buildQuery()}`);
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `user_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url);
      showToast("导出成功", "success");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "导出失败", "error"); }
  }

  const single = selectedIds.size !== 1; const multiple = selectedIds.size === 0;
  const totalPages = Math.ceil(total / pageSize);

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["user"]}>
      <div className="with-tree-panel">
        <DeptTree activeId={activeDeptId} onSelect={handleDeptSelect} width={treeWidth} onWidthChange={setTreeWidth} collapsed={treeCollapsed} onToggle={() => setTreeCollapsed(!treeCollapsed)} />
        <section className="data-surface">
          {showSearch && (<div className="search-bar">
            <div className="query-field"><span>用户名称</span><input value={qUserName} onChange={(e) => setQUserName(e.target.value)} placeholder="请输入用户名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
            <div className="query-field"><span>手机号码</span><input value={qPhone} onChange={(e) => setQPhone(e.target.value)} placeholder="请输入手机号码" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
            <div className="query-field"><span>状态</span><select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">正常</option><option value="1">停用</option></select></div>
            <div className="query-field"><span>创建时间</span><div className="date-range"><input type="date" value={qBeginTime} onChange={(e) => setQBeginTime(e.target.value)} /><span>-</span><input type="date" value={qEndTime} onChange={(e) => setQEndTime(e.target.value)} /></div></div>
            <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button>
            <button className="ghost-button" onClick={handleReset}>重置</button>
          </div>)}
          <div className="toolbar">
            {cAdd && <button className="primary-button" onClick={() => setEditModal({ mode: "create" })}><Plus size={14} />新增</button>}
            {cEdit && <button className="success-button" disabled={single} onClick={() => { const id = [...selectedIds][0]; if (id) setEditModal({ mode: "edit", userId: id }); }}>修改</button>}
            {cRemove && <button className="danger-button" disabled={multiple} onClick={() => handleDelete()}>删除</button>}
            {cImport && <button className="ghost-button" onClick={() => setImportOpen(true)}><Upload size={14} />导入</button>}
            {cExport && <button className="ghost-button" onClick={handleExport}><Download size={14} />导出</button>}
            <div style={{ flex: 1 }} />
            <button className="icon-button" onClick={() => setShowSearch(!showSearch)} title="搜索"><Search size={16} /></button>
            <button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
          </div>
          {error && <div className="table-meta"><strong>{error}</strong></div>}
          <div className="table-wrap"><table><thead><tr>
            <th className="select-cell"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === rows.filter((r) => Number(r.userId) !== 1).length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
            <th>用户编号</th><th>用户名称</th><th>用户昵称</th><th>部门</th><th>手机号码</th><th>状态</th><th>创建时间</th><th>操作</th>
          </tr></thead><tbody>
            {loading ? <TableSkeleton cols={9} rows={6} /> : rows.length ? rows.map((row) => {
              const uid = Number(row.userId); const isAdmin = uid === 1; const dept = row.dept as Record<string, unknown> | undefined;
              return (<tr key={uid}>
                <td className="select-cell">{!isAdmin && <input type="checkbox" checked={selectedIds.has(uid)} onChange={() => toggleSelect(uid)} />}</td>
                <td>{uid}</td>
                <td><button className="text-button" onClick={() => setViewUserId(uid)}>{String(row.userName)}</button></td>
                <td>{String(row.nickName ?? "")}</td>
                <td>{dept?.deptName ? String(dept.deptName) : ""}</td>
                <td>{String(row.phonenumber ?? "")}</td>
                <td>{cEdit ? <label className="switch-label"><input type="checkbox" className="switch-input" checked={row.status === "0"} onChange={() => handleStatusChange(row)} disabled={isAdmin} /><span className="switch-slider" /></label> : <span className={`status-tag ${row.status === "0" ? "normal" : "disabled"}`}>{row.status === "0" ? "正常" : "停用"}</span>}</td>
                <td>{parseDate(row.createTime)}</td>
                <td className="actions-cell">{!isAdmin && <>{cEdit && <button className="text-button" onClick={() => setEditModal({ mode: "edit", userId: uid })}>编辑</button>}{cRemove && <button className="text-button danger" onClick={() => handleDelete(row)}>删除</button>}{(cResetPwd || cEdit) && <div className="more-dropdown"><button className="text-button" style={{ color: "#667085" }}>更多 <ChevronDown size={12} style={{ display: "inline", verticalAlign: "middle" }} /></button><div className="more-menu">{cResetPwd && <button className="text-button" onClick={() => setResetPwdUser(row)}>重置密码</button>}{cEdit && <button className="text-button" onClick={() => setAuthRoleUser(row)}>分配角色</button>}</div></div>}</>}</td>
              </tr>);
            }) : <tr><td colSpan={9}>暂无数据</td></tr>}
          </tbody></table></div>
          {total > 0 && <div className="pager"><span style={{ color: "var(--muted)", fontSize: 13 }}>第 {pageNum}/{totalPages} 页 共 {total} 条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageNum(1); }} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px" }}><option value={10}>10条/页</option><option value={25}>25条/页</option><option value={50}>50条/页</option><option value={100}>100条/页</option></select><button className="ghost-button" disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}>上一页</button><button className="ghost-button" disabled={pageNum >= totalPages} onClick={() => setPageNum((p) => p + 1)}>下一页</button></div>}
        </section>
      </div>
      {editModal && <UserEditModal mode={editModal.mode} userId={editModal.userId} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); void load(); }} />}
      {viewUserId && <UserViewDrawer userId={viewUserId} onClose={() => setViewUserId(null)} />}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); void load(); }} />}
      {resetPwdUser && <ResetPwdModal user={resetPwdUser} onSubmit={async (pwd) => { await api.put("/system/user/resetPwd", { userId: resetPwdUser.userId, password: pwd }); showToast("修改成功，新密码是：" + pwd, "success"); setResetPwdUser(null); }} onClose={() => setResetPwdUser(null)} />}
      {authRoleUser && <AuthRoleModal userId={Number(authRoleUser.userId)} userName={String(authRoleUser.userName)} nickName={String(authRoleUser.nickName ?? "")} onClose={() => setAuthRoleUser(null)} onSaved={() => { setAuthRoleUser(null); showToast("授权成功", "success"); }} />}
    </SidebarLayout>
  );
}
