"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  Database,
  FileClock,
  KeyRound,
  LayoutDashboard,
  ListTree,
  LogOut,
  Menu as MenuIcon,
  RefreshCw,
  Search,
  Settings,
  Shield,
  UserRound
} from "lucide-react";
import { api, ApiError, clearToken, getToken, setToken } from "./shared/api";
import type { LoginResponse, RouterItem, TableResponse } from "./shared/types";

type Session = {
  user: Record<string, unknown>;
  roles: string[];
  permissions: string[];
  routers: RouterItem[];
};

type ViewKey =
  | "dashboard"
  | "user"
  | "role"
  | "menu"
  | "dept"
  | "post"
  | "dict"
  | "config"
  | "operlog"
  | "logininfor";

type FormOption = { label: string; value: string };

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "password" | "number" | "select" | "textarea" | "checkboxes";
  options?: FormOption[];
  required?: boolean;
  createOnly?: boolean;
};

type CrudConfig = {
  title: string;
  listPerm?: string;
  endpoint?: string;
  basePath?: string;
  idKey?: string;
  icon: React.ElementType;
  columns?: { key: string; label: string }[];
  fields?: FieldDef[];
  readonly?: boolean;
};

type ModalState = {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  initialValues?: Record<string, string>;
  options?: Record<string, FormOption[]>;
};

const statusOptions = [
  { label: "\u6b63\u5e38", value: "0" },
  { label: "\u505c\u7528", value: "1" }
];

const menuTypeOptions = [
  { label: "\u76ee\u5f55", value: "M" },
  { label: "\u83dc\u5355", value: "C" },
  { label: "\u6309\u94ae", value: "F" }
];

const viewMeta: Record<ViewKey, CrudConfig> = {
  dashboard: { title: "\u5de5\u4f5c\u53f0", icon: LayoutDashboard, readonly: true },
  user: {
    title: "\u7528\u6237\u7ba1\u7406",
    listPerm: "system:user:list",
    endpoint: "/system/user/list",
    basePath: "/system/user",
    idKey: "userId",
    icon: UserRound,
    columns: [
      { key: "userId", label: "ID" },
      { key: "userName", label: "\u8d26\u53f7" },
      { key: "nickName", label: "\u6635\u79f0" },
      { key: "phonenumber", label: "\u624b\u673a" },
      { key: "status", label: "\u72b6\u6001" }
    ],
    fields: [
      { key: "userName", label: "\u8d26\u53f7", required: true },
      { key: "nickName", label: "\u6635\u79f0", required: true },
      { key: "password", label: "\u5bc6\u7801", type: "password", createOnly: true },
      { key: "deptId", label: "\u90e8\u95e8ID", type: "number" },
      { key: "email", label: "\u90ae\u7bb1" },
      { key: "phonenumber", label: "\u624b\u673a" },
      { key: "sex", label: "\u6027\u522b" },
      { key: "status", label: "\u72b6\u6001", type: "select", options: statusOptions },
      { key: "roleIds", label: "\u89d2\u8272", type: "checkboxes" },
      { key: "postIds", label: "\u5c97\u4f4d", type: "checkboxes" },
      { key: "remark", label: "\u5907\u6ce8", type: "textarea" }
    ]
  },
  role: {
    title: "\u89d2\u8272\u7ba1\u7406",
    listPerm: "system:role:list",
    endpoint: "/system/role/list",
    basePath: "/system/role",
    idKey: "roleId",
    icon: Shield,
    columns: [
      { key: "roleId", label: "ID" },
      { key: "roleName", label: "\u89d2\u8272\u540d\u79f0" },
      { key: "roleKey", label: "\u6743\u9650\u5b57\u7b26" },
      { key: "data_scope", label: "\u6570\u636e\u8303\u56f4" },
      { key: "status", label: "\u72b6\u6001" }
    ],
    fields: [
      { key: "roleName", label: "\u89d2\u8272\u540d\u79f0", required: true },
      { key: "roleKey", label: "\u6743\u9650\u5b57\u7b26", required: true },
      { key: "roleSort", label: "\u6392\u5e8f", type: "number" },
      {
        key: "dataScope",
        label: "\u6570\u636e\u8303\u56f4",
        type: "select",
        options: [
          { label: "\u5168\u90e8\u6570\u636e", value: "1" },
          { label: "\u81ea\u5b9a\u4e49\u6570\u636e", value: "2" },
          { label: "\u672c\u90e8\u95e8\u6570\u636e", value: "3" },
          { label: "\u672c\u90e8\u95e8\u53ca\u4ee5\u4e0b", value: "4" },
          { label: "\u4ec5\u672c\u4eba", value: "5" }
        ]
      },
      { key: "status", label: "\u72b6\u6001", type: "select", options: statusOptions },
      { key: "menuIds", label: "\u83dc\u5355\u6743\u9650", type: "checkboxes" },
      { key: "deptIds", label: "\u6570\u636e\u6743\u9650\u90e8\u95e8", type: "checkboxes" },
      { key: "remark", label: "\u5907\u6ce8", type: "textarea" }
    ]
  },
  menu: {
    title: "\u83dc\u5355\u7ba1\u7406",
    listPerm: "system:menu:list",
    endpoint: "/system/menu/list",
    basePath: "/system/menu",
    idKey: "menuId",
    icon: ListTree,
    columns: [
      { key: "menuId", label: "ID" },
      { key: "menuName", label: "\u83dc\u5355\u540d\u79f0" },
      { key: "path", label: "\u8def\u7531\u5730\u5740" },
      { key: "perms", label: "\u6743\u9650\u5b57\u7b26" },
      { key: "status", label: "\u72b6\u6001" }
    ],
    fields: [
      { key: "menuName", label: "\u83dc\u5355\u540d\u79f0", required: true },
      { key: "parentId", label: "\u7236\u7ea7ID", type: "number" },
      { key: "orderNum", label: "\u6392\u5e8f", type: "number" },
      { key: "path", label: "\u8def\u7531\u5730\u5740" },
      { key: "component", label: "\u7ec4\u4ef6\u8def\u5f84" },
      { key: "menuType", label: "\u83dc\u5355\u7c7b\u578b", type: "select", options: menuTypeOptions },
      { key: "perms", label: "\u6743\u9650\u5b57\u7b26" },
      { key: "icon", label: "\u56fe\u6807" },
      { key: "status", label: "\u72b6\u6001", type: "select", options: statusOptions },
      {
        key: "visible",
        label: "\u663e\u793a\u72b6\u6001",
        type: "select",
        options: [
          { label: "\u663e\u793a", value: "0" },
          { label: "\u9690\u85cf", value: "1" }
        ]
      }
    ]
  },
  dept: {
    title: "\u90e8\u95e8\u7ba1\u7406",
    listPerm: "system:dept:list",
    endpoint: "/system/dept/list",
    basePath: "/system/dept",
    idKey: "deptId",
    icon: Building2,
    columns: [
      { key: "deptId", label: "ID" },
      { key: "deptName", label: "\u90e8\u95e8\u540d\u79f0" },
      { key: "leader", label: "\u8d1f\u8d23\u4eba" },
      { key: "phone", label: "\u7535\u8bdd" },
      { key: "status", label: "\u72b6\u6001" }
    ],
    fields: [
      { key: "deptName", label: "\u90e8\u95e8\u540d\u79f0", required: true },
      { key: "parentId", label: "\u7236\u7ea7ID", type: "number" },
      { key: "orderNum", label: "\u6392\u5e8f", type: "number" },
      { key: "leader", label: "\u8d1f\u8d23\u4eba" },
      { key: "phone", label: "\u7535\u8bdd" },
      { key: "email", label: "\u90ae\u7bb1" },
      { key: "status", label: "\u72b6\u6001", type: "select", options: statusOptions }
    ]
  },
  post: {
    title: "\u5c97\u4f4d\u7ba1\u7406",
    listPerm: "system:post:list",
    endpoint: "/system/post/list",
    basePath: "/system/post",
    idKey: "postId",
    icon: BookOpen,
    fields: [
      { key: "postCode", label: "\u5c97\u4f4d\u7f16\u7801", required: true },
      { key: "postName", label: "\u5c97\u4f4d\u540d\u79f0", required: true },
      { key: "postSort", label: "\u6392\u5e8f", type: "number" },
      { key: "status", label: "\u72b6\u6001", type: "select", options: statusOptions },
      { key: "remark", label: "\u5907\u6ce8", type: "textarea" }
    ]
  },
  dict: {
    title: "\u5b57\u5178\u7ba1\u7406",
    listPerm: "system:dict:list",
    endpoint: "/system/dict/type/list",
    basePath: "/system/dict/type",
    idKey: "dictId",
    icon: Database,
    fields: [
      { key: "dictName", label: "\u5b57\u5178\u540d\u79f0", required: true },
      { key: "dictType", label: "\u5b57\u5178\u7c7b\u578b", required: true },
      { key: "status", label: "\u72b6\u6001", type: "select", options: statusOptions },
      { key: "remark", label: "\u5907\u6ce8", type: "textarea" }
    ]
  },
  config: {
    title: "\u53c2\u6570\u914d\u7f6e",
    listPerm: "system:config:list",
    endpoint: "/system/config/list",
    basePath: "/system/config",
    idKey: "configId",
    icon: Settings,
    columns: [
      { key: "configId", label: "ID" },
      { key: "configKey", label: "\u53c2\u6570\u952e\u540d" },
      { key: "config_value", label: "\u53c2\u6570\u952e\u503c" },
      { key: "remark", label: "\u5907\u6ce8" }
    ],
    fields: [
      { key: "configName", label: "\u53c2\u6570\u540d\u79f0", required: true },
      { key: "configKey", label: "\u53c2\u6570\u952e\u540d", required: true },
      { key: "configValue", label: "\u53c2\u6570\u952e\u503c" },
      {
        key: "configType",
        label: "\u7cfb\u7edf\u5185\u7f6e",
        type: "select",
        options: [
          { label: "\u662f", value: "Y" },
          { label: "\u5426", value: "N" }
        ]
      },
      { key: "remark", label: "\u5907\u6ce8", type: "textarea" }
    ]
  },
  operlog: {
    title: "\u64cd\u4f5c\u65e5\u5fd7",
    listPerm: "monitor:operlog:list",
    endpoint: "/monitor/operlog/list",
    basePath: "/monitor/operlog",
    idKey: "oper_id",
    icon: FileClock,
    readonly: true
  },
  logininfor: {
    title: "\u767b\u5f55\u65e5\u5fd7",
    listPerm: "monitor:logininfor:list",
    endpoint: "/monitor/logininfor/list",
    basePath: "/monitor/logininfor",
    idKey: "info_id",
    icon: KeyRound,
    readonly: true
  }
};

const routeToView: Record<string, ViewKey> = {
  user: "user",
  role: "role",
  menu: "menu",
  dept: "dept",
  post: "post",
  dict: "dict",
  config: "config",
  operlog: "operlog",
  logininfor: "logininfor"
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [navOpen, setNavOpen] = useState(true);
  const [bootError, setBootError] = useState("");
  const [booting, setBooting] = useState(false);

  useEffect(() => {
    if (getToken()) void bootstrap();
  }, []);

  async function bootstrap() {
    setBooting(true);
    setBootError("");
    try {
      const [info, routers] = await Promise.all([api.get("/getInfo"), api.get("/getRouters")]);
      setSession({
        user: info.user ?? {},
        roles: info.roles ?? [],
        permissions: info.permissions ?? [],
        routers: routers.data ?? []
      });
    } catch (err) {
      clearToken();
      setSession(null);
      setBootError(err instanceof ApiError ? err.message : "\u540e\u53f0\u521d\u59cb\u5316\u5931\u8d25");
    } finally {
      setBooting(false);
    }
  }

  async function handleLogin(username: string, password: string) {
    const res = (await api.post("/login", { username, password })) as LoginResponse;
    setToken(res.token);
    await bootstrap();
  }

  async function handleLogout() {
    try {
      await api.post("/logout", {});
    } finally {
      clearToken();
      setSession(null);
      setView("dashboard");
    }
  }

  if (!session) return <LoginPanel onLogin={handleLogin} booting={booting} bootError={bootError} />;

  return (
    <main className="admin-shell">
      <aside className={navOpen ? "sidebar" : "sidebar compact"}>
        <div className="brand">
          <div className="brand-mark">R</div>
          {navOpen && (
            <div>
              <strong>RuoYi Next</strong>
          <span>{"FastAPI \u540e\u53f0"}</span>
            </div>
          )}
        </div>
        <button className="icon-row" onClick={() => setNavOpen((value) => !value)} title={"\u6298\u53e0\u83dc\u5355"}>
          <MenuIcon size={18} />
          {navOpen && <span>{"\u83dc\u5355"}</span>}
        </button>
        <nav className="nav-list">
          <NavButton active={view === "dashboard"} icon={LayoutDashboard} label={"\u5de5\u4f5c\u53f0"} open={navOpen} onClick={() => setView("dashboard")} />
          <RouterNav routers={session.routers} open={navOpen} current={view} onSelect={setView} />
        </nav>
      </aside>
      <section className="main-panel">
        <header className="topbar">
          <div>
            <h1>{viewMeta[view].title}</h1>
            <p>{String(session.user.nickName ?? session.user.userName ?? "admin")}</p>
          </div>
          <div className="top-actions">
            <span className="role-pill">{session.roles.join(", ") || "\u65e0\u89d2\u8272"}</span>
            <button className="ghost-button" onClick={handleLogout}>
              <LogOut size={16} />
              {"\u9000\u51fa"}
            </button>
          </div>
        </header>
        {view === "dashboard" ? <Dashboard session={session} onSelect={setView} /> : <DataView view={view} session={session} />}
      </section>
    </main>
  );
}

function LoginPanel({
  onLogin,
  booting,
  bootError
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  booting: boolean;
  bootError: string;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "\u767b\u5f55\u5931\u8d25");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-copy">
          <h1>RuoYi Next Admin</h1>
          <p>{"FastAPI RBAC \u6743\u9650\u540e\u53f0"}</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            {"\u8d26\u53f7"}
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            {"\u5bc6\u7801"}
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {booting && <div className="form-hint">{"\u6b63\u5728\u6062\u590d\u767b\u5f55\u72b6\u6001..."}</div>}
          {bootError && <div className="form-error">{bootError}</div>}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={busy || booting}>
            {busy ? "\u767b\u5f55\u4e2d..." : "\u767b\u5f55"}
          </button>
        </form>
      </section>
    </main>
  );
}

function RouterNav({ routers, open, current, onSelect }: { routers: RouterItem[]; open: boolean; current: ViewKey; onSelect: (view: ViewKey) => void }) {
  return (
    <>
      {flattenRouters(routers).map((item) => {
        const key = routeToView[item.path.replace("/", "")];
        if (!key) return null;
        const Icon = viewMeta[key].icon;
        return <NavButton key={`${item.path}-${key}`} active={current === key} icon={Icon} label={viewMeta[key].title} open={open} onClick={() => onSelect(key)} />;
      })}
    </>
  );
}

function NavButton({ active, icon: Icon, label, open, onClick }: { active: boolean; icon: React.ElementType; label: string; open: boolean; onClick: () => void }) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick} title={label}>
      <Icon size={18} />
      {open && <span>{label}</span>}
    </button>
  );
}

function Dashboard({ session, onSelect }: { session: Session; onSelect: (view: ViewKey) => void }) {
  const available = (Object.keys(viewMeta) as ViewKey[]).filter((key) => key === "dashboard" || can(session, viewMeta[key].listPerm));
  return (
    <div className="dashboard-grid">
      <section className="summary-band">
        <div>
          <span>{"\u5f53\u524d\u7528\u6237"}</span>
          <strong>{String(session.user.userName ?? "admin")}</strong>
        </div>
        <div>
          <span>{"\u89d2\u8272"}</span>
          <strong>{session.roles.join(", ") || "\u65e0"}</strong>
        </div>
        <div>
          <span>{"\u6743\u9650\u6570"}</span>
          <strong>{session.permissions.includes("*:*:*") ? "\u5168\u90e8" : session.permissions.length}</strong>
        </div>
      </section>
      <section className="module-grid">
        {available.filter((key) => key !== "dashboard").map((key) => {
          const Icon = viewMeta[key].icon;
          return (
            <button className="module-tile" key={key} onClick={() => onSelect(key)}>
              <Icon size={20} />
              <span>{viewMeta[key].title}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function DataView({ view, session }: { view: ViewKey; session: Session }) {
  const meta = viewMeta[view];
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);

  const canCreate = !meta.readonly && can(session, meta.listPerm?.replace(":list", ":add"));
  const canEdit = !meta.readonly && can(session, meta.listPerm?.replace(":list", ":edit"));
  const canRemove = can(session, meta.listPerm?.replace(":list", ":remove"));

  useEffect(() => {
    void load();
  }, [view]);

  async function load() {
    if (!meta.endpoint) return;
    setLoading(true);
    setError("");
    try {
      const res = (await api.get(`${meta.endpoint}?pageNum=1&pageSize=50`)) as TableResponse;
      const data = Array.isArray(res.data) ? res.data : res.rows ?? [];
      setRows(data);
      setTotal(res.total ?? data.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "\u52a0\u8f7d\u5931\u8d25");
    } finally {
      setLoading(false);
    }
  }

  async function openModal(mode: "create" | "edit", row?: Record<string, unknown>) {
    setError("");
    try {
      setModal(await buildModalState(view, mode, row));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "\u6253\u5f00\u8868\u5355\u5931\u8d25");
    }
  }

  async function remove(row: Record<string, unknown>) {
    if (!meta.basePath || !meta.idKey) return;
    const id = row[meta.idKey];
    if (!id) return;
    if (!window.confirm(`\u786e\u5b9a\u5220\u9664\u8fd9\u6761${meta.title}\u6570\u636e\u5417\uff1f`)) return;
    try {
      await api.delete(`${meta.basePath}/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "\u5220\u9664\u5931\u8d25");
    }
  }

  async function save(values: Record<string, string>) {
    if (!meta.basePath) return;
    const body = normalizeFormValues(view, values, modal?.row, modal?.mode ?? "create");
    if (modal?.mode === "edit") {
      await api.put(meta.basePath, body);
      if (view === "role") {
        await api.put("/system/role/dataScope", {
          roleId: body.roleId,
          dataScope: body.dataScope,
          deptIds: body.deptIds ?? []
        });
      }
    } else {
      await api.post(meta.basePath, body);
    }
    setModal(null);
    await load();
  }

  const visibleRows = useMemo(() => {
    if (!keyword) return rows;
    const q = keyword.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, keyword]);

  const columns = useMemo(() => meta.columns ?? pickColumns(rows), [meta.columns, rows]);

  return (
    <section className="data-surface">
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={"\u641c\u7d22\u5f53\u524d\u5217\u8868"} />
        </div>
        <button className="icon-button" onClick={load} title={"\u5237\u65b0"}>
          <RefreshCw size={16} />
        </button>
        {canCreate && <button className="primary-small" onClick={() => void openModal("create")}>{"\u65b0\u589e"}</button>}
      </div>
      <div className="table-meta">
        <span>{"\u5171"} {total} {"\u6761"}</span>
        {error && <strong>{error}</strong>}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              <th>{"\u64cd\u4f5c"}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1}>{"\u52a0\u8f7d\u4e2d..."}</td></tr>
            ) : visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr key={String(row.id ?? row.userId ?? row.roleId ?? row.menuId ?? index)}>
                  {columns.map((column) => <td key={column.key}>{formatCell(row[column.key])}</td>)}
                  <td className="actions-cell">
                    {canEdit && <button className="text-button" onClick={() => void openModal("edit", row)}>{"\u7f16\u8f91"}</button>}
                    {canRemove && <button className="text-button danger" onClick={() => void remove(row)}>{"\u5220\u9664"}</button>}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={columns.length + 1}>{"\u6682\u65e0\u6570\u636e"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {modal && meta.fields && (
        <CrudModal
          title={`${modal.mode === "edit" ? "\u7f16\u8f91" : "\u65b0\u589e"}${meta.title}`}
          fields={meta.fields}
          mode={modal.mode}
          row={modal.row}
          initialValues={modal.initialValues}
          dynamicOptions={modal.options}
          onClose={() => setModal(null)}
          onSubmit={save}
        />
      )}
    </section>
  );
}

async function buildModalState(view: ViewKey, mode: "create" | "edit", row?: Record<string, unknown>): Promise<ModalState> {
  const state: ModalState = { mode, row, initialValues: {}, options: {} };
  if (view === "user") {
    const [roles, posts, detail] = await Promise.all([
      api.get("/system/role/optionselect"),
      api.get("/system/post/list?pageNum=1&pageSize=200"),
      mode === "edit" && row ? api.get(`/system/user/${readRowValue(row, "userId")}`) : Promise.resolve({} as Record<string, unknown>)
    ]);
    state.options = {
      roleIds: toOptions(roles.data ?? roles, "roleId", "roleName"),
      postIds: toOptions(posts.rows ?? posts.data ?? [], "postId", "postName")
    };
    state.initialValues = {
      roleIds: toCsv(detail.roleIds),
      postIds: toCsv(detail.postIds)
    };
  }
  if (view === "role") {
    const roleId = row ? readRowValue(row, "roleId") : "";
    const [menus, roleDetail, deptTree] = await Promise.all([
      api.get("/system/menu/treeselect"),
      mode === "edit" && roleId ? api.get(`/system/role/${roleId}`) : Promise.resolve({} as Record<string, unknown>),
      mode === "edit" && roleId ? api.get(`/system/role/deptTree/${roleId}`) : api.get("/system/dept/list")
    ]);
    state.options = {
      menuIds: flattenTreeOptions(menus.data ?? []),
      deptIds: flattenTreeOptions(deptTree.depts ?? deptTree.data ?? [])
    };
    state.initialValues = {
      menuIds: toCsv(roleDetail.menuIds),
      deptIds: toCsv(roleDetail.deptIds ?? deptTree.checkedKeys)
    };
  }
  return state;
}

function CrudModal({ title, fields, mode, row, initialValues, dynamicOptions, onClose, onSubmit }: {
  title: string;
  fields: FieldDef[];
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  initialValues?: Record<string, string>;
  dynamicOptions?: Record<string, FormOption[]>;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const data: Record<string, string> = {};
    for (const field of fields) {
      if (mode === "edit" && field.createOnly) continue;
      data[field.key] = String(initialValues?.[field.key] ?? readRowValue(row, field.key) ?? defaultValue(field) ?? "");
    }
    return data;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "\u4fdd\u5b58\u5931\u8d25");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-mask">
      <form className="modal-panel" onSubmit={submit}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="text-button" onClick={onClose}>{"\u5173\u95ed"}</button>
        </div>
        <div className="form-grid">
          {fields.filter((field) => !(mode === "edit" && field.createOnly)).map((field) => (
            <label key={field.key} className={field.type === "textarea" || field.type === "checkboxes" ? "wide-field" : undefined}>
              {field.label}
              {renderField(field, values[field.key] ?? "", (value) => setValues((prev) => ({ ...prev, [field.key]: value })), dynamicOptions?.[field.key])}
            </label>
          ))}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>{"\u53d6\u6d88"}</button>
          <button className="primary-small" disabled={busy}>{busy ? "\u4fdd\u5b58\u4e2d..." : "\u4fdd\u5b58"}</button>
        </div>
      </form>
    </div>
  );
}

function renderField(field: FieldDef, value: string, onChange: (value: string) => void, dynamicOptions?: FormOption[]) {
  if (field.type === "checkboxes") {
    const selected = value ? value.split(",").filter(Boolean) : [];
    const options = dynamicOptions ?? field.options ?? [];
    return (
      <div className="check-list">
        {options.length ? options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label key={option.value} className="check-item">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);
                  onChange(Array.from(new Set(next)).join(","));
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        }) : <span className="empty-hint">{"\u6682\u65e0\u53ef\u9009\u9879"}</span>}
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <select value={value} required={field.required} onChange={(event) => onChange(event.target.value)}>
        {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }
  if (field.type === "textarea") {
    return <textarea value={value} required={field.required} onChange={(event) => onChange(event.target.value)} />;
  }
  return <input type={field.type ?? "text"} value={value} required={field.required} onChange={(event) => onChange(event.target.value)} />;
}

function normalizeFormValues(view: ViewKey, values: Record<string, string>, row: Record<string, unknown> | undefined, mode: "create" | "edit") {
  const body: Record<string, unknown> = { ...values };
  const idKey = viewMeta[view].idKey;
  if (mode === "edit" && idKey && row) body[idKey] = row[idKey];
  for (const key of ["deptId", "parentId", "orderNum", "roleSort", "postSort", "isFrame", "isCache"]) {
    if (body[key] !== undefined && body[key] !== "") body[key] = Number(body[key]);
  }
  for (const key of ["roleIds", "postIds", "menuIds", "deptIds"]) {
    if (body[key] !== undefined) body[key] = String(body[key]).split(",").filter(Boolean).map(Number);
  }
  return body;
}

function readRowValue(row: Record<string, unknown> | undefined, key: string) {
  if (!row) return "";
  if (row[key] !== undefined) return row[key];
  const snake = key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
  return row[snake];
}

function defaultValue(field: FieldDef) {
  if (field.type === "select") return field.options?.[0]?.value ?? "";
  if (field.type === "number") return "0";
  if (field.key === "password") return "123456";
  return "";
}

function flattenRouters(routers: RouterItem[]): RouterItem[] {
  return routers.flatMap((router) => [router, ...flattenRouters(router.children ?? [])]);
}

function toOptions(rows: unknown, valueKey: string, labelKey: string): FormOption[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      value: String(readRowValue(item, valueKey) ?? ""),
      label: String(readRowValue(item, labelKey) ?? readRowValue(item, valueKey) ?? "")
    };
  }).filter((option) => option.value);
}

function flattenTreeOptions(nodes: unknown, level = 0): FormOption[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap((node) => {
    const item = node as Record<string, unknown>;
    const id = item.id ?? item.deptId ?? item.menuId;
    const label = item.label ?? item.deptName ?? item.menuName ?? id;
    const children = item.children;
    const current = id === undefined ? [] : [{ value: String(id), label: `${"  ".repeat(level)}${String(label)}` }];
    return [...current, ...flattenTreeOptions(children, level + 1)];
  });
}

function toCsv(value: unknown) {
  return Array.isArray(value) ? value.map(String).join(",") : "";
}

function can(session: Session, permission?: string) {
  if (!permission) return true;
  return session.permissions.includes("*:*:*") || session.permissions.includes(permission);
}

function pickColumns(rows: Record<string, unknown>[]) {
  const sample = rows[0] ?? {};
  return Object.keys(sample).slice(0, 6).map((key) => ({ key, label: key }));
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (value === "0") return "\u6b63\u5e38";
  if (value === "1") return "\u505c\u7528";
  return String(value);
}
