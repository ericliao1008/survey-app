import type { Question, Survey } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface Props {
  survey: Survey;
  hasDraft: boolean;
  onStart: () => void;
  onResume: () => void;
  onDiscardDraft: () => void;
}

// 简易时长估算：按题型加权平均
const WEIGHTS: Record<Question["type"], number> = {
  text_long: 60,
  text_short: 20,
  number: 15,
  date: 10,
  single_choice: 10,
  multiple_choice: 12,
  likert_5: 8,
  rating_10: 8,
};

function estimateMinutes(questions: Question[]): number {
  const seconds = questions.reduce((sum, q) => sum + (WEIGHTS[q.type] ?? 12), 0);
  return Math.max(1, Math.round(seconds / 60));
}

export function WelcomeScreen({
  survey,
  hasDraft,
  onStart,
  onResume,
  onDiscardDraft,
}: Props) {
  const minutes = estimateMinutes(survey.questions);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-10 py-10 sm:py-20">
      <div className="animate-fade-in">
        <div className="chapter-mark mb-8">
          <span className="inline-block w-6 h-0.5 bg-wine-600" />
          A QUESTIONNAIRE
        </div>

        <h1 className="font-serif text-display text-paper-900 leading-[1.05] tracking-tight">
          {survey.title}
        </h1>

        {survey.description && (
          <p className="mt-6 max-w-xl font-serif text-lg sm:text-xl text-paper-800 leading-relaxed">
            {survey.description}
          </p>
        )}

        <div className="rule mt-10 sm:mt-12" />

        {/* Meta 信息网格 */}
        <dl className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
          <div>
            <dt className="chapter-mark text-paper-700 mb-2">
              <span className="inline-block w-3 h-0.5 bg-paper-600" />
              预估时长
            </dt>
            <dd className="font-serif text-3xl sm:text-4xl text-paper-900 tabular-nums">
              {minutes}
              <span className="ml-1 text-lg text-paper-700">分钟</span>
            </dd>
          </div>
          <div>
            <dt className="chapter-mark text-paper-700 mb-2">
              <span className="inline-block w-3 h-0.5 bg-paper-600" />
              题目数量
            </dt>
            <dd className="font-serif text-3xl sm:text-4xl text-paper-900 tabular-nums">
              {String(survey.questions.length).padStart(2, "0")}
              <span className="ml-1 text-lg text-paper-700">题</span>
            </dd>
          </div>
          <div>
            <dt className="chapter-mark text-paper-700 mb-2">
              <span className="inline-block w-3 h-0.5 bg-paper-600" />
              隐私
            </dt>
            <dd className="font-serif text-xl sm:text-2xl text-paper-900 leading-snug">
              完全匿名
            </dd>
          </div>
        </dl>

        <div className="rule mt-10 sm:mt-12" />

        {/* 承诺/说明 */}
        <div className="mt-10 sm:mt-12 max-w-xl space-y-3 font-serif text-base sm:text-lg text-paper-800 leading-relaxed">
          <p>
            <span className="text-wine-600 mr-2">—</span>
            您的作答将被匿名保存，不会关联到任何可识别的身份信息。
          </p>
          <p>
            <span className="text-wine-600 mr-2">—</span>
            您可以随时暂停。作答进度会自动保存在本机浏览器中。
          </p>
          <p>
            <span className="text-wine-600 mr-2">—</span>
            完成全部题目后可以提交。每位访客仅可提交一次。
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="mt-12 sm:mt-16">
          {hasDraft ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-3 bg-wine-50 border border-wine-100 rounded-full">
                <span className="inline-block w-2 h-2 rounded-full bg-wine-600" />
                <span className="font-sans text-sm text-wine-700">
                  检测到上次的作答草稿
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button variant="primary" onClick={onResume}>
                  <span>继续上次作答</span>
                  <span aria-hidden>→</span>
                </Button>
                <Button variant="outline" onClick={onDiscardDraft}>
                  重新开始
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="primary" onClick={onStart}>
              <span>开始作答</span>
              <span aria-hidden>→</span>
            </Button>
          )}
        </div>

        <p className="mt-16 sm:mt-20 chapter-mark text-paper-600 hidden sm:inline-flex">
          <span className="inline-block w-6 h-0.5 bg-paper-500" />
          press <kbd className="mx-1 px-1.5 py-0.5 bg-paper-100 border border-paper-300 rounded text-[11px] text-paper-800 font-sans tracking-normal normal-case">Enter</kbd> to begin
        </p>
      </div>
    </div>
  );
}
