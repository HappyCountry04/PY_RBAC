"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { api, ApiError } from "../api";
import { showToast } from "../utils";

interface FileUploadProps {
  uploadUrl: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // MB
  onSuccess?: (result: Record<string, unknown>) => void;
  disabled?: boolean;
}

export default function FileUpload({
  uploadUrl,
  accept = "*",
  multiple = false,
  maxSize = 10,
  onSuccess,
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        showToast(`文件"${file.name}"超过${maxSize}MB限制`, "error");
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      setUploading(true);
      try {
        const res = await api.upload(uploadUrl, form) as Record<string, unknown>;
        showToast("上传成功", "success");
        onSuccess?.(res);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "上传失败", "error");
      } finally {
        setUploading(false);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      style={{
        border: "2px dashed var(--line)",
        borderRadius: 8,
        padding: "24px 16px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color .2s",
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) handleFiles(e.dataTransfer.files); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || uploading}
      />
      {uploading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className="spinner" style={{ width: 24, height: 24, border: "3px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>上传中...</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Upload size={28} style={{ color: "var(--muted)" }} />
          <span style={{ fontSize: 14 }}>点击或拖拽文件到此处上传</span>
          {maxSize > 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>单个文件不超过 {maxSize}MB</span>}
        </div>
      )}
    </div>
  );
}

export function FileList({ files, onRemove }: { files: { name: string; url: string }[]; onRemove?: (index: number) => void }) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
      {files.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }}>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
          <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontSize: 12 }}>查看</a>
          {onRemove && <button type="button" className="text-button" onClick={() => onRemove(i)}><X size={14} /></button>}
        </div>
      ))}
    </div>
  );
}
