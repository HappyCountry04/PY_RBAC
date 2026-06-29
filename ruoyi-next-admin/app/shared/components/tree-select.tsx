"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";

interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
}

interface TreeSelectProps {
  value: string;
  options: TreeNode[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TreeSelect({ value, options, placeholder = "请选择", onChange, disabled }: TreeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  function expandAll() {
    const s = new Set<string>();
    (function walk(nodes: TreeNode[]) {
      for (const n of nodes) { s.add(String(n.id)); if (n.children) walk(n.children); }
    })(options);
    setExpanded(s);
  }

  function collapseAll() { setExpanded(new Set()); }

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  }

  function selectNode(id: string) {
    onChange(id);
    setOpen(false);
  }

  function findLabel(nodes: TreeNode[], targetId: string): string | null {
    for (const n of nodes) {
      if (String(n.id) === targetId) return String(n.label);
      if (n.children) {
        const found = findLabel(n.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  const selectedLabel = value ? findLabel(options, value) : null;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 5,
          cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "#f5f5f5" : "#fff",
          fontSize: 14, minHeight: 36, opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ flex: 1, color: selectedLabel ? "var(--text)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel ?? placeholder}
        </span>
        {value && (
          <span style={{ cursor: "pointer", display: "inline-flex" }}
            onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
            title="清除"
          >
            <X size={14} style={{ color: "var(--muted)" }} />
          </span>
        )}
        <ChevronDown size={14} style={{ color: "var(--muted)", flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(180deg)" : "" }} />
      </div>
      {open && (
        <div style={{
          position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0, marginTop: 4,
          background: "#fff", border: "1px solid var(--line)", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxHeight: 300, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--line)", display: "flex", gap: 8 }}>
            <div className="search-box" style={{ flex: 1, height: 30 }}>
              <Search size={14} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索" style={{ height: 28, fontSize: 13, border: "none", outline: "none", flex: 1 }} autoFocus />
            </div>
            <button type="button" style={{ fontSize: 12, background: "none", border: "none", color: "var(--primary)", cursor: "pointer", whiteSpace: "nowrap" }} onClick={expandAll}>展开</button>
            <button type="button" style={{ fontSize: 12, background: "none", border: "none", color: "var(--primary)", cursor: "pointer", whiteSpace: "nowrap" }} onClick={collapseAll}>折叠</button>
          </div>
          <div style={{ overflow: "auto", flex: 1 }}>
            {options.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onSelect={selectNode}
                selectedValue={value}
                search={search}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TreeNodeItem({
  node, depth, expanded, onToggleExpand, onSelect, selectedValue, search,
}: {
  node: TreeNode; depth: number; expanded: Set<string>;
  onToggleExpand: (id: string) => void; onSelect: (id: string) => void;
  selectedValue: string; search: string;
}) {
  const nid = String(node.id);
  const hasChildren = !!(node.children && node.children.length);
  const isOpen = expanded.has(nid);
  const active = selectedValue === nid;
  const label = String(node.label);

  if (search && !label.toLowerCase().includes(search.toLowerCase())) {
    if (!hasChildren) return null;
    return <>{node.children!.map((c) => <TreeNodeItem key={c.id} node={c} depth={depth} expanded={expanded} onToggleExpand={onToggleExpand} onSelect={onSelect} selectedValue={selectedValue} search={search} />)}</>;
  }

  return (
    <div>
      <div
        onClick={() => onSelect(nid)}
        style={{
          display: "flex", alignItems: "center", gap: 2,
          padding: "5px 10px", paddingLeft: 10 + depth * 22,
          cursor: "pointer", fontSize: 13, lineHeight: "22px",
          background: active ? "#eef4ff" : "transparent",
          color: active ? "var(--primary)" : "var(--text)",
        }}
      >
        {hasChildren ? (
          <span
            style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--muted)" }}
            onClick={(e) => { e.stopPropagation(); onToggleExpand(nid); }}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </div>
      {hasChildren && isOpen && node.children!.map((child) => (
        <TreeNodeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          onSelect={onSelect}
          selectedValue={selectedValue}
          search={search}
        />
      ))}
    </div>
  );
}
