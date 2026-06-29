"use client";

import { useMemo } from "react";
import { useDict } from "../dict";

export default function DictTag({
  dictType,
  value,
  options,
}: {
  dictType?: string;
  value?: string | number | null | undefined;
  options?: { label: string; value: string; cssClass?: string; listClass?: string }[];
}) {
  const { items } = useDict(dictType ?? "");
  const list = dictType ? items : (options ?? []);

  const matched = useMemo(() => {
    if (value === undefined || value === null || value === "") return [];
    const arr = String(value).split(",").map((v) => v.trim()).filter(Boolean);
    return arr.map((v) => list.find((d) => String(d.dictValue ?? (d as Record<string, unknown>).value) === v));
  }, [value, list]);

  if (!matched.length) return <span>{value ?? ""}</span>;

  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {matched.map((item, idx) => {
        if (!item) return <span key={idx}>{value}</span>;
        const label = item.dictLabel ?? (item as Record<string, unknown>).label ?? "";
        const cssClass = (item.cssClass ?? (item as Record<string, unknown>).cssClass as string) ?? "";
        const listClass = (item.listClass ?? (item as Record<string, unknown>).listClass as string) ?? "";
        const cls = cssClass || listClassTag(listClass);
        return (
          <span key={idx} className={`dict-tag ${cls}`}>
            {String(label)}
          </span>
        );
      })}
    </span>
  );
}

function listClassTag(listClass: string): string {
  switch (listClass) {
    case "primary": return "primary";
    case "success": return "success";
    case "info": return "info";
    case "warning": return "warning";
    case "danger": return "danger";
    default: return "";
  }
}
