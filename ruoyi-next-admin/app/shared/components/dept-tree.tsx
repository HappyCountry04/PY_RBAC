"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { api } from "../api";
import { filterDeptTree } from "../utils";

export default function DeptTree({ activeId, onSelect, width, onWidthChange, collapsed, onToggle }: {
  activeId: number | null;
  onSelect: (id: number | null) => void;
  width: number;
  onWidthChange: (w: number) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [deptTree, setDeptTree] = useState<Record<string, unknown>[]>([]);
  const [deptSearch, setDeptSearch] = useState("");
  const [resizing, setResizing] = useState(false);

  useEffect(() => { void loadDeptTree(); }, []);
  useEffect(() => {
    function onMove(e: MouseEvent) { if (!resizing) return; onWidthChange(Math.max(180, Math.min(480, e.clientX - 270))); }
    function onUp() { if (resizing) { setResizing(false); localStorage.setItem("dept-sidebar-width", String(width)); } }
    if (resizing) { document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp); }
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [resizing, width, onWidthChange]);

  async function loadDeptTree() {
    try { const res = await api.get("/system/user/deptTree") as Record<string, unknown>; setDeptTree((res.data as Record<string, unknown>[]) ?? []); } catch { /* ignore */ }
  }

  const visibleTree = useMemo(() => deptSearch.trim() ? filterDeptTree(deptTree, deptSearch.trim().toLowerCase()) : deptTree, [deptTree, deptSearch]);

  if (collapsed) return (
    <button className="dept-tree-toggle-btn" onClick={onToggle} title="展开组织机构"><ChevronRight size={16} /></button>
  );

  return (
    <div className="dept-side-tree" style={{ width, minWidth: 180, maxWidth: 480 }}>
      <div className="dept-side-head">
        <strong>组织机构</strong>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-button" onClick={loadDeptTree} title="刷新"><RefreshCw size={14} /></button>
          <button className="icon-button" onClick={onToggle} title="收起"><X size={14} /></button>
        </div>
      </div>
      <div style={{ padding: "8px 8px 0" }}>
        <div className="search-box" style={{ width: "100%", height: 32 }}><Search size={14} /><input value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} placeholder="请输入部门名称" style={{ height: 30, fontSize: 13 }} /></div>
      </div>
      <div className="dept-side-list">
        <button className={`dept-node${activeId === null ? " active" : ""}`} style={{ paddingLeft: 12 }} onClick={() => onSelect(null)}>全部部门</button>
        {visibleTree.map((node) => <DeptTreeNode key={String(node.id ?? node.deptId)} node={node} activeId={activeId} onClick={(n) => onSelect((n.id ?? n.deptId) as number)} />)}
        {visibleTree.length === 0 && deptSearch && <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>无匹配部门</div>}
      </div>
      <div className="dept-resize-handle" onMouseDown={() => setResizing(true)} title="拖拽调整宽度" />
    </div>
  );
}

function DeptTreeNode({ node, activeId, onClick, level = 0 }: { node: Record<string, unknown>; activeId: number | null; onClick: (node: Record<string, unknown>) => void; level?: number }) {
  const [expanded, setExpanded] = useState(true);
  const id = (node.id ?? node.deptId) as number;
  const label = (node.label ?? node.deptName) as string;
  const children = (node.children ?? []) as Record<string, unknown>[];
  return (
    <div>
      <button className={`dept-node${activeId === id ? " active" : ""}`} style={{ paddingLeft: 12 + level * 18 }} onClick={() => onClick(node)} title={label}>
        {children.length > 0 ? <span className="tree-toggle" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span> : <span className="tree-toggle" style={{ visibility: "hidden" }}><ChevronRight size={14} /></span>}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </button>
      {expanded && children.map((child) => <DeptTreeNode key={String(child.id ?? child.deptId)} node={child} activeId={activeId} onClick={onClick} level={level + 1} />)}
    </div>
  );
}
