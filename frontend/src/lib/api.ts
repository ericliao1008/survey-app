import type { Survey, SubmitPayload, SurveyStats } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_KEY = "survey_admin_token";

// ====== Admin Token 持久化（sessionStorage：关闭标签页即清除） ======
export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // sessionStorage 不可用时静默忽略（无痕模式等）
  }
}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const { auth = false, headers, ...rest } = init ?? {};
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };
  if (auth) {
    const token = getAdminToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail || `请求失败：${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// 带鉴权的二进制下载（CSV）
async function downloadCsv(slug: string): Promise<void> {
  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/surveys/${slug}/export`, { headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail || `下载失败：${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}_responses.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 延迟释放，避免某些浏览器下载被中断
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const api = {
  getSurvey: (slug: string) => request<Survey>(`/surveys/${slug}`),

  submitResponse: (slug: string, payload: SubmitPayload) =>
    request<{ id: number; message: string }>(`/surveys/${slug}/responses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getStats: (slug: string) =>
    request<SurveyStats>(`/admin/surveys/${slug}/stats`, { auth: true }),

  downloadCsv,
};
