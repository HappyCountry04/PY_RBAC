"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type ModalConfig = {
  title?: string;
  message: string;
  type?: "confirm" | "alert";
  okText?: string;
  cancelText?: string;
};

type ModalEntry = {
  resolve: (v: boolean) => void;
  config: ModalConfig;
};

let active: ModalEntry | null = null;
const listeners = new Set<() => void>();

export function modalConfirm(message: string, title = "提示"): Promise<boolean> {
  return new Promise((resolve) => {
    active = { resolve, config: { title, message, type: "confirm", okText: "确定", cancelText: "取消" } };
    listeners.forEach((fn) => fn());
  });
}

export function modalAlert(message: string, title = "提示"): Promise<boolean> {
  return new Promise((resolve) => {
    active = { resolve, config: { title, message, type: "alert", okText: "确定" } };
    listeners.forEach((fn) => fn());
  });
}

function useModalState() {
  const [entry, setEntry] = useState<ModalEntry | null>(null);
  useEffect(() => {
    const fn = () => setEntry(active);
    listeners.add(fn);
    setEntry(active);
    return () => { listeners.delete(fn); };
  }, []);
  const close = (ok: boolean) => {
    entry?.resolve(ok);
    active = null;
    setEntry(null);
    listeners.forEach((fn) => fn());
  };
  return { entry, close };
}

export function ModalRoot() {
  const { entry, close } = useModalState();
  if (!entry) return null;
  const { config } = entry;
  return (
    <div className="modal-mask" onClick={() => config.type !== "alert" && close(false)}>
      <div className="modal-panel" style={{ width: "min(420px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{config.title ?? "提示"}</h2>
          {config.type !== "alert" && <button className="text-button" onClick={() => close(false)}><X size={18} /></button>}
        </div>
        <div style={{ padding: "16px 24px", fontSize: 14, lineHeight: 1.8 }}>{config.message}</div>
        <div className="modal-actions">
          {config.type === "confirm" && <button className="ghost-button" onClick={() => close(false)}>{config.cancelText ?? "取消"}</button>}
          <button className="primary-small" onClick={() => close(true)}>{config.okText ?? "确定"}</button>
        </div>
      </div>
    </div>
  );
}
