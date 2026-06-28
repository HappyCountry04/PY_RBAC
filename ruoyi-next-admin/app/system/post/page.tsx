"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Edit3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import { can, showToast, parseDate, readRowValue } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

export default function PostManagementPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showSearch, setShowSearch] = useState(true);
  const [qPostCode, setQPostCode] = useState("");
  const [qPostName, setQPostName] = useState("");
  const [qStatus, setQStatus] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editModal, setEditModal] = useState<{ mode: "create" | "edit"; postId?: number } | null>(null);

  useEffect(() => { if (!session) router.replace("/"); }, [session, router]);

  const perms = (session?.permissions ?? []) as string[];
  const cAdd = can(perms, "system:post:add");
  const cEdit = can(perms, "system:post:edit");
  const cRemove = can(perms, "system:post:remove");
  const cExport = can(perms, "system:post:export");

  const buildQuery = useCallback(() => {
    let qs = `pageNum=${pageNum}&pageSize=${pageSize}`;
    if (qPostCode) qs += `&postCode=${encodeURIComponent(qPostCode)}`;
    if (qPostName) qs += `&postName=${encodeURIComponent(qPostName)}`;
    if (qStatus) qs += `&status=${qStatus}`;
    return qs;
  }, [pageNum, pageSize, qPostCode, qPostName, qStatus]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = (await api.get(`/system/post/list?${buildQuery()}`)) as TableResponse;
      setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
      setTotal(res.total ?? 0);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [buildQuery, session]);

  function handleSearch() { setPageNum(1); setSelectedIds(new Set()); }
  function handleReset() { setQPostCode(""); setQPostName(""); setQStatus(""); setPageNum(1); }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(rows.map((r) => Number(r.postId))));
    else setSelectedIds(new Set());
  }
  function toggleSelect(id: number) { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); }

  async function handleDelete(row?: Record<string, unknown>) {
    const ids = row ? [row.postId] : [...selectedIds];
    if (!ids.length) return;
    if (!window.confirm(`是否确认删除岗位编号为"${ids.join(",")}"的数据项？`)) return;
    try { await api.delete(`/system/post/${ids.join(",")}`); showToast("删除成功", "success"); setSelectedIds(new Set()); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  async function handleExport() {
    try {
      const blob = await api.blob(`/system/post/export?${buildQuery()}`);
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `post_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url);
      showToast("导出成功", "success");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "导出失败", "error"); }
  }

  const single = selectedIds.size !== 1; const multiple = selectedIds.size === 0;
  const totalPages = Math.ceil(total / pageSize);

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["post"]}>
      <section className="data-surface">
        {showSearch && (<div className="search-bar">
          <div className="query-field"><span>岗位编码</span><input value={qPostCode} onChange={(e) => setQPostCode(e.target.value)} placeholder="请输入岗位编码" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>岗位名称</span><input value={qPostName} onChange={(e) => setQPostName(e.target.value)} placeholder="请输入岗位名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>状态</span><select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">正常</option><option value="1">停用</option></select></div>
          <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button>
          <button className="ghost-button" onClick={handleReset}>重置</button>
        </div>)}
        <div className="toolbar">
          {cAdd && <button className="primary-button" onClick={() => setEditModal({ mode: "create" })}><Plus size={14} />新增</button>}
          {cEdit && <button className="success-button" disabled={single} onClick={() => { const id = [...selectedIds][0]; if (id) setEditModal({ mode: "edit", postId: id }); }}><Edit3 size={14} />修改</button>}
          {cRemove && <button className="danger-button" disabled={multiple} onClick={() => handleDelete()}><Trash2 size={14} />删除</button>}
          {cExport && <button className="ghost-button" onClick={handleExport}><Download size={14} />导出</button>}
          <div style={{ flex: 1 }} />
          <button className="icon-button" onClick={() => setShowSearch(!showSearch)} title="搜索"><Search size={16} /></button>
          <button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
        </div>
        <div className="table-meta"><span>共 {total} 条</span>{error && <strong>{error}</strong>}</div>
        <div className="table-wrap"><table><thead><tr>
          <th className="select-cell"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === rows.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
          <th>岗位编号</th><th>岗位编码</th><th>岗位名称</th><th>岗位排序</th><th>状态</th><th style={{ width: 180 }}>创建时间</th><th>操作</th>
        </tr></thead><tbody>
          {loading ? <tr><td colSpan={8}>加载中...</td></tr> : rows.length ? rows.map((row) => {
            const pid = Number(row.postId);
            return (<tr key={pid}>
              <td className="select-cell"><input type="checkbox" checked={selectedIds.has(pid)} onChange={() => toggleSelect(pid)} /></td>
              <td>{pid}</td>
              <td>{String(row.postCode ?? "")}</td>
              <td>{String(row.postName ?? "")}</td>
              <td>{String(row.postSort ?? "")}</td>
              <td><span className={`dict-tag ${row.status === "0" ? "success" : "danger"}`}>{row.status === "0" ? "正常" : "停用"}</span></td>
              <td>{parseDate(row.createTime)}</td>
              <td className="actions-cell">
                {cEdit && <button className="text-button" onClick={() => setEditModal({ mode: "edit", postId: pid })}><Edit3 size={13} />修改</button>}
                {cRemove && <button className="text-button danger" onClick={() => handleDelete(row)}><Trash2 size={13} />删除</button>}
              </td>
            </tr>);
          }) : <tr><td colSpan={8}>暂无数据</td></tr>}
        </tbody></table></div>
        {total > 0 && <div className="pager"><span style={{ color: "var(--muted)", fontSize: 13 }}>第 {pageNum}/{totalPages} 页 共 {total} 条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageNum(1); }} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px" }}><option value={10}>10条/页</option><option value={25}>25条/页</option><option value={50}>50条/页</option><option value={100}>100条/页</option></select><button className="ghost-button" disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}>上一页</button><button className="ghost-button" disabled={pageNum >= totalPages} onClick={() => setPageNum((p) => p + 1)}>下一页</button></div>}
      </section>
      {editModal && <PostEditModal mode={editModal.mode} postId={editModal.postId} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); void load(); }} />}
    </SidebarLayout>
  );
}

function PostEditModal({ mode, postId, onClose, onSaved }: {
  mode: "create" | "edit"; postId?: number; onClose: () => void; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({ postSort: "0", status: "0" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => { (async () => {
    if (mode === "edit" && postId) {
      try {
        const detail = await api.get(`/system/post/${postId}`);
        const data = ((detail as Record<string, unknown>).data ?? detail) as Record<string, unknown>;
        const init: Record<string, string> = {};
        for (const k of ["postName","postCode","postSort","status","remark"]) {
          init[k] = String(readRowValue(data, k) ?? "");
        }
        if (!init.postSort || init.postSort === "undefined") init.postSort = "0";
        if (!init.status || init.status === "undefined") init.status = "0";
        setValues(init);
      } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    }
    setLoading(false);
  })(); }, [mode, postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.postName?.trim()) { setError("岗位名称不能为空"); return; }
    if (!values.postCode?.trim()) { setError("岗位编码不能为空"); return; }
    if (!values.postSort) { setError("岗位顺序不能为空"); return; }
    setBusy(true); setError("");
    const body: Record<string, unknown> = { ...values, postSort: Number(values.postSort || 0) };
    try {
      if (mode === "edit" && postId) { body.postId = postId; await api.put("/system/post", body); showToast("修改成功", "success"); }
      else { await api.post("/system/post", body); showToast("新增成功", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); }
    finally { setBusy(false); }
  }

  function setV(k: string, v: string) { setValues((prev) => ({ ...prev, [k]: v })); }

  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;

  return (<div className="modal-mask"><form className="modal-panel" style={{ width: "min(500px, 100%)" }} onSubmit={submit}>
    <div className="modal-head"><h2>{mode === "edit" ? "修改岗位" : "添加岗位"}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label>岗位名称 <span style={{ color: "var(--danger)" }}>*</span><input value={values.postName ?? ""} onChange={(e) => setV("postName", e.target.value)} /></label>
      <label>岗位编码 <span style={{ color: "var(--danger)" }}>*</span><input value={values.postCode ?? ""} onChange={(e) => setV("postCode", e.target.value)} /></label>
      <label>岗位顺序 <span style={{ color: "var(--danger)" }}>*</span><input type="number" value={values.postSort ?? "0"} onChange={(e) => setV("postSort", e.target.value)} min={0} /></label>
      <label>
        状态
        <div className="radio-group">
          <label className="radio-label"><input type="radio" name="status" value="0" checked={(values.status || "0") === "0"} onChange={() => setV("status", "0")} />正常</label>
          <label className="radio-label"><input type="radio" name="status" value="1" checked={values.status === "1"} onChange={() => setV("status", "1")} />停用</label>
        </div>
      </label>
      <label className="wide-field">备注<textarea value={values.remark ?? ""} onChange={(e) => setV("remark", e.target.value)} /></label>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div>
  </form></div>);
}
