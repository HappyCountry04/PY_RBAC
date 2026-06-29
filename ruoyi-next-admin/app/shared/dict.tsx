"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

export interface DictData {
  dictCode: number;
  dictSort: number;
  dictLabel: string;
  dictValue: string;
  dictType: string;
  cssClass: string;
  listClass: string;
  isDefault: string;
  status: string;
}

const cache = new Map<string, DictData[]>();
const pending = new Map<string, Promise<DictData[]>>();

export async function loadDict(dictType: string): Promise<DictData[]> {
  if (cache.has(dictType)) return cache.get(dictType)!;
  if (pending.has(dictType)) return pending.get(dictType)!;
  const promise = api.get(`/system/dict/data/type/${dictType}`).then((res) => {
    const data = ((res as Record<string, unknown>).data ?? []) as DictData[];
    cache.set(dictType, data);
    pending.delete(dictType);
    return data;
  }).catch((err) => {
    pending.delete(dictType);
    return [];
  });
  pending.set(dictType, promise);
  return promise;
}

export function getCachedDict(dictType: string): DictData[] | undefined {
  return cache.get(dictType);
}

export function selectDictLabel(dictType: string, value: string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  const items = cache.get(dictType);
  if (!items) return value;
  const found = items.find((d) => String(d.dictValue) === String(value));
  return found ? found.dictLabel : value;
}

export function selectDictLabels(dictType: string, values: string | undefined | null, separator = ","): string {
  if (!values) return "";
  return values.split(",").map((v) => selectDictLabel(dictType, v.trim())).join(separator);
}

export function useDict(dictType: string) {
  const [items, setItems] = useState<DictData[]>(cache.get(dictType) ?? []);
  const [loading, setLoading] = useState(!cache.has(dictType));

  useEffect(() => {
    let cancelled = false;
    loadDict(dictType).then((data) => {
      if (!cancelled) { setItems(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [dictType]);

  return { items, loading };
}

export function useDicts(dictTypes: string[]) {
  const [data, setData] = useState<Record<string, DictData[]>>(() => {
    const init: Record<string, DictData[]> = {};
    for (const t of dictTypes) { const c = cache.get(t); if (c) init[t] = c; }
    return init;
  });
  const [loading, setLoading] = useState(dictTypes.some((t) => !cache.has(t)));

  useEffect(() => {
    let cancelled = false;
    const missing = dictTypes.filter((t) => !cache.has(t));
    if (!missing.length) return;
    Promise.all(missing.map((t) => loadDict(t))).then(() => {
      if (cancelled) return;
      const all: Record<string, DictData[]> = {};
      for (const t of dictTypes) { const c = cache.get(t); if (c) all[t] = c; }
      setData(all);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dictTypes.join(",")]);

  return { data, loading };
}

export function PreloadDicts({ types, children }: { types: string[]; children: React.ReactNode }) {
  useDicts(types);
  return <>{children}</>;
}

const DictContext = createContext<Record<string, DictData[]>>({});

export function DictProvider({ children, preload = [] as string[] }: { children: React.ReactNode; preload?: string[] }) {
  const { data } = useDicts(preload);
  return <DictContext.Provider value={data}>{children}</DictContext.Provider>;
}

export function useDictContext() {
  return useContext(DictContext);
}
