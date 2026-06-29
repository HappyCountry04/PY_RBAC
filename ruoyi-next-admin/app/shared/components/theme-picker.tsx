"use client";

import { useState, useEffect } from "react";
import { Palette, X } from "lucide-react";

const PRESETS = [
  { label: "经典蓝", color: "#1677ff" },
  { label: "翡翠绿", color: "#10b981" },
  { label: "热情橙", color: "#f59e0b" },
  { label: "深空紫", color: "#8b5cf6" },
  { label: "沉稳灰", color: "#64748b" },
  { label: "暗夜青", color: "#0891b2" },
  { label: "若依蓝", color: "#1890ff" },
  { label: "少女粉", color: "#ec4899" },
];

const STORAGE_KEY = "ruoyi_next_theme";

export function getThemeColor(): string {
  if (typeof window === "undefined") return "#1677ff";
  return window.localStorage.getItem(STORAGE_KEY) ?? "#1677ff";
}

function setThemeColor(color: string) {
  document.documentElement.style.setProperty("--primary", color);
  document.documentElement.style.setProperty("--primary-light", color + "15");
  window.localStorage.setItem(STORAGE_KEY, color);
}

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getThemeColor());

  useEffect(() => {
    setThemeColor(current);
  }, [current]);

  return (
    <>
      <button className="icon-button" onClick={() => setOpen(!open)} title="主题色">
        <Palette size={16} />
      </button>
      {open && (
        <div className="modal-mask" onClick={() => setOpen(false)}>
          <div className="modal-panel" style={{ width: "min(360px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>主题色</h2>
              <button className="text-button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.color}
                  onClick={() => { setCurrent(p.color); setOpen(false); }}
                  style={{
                    height: 56,
                    borderRadius: 8,
                    border: current === p.color ? `3px solid ${p.color}` : "1px solid var(--line)",
                    background: p.color,
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    transition: "transform .15s",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>A</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ThemeInit() {
  useEffect(() => {
    setThemeColor(getThemeColor());
  }, []);
  return null;
}
