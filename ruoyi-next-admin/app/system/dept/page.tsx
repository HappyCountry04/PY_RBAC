"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Check, ChevronDown, ChevronRight, Edit3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import TreeSelect from "../../shared/components/tree-select";
import TableSkeleton from "../../shared/components/skeleton";
import { modalConfirm } from "../../shared/components/modal";
import { can, showToast, parseDate, readRowValue, buildTree } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

function flattenAll(nodes: Record<string, unknown>[]): Record<string, unknown>[] {
  return nodes.flatMap((n) => {
    const children = (n.children ?? []) as Record<string, unknown>[];
    return [{ ...n, _children: children }, ...flattenAll(children)];
  });
}

export default function DeptManagementPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [treeData, setTreeData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [qDeptName, setQDeptName] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const [sortValues, setSortValues] = useState<Record<number, string>>({});
  const [sortChanged, setSortChanged] = useState(false);

  const [editModal, setEditModal] = useState<{ mode: "create" | "edit"; parentId?: number; deptId?: number } | null>(null);
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => { if (!session) router.replace("/"); }, [session, router]);

  const perms = (session?.permissions ?? []) as string[];
  const cAdd = can(perms, "system:dept:add");
  const cEdit = can(perms, "system:dept:edit");
  const cRemove = can(perms, "system:dept:remove");

  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (qDeptName) params.set("deptName", qDeptName);
      if (qStatus) params.set("status", qStatus);
      const qs = params.toString();
      const res = (await api.get(`/system/dept/list${qs ? `?${qs}` : ""}`)) as TableResponse;
      const data = (res.data ?? res.rows ?? []) as Record<string, unknown>[];
      const tree = buildTree(data, "deptId", "parentId");
      setTreeData(tree);
      setAllRows(flattenAll(tree));
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  const displayRows = useMemo(() => {
    function build(nodes: Record<string, unknown>[], depth: number): Record<string, unknown>[] {
      return nodes.flatMap((n) => {
        const did = Number(n.deptId);
        const children = (n.children ?? []) as Record<string, unknown>[];
        const isExpanded = expandAll || expandedNodes.has(did);
        const row: Record<string, unknown> = { ...n, _depth: depth, _hasChildren: children.length > 0, _expanded: isExpanded };
        if (children.length && isExpanded) {
          return [row, ...build(children, depth + 1)];
        }
        return [row];
      });
    }
    return build(treeData, 0);
  }, [treeData, expandAll, expandedNodes]);

  if (!session) return null;

  function toggleNode(deptId: number) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }

  function handleSearch() { void load(); }
  function handleReset() { setQDeptName(""); setQStatus(""); void load(); }

  async function handleDelete(row: Record<string, unknown>) {
    if (!await modalConfirm(`是否确认删除部门"${row.deptName}"？`)) return;
    try {
      await api.delete(`/system/dept/${row.deptId}`);
      showToast("删除成功", "success");
      await load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "删除失败", "error");
    }
  }

  function handleSortChange(deptId: number, value: string) {
    setSortValues((prev) => {
      const next = { ...prev, [deptId]: value };
      let changed = false;
      for (const row of allRows) {
        const id = Number(row.deptId);
        if (next[id] !== undefined && String(next[id]) !== String(row.orderNum ?? "")) changed = true;
      }
      setSortChanged(changed);
      return next;
    });
  }

  async function handleSaveSort() {
    const deptIds: number[] = [];
    const orderNums: number[] = [];
    for (const row of allRows) {
      const id = Number(row.deptId);
      if (sortValues[id] !== undefined && String(sortValues[id]) !== String(row.orderNum ?? "")) {
        deptIds.push(id);
        orderNums.push(Number(sortValues[id]));
      }
    }
    if (!deptIds.length) { showToast("未检测到排序修改", "info"); return; }
    try {
      await api.put("/system/dept/updateSort", { deptIds: deptIds.join(","), orderNums: orderNums.join(",") });
      showToast("排序保存成功", "success");
      setSortValues({}); setSortChanged(false);
      await load();
    } catch (err) { showToast(err instanceof ApiError ? err.message : "保存排序失败", "error"); }
  }

  return (
    <SidebarLayout currentPaths={["dept"]}>
      <section className="data-surface">
        {showSearch && (<div className="search-bar">
          <div className="query-field"><span>部门名称</span><input value={qDeptName} onChange={(e) => setQDeptName(e.target.value)} placeholder="请输入部门名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
          <div className="query-field"><span>状态</span><select value={qStatus} onChange={(e) => setQStatus(e.target.value)} style={{ width: 140 }}><option value="">全部</option><option value="0">正常</option><option value="1">停用</option></select></div>
          <button className="primary-small" onClick={handleSearch}><Search size={14} />搜索</button>
          <button className="ghost-button" onClick={handleReset}>重置</button>
        </div>)}
        <div className="toolbar">
          {cAdd && <button className="primary-button" onClick={() => setEditModal({ mode: "create" })}><Plus size={14} />新增</button>}
          {cEdit && <button className="warning-button" onClick={handleSaveSort}><Check size={14} />保存排序</button>}
          <button className="info-button" onClick={() => { setExpandAll(!expandAll); if (!expandAll) setExpandedNodes(new Set()); }}><ArrowUpDown size={14} />展开/折叠</button>
          <div style={{ flex: 1 }} />
          <button className="icon-button" onClick={() => setShowSearch(!showSearch)} title="搜索"><Search size={16} /></button>
          <button className="icon-button" onClick={load} title="刷新"><RefreshCw size={16} /></button>
        </div>
        {error && <div className="table-meta"><strong>{error}</strong></div>}
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{ minWidth: 260 }}>部门名称</th>
              <th style={{ width: 200 }}>排序</th>
              <th style={{ width: 100 }}>状态</th>
              <th style={{ width: 200 }}>创建时间</th>
              <th>操作</th>
            </tr></thead>
            <tbody>
              {loading ? <TableSkeleton cols={5} rows={6} /> : displayRows.length ? displayRows.map((row) => {
                const did = Number(row.deptId);
                const depth = (row._depth as number) || 0;
                const st = String(row.status ?? "0");
                const hasChildren = (row._hasChildren as boolean) || false;
                const isExpanded = (row._expanded as boolean) || false;
                return <tr key={did}>
                  <td style={{ paddingLeft: 12 + depth * 24 }}>
                    {hasChildren ? (
                      <span className="tree-toggle" style={{ cursor: "pointer" }} onClick={() => toggleNode(did)}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    ) : <span style={{ display: "inline-block", width: 18 }} />}
                    <span>{String(row.deptName ?? "")}</span>
                  </td>
                  <td>
                    <input type="number" style={{ width: 88, height: 28, border: "1px solid var(--line)", padding: "0 6px", textAlign: "center" }}
                      value={sortValues[did] ?? String(row.orderNum ?? 0)}
                      onChange={(e) => handleSortChange(did, e.target.value)} />
                  </td>
                  <td><span className={`dict-tag ${st === "0" ? "success" : "danger"}`}>{st === "0" ? "正常" : "停用"}</span></td>
                  <td style={{ fontSize: 13 }}>{parseDate(row.createTime)}</td>
                  <td className="actions-cell">
                    {cEdit && <button className="text-button" onClick={() => setEditModal({ mode: "edit", deptId: did })}><Edit3 size={13} />修改</button>}
                    {cAdd && <button className="text-button" onClick={() => setEditModal({ mode: "create", parentId: did })}><Plus size={13} />新增</button>}
                    {cRemove && Number(row.parentId) !== 0 && <button className="text-button danger" onClick={() => handleDelete(row)}><Trash2 size={13} />删除</button>}
                  </td>
                </tr>;
              }) : <tr><td colSpan={5}>暂无数据</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {editModal && <DeptEditModal mode={editModal.mode} parentId={editModal.parentId} deptId={editModal.deptId} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); void load(); }} />}
    </SidebarLayout>
  );
}

// ── Dept Edit Modal ──
function DeptEditModal({ mode, parentId, deptId, onClose, onSaved }: {
  mode: "create" | "edit"; parentId?: number; deptId?: number; onClose: () => void; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    orderNum: "0", status: "0",
  });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [treeNodes, setTreeNodes] = useState<{ id: string | number; label: string; children?: { id: string | number; label: string }[] }[]>([]);

  useEffect(() => { (async () => {
    try {
      const treeRes = await api.get("/system/dept/treeselect");
      const tree = (treeRes as Record<string, unknown>).data as Record<string, unknown>[];
      const nodes = (tree ?? []).map((n: any) => ({ id: n.id, label: n.label, children: n.children }));
      setTreeNodes([{ id: "0", label: "无", children: nodes }]);

      if (mode === "edit" && deptId) {
        const detail = await api.get(`/system/dept/${deptId}`);
        const data = ((detail as Record<string, unknown>).data ?? detail) as Record<string, unknown>;
        const init: Record<string, string> = {};
        for (const k of ["deptName","parentId","orderNum","leader","phone","email","status"]) {
          init[k] = String(readRowValue(data, k) ?? "");
        }
        if (init.orderNum === "" || init.orderNum === "undefined") init.orderNum = "0";
        if (init.status === "" || init.status === "undefined") init.status = "0";
        setValues(init);
      } else if (mode === "create" && parentId) {
        setValues((prev) => ({ ...prev, parentId: String(parentId) }));
      }
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  })(); }, [mode, deptId, parentId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.parentId && values.parentId !== "0") { setError("上级部门不能为空"); return; }
    if (!values.deptName?.trim()) { setError("部门名称不能为空"); return; }
    if (!values.orderNum) { setError("显示排序不能为空"); return; }
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) { setError("邮箱格式不正确"); return; }
    if (values.phone && !/^1[3|4|5|6|7|8|9][0-9]\d{8}$/.test(values.phone)) { setError("手机号码格式不正确"); return; }
    setBusy(true); setError("");
    const body: Record<string, unknown> = {
      ...values,
      parentId: Number(values.parentId || 0),
      orderNum: Number(values.orderNum || 0),
    };
    try {
      if (mode === "edit" && deptId) { body.deptId = deptId; await api.put("/system/dept", body); showToast("修改成功", "success"); }
      else { await api.post("/system/dept", body); showToast("新增成功", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); }
    finally { setBusy(false); }
  }

  function setV(k: string, v: string) { setValues((prev) => ({ ...prev, [k]: v })); }

  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;

  return (<div className="modal-mask"><form className="modal-panel" style={{ width: "min(680px, 100%)" }} onSubmit={submit}>
    <div className="modal-head"><h2>{mode === "edit" ? "修改部门" : "添加部门"}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      <label><span className="form-label-text">上级部门</span><TreeSelect value={values.parentId ?? "0"} options={treeNodes} onChange={(v) => setV("parentId", v)} /></label>
      <label><span className="form-label-text">部门名称 <em className="required">*</em></span><input value={values.deptName ?? ""} onChange={(e) => setV("deptName", e.target.value)} /></label>
      <label><span className="form-label-text">显示排序 <em className="required">*</em></span><input type="number" value={values.orderNum ?? "0"} onChange={(e) => setV("orderNum", e.target.value)} min={0} /></label>
      <label><span className="form-label-text">负责人</span><input value={values.leader ?? ""} onChange={(e) => setV("leader", e.target.value)} /></label>
      <label><span className="form-label-text">联系电话</span><input value={values.phone ?? ""} onChange={(e) => setV("phone", e.target.value)} placeholder="如：13800000000" /></label>
      <label><span className="form-label-text">邮箱</span><input value={values.email ?? ""} onChange={(e) => setV("email", e.target.value)} placeholder="如：admin@ruoyi.com" /></label>
      <label><span className="form-label-text">状态</span>
        <div className="radio-group">
          <span className="radio-label"><input type="radio" name="status" value="0" checked={(values.status || "0") === "0"} onChange={() => setV("status", "0")} />正常</span>
          <span className="radio-label"><input type="radio" name="status" value="1" checked={values.status === "1"} onChange={() => setV("status", "1")} />停用</span>
        </div>
      </label>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div>
  </form></div>);
}
