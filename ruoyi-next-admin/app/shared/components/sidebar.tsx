"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, Building2, Database, FileClock, KeyRound,
  LayoutDashboard, ListTree, LogOut, Menu as MenuIcon,
  Settings, Shield, UserRound,
} from "lucide-react";
import { useAuth } from "../auth";
import { flattenRouters } from "../utils";
import type { RouterItem } from "../types";

const routeMap: Record<string, string> = {
  user: "/system/user", role: "/system/role", menu: "/system/menu",
  dept: "/system/dept", post: "/system/post", dict: "/system/dict",
  config: "/system/config", operlog: "/system/operlog", logininfor: "/system/logininfor",
};

const viewIcons: Record<string, React.ElementType> = {
  user: UserRound, role: Shield, menu: ListTree, dept: Building2,
  post: BookOpen, dict: Database, config: Settings,
  operlog: FileClock, logininfor: KeyRound,
};

const viewTitles: Record<string, string> = {
  user: "用户管理", role: "角色管理", menu: "菜单管理", dept: "部门管理",
  post: "岗位管理", dict: "字典管理", config: "参数配置",
  operlog: "操作日志", logininfor: "登录日志",
};

export default function SidebarLayout({ children, currentPaths }: { children: React.ReactNode; currentPaths: string[] }) {
  const { session, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(true);
  const s = session!;

  function getTitle() {
    for (const p of currentPaths) { if (viewTitles[p]) return viewTitles[p]; }
    return "";
  }

  return (
    <main className="admin-shell">
      <aside className={navOpen ? "sidebar" : "sidebar compact"}>
        <div className="brand">
          <div className="brand-mark">R</div>
          {navOpen && <div><strong>RuoYi Next</strong><span>FastAPI 后台</span></div>}
        </div>
        <button className="icon-row" onClick={() => setNavOpen((v) => !v)} title="折叠菜单">
          <MenuIcon size={18} />{navOpen && <span>菜单</span>}
        </button>
        <nav className="nav-list">
          <NavBtn active={pathname === "/"} Icon={LayoutDashboard} label="工作台" open={navOpen} onClick={() => router.push("/")} />
          {flattenRouters(s.routers).map((item: RouterItem) => {
            const key = item.path.replace("/", "");
            const route = routeMap[key];
            if (!route) return null;
            const Icon = viewIcons[key] || LayoutDashboard;
            return <NavBtn key={route} active={pathname.startsWith(route)} Icon={Icon} label={viewTitles[key] || route} open={navOpen} onClick={() => router.push(route)} />;
          })}
        </nav>
      </aside>
      <section className="main-panel">
        <header className="topbar">
          <div>
            <h1>{getTitle()}</h1>
            <p><button className="text-button" onClick={() => router.push("/profile")}>{String(s.user.nickName ?? s.user.userName ?? "admin")}</button></p>
          </div>
          <div className="top-actions">
            <span className="role-pill">{s.roles.join(", ") || "无角色"}</span>
            <button className="ghost-button" onClick={async () => { await logout(); router.push("/"); }}>
              <LogOut size={16} />退出
            </button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function NavBtn({ active, Icon, label, open, onClick }: { active: boolean; Icon: React.ElementType; label: string; open: boolean; onClick: () => void }) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick} title={label}>
      <Icon size={18} />{open && <span>{label}</span>}
    </button>
  );
}
