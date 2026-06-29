import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./shared/auth";
import { PreloadDicts } from "./shared/dict";
import { ModalRoot } from "./shared/components/modal";
import { ThemeInit } from "./shared/components/theme-picker";
import { TopLoader } from "./shared/components/top-loader";

const PRELOAD_DICTS = ["sys_normal_disable", "sys_show_hide", "sys_user_sex", "sys_yes_no", "sys_notice_type", "sys_notice_status"];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <PreloadDicts types={PRELOAD_DICTS}>
            <ThemeInit />
            <TopLoader />
            {children}
            <ModalRoot />
          </PreloadDicts>
        </AuthProvider>
      </body>
    </html>
  );
}
