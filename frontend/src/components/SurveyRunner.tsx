import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AnswerPayload, Question, Survey } from "@/lib/types";
import { getVisitorId, markSubmitted } from "@/lib/visitor";
import { api } from "@/lib/api";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type DraftAnswerState,
} from "@/lib/drafts";
import { getVisibleQuestions } from "@/lib/skipLogic";
import { randomizeQuestionOptions } from "@/lib/randomize";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { SingleChoice } from "./questions/SingleChoice";
import { MultipleChoice } from "./questions/MultipleChoice";
import { TextShort } from "./questions/TextShort";
import { TextLong } from "./questions/TextLong";
import { Likert } from "./questions/Likert";
import { Rating } from "./questions/Rating";
import { NumberInput } from "./questions/NumberInput";
import { DateInput } from "./questions/DateInput";

interface Props {
  survey: Survey;
}

type AnswerState = DraftAnswerState;
type Phase = "welcome" | "questions";

function isAnswered(q: Question, state: AnswerState | undefined): boolean {
  if (!state) return false;
  switch (q.type) {
    case "single_choice":
      return state.singleOptionId != null;
    case "multiple_choice":
      return (state.optionIds?.length ?? 0) > 0;
    case "text_short":
    case "text_long":
      return (state.text ?? "").trim().length > 0;
    case "likert_5":
    case "rating_10":
    case "number":
      return state.number != null && !Number.isNaN(state.number);
    case "date":
      return (state.date ?? "").length > 0;
  }
}

function toPayload(q: Question, state: AnswerState): AnswerPayload {
  const base: AnswerPayload = { question_id: q.id };
  switch (q.type) {
    case "single_choice":
      return {
        ...base,
        selected_option_ids:
          state.singleOptionId != null ? [state.singleOptionId] : [],
      };
    case "multiple_choice":
      return { ...base, selected_option_ids: state.optionIds ?? [] };
    case "text_short":
    case "text_long":
      return { ...base, value_text: state.text ?? "" };
    case "likert_5":
    case "rating_10":
    case "number":
      return { ...base, value_number: state.number ?? null };
    case "date":
      return { ...base, value_text: state.date ?? "" };
  }
}

export function SurveyRunner({ survey }: Props) {
  const navigate = useNavigate();

  // 原始题目排序 + 选项随机化（在 survey 加载时 shuffle 一次，保持本次作答稳定）
  const questions = useMemo(
    () =>
      randomizeQuestionOptions(
        [...survey.questions].sort((a, b) => a.order - b.order)
      ),
    [survey]
  );

  // 初始化：检查是否有草稿
  const initialDraft = useMemo(() => loadDraft(survey.slug), [survey.slug]);

  const [phase, setPhase] = useState<Phase>("welcome");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0); // 触发 shake 动画重放
  const [direction, setDirection] = useState<"forward" | "backward" | "initial">(
    "initial"
  );

  // Skip Logic：根据当前答案过滤可见题目（show_if 条件未满足则隐藏）
  const visibleQuestions = useMemo(
    () => getVisibleQuestions(questions, answers),
    [questions, answers]
  );

  // 若当前 idx 因题目隐藏超出范围，钳制到末尾
  useEffect(() => {
    if (visibleQuestions.length === 0) return;
    if (idx > visibleQuestions.length - 1) {
      setIdx(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, idx]);

  const safeIdx = Math.min(idx, Math.max(0, visibleQuestions.length - 1));
  const current = visibleQuestions[safeIdx];
  const currentState = current ? answers[current.id] ?? {} : {};
  const answered = current ? isAnswered(current, currentState) : false;
  const canProceed = current?.required ? answered : true;
  const isLast = safeIdx === visibleQuestions.length - 1;

  // 草稿自动保存（防抖 500ms）
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== "questions") return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveDraft(survey.slug, idx, answers);
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [survey.slug, idx, answers, phase]);

  // 离开确认（仅在有答案且正在作答时）
  useEffect(() => {
    if (phase !== "questions") return;
    if (Object.keys(answers).length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, answers]);

  const updateState = useCallback(
    (patch: AnswerState) => {
      if (!current) return;
      setAnswers((prev) => ({
        ...prev,
        [current.id]: { ...prev[current.id], ...patch },
      }));
      setError(null);
    },
    [current]
  );

  const showError = useCallback((msg: string) => {
    setError(msg);
    setErrorKey((k) => k + 1);
  }, []);

  const goPrev = useCallback(() => {
    setError(null);
    if (safeIdx > 0) {
      setDirection("backward");
      setIdx(safeIdx - 1);
    }
  }, [safeIdx]);

  const goNext = useCallback(() => {
    if (!canProceed) {
      showError("这题对我们很重要，请先作答");
      return;
    }
    if (!isLast) {
      setDirection("forward");
      setIdx(safeIdx + 1);
    }
  }, [canProceed, isLast, safeIdx, showError]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return; // 防重复提交
    if (!canProceed) {
      showError("这题对我们很重要，请先作答");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 完整校验必答（仅校验可见题目）
      for (let i = 0; i < visibleQuestions.length; i++) {
        const q = visibleQuestions[i];
        if (q.required && !isAnswered(q, answers[q.id])) {
          showError(`第 ${i + 1} 题为必答题，请返回作答`);
          setIdx(i);
          setSubmitting(false);
          return;
        }
      }
      // 只提交可见且已作答的题目
      const payloadAnswers: AnswerPayload[] = visibleQuestions
        .filter((q) => isAnswered(q, answers[q.id]))
        .map((q) => toPayload(q, answers[q.id]!));

      await api.submitResponse(survey.slug, {
        visitor_id: getVisitorId(),
        answers: payloadAnswers,
      });
      markSubmitted(survey.slug);
      clearDraft(survey.slug);
      navigate(`/s/${survey.slug}/thanks`, { replace: true });
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "提交失败，请稍后重试");
      setSubmitting(false);
    }
  }, [submitting, canProceed, visibleQuestions, answers, survey.slug, navigate, showError]);

  // 键盘快捷键
  useEffect(() => {
    if (phase !== "questions") return;
    if (!current) return;

    const handler = (e: KeyboardEvent) => {
      // 在输入框内时，除 Enter 和 Esc 以外的快捷键禁用
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // textarea 内不处理 Enter（允许换行）
      if (e.key === "Enter") {
        if (target?.tagName === "TEXTAREA") return;
        if (e.shiftKey) {
          e.preventDefault();
          goPrev();
        } else {
          e.preventDefault();
          if (isLast) {
            handleSubmit();
          } else {
            goNext();
          }
        }
        return;
      }

      if (inField) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!isLast) goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (/^[1-9]$/.test(e.key)) {
        const num = parseInt(e.key, 10);
        // 数字键快选
        if (current.type === "single_choice") {
          const opt = current.options[num - 1];
          if (opt) updateState({ singleOptionId: opt.id });
        } else if (current.type === "multiple_choice") {
          const opt = current.options[num - 1];
          if (opt) {
            const cur = answers[current.id]?.optionIds ?? [];
            const next = cur.includes(opt.id)
              ? cur.filter((id) => id !== opt.id)
              : [...cur, opt.id];
            updateState({ optionIds: next });
          }
        } else if (current.type === "likert_5" && num >= 1 && num <= 5) {
          updateState({ number: num });
        } else if (current.type === "rating_10" && num >= 0 && num <= 9) {
          updateState({ number: num });
        }
      } else if (e.key === "0" && current.type === "rating_10") {
        updateState({ number: 0 });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, current, answers, isLast, goPrev, goNext, handleSubmit, updateState]);

  // Welcome 开始
  const handleStart = useCallback(() => {
    setPhase("questions");
    setIdx(0);
    setAnswers({});
    setDirection("initial");
  }, []);

  // Welcome 继续（从草稿恢复）
  const handleResume = useCallback(() => {
    if (initialDraft) {
      setAnswers(initialDraft.answers);
      setIdx(Math.min(initialDraft.idx, questions.length - 1));
    }
    setPhase("questions");
    setDirection("initial");
  }, [initialDraft, questions.length]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft(survey.slug);
    setPhase("questions");
    setIdx(0);
    setAnswers({});
    setDirection("initial");
  }, [survey.slug]);

  // Welcome 页面键盘快捷键：Enter = 开始/继续
  useEffect(() => {
    if (phase !== "welcome") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (initialDraft) {
          handleResume();
        } else {
          handleStart();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, initialDraft, handleStart, handleResume]);

  // ---------- 渲染 ----------

  if (phase === "welcome") {
    return (
      <WelcomeScreen
        survey={survey}
        hasDraft={!!initialDraft}
        onStart={handleStart}
        onResume={handleResume}
        onDiscardDraft={handleDiscardDraft}
      />
    );
  }

  // 防御：如果所有题目都因 skip logic 被隐藏，极端情况
  if (!current) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-10 py-20 text-center animate-fade-in">
        <p className="chapter-mark text-paper-700 justify-center">
          <span className="inline-block w-6 h-0.5 bg-paper-500" />
          no questions visible
        </p>
        <p className="mt-6 font-serif text-paper-800">暂无需要作答的题目。</p>
      </div>
    );
  }

  const renderQuestion = (q: Question) => {
    const s = answers[q.id] ?? {};
    switch (q.type) {
      case "single_choice":
        return (
          <SingleChoice
            question={q}
            value={s.singleOptionId ?? null}
            onChange={(id) => updateState({ singleOptionId: id })}
          />
        );
      case "multiple_choice":
        return (
          <MultipleChoice
            question={q}
            value={s.optionIds ?? []}
            onChange={(ids) => updateState({ optionIds: ids })}
          />
        );
      case "text_short":
        return (
          <TextShort
            question={q}
            value={s.text ?? ""}
            onChange={(v) => updateState({ text: v })}
          />
        );
      case "text_long":
        return (
          <TextLong
            question={q}
            value={s.text ?? ""}
            onChange={(v) => updateState({ text: v })}
          />
        );
      case "likert_5":
        return (
          <Likert
            question={q}
            value={s.number ?? null}
            onChange={(v) => updateState({ number: v })}
          />
        );
      case "rating_10":
        return (
          <Rating
            question={q}
            value={s.number ?? null}
            onChange={(v) => updateState({ number: v })}
          />
        );
      case "number":
        return (
          <NumberInput
            question={q}
            value={s.number ?? null}
            onChange={(v) => updateState({ number: v })}
          />
        );
      case "date":
        return (
          <DateInput
            value={s.date ?? ""}
            onChange={(v) => updateState({ date: v })}
          />
        );
    }
  };

  const animClass =
    direction === "forward"
      ? "animate-slide-in-left"
      : direction === "backward"
      ? "animate-slide-in-right"
      : "animate-slide-up";

  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-10 pt-6 sm:pt-16 pb-28 sm:pb-16">
      {/* 顶部品牌标识 —— 移动端隐藏，标题交给 document.title */}
      <header className="hidden sm:block mb-14 animate-fade-in">
        <div className="chapter-mark mb-6">
          <span className="inline-block w-6 h-0.5 bg-wine-600" />
          {survey.title}
        </div>
      </header>

      {/* 进度 */}
      <ProgressBar current={safeIdx} total={visibleQuestions.length} />

      {/* 题目区 */}
      <div className="mt-6 sm:mt-16">
        <article key={`${current.id}-${direction}`} className={animClass}>
          <div className="mb-6 sm:mb-10">
            <div className="chapter-mark mb-4 text-paper-700">
              <span className="text-wine-600">
                Question {String(safeIdx + 1).padStart(2, "0")}
              </span>
              {current.required && (
                <span className="ml-2 text-wine-600">· 必答</span>
              )}
            </div>
            <h2 className="font-serif text-question text-paper-900 leading-[1.2] tracking-tight">
              {current.text}
            </h2>
          </div>

          <div className="mt-6 sm:mt-8">{renderQuestion(current)}</div>

          {error && (
            <p
              key={errorKey}
              className="mt-6 font-sans text-wine-600 text-sm font-medium flex items-center gap-2 animate-shake"
              role="alert"
              aria-live="assertive"
            >
              <span className="inline-block w-4 h-0.5 bg-wine-600" />
              {error}
            </p>
          )}
        </article>
      </div>

      {/* 导航 ——
          移动端：fixed 底部毛玻璃操作栏（拇指区）
          桌面端：在内容流中静态布局 */}
      <nav
        aria-label="问卷导航"
        className="
          fixed sm:static bottom-0 left-0 right-0 z-20
          sm:mt-16
          bg-paper-200/92 sm:bg-transparent
          backdrop-blur-md sm:backdrop-blur-none
          border-t border-paper-300 sm:border-0
          shadow-[0_-8px_24px_-14px_rgba(26,23,20,0.18)] sm:shadow-none
          px-5 py-3 sm:p-0
        "
      >
        <div className="mx-auto max-w-3xl flex flex-row items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={safeIdx === 0 || submitting}
            aria-label="上一题"
          >
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">上一题</span>
          </Button>
          {!isLast ? (
            <Button
              variant="primary"
              fullWidth
              onClick={goNext}
              disabled={submitting}
            >
              <span>继续</span>
              <span aria-hidden>→</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              loading={submitting}
              disabled={submitting}
            >
              {submitting ? "提交中…" : "提交问卷"}
            </Button>
          )}
        </div>
      </nav>

      {/* 键盘快捷键提示（仅桌面） */}
      <p className="hidden sm:flex mt-6 chapter-mark text-paper-600 justify-center">
        <kbd className="px-1.5 py-0.5 bg-paper-100 border border-paper-300 rounded text-[11px] text-paper-800 font-sans tracking-normal normal-case">
          Enter
        </kbd>
        <span className="-ml-1">继续</span>
        <span className="mx-2 text-paper-400">·</span>
        <kbd className="px-1.5 py-0.5 bg-paper-100 border border-paper-300 rounded text-[11px] text-paper-800 font-sans tracking-normal normal-case">
          ←
        </kbd>
        <kbd className="-ml-1 px-1.5 py-0.5 bg-paper-100 border border-paper-300 rounded text-[11px] text-paper-800 font-sans tracking-normal normal-case">
          →
        </kbd>
        <span className="-ml-1">切换题目</span>
        <span className="mx-2 text-paper-400">·</span>
        <kbd className="px-1.5 py-0.5 bg-paper-100 border border-paper-300 rounded text-[11px] text-paper-800 font-sans tracking-normal normal-case">
          1-9
        </kbd>
        <span className="-ml-1">快选</span>
      </p>

      <footer className="hidden sm:block mt-20 pt-8 border-t border-paper-300">
        <p className="chapter-mark justify-center text-center text-paper-600">
          <span className="inline-block w-6 h-0.5 bg-paper-500" />
          作答已自动保存 · 完全匿名
          <span className="inline-block w-6 h-0.5 bg-paper-500" />
        </p>
      </footer>
    </div>
  );
}
