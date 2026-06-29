"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: "#f0f4ff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
          <img src="/assets/404_images/404.png" alt="404" style={{ maxWidth: 480, width: "80%" }} />
          <h2 style={{ color: "#666", margin: 0, fontWeight: 400 }}>抱歉，您访问的页面不存在</h2>
          <Link href="/" style={{ color: "var(--primary, #1677ff)", fontSize: 15 }}>返回首页</Link>
        </div>
      </body>
    </html>
  );
}
