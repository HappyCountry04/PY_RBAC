"use client";

import { useEffect, useState, useRef } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();
let activeRequests = 0;

export function startLoader() {
  activeRequests++;
  listeners.forEach((fn) => fn());
}

export function stopLoader() {
  activeRequests = Math.max(0, activeRequests - 1);
  listeners.forEach((fn) => fn());
}

export function TopLoader() {
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fn = () => {
      if (activeRequests > 0) {
        setVisible(true);
        setWidth((w) => {
          if (w < 20) return 20;
          if (w < 60) return w + 3;
          if (w < 85) return w + 1;
          return w + 0.2;
        });
      } else {
        setWidth(100);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
          setVisible(false);
          setWidth(0);
        }, 200);
      }
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      height: 2, background: "transparent", pointerEvents: "none",
    }}>
      <div style={{
        height: "100%", width: `${width}%`,
        background: "var(--primary, #1677ff)",
        transition: "width 0.3s ease",
        boxShadow: "0 0 8px rgba(22,119,255,0.4)",
      }} />
    </div>
  );
}
