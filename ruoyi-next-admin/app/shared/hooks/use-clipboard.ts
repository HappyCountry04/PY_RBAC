"use client";

import { useState } from "react";
import { showToast } from "../utils";

export function useClipboard() {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("复制成功", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      showToast("复制成功", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return { copy, copied };
}
