"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Check, ChevronDown, ChevronRight, Edit3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../shared/api";
import { useAuth } from "../../shared/auth";
import SidebarLayout from "../../shared/components/sidebar";
import { can, showToast, parseDate, readRowValue, flattenTreeOptions, buildTree } from "../../shared/utils";
import type { TableResponse } from "../../shared/types";

// ── Icon list ──
const ICONS = [
  "#", "system", "monitor", "tool", "user", "peoples", "phone", "tree", "tree-table", "form",
  "documentation", "guide", "eye-open", "eye", "checkbox", "component", "button", "dict",
  "example", "excel", "pdf", "zip", "clipboard", "email", "internet", "chart", "color",
  "date-range", "date", "icon", "input", "link", "list", "logininfor", "log", "message",
  "money", "nested", "online", "operlog", "password", "post", "question", "radio",
  "rate", "role", "rows", "search", "select", "server", "size", "slider", "star",
  "swagger", "switch", "tab", "table", "time", "time-range", "upload", "validCode",
  "wechat", "create", "bug", "dashboard", "job", "redis", "redis-list", "build",
  "drag", "education", "exit-fullscreen", "fullscreen", "international", "language",
  "like", "lock", "number", "shopping", "skill", "sort", "tab-radio", "cascader",
  "color-picker", "edit", "editor", "number-validate", "pic-upload", "share",
];

function menuTypeLabel(t: string) {
  if (t === "M") return "目录"; if (t === "C") return "菜单"; if (t === "F") return "按钮"; return t;
}

function menuTypeColor(t: string) {
  if (t === "M") return "primary"; if (t === "C") return "success"; if (t === "F") return "warning"; return "";
}

function isExternal(mt: string, frame: string) { return (mt === "M" || mt === "C") && frame === "0"; }

// Flatten tree with depth, expanding based on expandAll
function flattenMenuTree(nodes: Record<string, unknown>[], expandAll: boolean): Record<string, unknown>[] {
  return nodes.flatMap((n) => {
    const row = { ...n, _expanded: expandAll };
    const children = n.children as Record<string, unknown>[] | undefined;
    return [row, ...(children?.length && expandAll ? flattenMenuTree(children, expandAll) : [])];
  });
}

// Build tree with individual expand state
function buildTableData(rows: Record<string, unknown>[], expandAll: boolean): Record<string, unknown>[] {
  if (expandAll) return flattenAll(rows);
  // Show only root level, user clicks to expand
  return flattenRootOnly(rows);
}

function flattenAll(nodes: Record<string, unknown>[]): Record<string, unknown>[] {
  return nodes.flatMap((n) => {
    const children = (n.children ?? []) as Record<string, unknown>[];
    return [{ ...n, _children: children }, ...flattenAll(children)];
  });
}

function flattenRootOnly(nodes: Record<string, unknown>[]): Record<string, unknown>[] {
  return nodes.map((n) => {
    const children = (n.children ?? []) as Record<string, unknown>[];
    return { ...n, _children: children };
  });
}

export default function MenuManagementPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [treeData, setTreeData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [qMenuName, setQMenuName] = useState("");
  const [qStatus, setQStatus] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  // Individual node expand state: menuId -> boolean
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Sort editing
  const [sortValues, setSortValues] = useState<Record<number, string>>({});
  const [sortChanged, setSortChanged] = useState(false);

  // Modal
  const [editModal, setEditModal] = useState<{ mode: "create" | "edit"; parentId?: number; menuId?: number } | null>(null);

  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => { if (!session) router.replace("/"); }, [session, router]);

  const perms = (session?.permissions ?? []) as string[];
  const cAdd = can(perms, "system:menu:add");
  const cEdit = can(perms, "system:menu:edit");
  const cRemove = can(perms, "system:menu:remove");

  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (qMenuName) params.set("menuName", qMenuName);
      if (qStatus) params.set("status", qStatus);
      const qs = params.toString();
      const res = (await api.get(`/system/menu/list${qs ? `?${qs}` : ""}`)) as TableResponse;
      const data = (res.data ?? res.rows ?? []) as Record<string, unknown>[];
      const tree = buildTree(data, "menuId", "parentId");
      setTreeData(tree);
      setAllRows(flattenAll(tree));
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  // Build display rows: flatten respecting individual expand state
  const displayRows = useMemo(() => {
    function build(nodes: Record<string, unknown>[], depth: number): Record<string, unknown>[] {
      return nodes.flatMap((n) => {
        const mid = Number(n.menuId);
        const children = (n.children ?? []) as Record<string, unknown>[];
        const isExpanded = expandAll || expandedNodes.has(mid);
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

  function toggleNode(menuId: number) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) next.delete(menuId);
      else next.add(menuId);
      return next;
    });
  }

  function handleSearch() { void load(); }
  function handleReset() { setQMenuName(""); setQStatus(""); void load(); }

  async function handleDelete(row: Record<string, unknown>) {
    if (!window.confirm(`是否确认删除菜单"${row.menuName}"？`)) return;
    try {
      await api.delete(`/system/menu/${row.menuId}`);
      showToast("删除成功", "success");
      await load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "删除失败", "error");
    }
  }

  function handleSortChange(menuId: number, value: string) {
    setSortValues((prev) => {
      const next = { ...prev, [menuId]: value };
      let changed = false;
      for (const row of allRows) {
        const id = Number(row.menuId);
        if (next[id] !== undefined && String(next[id]) !== String(row.orderNum ?? "")) changed = true;
      }
      setSortChanged(changed);
      return next;
    });
  }

  async function handleSaveSort() {
    const menuIds: number[] = [];
    const orderNums: number[] = [];
    for (const row of allRows) {
      const id = Number(row.menuId);
      if (sortValues[id] !== undefined && String(sortValues[id]) !== String(row.orderNum ?? "")) {
        menuIds.push(id);
        orderNums.push(Number(sortValues[id]));
      }
    }
    if (!menuIds.length) { showToast("未检测到排序修改", "info"); return; }
    try {
      await api.put("/system/menu/updateSort", { menuIds: menuIds.join(","), orderNums: orderNums.join(",") });
      showToast("排序保存成功", "success");
      setSortValues({}); setSortChanged(false);
      await load();
    } catch (err) { showToast(err instanceof ApiError ? err.message : "保存排序失败", "error"); }
  }

  return (
    <SidebarLayout currentPaths={["menu"]}>
      <section className="data-surface">
        {showSearch && (<div className="search-bar">
          <div className="query-field"><span>菜单名称</span><input value={qMenuName} onChange={(e) => setQMenuName(e.target.value)} placeholder="请输入菜单名称" style={{ width: 180 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /></div>
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
        <div className="table-meta"><span>共 {displayRows.length} 条</span>{error && <strong>{error}</strong>}</div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{ minWidth: 220 }}>菜单名称</th>
              <th style={{ width: 100 }}>类型</th>
              <th style={{ width: 200 }}>排序</th>
              <th>权限标识</th>
              <th>组件路径</th>
              <th style={{ width: 80 }}>状态</th>
              <th style={{ width: 180 }}>操作</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}>加载中...</td></tr> : displayRows.length ? displayRows.map((row) => {
                const mid = Number(row.menuId);
                const depth = (row._depth as number) || 0;
                const mt = String(row.menuType ?? "");
                const st = String(row.status ?? "0");
                const frame = String(row.isFrame ?? "1");
                const hasChildren = (row._hasChildren as boolean) || false;
                const isExpanded = (row._expanded as boolean) || false;
                return <tr key={mid}>
                  <td style={{ paddingLeft: 12 + depth * 24 }}>
                    {hasChildren ? (
                      <span className="tree-toggle" style={{ cursor: "pointer" }} onClick={() => toggleNode(mid)}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    ) : <span style={{ display: "inline-block", width: 18 }} />}
                    <span>{String(row.icon ?? "#") !== "#" && <span style={{ marginRight: 6, color: "var(--muted)" }}>[{String(row.icon)}]</span>}{String(row.menuName ?? "")}</span>
                  </td>
                  <td><span className={`dict-tag ${isExternal(mt, frame) ? "danger" : menuTypeColor(mt)}`}>{isExternal(mt, frame) ? "外链" : menuTypeLabel(mt)}</span></td>
                  <td>
                    <input type="number" style={{ width: 88, height: 28, border: "1px solid var(--line)", padding: "0 6px", textAlign: "center" }}
                      value={sortValues[mid] ?? String(row.orderNum ?? 0)}
                      onChange={(e) => handleSortChange(mid, e.target.value)} />
                  </td>
                  <td><code style={{ fontSize: 12 }}>{String(row.perms ?? "")}</code></td>
                  <td style={{ fontSize: 13 }}>{String(row.component ?? "")}</td>
                  <td><span className={`dict-tag ${st === "0" ? "success" : "danger"}`}>{st === "0" ? "正常" : "停用"}</span></td>
                  <td className="actions-cell">
                    {cEdit && <button className="text-button" onClick={() => setEditModal({ mode: "edit", menuId: mid })}><Edit3 size={13} />修改</button>}
                    {cAdd && <button className="text-button" onClick={() => setEditModal({ mode: "create", parentId: mid })}><Plus size={13} />新增</button>}
                    {cRemove && <button className="text-button danger" onClick={() => handleDelete(row)}><Trash2 size={13} />删除</button>}
                  </td>
                </tr>;
              }) : <tr><td colSpan={7}>暂无数据</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {editModal && <MenuEditModal mode={editModal.mode} parentId={editModal.parentId} menuId={editModal.menuId} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); void load(); }} />}
    </SidebarLayout>
  );
}

// ── Menu Edit Modal ──
function MenuEditModal({ mode, parentId, menuId, onClose, onSaved }: {
  mode: "create" | "edit"; parentId?: number; menuId?: number; onClose: () => void; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    icon: "#", orderNum: "0", isFrame: "0", isCache: "0", visible: "0", status: "0",
  });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [treeOptions, setTreeOptions] = useState<{ label: string; value: string }[]>([]);
  const [iconOpen, setIconOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  useEffect(() => { (async () => {
    try {
      const [treeRes] = await Promise.all([api.get("/system/menu/treeselect")]);
      const tree = (treeRes as Record<string, unknown>).data as Record<string, unknown>[];
      const opts = flattenTreeOptions(tree ?? []);
      opts.unshift({ value: "0", label: "主类目" });
      setTreeOptions(opts);

      if (mode === "edit" && menuId) {
        const detail = await api.get(`/system/menu/${menuId}`);
        const data = ((detail as Record<string, unknown>).data ?? detail) as Record<string, unknown>;
        const init: Record<string, string> = {};
        for (const k of ["menuName","parentId","orderNum","path","component","query","routeName","isFrame","isCache","menuType","visible","status","perms","icon","remark"]) {
          init[k] = String(readRowValue(data, k) ?? "");
        }
        // Normalize defaults for edit: fill missing with sensible defaults
        if (!init.menuType) init.menuType = "M";
        if (!init.icon) init.icon = "#";
        if (init.orderNum === "" || init.orderNum === "undefined") init.orderNum = "0";
        if (init.isFrame === "" || init.isFrame === "undefined") init.isFrame = "0";
        if (init.isCache === "" || init.isCache === "undefined") init.isCache = "0";
        if (init.visible === "" || init.visible === "undefined") init.visible = "0";
        if (init.status === "" || init.status === "undefined") init.status = "0";
        setValues(init);
      }
      if (mode === "create" && parentId) {
        setValues((prev) => ({ ...prev, parentId: String(parentId) }));
      }
    } catch (err) { setError(err instanceof ApiError ? err.message : "加载失败"); }
    finally { setLoading(false); }
  })(); }, [mode, menuId, parentId]);

  const mt = values.menuType || "M";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.menuName?.trim()) { setError("菜单名称不能为空"); return; }
    if (!values.orderNum) { setError("菜单顺序不能为空"); return; }
    if (mt !== "M" && mt !== "F" && !values.path?.trim()) { setError("路由地址不能为空"); return; }
    setBusy(true); setError("");
    const body: Record<string, unknown> = {
      ...values,
      parentId: Number(values.parentId || 0),
      orderNum: Number(values.orderNum || 0),
      isFrame: Number(values.isFrame ?? 0),
      isCache: Number(values.isCache ?? 0),
    };
    try {
      if (mode === "edit" && menuId) { body.menuId = menuId; await api.put("/system/menu", body); showToast("修改成功", "success"); }
      else { await api.post("/system/menu", body); showToast("新增成功", "success"); }
      onSaved();
    } catch (err) { setError(err instanceof ApiError ? err.message : "保存失败"); }
    finally { setBusy(false); }
  }

  function setV(k: string, v: string) { setValues((prev) => ({ ...prev, [k]: v })); }

  const filteredIcons = ICONS.filter((ic) => ic.includes(iconSearch.toLowerCase()) || !iconSearch);

  if (loading) return <div className="modal-mask"><div className="modal-panel" style={{ display: "grid", placeItems: "center", minHeight: 200 }}><p>加载中...</p></div></div>;

  return (<div className="modal-mask"><form className="modal-panel" style={{ width: "min(680px, 100%)" }} onSubmit={submit}>
    <div className="modal-head"><h2>{mode === "edit" ? "修改菜单" : "添加菜单"}</h2><button type="button" className="text-button" onClick={onClose}><X size={18} /></button></div>
    <div className="form-grid">
      {/* Row 1: Parent + Type */}
      <label>上级菜单<select value={values.parentId ?? "0"} onChange={(e) => setV("parentId", e.target.value)}><option value="0">主类目</option>{treeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      <label>
        菜单类型
        <div className="radio-group">
          {[{ label: "目录", value: "M" }, { label: "菜单", value: "C" }, { label: "按钮", value: "F" }].map((o) => (
            <label key={o.value} className="radio-label"><input type="radio" name="menuType" value={o.value} checked={mt === o.value} onChange={(e) => setV("menuType", e.target.value)} />{o.label}</label>
          ))}
        </div>
      </label>

      {/* Icon selector — hidden for F type */}
      {mt !== "F" && (
        <label>
          菜单图标
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={values.icon ?? "#"} onChange={(e) => setV("icon", e.target.value)} style={{ width: 120 }} placeholder="图标名称" />
              <button type="button" className="ghost-button" style={{ height: 32, fontSize: 12 }} onClick={() => { setIconOpen(!iconOpen); setIconSearch(""); }}>选择</button>
            </div>
            {iconOpen && (
              <div style={{ position: "absolute", zIndex: 10, background: "#fff", border: "1px solid var(--line)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", borderRadius: 8, width: 360, padding: 8 }}>
                <div style={{ padding: "0 4px 8px" }}><div className="search-box"><Search size={14} /><input value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} placeholder="搜索图标" style={{ height: 28, fontSize: 12 }} /></div></div>
                <div className="icon-select" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6, maxHeight: 240, overflow: "auto" }}>
                  {filteredIcons.map((ic) => (
                    <button key={ic} type="button" className={`icon-choice${values.icon === ic ? " active" : ""}`} onClick={() => { setV("icon", ic); setIconOpen(false); setIconSearch(""); }} style={{ padding: "6px 8px" }}>
                      <span>{ic.charAt(0).toUpperCase()}</span><small>{ic}</small>
                    </button>
                  ))}
                  {filteredIcons.length === 0 && <div className="empty-hint" style={{ gridColumn: "1/-1", textAlign: "center" }}>无匹配图标</div>}
                </div>
              </div>
            )}
          </div>
        </label>
      )}
      {mt === "F" && <label>{/* placeholder for grid alignment */}<span style={{ visibility: "hidden" }}>_</span></label>}

      {/* Sort + Name */}
      <label>显示排序 <span style={{ color: "var(--danger)" }}>*</span><input type="number" value={values.orderNum ?? "0"} onChange={(e) => setV("orderNum", e.target.value)} min={0} /></label>
      <label>菜单名称 <span style={{ color: "var(--danger)" }}>*</span><input value={values.menuName ?? ""} onChange={(e) => setV("menuName", e.target.value)} /></label>

      {/* Route name + External link */}
      {mt === "C" && <label>路由名称<input value={values.routeName ?? ""} onChange={(e) => setV("routeName", e.target.value)} placeholder="默认与路由地址相同" /></label>}
      {mt !== "F" && (
        <label>
          是否外链
          <div className="radio-group">
            <label className="radio-label"><input type="radio" name="isFrame" value="0" checked={values.isFrame === "0"} onChange={() => setV("isFrame", "0")} />是</label>
            <label className="radio-label"><input type="radio" name="isFrame" value="1" checked={(values.isFrame || "1") === "1"} onChange={() => setV("isFrame", "1")} />否</label>
          </div>
        </label>
      )}
      {mt === "F" && <label>{/* grid placeholder */}<span style={{ visibility: "hidden" }}>_</span></label>}

      {/* Route path + Component */}
      {mt !== "F" && <label>路由地址 {mt === "C" && <span style={{ color: "var(--danger)" }}>*</span>}<input value={values.path ?? ""} onChange={(e) => setV("path", e.target.value)} /></label>}
      {mt === "C" && <label>组件路径<input value={values.component ?? ""} onChange={(e) => setV("component", e.target.value)} /></label>}
      {mt !== "F" && mt !== "C" && <label>{/* grid placeholder */}<span style={{ visibility: "hidden" }}>_</span></label>}

      {/* Perms + Query */}
      {mt !== "M" && <label>权限标识<input value={values.perms ?? ""} onChange={(e) => setV("perms", e.target.value)} placeholder="如：system:user:list" /></label>}
      {mt === "M" && <label>{/* placeholder */}<span style={{ visibility: "hidden" }}>_</span></label>}
      {mt === "C" && <label>路由参数<input value={values.query ?? ""} onChange={(e) => setV("query", e.target.value)} placeholder={`如：{"id":"1"}`} /></label>}

      {/* Cache + Visible */}
      {mt === "C" && (
        <label>
          是否缓存
          <div className="radio-group">
            <label className="radio-label"><input type="radio" name="isCache" value="0" checked={(values.isCache || "0") === "0"} onChange={() => setV("isCache", "0")} />缓存</label>
            <label className="radio-label"><input type="radio" name="isCache" value="1" checked={values.isCache === "1"} onChange={() => setV("isCache", "1")} />不缓存</label>
          </div>
        </label>
      )}
      {mt !== "F" && (
        <label>
          显示状态
          <div className="radio-group">
            <label className="radio-label"><input type="radio" name="visible" value="0" checked={(values.visible || "0") === "0"} onChange={() => setV("visible", "0")} />显示</label>
            <label className="radio-label"><input type="radio" name="visible" value="1" checked={values.visible === "1"} onChange={() => setV("visible", "1")} />隐藏</label>
          </div>
        </label>
      )}
      {mt === "F" && <label>{/* grid placeholder */}<span style={{ visibility: "hidden" }}>_</span></label>}

      {/* Status */}
      <label>
        菜单状态
        <div className="radio-group">
          <label className="radio-label"><input type="radio" name="status" value="0" checked={(values.status || "0") === "0"} onChange={() => setV("status", "0")} />正常</label>
          <label className="radio-label"><input type="radio" name="status" value="1" checked={values.status === "1"} onChange={() => setV("status", "1")} />停用</label>
        </div>
      </label>
      <label>{/* grid placeholder */}<span style={{ visibility: "hidden" }}>_</span></label>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>取消</button><button className="primary-small" disabled={busy}>{busy ? "保存中..." : "确定"}</button></div>
  </form></div>);
}
