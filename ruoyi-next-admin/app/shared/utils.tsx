import type { RouterItem } from "./types";

export type ToastType = "success" | "error" | "info";
export type FormOption = { label: string; value: string };

export function can(permissions: string[], permission?: string) {
  if (!permission) return true;
  return permissions.includes("*:*:*") || permissions.includes(permission);
}

export function readRowValue(row: Record<string, unknown> | undefined, key: string): unknown {
  if (!row) return "";
  if (row[key] !== undefined) return row[key];
  const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  return row[snake];
}

export function toCsv(value: unknown) {
  return Array.isArray(value) ? value.map(String).join(",") : "";
}

export function flattenRouters(routers: RouterItem[]): RouterItem[] {
  return routers.flatMap((r) => [r, ...flattenRouters(r.children ?? [])]);
}

export function toOptions(rows: unknown, valueKey: string, labelKey: string): FormOption[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        value: String(readRowValue(item, valueKey) ?? ""),
        label: String(readRowValue(item, labelKey) ?? readRowValue(item, valueKey) ?? ""),
      };
    })
    .filter((o) => o.value);
}

export function flattenTreeOptions(nodes: unknown, level = 0): FormOption[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((node) => {
    const item = node as Record<string, unknown>;
    const id = item.id ?? item.deptId ?? item.menuId;
    const label = item.label ?? item.deptName ?? item.menuName ?? id;
    const children = item.children;
    const cur = id === undefined ? [] : [{ value: String(id), label: `${"\u00A0\u00A0".repeat(level)}${String(label)}` }];
    return [...cur, ...flattenTreeOptions(children, level + 1)];
  });
}

export function pickColumns(rows: Record<string, unknown>[]) {
  const sample = rows[0] ?? {};
  return Object.keys(sample).slice(0, 6).map((key) => ({ key, label: key }));
}

export function parseDate(value: unknown): string {
  if (!value) return "";
  try {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("zh-CN");
  } catch {
    return String(value);
  }
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function filterDeptTree(nodes: Record<string, unknown>[], keyword: string): Record<string, unknown>[] {
  const kw = keyword.toLowerCase();
  return nodes.reduce<Record<string, unknown>[]>((acc, node) => {
    const label = String(node.label ?? node.deptName ?? node.name ?? "").toLowerCase();
    const children = node.children as Record<string, unknown>[] | undefined;
    const fc = children?.length ? filterDeptTree(children, kw) : [];
    if (label.includes(kw) || fc.length > 0)
      acc.push({ ...node, children: fc.length > 0 ? fc : node.children });
    return acc;
  }, []);
}

let toastId = 0;
export function showToast(text: string, type: ToastType) {
  const id = ++toastId;
  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.textContent = text;
  document.body.appendChild(node);
  setTimeout(() => {
    if (node.parentNode) node.parentNode.removeChild(node);
  }, 2500);
}

export const statusOptions = [
  { label: "\u6b63\u5e38", value: "0" },
  { label: "\u505c\u7528", value: "1" },
];

export const sexOptions = [
  { label: "\u7537", value: "0" },
  { label: "\u5973", value: "1" },
];
