"use client";

import { useState, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { api, ApiError } from "../api";
import { showToast } from "../utils";

interface ImageUploadProps {
  uploadUrl: string;
  value?: string;
  maxSize?: number; // MB
  disabled?: boolean;
  onSuccess?: (url: string) => void;
}

export default function ImageUpload({
  uploadUrl,
  value,
  maxSize = 5,
  disabled = false,
  onSuccess,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      showToast(`文件大小超过${maxSize}MB限制`, "error");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await api.upload(uploadUrl, form) as Record<string, unknown>;
      const url = String(res.url ?? res.imgUrl ?? "");
      setCurrentUrl(url);
      onSuccess?.(url);
      showToast("上传成功", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "上传失败", "error");
    } finally {
      setUploading(false);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const displayUrl = currentUrl.startsWith("http") ? currentUrl : currentUrl ? `http://127.0.0.1:8000${currentUrl}` : "";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        disabled={disabled || uploading}
      />
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          width: 120,
          height: 120,
          border: "2px dashed var(--line)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          overflow: "hidden",
          background: "#fafafa",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {uploading ? (
          <div className="spinner" style={{ width: 24, height: 24, border: "3px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
        ) : displayUrl ? (
          <img src={displayUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <ImagePlus size={28} style={{ color: "var(--muted)" }} />
        )}
      </div>
      {currentUrl && !uploading && (
        <button
          type="button"
          className="text-button danger"
          onClick={(e) => { e.stopPropagation(); setCurrentUrl(""); onSuccess?.(""); }}
          title="移除"
          style={{ position: "absolute", top: -6, right: -6, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
