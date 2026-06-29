"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Edit3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import { modalConfirm } from "../../shared/components/modal";
import TableSkeleton from "../../shared/components/skeleton";
import DictTag from "../../shared/components/dict-tag";
import { can, showToast, parseDate, readRowValue } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

export default function ConfigManagementPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showSearch, setShowSearch] = useState(true);
  const [qConfigName, setQConfigName] = useState("");
  const [qConfigKey, setQConfigKey] = useState("");
  const [qConfigType, setQConfigType] = useState("");
  const [qBeginTime, setQBeginTime] = useState("");
  const [qEndTime, setQEndTime] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editModal, setEditModal] = useState<{ mode: "create" | "edit"; configId?: number } | null>(null);

  const perms = (session?.permissions ?? []) as string[];
  const cAdd = can(perms, "system:config:add");
  const cEdit = can(perms, "system:config:edit");
  const cRemove = can(perms, "system:config:remove");
  const cExport = can(perms, "system:config:export");

  const buildQuery = useCallback(() => {
    let qs = `pageNum=${pageNum}&pageSize=${pageSize}`;
    if (qConfigName) qs += `&configName=${encodeURIComponent(qConfigName)}`;
    if (qConfigKey) qs += `&configKey=${encodeURIComponent(qConfigKey)}`;
    if (qConfigType) qs += `&configType=${qConfigType}`;
    if (qBeginTime) qs += `&beginTime=${qBeginTime}`;
    if (qEndTime) qs += `&endTime=${qEndTime}`;
    return qs;
  }, [pageNum, pageSize, qConfigName, qConfigKey, qConfigType, qBeginTime, qEndTime]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = (await api.get(`/system/config/list?${buildQuery()}`)) as TableResponse;
      setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
      setTotal(res.total ?? 0);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [buildQuery, session]);

  function handleSearch() { setPageNum(1); setSelectedIds(new Set()); }
  function handleReset() { setQConfigName(""); setQConfigKey(""); setQConfigType(""); setQBeginTime(""); setQEndTime(""); setPageNum(1); }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(rows.map((r) => Number(r.configId))));
    else setSelectedIds(new Set());
  }
  function toggleSelect(id: number) { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); }

  async function handleDelete(row?: Record<string, unknown>) {
    const ids = row ? [row.configId] : [...selectedIds];
    if (!ids.length) return;
    if (!await modalConfirm(`是否确认删除参数编号为"${ids.join(",")}"的数据项？`)) return;
    try { await api.delete(`/system/config/${ids.join(",")}`); showToast("删除成功", "success"); setSelectedIds(new Set()); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  async function handleRefreshCache() {
    try { await api.delete("/system/config/refreshCache"); showToast("刷新缓存成功", "success"); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "刷新失败", "error"); }
  }

  async function handleExport() {
    try {
      const blob = await api.blob(`/system/config/export?${buildQuery()}`);
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `config_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url);
      showToast("导出成功", "success");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "导出失败", "error"); }
  }

  const single = selectedIds.size !== 1; const multiple = selectedIds.size === 0;
  const totalPages = Math.ceil(total / pageSize);

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["config"]}>
      <section className="data-surface">
        {showSearch && (<div className="search-bar">
          <div className="query-field"><span>参数名称</span><input value={qConfigName} onChange={(e) => setQConfigName(e.target.value)} placeholder="请输入参数名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>参数键名</span><input value={qConfigKey} onChange={(e) => setQConfigKey(e.target.value)} placeholder="请输入参数键名" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>系统内置</span><select value={qConfigType} onChange={(e) => setQConfigType(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="Y">是</option><option value="N">否</option></select></div>
          <div className="query-field"><span>创建时间</span><div className="date-range"><input type="date" value={qBeginTime} onChange={(e) => setQBeginTime(e.target.value)} /><span>-</span><input type="date" value={qEndTime} onChange={(e) => setQEndTime(e.target.value)} /></div></div>
          <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button>
          <button className="ghost-button" onClick={handleReset}>重置</button>
        </div>)}
        <div className="toolbar">
          {cAdd && <button className="primary-button" onClick={() => setEditModal({ mode: "create" })}><Plus size={14} />新增</button>}
          {cEdit && <button className="success-button" disabled={single} onClick={() => { const id = [...selectedIds][0]; if (id) setEditModal({ mode: "edit", configId: id }); }}><Edit3 size={14} />修改</button>}
          {cRemove && <button className="danger-button" disabled={multiple} onClick={() => handleDelete()}><Trash2 size={14} />删除</button>}
          {cExport && <button className="ghost-button" onClick={handleExport}><Download size={14} />导出</button>}
          {cRemove && <button className="ghost-button" onClick={handleRefreshCache}>刷新缓存</button>}
          <div style={{ flex: 1 }} />
          <button className="icon-button" onClick={() => setShowSearch(!showSearch)} title="搜索"><Search size={16} /></button>
          <button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
        </div>
        {error && <div className="table-meta"><strong>{error}</strong></div>}
        <div className="table-wrap"><table><thead><tr>
          <th className="select-cell"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === rows.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
          <th>参数编号</th><th>参数名称</th><th>参数键名</th><th>参数键值</th><th>系统内置</th><th style={{ width: 180 }}>创建时间</th><th>操作</th>
        </tr></thead><tbody>
          {loading ? <TableSkeleton cols={8} rows={5} /> : rows.length ? rows.map((row) => {
            const cid = Number(row.configId);
            return (<tr key={cid}>
              <td className="select-cell"><input type="checkbox" checked={selectedIds.has(cid)} onChange={() => toggleSelect(cid)} /></td>
              <td>{cid}</td>
              <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.configName ?? "")}</td>
              <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.configKey ?? "")}</td>
              <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.configValue ?? "")}</td>
              <td><span className={`dict-tag ${row.configType === "Y" ? "success" : "info"}`}>{row.configType === "Y" ? "是" : "否"}</span></td>
              <td>{parseDate(row.createTime)}</td>
              <td className="actions-cell">
                {cEdit && <button className="text-button" onClick={() => setEditModal({ mode: "edit", configId: cid })}><Edit3 size={13} />修改</button>}
                {cRemove && <button className="text-button danger" onClick={() => handleDelete(row)}><Trash2 size={13} />删除</button>}
              </td>
            </tr>);
          }) : <tr><td colSpan={8}>暂无数据</td></tr>}
        </tbody></table></div>
        {total > 0 && <div className="pager"><span style={{ color: "var(--muted)", fontSize: 13 }}>第 {pageNum}/{totalPages} 页 共 {total} 条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageNum(1); }} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px" }}><option value={10}>10条/页</option><option value={25}>25条/页</option><option value={50}>50条/页</option><option value={100}>100条/页</option></select><button className="ghost-button" disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}>上一页</button><button className="ghost-button" disabled={pageNum >= totalPages} onClick={() => setPageNum((p) => p + 1)}>下一页</button></div>}
      </section>
      {editModal && <ConfigEditModal mode={editModal.mode} configId={editModal.configId} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); void load(); }} />}
    </SidebarLayout>
  );
}

function ConfigEditModal({ mode, configId, onClose, onSaved }: {
  mode: "create" | "edit"; configId?: number; onClose: () => void; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({ configType: "Y" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => { (async () => {
    if (mode === "edit" && configId) {
      try {
        const detail = await api.get(`/system/config/${configId}`);
        const data = ((detail as Record<string, unknown>).data ?? detail) as Record<string, unknown>;
        const init: Record<string, string> = {};
        for (const k of ["configName","configKey","configValue","configType","remark"]) {
          init[k] = String(readRowValue(data, k) ?? "");
        }
        if (!init.configType || init.configType === "undefined") init.configType = "Y";
        setValues(init);
      } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    }
    setLoading(false);
  })(); }, [mode, configId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.configName?.trim()) { setError("参数名称不能为空"); return; }
    if (!values.configKey?.trim()) { setError("参数键名不能为空"); return; }
    if (!values.configValue?.trim()) { setError("参数键值不能为空"); return; }
    setBusy(true); setError("");
    const body: Record<string, unknown> = { ...values };
    try {
      if (mode === "edit" && configId) { body.configId = configId; await api.put("/system/config", body); showToast("修改成功", "success"); }
      else { await api.post("/system/config", body); showToast("新增成功", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); }
    finally { setBusy(false); }
  }

  function setV(k: string, v: string) { setValues((prev) => ({ ...prev, [k]: v })); }

  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;

  return (<div className="modal-mask"><form className="modal-panel" style={{ width: "min(500px, 100%)" }} onSubmit={submit}>
    <div className="modal-head"><h2>{mode === "edit" ? "修改参数" : "添加参数"}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label><span className="form-label-text">参数名称 <em className="required">*</em></span><input value={values.configName ?? ""} onChange={(e) => setV("configName", e.target.value)} /></label>
      <label><span className="form-label-text">参数键名 <em className="required">*</em></span><input value={values.configKey ?? ""} onChange={(e) => setV("configKey", e.target.value)} /></label>
      <label><span className="form-label-text">参数键值 <em className="required">*</em></span><textarea value={values.configValue ?? ""} onChange={(e) => setV("configValue", e.target.value)} /></label>
      <label><span className="form-label-text">系统内置</span>
        <div className="radio-group">
          <label className="radio-label"><input type="radio" name="configType" value="Y" checked={(values.configType || "Y") === "Y"} onChange={() => setV("configType", "Y")} />是</label>
          <label className="radio-label"><input type="radio" name="configType" value="N" checked={values.configType === "N"} onChange={() => setV("configType", "N")} />否</label>
        </div>
      </label>
      <label><span className="form-label-text">备注</span><textarea value={values.remark ?? ""} onChange={(e) => setV("remark", e.target.value)} /></label>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div>
  </form></div>);
}
