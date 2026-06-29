"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { ChevronDown, ChevronRight, LogOut, Menu as MenuIcon } from "lucide-react";
import { useAuth } from "../auth";
import SvgIcon from "./svgicon";
import FullscreenToggle from "./fullscreen";
import ThemePicker from "./theme-picker";
import type { RouterItem } from "../types";

const routeMap: Record<string, string> = {
  user: "/system/user", role: "/system/role", menu: "/system/menu",
  dept: "/system/dept", post: "/system/post", dict: "/system/dict",
  config: "/system/config", operlog: "/monitor/operlog", logininfor: "/monitor/logininfor",
};

const viewTitles: Record<string, string> = {
  user: "用户管理", role: "角色管理", menu: "菜单管理", dept: "部门管理",
  post: "岗位管理", dict: "字典管理", config: "参数配置",
  operlog: "操作日志", logininfor: "登录日志",
};

function visibleChildren(item: RouterItem): RouterItem[] {
  return (item.children ?? []).filter((c) => !c.hidden);
}

function leafRoute(item: RouterItem): string | undefined {
  const key = item.path.replace("/", "");
  return routeMap[key];
}

function anyDescendantActive(item: RouterItem, pathname: string): boolean {
  if (item.hidden) return false;
  const route = leafRoute(item);
  if (route && pathname.startsWith(route)) return true;
  for (const child of item.children ?? []) {
    if (anyDescendantActive(child, pathname)) return true;
  }
  return false;
}

const NavBtn = memo(function NavBtn({ active, icon, label, open, onClick }: {
  active: boolean; icon?: string; label: string; open: boolean; onClick: () => void;
}) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick} title={label}>
      <SvgIcon name={icon} size={18} />
      {open && <span>{label}</span>}
    </button>
  );
});

const ROUTER_DEBOUNCE_MS = 80;
let lastNavTime = 0;

export default function SidebarLayout({ children, currentPaths }: { children: React.ReactNode; currentPaths: string[] }) {
  const { session, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !session) router.replace("/");
  }, [session, loading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const routers = (session?.routers ?? []).filter((r) => !r.hidden);

  const title = useMemo(() => {
    for (const p of currentPaths) { if (viewTitles[p]) return viewTitles[p]; }
    return "";
  }, [currentPaths]);

  const handleNav = useCallback((route: string) => {
    const now = Date.now();
    if (now - lastNavTime < ROUTER_DEBOUNCE_MS) return;
    lastNavTime = now;
    router.push(route);
  }, [router]);

  const toggleDir = useCallback((dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  }, []);

  if (!session) return null;

  const renderTree = (items: RouterItem[], depth: number): React.ReactNode[] => {
    return items
      .filter((item) => !item.hidden)
      .map((item) => {
        const children = visibleChildren(item);
        const route = leafRoute(item);

        if (children.length > 0) {
          const active = anyDescendantActive(item, pathname);
          const expanded = expandedDirs.has(item.path);
          const title = item.meta?.title ?? item.name ?? "";

          return (
            <div key={item.path}>
              <button
                className={active ? "nav-button active" : "nav-button"}
                onClick={() => toggleDir(item.path)}
                title={title}
              >
                <SvgIcon name={item.meta?.icon} size={18} />
                {navOpen && <span style={{ flex: 1, textAlign: "left" }}>{title}</span>}
                {navOpen && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
              </button>
              {navOpen && expanded && (
                <div className="nav-submenu">
                  {renderTree(children, depth + 1)}
                </div>
              )}
              {!navOpen && expanded && renderTree(children, depth + 1)}
            </div>
          );
        }

        if (!route) return null;
        const active = pathname.startsWith(route);
        const icon = item.meta?.icon;
        const label = item.meta?.title ?? viewTitles[item.path.replace("/", "")] ?? item.path;

        return (
          <NavBtn
            key={item.path}
            active={active}
            icon={icon}
            label={label}
            open={navOpen}
            onClick={() => handleNav(route)}
          />
        );
      });
  };

  return (
    <main className="admin-shell">
      <aside className={`sidebar${navOpen ? "" : " compact"}${mobileOpen ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">R</div>
          {navOpen && <div><strong>RuoYi Next</strong><span>FastAPI 后台</span></div>}
        </div>
        <nav className="nav-list">
          {renderTree(routers, 0)}
        </nav>
        <div className="sidebar-collapse">
          <button className="icon-row" onClick={() => setNavOpen((v) => !v)} title="折叠菜单" style={{ width: "auto" }}>
            <MenuIcon size={18} />
          </button>
        </div>
      </aside>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <section className="main-panel">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setMobileOpen((v) => !v)} title="菜单">
              <MenuIcon size={20} />
            </button>
            <div>
              <h1>{title}</h1>
              <p><button className="text-button" onClick={() => router.push("/profile")}>{String(session.user.nickName ?? session.user.userName ?? "admin")}</button></p>
            </div>
          </div>
          <div className="top-actions">
            <FullscreenToggle />
            <ThemePicker />
            <span className="role-pill">{session.roles.join(", ") || "无角色"}</span>
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
