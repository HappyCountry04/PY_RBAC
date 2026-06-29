"use client";

import { useState, useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";

export default function FullscreenToggle({ className = "" }: { className?: string }) {
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const handler = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggle() {
    if (isFull) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <button className={`icon-button ${className}`} onClick={toggle} title={isFull ? "退出全屏" : "全屏"}>
      {isFull ? <Minimize size={16} /> : <Maximize size={16} />}
    </button>
  );
}
