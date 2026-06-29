import { startLoader, stopLoader } from "./components/top-loader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "ruoyi_next_token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T = Record<string, any>>(path: string, init: RequestInit = {}): Promise<T> {
  startLoader();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal
    });
  } catch (err) {
    stopLoader();
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("\u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u68c0\u67e5\u540e\u7aef\u670d\u52a1", 408);
    }
    throw new ApiError("\u65e0\u6cd5\u8fde\u63a5\u540e\u7aef\u670d\u52a1", 0);
  } finally {
    window.clearTimeout(timeout);
  }

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    stopLoader();
    throw new ApiError("\u540e\u7aef\u8fd4\u56de\u683c\u5f0f\u4e0d\u662f JSON", response.status);
  }

  stopLoader();
  if (!response.ok || (typeof data.code === "number" && data.code >= 400)) {
    throw new ApiError(String(data.detail ?? data.msg ?? "\u8bf7\u6c42\u5931\u8d25"), response.status);
  }
  return data as T;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
  upload: (path: string, body: FormData) => request(path, { method: "POST", body }),
  blob: async (path: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_BASE}${path}`, { headers });
    if (!response.ok) throw new ApiError("\u6587\u4ef6\u4e0b\u8f7d\u5931\u8d25", response.status);
    return response.blob();
  }
};
