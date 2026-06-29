"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, LockKeyhole, RefreshCw, Search, Trash2 } from "lucide-react";
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

export default function LogininforPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderByColumn, setOrderByColumn] = useState("loginTime");
  const [isAsc, setIsAsc] = useState("desc");

  const [showSearch, setShowSearch] = useState(true);
  const [qIpaddr, setQIpaddr] = useState("");
  const [qUserName, setQUserName] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [qBeginTime, setQBeginTime] = useState("");
  const [qEndTime, setQEndTime] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectName, setSelectName] = useState("");

  useEffect(() => { if (!session) router.replace("/"); }, [session, router]);

  const perms = (session?.permissions ?? []) as string[];
  const cRemove = can(perms, "monitor:logininfor:remove");
  const cUnlock = can(perms, "monitor:logininfor:unlock");
  const cExport = can(perms, "monitor:logininfor:export");

  const buildQuery = useCallback(() => {
    let qs = `pageNum=${pageNum}&pageSize=${pageSize}&orderByColumn=${orderByColumn}&isAsc=${isAsc}`;
    if (qIpaddr) qs += `&ipaddr=${encodeURIComponent(qIpaddr)}`;
    if (qUserName) qs += `&userName=${encodeURIComponent(qUserName)}`;
    if (qStatus) qs += `&status=${qStatus}`;
    if (qBeginTime) qs += `&beginTime=${qBeginTime}`;
    if (qEndTime) qs += `&endTime=${qEndTime}`;
    return qs;
  }, [pageNum, pageSize, orderByColumn, isAsc, qIpaddr, qUserName, qStatus, qBeginTime, qEndTime]);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = (await api.get(`/monitor/logininfor/list?${buildQuery()}`)) as TableResponse;
      setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
      setTotal(res.total ?? 0);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [buildQuery, session]);

  function handleSearch() { setPageNum(1); setSelectedIds(new Set()); }
  function handleReset() { setQIpaddr(""); setQUserName(""); setQStatus(""); setQBeginTime(""); setQEndTime(""); setPageNum(1); }

  function toggleSelectAll(checked: boolean) {
    if (checked) { setSelectedIds(new Set(rows.map((r) => Number(r.info_id)))); setSelectName(""); }
    else { setSelectedIds(new Set()); setSelectName(""); }
  }
  function toggleSelect(infoId: number, userName: string) {
    const n = new Set(selectedIds);
    if (n.has(infoId)) { n.delete(infoId); setSelectName(""); }
    else { n.clear(); n.add(infoId); setSelectName(userName); }
    setSelectedIds(n);
  }

  function handleSort(col: string) {
    if (orderByColumn === col) { setIsAsc((p) => p === "asc" ? "desc" : "asc"); }
    else { setOrderByColumn(col); setIsAsc("asc"); }
    setPageNum(1);
  }

  async function handleDelete(row?: Record<string, unknown>) {
    const ids = row ? [row.info_id] : [...selectedIds];
    if (!ids.length) return;
    if (!await modalConfirm(`是否确认删除日志编号为"${ids.join(",")}"的数据项？`)) return;
    try { await api.delete(`/monitor/logininfor/${ids.join(",")}`); showToast("删除成功", "success"); setSelectedIds(new Set()); setSelectName(""); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "删除失败", "error"); }
  }

  async function handleClean() {
    if (!await modalConfirm("是否确认清空所有登录日志？")) return;
    try { await api.delete("/monitor/logininfor/clean"); showToast("清空成功", "success"); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "清空失败", "error"); }
  }

  async function handleUnlock() {
    if (!selectName) { showToast("请选择要解锁的用户", "info"); return; }
    if (!await modalConfirm(`是否确认解锁用户"${selectName}"数据项？`)) return;
    try { await api.get(`/monitor/logininfor/unlock/${encodeURIComponent(selectName)}`); showToast(`用户${selectName}解锁成功`, "success"); await load(); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "解锁失败", "error"); }
  }

  async function handleExport() {
    try {
      const blob = await api.blob(`/monitor/logininfor/export?${buildQuery()}`);
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `logininfor_${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(url);
      showToast("导出成功", "success");
    } catch (err) { showToast(err instanceof ApiError ? err.message : "导出失败", "error"); }
  }

  function sortIcon(col: string) {
    if (orderByColumn !== col) return <span style={{ display: "inline-block", width: 14, color: "#ccc" }}>⇅</span>;
    return isAsc === "asc" ? <span style={{ color: "var(--primary)" }}>↑</span> : <span style={{ color: "var(--primary)" }}>↓</span>;
  }

  const single = selectedIds.size !== 1; const multiple = selectedIds.size === 0;

  if (!session) return null;

  return (
    <SidebarLayout currentPaths={["logininfor"]}>
      <section className="data-surface">
        {showSearch && (<div className="search-bar">
          <div className="query-field"><span>登录地址</span><input value={qIpaddr} onChange={(e) => setQIpaddr(e.target.value)} placeholder="请输入登录地址" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>用户名称</span><input value={qUserName} onChange={(e) => setQUserName(e.target.value)} placeholder="请输入用户名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>状态</span><select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">成功</option><option value="1">失败</option></select></div>
          <div className="query-field"><span>登录时间</span><div className="date-range"><input type="date" value={qBeginTime} onChange={(e) => setQBeginTime(e.target.value)} /><span>-</span><input type="date" value={qEndTime} onChange={(e) => setQEndTime(e.target.value)} /></div></div>
          <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button>
          <button className="ghost-button" onClick={handleReset}>重置</button>
        </div>)}
        <div className="toolbar">
          {cRemove && <button className="danger-button" disabled={multiple} onClick={() => handleDelete()}><Trash2 size={14} />删除</button>}
          {cRemove && <button className="warning-button" onClick={handleClean}><Trash2 size={14} />清空</button>}
          {cUnlock && <button className="primary-button" disabled={single} onClick={handleUnlock}><LockKeyhole size={14} />解锁</button>}
          {cExport && <button className="ghost-button" onClick={handleExport}><Download size={14} />导出</button>}
          <div style={{ flex: 1 }} />
          <button className="icon-button" onClick={() => setShowSearch(!showSearch)} title="搜索"><Search size={16} /></button>
          <button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
        </div>
        {error && <div className="table-meta"><strong>{error}</strong></div>}
        <div className="table-wrap"><table><thead><tr>
          <th className="select-cell"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === rows.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
          <th>访问编号</th>
          <th style={{ cursor: "pointer" }} onClick={() => handleSort("userName")}>用户名称 {sortIcon("userName")}</th>
          <th style={{ width: 130 }}>登录地址</th><th>登录地点</th><th>浏览器</th><th>操作系统</th>
          <th>登录状态</th><th>操作信息</th>
          <th style={{ width: 180, cursor: "pointer" }} onClick={() => handleSort("loginTime")}>登录日期 {sortIcon("loginTime")}</th>
        </tr></thead><tbody>
          {loading ? <TableSkeleton cols={11} rows={6} /> : rows.length ? rows.map((row) => {
            const iid = Number(row.info_id);
            return (<tr key={iid}>
              <td className="select-cell"><input type="checkbox" checked={selectedIds.has(iid)} onChange={() => toggleSelect(iid, String(row.user_name ?? ""))} /></td>
              <td>{iid}</td>
              <td>{String(row.user_name ?? "")}</td>
              <td>{String(row.ipaddr ?? "")}</td>
              <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.login_location ?? "")}</td>
              <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.browser ?? "")}</td>
              <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.os ?? "")}</td>
              <td><DictTag options={[{label:"成功",value:"0"},{label:"失败",value:"1"}]} value={String(row.status ?? "")} /></td>
              <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row.msg ?? "")}</td>
              <td>{parseDate(row.login_time)}</td>
            </tr>);
          }) : <tr><td colSpan={11}>暂无数据</td></tr>}
        </tbody></table></div>
        <Pagination pageNum={pageNum} pageSize={pageSize} total={total} onPageChange={(p, s) => { setPageNum(p); setPageSize(s); }} />
      </section>
    </SidebarLayout>
  );
}
