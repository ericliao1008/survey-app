import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError, setAdminToken, getAdminToken, clearAdminToken } from "@/lib/api";
import type { SurveyStats } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function StatsPage() {
  const { slug = "" } = useParams();
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.title = "后台 · 问卷统计";
    return () => {
      document.title = "问卷调查";
    };
  }, []);

  const loadStats = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getStats(slug)
      .then((d) => {
        setStats(d);
        setNeedAuth(false);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          clearAdminToken();
          setNeedAuth(true);
        } else {
          setError(e instanceof Error ? e.message : "未知错误");
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    if (!getAdminToken()) {
      setNeedAuth(true);
      setLoading(false);
      return;
    }
    loadStats();
  }, [slug, loadStats]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setAuthError(null);
    setAdminToken(passwordInput.trim());
    setPasswordInput("");
    loadStats();
  };

  const handleLogout = () => {
    clearAdminToken();
    setStats(null);
    setNeedAuth(true);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadCsv(slug);
    } catch (e: unknown) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        clearAdminToken();
        setNeedAuth(true);
        setStats(null);
      } else {
        setError(e instanceof Error ? e.message : "下载失败");
      }
    } finally {
      setDownloading(false);
    }
  };

  // ============================= 密码门 =============================
  if (needAuth) {
    return (
      <div className="min-h-full flex items-center justify-center px-5 py-10">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm animate-fade-in"
        >
          <div className="chapter-mark mb-6 justify-center">
            <span className="inline-block w-6 h-px bg-wine-600" />
            admin
            <span className="inline-block w-6 h-px bg-wine-600" />
          </div>
          <h2 className="font-serif text-title text-paper-900 text-center leading-[1.1]">
            后台登录
          </h2>
          <p className="mt-3 font-serif italic text-paper-600 text-center">
            — 请输入管理员密码查看统计
          </p>

          <div className="mt-10 space-y-4">
            <Input
              type="password"
              autoFocus
              placeholder="管理员密码"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoComplete="current-password"
            />
            {authError && (
              <p className="font-serif italic text-wine-600 text-sm">
                — {authError}
              </p>
            )}
            <Button type="submit" fullWidth disabled={!passwordInput.trim()}>
              <span>进入后台</span>
              <span aria-hidden>→</span>
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="chapter-mark text-paper-500 animate-fade-in">
          <span className="inline-block w-6 h-px bg-paper-400" />
          loading
          <span className="inline-block w-6 h-px bg-paper-400" />
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-full flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-in">
          <p className="chapter-mark text-wine-600 justify-center mb-4">
            <span className="inline-block w-6 h-px bg-wine-600" />
            error
          </p>
          <h2 className="font-serif text-title text-paper-900">加载失败</h2>
          <p className="mt-3 font-serif italic text-paper-600">— {error}</p>
          <Button variant="outline" onClick={loadStats} className="mt-8">
            <span>重试</span>
            <span aria-hidden>↻</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-10 py-10 sm:py-16">
      <header className="mb-12 sm:mb-16 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="chapter-mark">
            <span className="inline-block w-6 h-px bg-wine-600" />
            DASHBOARD
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="chapter-mark text-paper-500 hover:text-wine-600 transition-colors"
          >
            退出
          </button>
        </div>
        <h1 className="font-serif text-title text-paper-900 leading-[1.1] tracking-tight">
          {stats.survey_title}
        </h1>
        <div className="rule mt-8" />

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="chapter-mark text-paper-700 mb-2">
              <span className="inline-block w-4 h-0.5 bg-paper-600" />
              total responses
            </div>
            <div className="font-serif text-display text-paper-900 tabular-nums leading-none">
              {String(stats.total_responses).padStart(2, "0")}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={downloading}
            className="self-start sm:self-auto"
          >
            <span>{downloading ? "下载中…" : "导出 CSV"}</span>
            <span aria-hidden>↓</span>
          </Button>
        </div>
      </header>

      <div className="space-y-12 sm:space-y-16">
        {stats.questions.map((q, qi) => (
          <article key={q.question_id} className="animate-fade-in">
            <div className="chapter-mark mb-3">
              Question {String(qi + 1).padStart(2, "0")}
              <span className="ml-2 text-paper-700 not-italic">
                · {q.answered} 次作答
              </span>
            </div>
            <h3 className="font-serif text-question text-paper-900 leading-[1.25] tracking-tight mb-6">
              {q.text}
            </h3>

            {q.options && q.options.length > 0 && (
              <ul className="border-t border-paper-300">
                {q.options.map((o) => {
                  const total = q.answered || 1;
                  const pct = Math.round((o.count / total) * 100);
                  return (
                    <li
                      key={o.value}
                      className="border-b border-paper-300 py-4"
                    >
                      <div className="flex items-baseline justify-between gap-4 mb-2">
                        <span className="font-serif text-base sm:text-lg text-paper-900">
                          {o.text}
                        </span>
                        <span className="font-serif text-paper-700 tabular-nums text-sm">
                          <span className="text-paper-900 text-base font-medium">{o.count}</span>
                          <span className="mx-2 text-paper-500">/</span>
                          <span>{pct}%</span>
                        </span>
                      </div>
                      <div className="h-1 w-full bg-paper-300 overflow-hidden rounded-full">
                        <div
                          className="h-full bg-paper-900 transition-all duration-700 ease-out-expo rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {q.mean != null && (
              <div className="grid grid-cols-3 gap-px bg-paper-300 border-y border-paper-300">
                <div className="bg-paper-50 px-3 py-4 sm:px-5 sm:py-6">
                  <div className="chapter-mark text-paper-700 mb-2">
                    <span className="inline-block w-3 h-0.5 bg-paper-600" />
                    mean
                  </div>
                  <div className="font-serif text-2xl sm:text-4xl text-paper-900 tabular-nums">
                    {q.mean}
                  </div>
                </div>
                <div className="bg-paper-50 px-3 py-4 sm:px-5 sm:py-6">
                  <div className="chapter-mark text-paper-700 mb-2">
                    <span className="inline-block w-3 h-0.5 bg-paper-600" />
                    min
                  </div>
                  <div className="font-serif text-2xl sm:text-4xl text-paper-900 tabular-nums">
                    {q.min}
                  </div>
                </div>
                <div className="bg-paper-50 px-3 py-4 sm:px-5 sm:py-6">
                  <div className="chapter-mark text-paper-700 mb-2">
                    <span className="inline-block w-3 h-0.5 bg-paper-600" />
                    max
                  </div>
                  <div className="font-serif text-2xl sm:text-4xl text-paper-900 tabular-nums">
                    {q.max}
                  </div>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
