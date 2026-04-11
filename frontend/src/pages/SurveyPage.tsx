import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import type { Survey } from "@/lib/types";
import { hasSubmitted } from "@/lib/visitor";
import { SurveyRunner } from "@/components/SurveyRunner";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function SurveyPage() {
  const { slug = "" } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getSurvey(slug)
      .then((data) => {
        if (cancelled) return;
        setSurvey(data);
        setAlreadySubmitted(hasSubmitted(slug));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 动态文档标题：增强 tab 可识别性
  useEffect(() => {
    if (!survey) return;
    const prev = document.title;
    document.title = `${survey.title} — 问卷调查`;
    return () => {
      document.title = prev;
    };
  }, [survey]);

  if (loading) {
    return <LoadingSkeleton variant="survey" />;
  }

  if (error || !survey) {
    return (
      <div className="min-h-full flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-in">
          <p className="chapter-mark text-wine-600 justify-center mb-4">
            <span className="inline-block w-6 h-px bg-wine-600" />
            error
          </p>
          <h2 className="font-serif text-title text-paper-900">无法加载问卷</h2>
          <p className="mt-3 font-serif text-paper-700">
            — {error ?? "未知错误"}
          </p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-full flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-in">
          <p className="chapter-mark text-paper-700 justify-center mb-4">
            <span className="inline-block w-6 h-0.5 bg-paper-500" />
            already submitted
          </p>
          <h2 className="font-serif text-title text-paper-900">您已提交过此问卷</h2>
          <p className="mt-3 font-serif text-paper-700">— 感谢您的参与。</p>
          <div className="mt-8">
            <Link to={`/s/${slug}/thanks`}>
              <Button variant="outline">查看完成页</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <SurveyRunner survey={survey} />;
}
