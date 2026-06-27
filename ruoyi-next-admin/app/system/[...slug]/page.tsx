"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import { formatCell } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

const endpoints: Record<string, string> = {
  menu: "/system/menu/list", dept: "/system/dept/list",
  post: "/system/post/list", dict: "/system/dict/type/list",
  config: "/system/config/list", operlog: "/monitor/operlog/list",
  logininfor: "/monitor/logininfor/list",
};

export default function CatchAllPage() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string[]) || [];
  const viewKey = slug[0] || "";

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) router.replace("/");
  }, [session, router]);

  if (!session) return null;

  const endpoint = endpoints[viewKey];

  useEffect(() => { if (endpoint) void load(); }, [viewKey]);

  async function load() {
    if (!endpoint) return;
    setLoading(true); setError("");
    try {
      const res = (await api.get(`${endpoint}?pageNum=1&pageSize=50`)) as TableResponse;
      setRows((res.rows ?? res.data ?? []) as Record<string, unknown>[]);
      setTotal(res.total ?? 0);
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  const visibleRows = useMemo(() => {
    if (!keyword) return rows;
    const q = keyword.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, keyword]);

  const columns = useMemo(() => {
    if (rows.length && rows[0]) {
      const sample = rows[0] as Record<string, unknown>;
      return Object.keys(sample).slice(0, 6).map((k) => ({ key: k, label: k }));
    }
    return [{ key: "_", label: "" }];
  }, [rows]);

  return (
    <SidebarLayout currentPaths={[viewKey]}>
      <section className="data-surface">
        <div className="toolbar">
          <div className="search-box"><Search size={16} /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索当前列表" /></div>
          <button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
        </div>
        <div className="table-meta"><span>共 {total} 条</span>{error && <strong>{error}</strong>}</div>
        <div className="table-wrap"><table><thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={columns.length}>加载中...</td></tr> : visibleRows.length ? visibleRows.map((row, idx) => <tr key={idx}>{columns.map((c) => <td key={c.key}>{formatCell(row[c.key])}</td>)}</tr>) : <tr><td colSpan={columns.length}>暂无数据</td></tr>}</tbody></table></div>
      </section>
    </SidebarLayout>
  );
}
