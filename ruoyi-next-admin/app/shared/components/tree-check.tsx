"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
}

interface TreeCheckProps {
  nodes: TreeNode[];
  checked: Set<number>;
  onCheck: (id: number, checked: boolean) => void;
  onCheckAll?: (ids: number[], checked: boolean) => void;
}

function collectIds(nodes: TreeNode[]): number[] {
  const ids: number[] = [];
  (function walk(items: TreeNode[]) {
    for (const n of items) {
      ids.push(Number(n.id));
      if (n.children) walk(n.children);
    }
  })(nodes);
  return ids;
}

function nodeState(ids: number[], checked: Set<number>): "all" | "none" | "partial" {
  const c = ids.filter((id) => checked.has(id)).length;
  if (c === 0) return "none";
  if (c === ids.length) return "all";
  return "partial";
}

function getAllIds(nodes: TreeNode[]): number[] {
  return collectIds(nodes);
}

function parentNodeIds(nodes: TreeNode[]): number[] {
  return nodes.filter((n) => n.children && n.children.length).map((n) => Number(n.id));
}

export default function TreeCheck({ nodes, checked, onCheck, onCheckAll }: TreeCheckProps) {
  const allIds = useMemo(() => getAllIds(nodes), [nodes]);
  const parents = useMemo(() => parentNodeIds(nodes), [nodes]);
  const rootState = nodeState(allIds, checked);
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (const n of nodes) if (n.children?.length) s.add(Number(n.id));
    return s;
  });
  const [showAll, setShowAll] = useState(true);

  function expandAll() {
    const s = new Set<number>();
    (function walk(items: TreeNode[]) {
      for (const n of items) {
        if (n.children?.length) { s.add(Number(n.id)); walk(n.children); }
      }
    })(nodes);
    setExpanded(s);
    setShowAll(true);
  }

  function collapseAll() {
    setExpanded(new Set());
    setShowAll(false);
  }

  function toggleExpand(id: number) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
    setShowAll(false);
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 6, background: "#fff", maxHeight: 320, overflow: "auto" }}>
      <div style={{
        padding: "4px 8px", borderBottom: "1px solid var(--line)",
        background: "#fafbfc", display: "flex", gap: 16, position: "sticky", top: 0, zIndex: 1,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13, color: "var(--primary)", userSelect: "none" }}
          onClick={() => onCheckAll?.(allIds, rootState !== "all")}
        >
          <input
            type="checkbox"
            checked={rootState === "all"}
            ref={(el) => { if (el) el.indeterminate = rootState === "partial"; }}
            readOnly
            style={{ width: 14, height: 14, margin: 0, accentColor: "var(--primary)", pointerEvents: "none" }}
          />
          全选/全不选
        </span>
        <span style={{ fontSize: 13, color: "#999", cursor: "pointer", userSelect: "none" }} onClick={expandAll}>
          展开所有
        </span>
        <span style={{ fontSize: 13, color: "#999", cursor: "pointer", userSelect: "none" }} onClick={collapseAll}>
          折叠所有
        </span>
      </div>
      <div style={{ padding: "2px 0" }}>
        {nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            checked={checked}
            expanded={expanded}
            onCheck={onCheck}
            onToggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNodeItem({
  node, depth, checked, expanded, onCheck, onToggleExpand,
}: {
  node: TreeNode; depth: number; checked: Set<number>;
  expanded: Set<number>; onCheck: (id: number, checked: boolean) => void;
  onToggleExpand: (id: number) => void;
}) {
  const nid = Number(node.id);
  const hasChildren = !!(node.children && node.children.length);
  const childIds = hasChildren ? collectIds(node.children!) : [nid];
  const state = nodeState(childIds, checked);
  const isOpen = expanded.has(nid);
  const indent = 8 + depth * 22;

  function handleChange() {
    if (hasChildren) {
      const newVal = state !== "all";
      for (const id of childIds) onCheck(id, newVal);
    } else {
      onCheck(nid, !checked.has(nid));
    }
  }

  return (
    <div>
      <label
        style={{
          display: "flex", flexDirection: "row", alignItems: "center", gap: 4,
          padding: "1px 8px", paddingLeft: indent, cursor: "pointer",
          fontSize: 13, lineHeight: "26px",
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
        <input
          type="checkbox"
          checked={state === "all"}
          ref={(el) => { if (el) el.indeterminate = state === "partial"; }}
          onChange={handleChange}
          style={{ width: 14, height: 14, margin: 0, flexShrink: 0, accentColor: "var(--primary)" }}
        />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.label}
        </span>
      </label>
      {hasChildren && isOpen && node.children!.map((child) => (
        <TreeNodeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          checked={checked}
          expanded={expanded}
          onCheck={onCheck}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  );
}
