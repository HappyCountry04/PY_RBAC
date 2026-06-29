"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Edit3, List, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import { modalConfirm } from "../../shared/components/modal";
import TableSkeleton from "../../shared/components/skeleton";
import DictTag from "../../shared/components/dict-tag";
import { can, showToast, parseDate, readRowValue } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

export default function DictManagementPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showSearch, setShowSearch] = useState(true);
  const [qDictName, setQDictName] = useState("");
  const [qDictType, setQDictType] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [qBeginTime, setQBeginTime] = useState("");
  const [qEndTime, setQEndTime] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editModal, setEditModal] = useState<{ mode: "create" | "edit"; dictId?: number } | null>(null);

  // Dict data management modal
  const [dataManage, setDataManage] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { if (!session) router.replace("/"); }, [session, router]);

  const perms = (session?.permissions ?? []) as string[];
  const cAdd = can(perms, "system:dict:add");
  const cEdit = can(perms, "system:dict:edit");
  const cRemove = can(perms, "system:dict:remove");
  const cExport = can(perms, "system:dict:export");

  const buildQuery = useCallback(() => {
    let qs = `pageNum=${pageNum}&pageSize=${pageSize}`;
    if (qDictName) qs += `&dictName=${encodeURIComponent(qDictName)}`;
    if (qDictType) qs += `&dictType=${encodeURIComponent(qDictType)}`;
    if (qStatus) qs += `&status=${qStatus}`;
    if (qBeginTime) qs += `&beginTime=${qBeginTime}`;
    if (qEndTime) qs += `&endTime=${qEndTime}`;
    return qs;
  }, [pageNum, pageSize, qDictName, qDictType, qStatus, qBeginTime, qEndTime]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = (await api.get(`/system/dict/type/list?${buildQuery()}`)) as TableResponse;
      setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
      setTotal(res.total ?? 0);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [buildQuery, session]);

  function handleSearch() { setPageNum(1); setSelectedIds(new Set()); }
  function handleReset() { setQDictName(""); setQDictType(""); setQStatus(""); setQBeginTime(""); setQEndTime(""); setPageNum(1); }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(rows.map((r) => Number(r.dictId))));
    else setSelectedIds(new Set());
  }
  function toggleSelect(id: number) { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); }

  async function handleDelete(row?: Record<string, unknown>) {
    const ids = row ? [row.dictId] : [...selectedIds];
    if (!ids.length) return;
    if (!await modalConfirm(`是否确认删除字典编号为"${ids.join(",")}"的数据项？`)) return;
    try { await api.delete(`/system/dict/type/${ids.join(",")}`); showToast("删除成功", "success"); setSelectedIds(new Set()); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  async function handleRefreshCache() {
    try { await api.delete("/system/dict/type/refreshCache"); showToast("刷新缓存成功", "success"); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "刷新失败", "error"); }
  }

  async function handleExport() {
    try {
      const blob = await api.blob(`/system/dict/type/export?${buildQuery()}`);
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `dict_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url);
      showToast("导出成功", "success");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "导出失败", "error"); }
  }

  const single = selectedIds.size !== 1; const multiple = selectedIds.size === 0;
  const totalPages = Math.ceil(total / pageSize);

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["dict"]}>
      <section className="data-surface">
        {showSearch && (<div className="search-bar">
          <div className="query-field"><span>字典名称</span><input value={qDictName} onChange={(e) => setQDictName(e.target.value)} placeholder="请输入字典名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>字典类型</span><input value={qDictType} onChange={(e) => setQDictType(e.target.value)} placeholder="请输入字典类型" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>状态</span><select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">正常</option><option value="1">停用</option></select></div>
          <div className="query-field"><span>创建时间</span><div className="date-range"><input type="date" value={qBeginTime} onChange={(e) => setQBeginTime(e.target.value)} /><span>-</span><input type="date" value={qEndTime} onChange={(e) => setQEndTime(e.target.value)} /></div></div>
          <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button>
          <button className="ghost-button" onClick={handleReset}>重置</button>
        </div>)}
        <div className="toolbar">
          {cAdd && <button className="primary-button" onClick={() => setEditModal({ mode: "create" })}><Plus size={14} />新增</button>}
          {cEdit && <button className="success-button" disabled={single} onClick={() => { const id = [...selectedIds][0]; if (id) setEditModal({ mode: "edit", dictId: id }); }}><Edit3 size={14} />修改</button>}
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
          <th>字典编号</th><th>字典名称</th><th>字典类型</th><th>状态</th><th>备注</th><th style={{ width: 180 }}>创建时间</th><th>操作</th>
        </tr></thead><tbody>
          {loading ? <TableSkeleton cols={8} rows={5} /> : rows.length ? rows.map((row) => {
            const did = Number(row.dictId);
            return (<tr key={did}>
              <td className="select-cell"><input type="checkbox" checked={selectedIds.has(did)} onChange={() => toggleSelect(did)} /></td>
              <td>{did}</td>
              <td>{String(row.dictName ?? "")}</td>
              <td>{String(row.dictType ?? "")}</td>
              <td><span className={`dict-tag ${row.status === "0" ? "success" : "danger"}`}>{row.status === "0" ? "正常" : "停用"}</span></td>
              <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.remark ?? "")}</td>
              <td>{parseDate(row.createTime)}</td>
              <td className="actions-cell">
                {cEdit && <button className="text-button" onClick={() => setEditModal({ mode: "edit", dictId: did })}><Edit3 size={13} />修改</button>}
                {cEdit && <button className="text-button" onClick={() => setDataManage(row)}><List size={13} />列表</button>}
                {cRemove && <button className="text-button danger" onClick={() => handleDelete(row)}><Trash2 size={13} />删除</button>}
              </td>
            </tr>);
          }) : <tr><td colSpan={8}>暂无数据</td></tr>}
        </tbody></table></div>
        {total > 0 && <div className="pager"><span style={{ color: "var(--muted)", fontSize: 13 }}>第 {pageNum}/{totalPages} 页 共 {total} 条</span><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageNum(1); }} style={{ height: 32, border: "1px solid var(--line)", padding: "0 8px" }}><option value={10}>10条/页</option><option value={25}>25条/页</option><option value={50}>50条/页</option><option value={100}>100条/页</option></select><button className="ghost-button" disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}>上一页</button><button className="ghost-button" disabled={pageNum >= totalPages} onClick={() => setPageNum((p) => p + 1)}>下一页</button></div>}
      </section>
      {editModal && <DictEditModal mode={editModal.mode} dictId={editModal.dictId} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); void load(); }} />}
      {dataManage && <DictDataManageModal row={dataManage} onClose={() => setDataManage(null)} />}
    </SidebarLayout>
  );
}

function DictEditModal({ mode, dictId, onClose, onSaved }: {
  mode: "create" | "edit"; dictId?: number; onClose: () => void; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({ status: "0" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => { (async () => {
    if (mode === "edit" && dictId) {
      try {
        const detail = await api.get(`/system/dict/type/${dictId}`);
        const data = ((detail as Record<string, unknown>).data ?? detail) as Record<string, unknown>;
        const init: Record<string, string> = {};
        for (const k of ["dictName","dictType","status","remark"]) {
          init[k] = String(readRowValue(data, k) ?? "");
        }
        if (!init.status || init.status === "undefined") init.status = "0";
        setValues(init);
      } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    }
    setLoading(false);
  })(); }, [mode, dictId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.dictName?.trim()) { setError("字典名称不能为空"); return; }
    if (!values.dictType?.trim()) { setError("字典类型不能为空"); return; }
    setBusy(true); setError("");
    const body: Record<string, unknown> = { ...values };
    try {
      if (mode === "edit" && dictId) { body.dictId = dictId; await api.put("/system/dict/type", body); showToast("修改成功", "success"); }
      else { await api.post("/system/dict/type", body); showToast("新增成功", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); }
    finally { setBusy(false); }
  }

  function setV(k: string, v: string) { setValues((prev) => ({ ...prev, [k]: v })); }

  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;

  return (<div className="modal-mask"><form className="modal-panel" style={{ width: "min(500px, 100%)" }} onSubmit={submit}>
    <div className="modal-head"><h2>{mode === "edit" ? "修改字典类型" : "添加字典类型"}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label><span className="form-label-text">字典名称 <em className="required">*</em></span><input value={values.dictName ?? ""} onChange={(e) => setV("dictName", e.target.value)} /></label>
      <label><span className="form-label-text">字典类型 <em className="required">*</em></span><input value={values.dictType ?? ""} onChange={(e) => setV("dictType", e.target.value)} maxLength={100} placeholder="如：sys_user_sex" /></label>
      <label><span className="form-label-text">状态</span>
        <div className="radio-group">
          <label className="radio-label"><input type="radio" name="status" value="0" checked={(values.status || "0") === "0"} onChange={() => setV("status", "0")} />正常</label>
          <label className="radio-label"><input type="radio" name="status" value="1" checked={values.status === "1"} onChange={() => setV("status", "1")} />停用</label>
        </div>
      </label>
      <label><span className="form-label-text">备注</span><textarea value={values.remark ?? ""} onChange={(e) => setV("remark", e.target.value)} /></label>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div>
  </form></div>);
}

function DictDataManageModal({ row, onClose }: { row: Record<string, unknown>; onClose: () => void }) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qLabel, setQLabel] = useState("");
  const [qDataStatus, setQDataStatus] = useState("");

  const [editForm, setEditForm] = useState<{ mode: "create" | "edit"; dictCode?: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let qs = `dictType=${encodeURIComponent(String(row.dictType ?? ""))}&pageNum=1&pageSize=200`;
      if (qLabel) qs += `&dictLabel=${encodeURIComponent(qLabel)}`;
      if (qDataStatus) qs += `&status=${qDataStatus}`;
      const res = await api.get(`/system/dict/data/list?${qs}`) as TableResponse;
      setData((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }, [row.dictType, qLabel, qDataStatus]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function handleDataSearch() { void fetchData(); }
  function handleDataReset() { setQLabel(""); setQDataStatus(""); }

  async function handleDataDelete(d: Record<string, unknown>) {
    if (!await modalConfirm(`是否确认删除字典数据"${d.dictLabel}"？`)) return;
    try { await api.delete(`/system/dict/data/${d.dictCode}`); showToast("删除成功", "success"); await fetchData(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  return (<div className="modal-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-panel" style={{ width: "min(800px, 100%)", maxHeight: "min(760px, calc(100vh - 48px))", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-head"><h2>{String(row.dictName ?? "")} - 字典数据</h2><button className="text-button" onClick={onClose}><X size={18} /></button></div>
      <div className="search-bar">
        <div className="query-field"><span>字典标签</span><input value={qLabel} onChange={(e) => setQLabel(e.target.value)} placeholder="请输入字典标签" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleDataSearch()} /></div>
        <div className="query-field"><span>状态</span><select value={qDataStatus} onChange={(e) => setQDataStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">正常</option><option value="1">停用</option></select></div>
        <button className="primary-small" onClick={handleDataSearch}><Search size={14} />搜索</button>
        <button className="ghost-button" onClick={handleDataReset}>重置</button>
      </div>
      <div className="toolbar">
        <button className="primary-button" onClick={() => setEditForm({ mode: "create" })}><Plus size={14} />新增</button>
        <div style={{ flex: 1 }} />
      </div>
      <div className="table-meta">{error && <strong>{error}</strong>}</div>
      <div className="table-wrap">
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>加载中...</div> : data.length ? (
          <table><thead><tr><th>字典标签</th><th>键值</th><th style={{ width: 100 }}>排序</th><th style={{ width: 100 }}>状态</th><th>备注</th><th>创建时间</th><th style={{ width: 140 }}>操作</th></tr></thead>
            <tbody>{data.map((d) => (
              <tr key={String(d.dictCode)}>
                <td>{String(d.dictLabel ?? "")}</td>
                <td>{String(d.dictValue ?? "")}</td>
                <td>{String(d.dictSort ?? "")}</td>
                <td><span className={`dict-tag ${d.status === "0" ? "success" : "danger"}`}>{d.status === "0" ? "正常" : "停用"}</span></td>
                <td>{String(d.remark ?? "")}</td>
                <td>{parseDate(d.createTime)}</td>
                <td className="actions-cell">
                  <button className="text-button" onClick={() => setEditForm({ mode: "edit", dictCode: Number(d.dictCode) })}><Edit3 size={13} />修改</button>
                  <button className="text-button danger" onClick={() => handleDataDelete(d)}><Trash2 size={13} />删除</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>暂无字典数据</div>}
      </div>
      {editForm && <DictDataEditModal mode={editForm.mode} dictCode={editForm.dictCode} dictType={String(row.dictType ?? "")} onClose={() => setEditForm(null)} onSaved={() => { setEditForm(null); void fetchData(); }} />}
    </div>
  </div>);
}

function DictDataEditModal({ mode, dictCode, dictType, onClose, onSaved }: {
  mode: "create" | "edit"; dictCode?: number; dictType: string; onClose: () => void; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({ dictSort: "0", status: "0" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => { (async () => {
    if (mode === "edit" && dictCode) {
      try {
        const detail = await api.get(`/system/dict/data/${dictCode}`);
        const data = ((detail as Record<string, unknown>).data ?? detail) as Record<string, unknown>;
        const init: Record<string, string> = {};
        for (const k of ["dictLabel","dictValue","dictSort","status","remark","cssClass","listClass"]) {
          init[k] = String(readRowValue(data, k) ?? "");
        }
        if (!init.dictSort || init.dictSort === "undefined") init.dictSort = "0";
        if (!init.status || init.status === "undefined") init.status = "0";
        setValues(init);
      } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    }
    setLoading(false);
  })(); }, [mode, dictCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.dictLabel?.trim()) { setError("字典标签不能为空"); return; }
    if (!values.dictValue?.trim()) { setError("字典键值不能为空"); return; }
    if (!values.dictSort) { setError("字典排序不能为空"); return; }
    setBusy(true); setError("");
    const body: Record<string, unknown> = {
      ...values,
      dictType,
      dictSort: Number(values.dictSort || 0),
    };
    try {
      if (mode === "edit" && dictCode) { body.dictCode = dictCode; await api.put("/system/dict/data", body); showToast("修改成功", "success"); }
      else { await api.post("/system/dict/data", body); showToast("新增成功", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); }
    finally { setBusy(false); }
  }

  function setV(k: string, v: string) { setValues((prev) => ({ ...prev, [k]: v })); }

  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;

  return (<div className="modal-mask"><form className="modal-panel" style={{ width: "min(500px, 100%)" }} onSubmit={submit}>
    <div className="modal-head"><h2>{mode === "edit" ? "修改字典数据" : "添加字典数据"}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label><span className="form-label-text">字典类型</span><span style={{ color: "var(--muted)", flex: 1, padding: "7px 0", fontSize: 14 }}>{dictType}</span></label>
      <label><span className="form-label-text">字典标签 <em className="required">*</em></span><input value={values.dictLabel ?? ""} onChange={(e) => setV("dictLabel", e.target.value)} /></label>
      <label><span className="form-label-text">字典键值 <em className="required">*</em></span><input value={values.dictValue ?? ""} onChange={(e) => setV("dictValue", e.target.value)} /></label>
      <label><span className="form-label-text">显示排序 <em className="required">*</em></span><input type="number" value={values.dictSort ?? "0"} onChange={(e) => setV("dictSort", e.target.value)} min={0} /></label>
      <label><span className="form-label-text">状态</span>
        <div className="radio-group">
          <label className="radio-label"><input type="radio" name="status" value="0" checked={(values.status || "0") === "0"} onChange={() => setV("status", "0")} />正常</label>
          <label className="radio-label"><input type="radio" name="status" value="1" checked={values.status === "1"} onChange={() => setV("status", "1")} />停用</label>
        </div>
      </label>
      <label><span className="form-label-text">备注</span><textarea value={values.remark ?? ""} onChange={(e) => setV("remark", e.target.value)} /></label>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div>
  </form></div>);
}
