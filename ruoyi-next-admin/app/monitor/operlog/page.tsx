"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import Pagination from "../../shared/components/pagination";
import TableSkeleton from "../../shared/components/skeleton";
import DictTag from "../../shared/components/dict-tag";
import { modalConfirm } from "../../shared/components/modal";
import { can, showToast, parseDate } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

export default function OperlogPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderByColumn, setOrderByColumn] = useState("operTime");
  const [isAsc, setIsAsc] = useState("desc");

  const [showSearch, setShowSearch] = useState(true);
  const [qOperIp, setQOperIp] = useState("");
  const [qTitle, setQTitle] = useState("");
  const [qOperName, setQOperName] = useState("");
  const [qBusinessType, setQBusinessType] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [qBeginTime, setQBeginTime] = useState("");
  const [qEndTime, setQEndTime] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { if (!session) router.replace("/"); }, [session, router]);

  const routerRef = router;

  const perms = (session?.permissions ?? []) as string[];
  const cQuery = can(perms, "monitor:operlog:query");
  const cRemove = can(perms, "monitor:operlog:remove");
  const cExport = can(perms, "monitor:operlog:export");

  const buildQuery = useCallback(() => {
    let qs = `pageNum=${pageNum}&pageSize=${pageSize}&orderByColumn=${orderByColumn}&isAsc=${isAsc}`;
    if (qOperIp) qs += `&operIp=${encodeURIComponent(qOperIp)}`;
    if (qTitle) qs += `&title=${encodeURIComponent(qTitle)}`;
    if (qOperName) qs += `&operName=${encodeURIComponent(qOperName)}`;
    if (qBusinessType) qs += `&businessType=${qBusinessType}`;
    if (qStatus) qs += `&status=${qStatus}`;
    if (qBeginTime) qs += `&beginTime=${qBeginTime}`;
    if (qEndTime) qs += `&endTime=${qEndTime}`;
    return qs;
  }, [pageNum, pageSize, orderByColumn, isAsc, qOperIp, qTitle, qOperName, qBusinessType, qStatus, qBeginTime, qEndTime]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = (await api.get(`/monitor/operlog/list?${buildQuery()}`)) as TableResponse;
      setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
      setTotal(res.total ?? 0);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [buildQuery, session]);

  function handleSearch() { setPageNum(1); setSelectedIds(new Set()); }
  function handleReset() { setQOperIp(""); setQTitle(""); setQOperName(""); setQBusinessType(""); setQStatus(""); setQBeginTime(""); setQEndTime(""); setPageNum(1); }

  function toggleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(rows.map((r) => Number(r.oper_id))));
    else setSelectedIds(new Set());
  }
  function toggleSelect(id: number) { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); }

  function handleSort(col: string) {
    if (orderByColumn === col) { setIsAsc((p) => p === "asc" ? "desc" : "asc"); }
    else { setOrderByColumn(col); setIsAsc("asc"); }
    setPageNum(1);
  }

  async function handleDelete(row?: Record<string, unknown>) {
    const ids = row ? [row.oper_id] : [...selectedIds];
    if (!ids.length) return;
    if (!await modalConfirm(`是否确认删除日志编号为"${ids.join(",")}"的数据项？`)) return;
    try { await api.delete(`/monitor/operlog/${ids.join(",")}`); showToast("删除成功", "success"); setSelectedIds(new Set()); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  async function handleClean() {
    if (!await modalConfirm("是否确认清空所有操作日志？")) return;
    try { await api.delete("/monitor/operlog/clean"); showToast("清空成功", "success"); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "清空失败", "error"); }
  }

  async function handleExport() {
    try {
      const blob = await api.blob(`/monitor/operlog/export?${buildQuery()}`);
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `operlog_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url);
      showToast("导出成功", "success");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "导出失败", "error"); }
  }

  function sortIcon(col: string) {
    if (orderByColumn !== col) return <span style={{ display: "inline-block", width: 14, color: "#ccc" }}>⇅</span>;
    return isAsc === "asc" ? <span style={{ color: "var(--primary)" }}>↑</span> : <span style={{ color: "var(--primary)" }}>↓</span>;
  }

  const multiple = selectedIds.size === 0;
  const businessTypeMap: Record<string, string> = { "1": "新增", "2": "修改", "3": "删除", "4": "授权", "5": "导出", "6": "导入", "7": "强退", "8": "生成代码", "9": "清空数据" };

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["operlog"]}>
      <section className="data-surface">
        {showSearch && (<div className="search-bar">
          <div className="query-field"><span>操作地址</span><input value={qOperIp} onChange={(e) => setQOperIp(e.target.value)} placeholder="请输入操作地址" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>系统模块</span><input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="请输入系统模块" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>操作人员</span><input value={qOperName} onChange={(e) => setQOperName(e.target.value)} placeholder="请输入操作人员" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>类型</span><select value={qBusinessType} onChange={(e) => setQBusinessType(e.target.value)} style={{ width: 140 }}><option value="">全部</option>{Object.entries(businessTypeMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="query-field"><span>状态</span><select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">成功</option><option value="1">失败</option></select></div>
          <div className="query-field"><span>操作时间</span><div className="date-range"><input type="date" value={qBeginTime} onChange={(e) => setQBeginTime(e.target.value)} /><span>-</span><input type="date" value={qEndTime} onChange={(e) => setQEndTime(e.target.value)} /></div></div>
          <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button>
          <button className="ghost-button" onClick={handleReset}>重置</button>
        </div>)}
        <div className="toolbar">
          {cRemove && <button className="danger-button" disabled={multiple} onClick={() => handleDelete()}><Trash2 size={14} />删除</button>}
          {cRemove && <button className="warning-button" onClick={handleClean}><Trash2 size={14} />清空</button>}
          {cExport && <button className="ghost-button" onClick={handleExport}><Download size={14} />导出</button>}
          <div style={{ flex: 1 }} />
          <button className="icon-button" onClick={() => setShowSearch(!showSearch)} title="搜索"><Search size={16} /></button>
          <button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
        </div>
        {error && <div className="table-meta"><strong>{error}</strong></div>}
        <div className="table-wrap"><table><thead><tr>
          <th className="select-cell"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === rows.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
          <th>日志编号</th><th>系统模块</th><th>操作类型</th>
          <th style={{ width: 110, cursor: "pointer" }} onClick={() => handleSort("operName")}>操作人员 {sortIcon("operName")}</th>
          <th style={{ width: 130 }}>操作地址</th><th>操作地点</th><th>操作状态</th>
          <th style={{ width: 160, cursor: "pointer" }} onClick={() => handleSort("operTime")}>操作日期 {sortIcon("operTime")}</th>
          <th style={{ width: 110, cursor: "pointer" }} onClick={() => handleSort("costTime")}>消耗时间 {sortIcon("costTime")}</th>
          <th>操作</th>
        </tr></thead><tbody>
          {loading ? <TableSkeleton cols={12} rows={6} /> : rows.length ? rows.map((row) => {
            const oid = Number(row.oper_id);
            return (<tr key={oid}>
              <td className="select-cell"><input type="checkbox" checked={selectedIds.has(oid)} onChange={() => toggleSelect(oid)} /></td>
              <td>{oid}</td>
              <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.title ?? "")}</td>
              <td><span className="dict-tag info">{businessTypeMap[String(row.business_type ?? "")] ?? String(row.business_type ?? "")}</span></td>
              <td>{String(row.oper_name ?? "")}</td>
              <td>{String(row.oper_ip ?? "")}</td>
              <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.oper_location ?? "")}</td>
              <td><DictTag options={[{label:"成功",value:"0"},{label:"失败",value:"1"}]} value={String(row.status ?? "")} /></td>
              <td>{parseDate(row.oper_time)}</td>
              <td>{String(row.cost_time ?? "")}毫秒</td>
              <td className="actions-cell">
                {cQuery && <button className="text-button" onClick={() => setDetailRow(row)}><Eye size={13} />详细</button>}
              </td>
            </tr>);
          }) : <tr><td colSpan={12}>暂无数据</td></tr>}
        </tbody></table></div>
        <Pagination pageNum={pageNum} pageSize={pageSize} total={total} onPageChange={(p, s) => { setPageNum(p); setPageSize(s); }} />
      </section>
      {detailRow && <OperlogDetail row={detailRow} onClose={() => setDetailRow(null)} businessTypeMap={businessTypeMap} />}
    </SidebarLayout>
  );
}

function OperlogDetail({ row, onClose, businessTypeMap }: {
  row: Record<string, unknown>; onClose: () => void; businessTypeMap: Record<string, string>;
}) {
  const method = String(row.request_method ?? "GET");
  const methodColor: Record<string, string> = { GET: "success", POST: "primary", PUT: "warning", DELETE: "danger" };

  return (<div className="modal-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-panel" style={{ width: "min(780px, 100%)", maxHeight: "min(760px, calc(100vh - 48px))", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-head"><h2>操作日志详细</h2><button className="text-button" onClick={onClose}><X size={18} /></button></div>
      <h4 className="section-header">基本信息</h4>
      <div className="detail-grid">
        <div className="detail-item"><span>操作模块</span><strong>{String(row.title ?? "")}</strong></div>
        <div className="detail-item"><span>业务类型</span><strong>{businessTypeMap[String(row.business_type ?? "")] ?? String(row.business_type ?? "")}</strong></div>
        <div className="detail-item"><span>操作时间</span><strong>{parseDate(row.oper_time)}</strong></div>
        <div className="detail-item"><span>执行状态</span><strong><span className={`dict-tag ${String(row.status) === "0" ? "success" : "danger"}`}>{String(row.status) === "0" ? "正常" : "异常"}</span></strong></div>
      </div>
      <h4 className="section-header">操作人员</h4>
      <div className="detail-grid">
        <div className="detail-item"><span>操作人员</span><strong>{String(row.oper_name ?? "")}</strong></div>
        <div className="detail-item"><span>所属部门</span><strong>{String(row.dept_name ?? "")}</strong></div>
        <div className="detail-item"><span>操作地址</span><strong>{String(row.oper_ip ?? "")}</strong></div>
        <div className="detail-item"><span>操作地点</span><strong>{String(row.oper_location ?? "")}</strong></div>
      </div>
      <h4 className="section-header">请求信息</h4>
      <div className="detail-grid">
        <div className="detail-item"><span>请求地址</span><strong><span className={`dict-tag ${methodColor[method] ?? "info"}`} style={{ marginRight: 8 }}>{method}</span>{String(row.oper_url ?? "")}</strong></div>
        <div className="detail-item"><span>操作方法</span><strong><code style={{ fontSize: 12 }}>{String(row.method ?? "")}</code></strong></div>
        <div className="detail-item"><span>消耗时间</span><strong>{String(row.cost_time ?? "")}毫秒</strong></div>
      </div>
      <h4 className="section-header">请求参数</h4>
      <div style={{ padding: "0 18px 8px" }}><pre style={{ maxHeight: 200, overflow: "auto", background: "#f8fafc", padding: 12, fontSize: 12, border: "1px solid var(--line)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(tryParse(String(row.oper_param ?? "")), null, 2)}</pre></div>
      <h4 className="section-header">返回参数</h4>
      <div style={{ padding: "0 18px 8px" }}><pre style={{ maxHeight: 200, overflow: "auto", background: "#f8fafc", padding: 12, fontSize: 12, border: "1px solid var(--line)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(tryParse(String(row.json_result ?? "")), null, 2)}</pre></div>
      {String(row.status) !== "0" && String(row.error_msg ?? "") && (<>
        <h4 className="section-header" style={{ color: "var(--danger)" }}>异常信息</h4>
        <div style={{ padding: "0 18px 14px", color: "var(--danger)", fontSize: 13, whiteSpace: "pre-wrap" }}>{String(row.error_msg)}</div>
      </>)}
      <div className="modal-actions" style={{ borderTop: "1px solid var(--line)" }}><button className="ghost-button" onClick={onClose}>关闭</button></div>
    </div>
  </div>);
}

function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
