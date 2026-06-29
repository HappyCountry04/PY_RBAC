"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { ChevronDown, ChevronRight, LogOut, Menu as MenuIcon } from "lucide-react";
import { useAuth } from "../auth";
import SvgIcon from "./svgicon";
import FullscreenToggle from "./fullscreen";
import ThemePicker from "./theme-picker";
import type { RouterItem } from "../types";

function visibleChildren(item: RouterItem): RouterItem[] {
  return (item.children ?? []).filter((c) => !c.hidden);
}

const routeMap: Record<string, string> = {
  user: "/system/user", role: "/system/role", menu: "/system/menu",
  dept: "/system/dept", post: "/system/post", dict: "/system/dict",
  config: "/system/config", operlog: "/monitor/operlog", logininfor: "/monitor/logininfor",
};

function resolveRoute(item: RouterItem, parentRoute: string): string {
  const key = item.path.replace(/^\//, "");
  if (routeMap[key]) return routeMap[key];
  return parentRoute ? `${parentRoute}/${key}` : `/${key}`;
}

function buildRoute(item: RouterItem, parentRoute: string): string {
  const seg = item.path.replace(/^\//, "");
  return parentRoute ? `${parentRoute}/${seg}` : `/${seg}`;
}

type NavItem = {
  route: string;
  icon?: string;
  label: string;
  active: boolean;
  type: "leaf";
};

type DirItem = {
  route: string;
  icon?: string;
  label: string;
  childActive: boolean;
  expanded: boolean;
  type: "dir";
  children: (NavItem | DirItem)[];
};

function buildNavTree(
  items: RouterItem[],
  parentRoute: string,
  pathname: string,
  expandedSet: Set<string>,
): (NavItem | DirItem)[] {
  return items
    .filter((item) => !item.hidden)
    .map((item) => {
      const route = buildRoute(item, parentRoute);
      const children = visibleChildren(item);
      const label = item.meta?.title ?? item.name ?? item.path;
      const icon = item.meta?.icon;

      if (children.length > 0) {
        const sub = buildNavTree(children, route, pathname, expandedSet);
        const childActive = sub.some((c) => {
          if (c.type === "leaf") return c.active;
          return c.childActive;
        });
        const expanded = expandedSet.has(route);
        return { route, icon, label, childActive, expanded, type: "dir" as const, children: sub };
      }

      const active = pathname.startsWith(resolveRoute(item, parentRoute));
      return { route: resolveRoute(item, parentRoute), icon, label, active, type: "leaf" as const };
    });
}

function collectAncestorRoutes(item: RouterItem, parentRoute: string, pathname: string): Set<string> {
  const out = new Set<string>();
  const route = buildRoute(item, parentRoute);
  const children = visibleChildren(item);
  if (children.length === 0) {
    if (pathname.startsWith(resolveRoute(item, parentRoute))) out.add(route);
    return out;
  }
  for (const child of children) {
    const childRoutes = collectAncestorRoutes(child, route, pathname);
    if (childRoutes.size > 0) {
      out.add(route);
      for (const r of childRoutes) out.add(r);
      return out;
    }
  }
  return out;
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
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !session) router.replace("/");
  }, [session, loading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const routers = (session?.routers ?? []).filter((r) => !r.hidden);

  const autoExpandSet = useMemo(() => {
    const out = new Set<string>();
    for (const r of routers) {
      for (const s of collectAncestorRoutes(r, "", pathname)) out.add(s);
    }
    return out;
  }, [routers, pathname]);

  const expandedSet = useMemo(() => {
    const out = new Set<string>();
    for (const r of autoExpandSet) {
      if (!manualCollapsed.has(r)) out.add(r);
    }
    for (const r of manualExpanded) out.add(r);
    return out;
  }, [autoExpandSet, manualCollapsed, manualExpanded]);

  const navTree = useMemo(
    () => buildNavTree(routers, "", pathname, expandedSet),
    [routers, pathname, expandedSet],
  );

  const title = useMemo(() => {
    for (const item of navTree) {
      if (item.type === "leaf" && item.active) return item.label;
      if (item.type === "dir") {
        for (const c of item.children) {
          if (c.type === "leaf" && c.active) return c.label;
          if (c.type === "dir" && c.childActive) return c.label;
        }
      }
    }
    return "";
  }, [navTree]);

  const handleNav = useCallback((route: string) => {
    const now = Date.now();
    if (now - lastNavTime < ROUTER_DEBOUNCE_MS) return;
    lastNavTime = now;
    router.push(route);
  }, [router]);

  const toggleDir = useCallback((route: string, currentlyExpanded: boolean) => {
    if (currentlyExpanded) {
      setManualCollapsed((prev) => new Set(prev).add(route));
      setManualExpanded((prev) => { const n = new Set(prev); n.delete(route); return n; });
    } else {
      setManualExpanded((prev) => new Set(prev).add(route));
      setManualCollapsed((prev) => { const n = new Set(prev); n.delete(route); return n; });
    }
  }, []);

  if (!session) {
    if (loading) {
      return (
        <main className="admin-shell">
          <aside className="sidebar compact" />
          <section className="main-panel" style={{ display: "grid", placeItems: "center" }}>
            <div style={{ color: "var(--muted)" }}>加载中...</div>
          </section>
        </main>
      );
    }
    return null;
  }

  const renderNavNode = (node: NavItem | DirItem, depth: number): React.ReactNode => {
    if (node.type === "leaf") {
      return (
        <NavBtn
          key={node.route}
          active={node.active}
          icon={node.icon}
          label={node.label}
          open={navOpen}
          onClick={() => handleNav(node.route)}
        />
      );
    }

    return (
      <div key={node.route}>
        <button
          className={node.childActive ? "nav-button child-active" : "nav-button"}
          onClick={() => toggleDir(node.route, node.expanded)}
          title={node.label}
        >
          <SvgIcon name={node.icon} size={18} />
          {navOpen && <span style={{ flex: 1, textAlign: "left" }}>{node.label}</span>}
          {navOpen && (node.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>
        {navOpen && node.expanded && (
          <div className="nav-submenu">
            {node.children.map((c) => renderNavNode(c, depth + 1))}
          </div>
        )}
        {!navOpen && node.expanded && node.children.map((c) => renderNavNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <main className="admin-shell">
      <aside className={`sidebar${navOpen ? "" : " compact"}${mobileOpen ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">R</div>
          {navOpen && <div><strong>RuoYi Next</strong><span>FastAPI 后台</span></div>}
        </div>
        <nav className="nav-list">
          {navTree.map((node) => renderNavNode(node, 0))}
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
