import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RuoYi Next Admin",
  description: "若依 FastAPI 后台管理前端"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
