import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  AnswerPayload,
  MatrixAnswer,
  Question,
  QuestionInstance,
  Survey,
} from "@/lib/types";
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
import { TerminationScreen } from "@/components/TerminationScreen";
import { SingleChoice } from "./questions/SingleChoice";
import { MultipleChoice } from "./questions/MultipleChoice";
import { TextShort } from "./questions/TextShort";
import { TextLong } from "./questions/TextLong";
import { Likert } from "./questions/Likert";
import { Rating } from "./questions/Rating";
import { NumberInput } from "./questions/NumberInput";
import { DateInput } from "./questions/DateInput";
import {
  MatrixLikert,
  isMatrixLikertAnswered,
} from "./questions/MatrixLikert";
import {
  MatrixSingle,
  isMatrixSingleAnswered,
} from "./questions/MatrixSingle";
import { CBCTask, isCBCAnswered } from "./questions/CBCTask";

interface Props {
  survey: Survey;
}

type AnswerState = DraftAnswerState;
type Phase = "welcome" | "questions" | "terminated";

// ------------------------------------------------------------------
// 工具：是否已作答 / 转 payload
// ------------------------------------------------------------------
function isAnswered(q: Question, state: AnswerState | undefined): boolean {
  if (!state) return false;
  switch (q.type) {
    case "single_choice":
      return state.singleOptionId != null;
    case "multiple_choice": {
      const ids = state.optionIds ?? [];
      if (ids.length === 0) return false;
      const cfg = (q.config ?? {}) as { max_select?: number; min_select?: number };
      if (cfg.min_select && ids.length < cfg.min_select) return false;
      return true;
    }
    case "text_short":
    case "text_long":
      return (state.text ?? "").trim().length > 0;
    case "likert_5":
    case "rating_10":
    case "number":
      return state.number != null && !Number.isNaN(state.number);
    case "date":
      return (state.date ?? "").length > 0;
    case "matrix_likert":
      return isMatrixLikertAnswered(q, state.matrix);
    case "matrix_single":
      return isMatrixSingleAnswered(q, state.matrix);
    case "cbc_task":
      return isCBCAnswered(state.cbc);
  }
}

// 把 optionTexts（key=option_id）转换成以 option.value 为键的 dict，便于后端存储/导出
function buildOptionTextsMap(
  q: Question,
  state: AnswerState,
  relevantIds: number[]
): Record<string, string> | null {
  const ot = state.optionTexts;
  if (!ot) return null;
  const result: Record<string, string> = {};
  for (const oid of relevantIds) {
    const t = ot[oid];
    if (typeof t === "string" && t.trim().length > 0) {
      const opt = q.options.find((o) => o.id === oid);
      if (opt) result[opt.value] = t.trim();
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function toPayload(
  instance: QuestionInstance,
  state: AnswerState
): AnswerPayload {
  const q = instance.question;
  const base: AnswerPayload = {
    question_id: q.id,
    pipe_option_id: instance.pipeOption?.id ?? null,
  };
  switch (q.type) {
    case "single_choice": {
      const selId = state.singleOptionId;
      const ids = selId != null ? [selId] : [];
      const texts = buildOptionTextsMap(q, state, ids);
      return {
        ...base,
        selected_option_ids: ids,
        value_json: texts ? { option_texts: texts } : null,
      };
    }
    case "multiple_choice": {
      const ids = state.optionIds ?? [];
      const texts = buildOptionTextsMap(q, state, ids);
      return {
        ...base,
        selected_option_ids: ids,
        value_json: texts ? { option_texts: texts } : null,
      };
    }
    case "text_short":
    case "text_long":
      return { ...base, value_text: state.text ?? "" };
    case "likert_5":
    case "rating_10":
    case "number":
      return { ...base, value_number: state.number ?? null };
    case "date":
      return { ...base, value_text: state.date ?? "" };
    case "matrix_likert":
    case "matrix_single":
      return {
        ...base,
        value_json: (state.matrix ?? {}) as unknown as Record<string, unknown>,
      };
    case "cbc_task":
      return {
        ...base,
        value_json: (state.cbc ?? {}) as unknown as Record<string, unknown>,
      };
  }
}

// 判断 single_choice 当前答案是否触发终止
function answerTerminates(q: Question, state: AnswerState | undefined): boolean {
  if (q.type !== "single_choice") return false;
  if (!state || state.singleOptionId == null) return false;
  const cfg = (q.config ?? {}) as { terminate_on_values?: string[] };
  const terminators = cfg.terminate_on_values;
  if (!terminators || terminators.length === 0) return false;
  const opt = q.options.find((o) => o.id === state.singleOptionId);
  return !!opt && terminators.includes(opt.value);
}

// 把 {pipe} 占位符替换为 pipeOption.text
function renderQuestionText(inst: QuestionInstance): string {
  if (!inst.pipeOption) return inst.question.text;
  return inst.question.text.replace(/\{pipe\}/g, inst.pipeOption.text);
}

// 把可见题目展开为题目实例（pipe 题按源题选中项展开）
function expandInstances(
  visible: Question[],
  answers: Record<string, AnswerState>
): QuestionInstance[] {
  const out: QuestionInstance[] = [];
  for (const q of visible) {
    const cfg = (q.config ?? {}) as {
      pipe_from?: { question_order: number };
    };
    const pf = cfg.pipe_from;
    if (pf && typeof pf.question_order === "number") {
      const srcQ = visible.find((v) => v.order === pf.question_order);
      if (!srcQ) continue;
      const srcState = answers[String(srcQ.id)];
      const selectedIds = srcState?.optionIds ?? [];
      for (const optId of selectedIds) {
        const opt = srcQ.options.find((o) => o.id === optId);
        if (opt) {
          out.push({ key: `${q.id}:${opt.id}`, question: q, pipeOption: opt });
        }
      }
    } else {
      out.push({ key: String(q.id), question: q, pipeOption: null });
    }
  }
  return out;
}

// ------------------------------------------------------------------
// SurveyRunner
// ------------------------------------------------------------------
export function SurveyRunner({ survey }: Props) {
  const navigate = useNavigate();

  const questions = useMemo(
    () =>
      randomizeQuestionOptions(
        [...survey.questions].sort((a, b) => a.order - b.order)
      ),
    [survey]
  );

  const initialDraft = useMemo(() => loadDraft(survey.slug), [survey.slug]);

  const [phase, setPhase] = useState<Phase>("welcome");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward" | "initial">(
    "initial"
  );

  // 可见题目（skip logic 过滤）
  const visibleQuestions = useMemo(
    () => getVisibleQuestions(questions, answers),
    [questions, answers]
  );

  // 展开 pipe 实例
  const instances = useMemo(
    () => expandInstances(visibleQuestions, answers),
    [visibleQuestions, answers]
  );

  useEffect(() => {
    if (instances.length === 0) return;
    if (idx > instances.length - 1) {
      setIdx(instances.length - 1);
    }
  }, [instances.length, idx]);

  const safeIdx = Math.min(idx, Math.max(0, instances.length - 1));
  const current = instances[safeIdx];
  const currentState = current ? answers[current.key] ?? {} : {};
  const answered = current
    ? isAnswered(current.question, currentState)
    : false;
  const canProceed = current?.question.required ? answered : true;
  const isLast = safeIdx === instances.length - 1;

  // 当前是否触发终止
  const currentTerminates = current
    ? answerTerminates(current.question, currentState)
    : false;

  // 草稿自动保存（500ms 防抖）
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

  // 离开确认
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
        [current.key]: { ...prev[current.key], ...patch },
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
    // 当前题触发终止：进入终止页
    if (currentTerminates) {
      setPhase("terminated");
      clearDraft(survey.slug);
      return;
    }
    if (!isLast) {
      setDirection("forward");
      setIdx(safeIdx + 1);
    }
  }, [canProceed, currentTerminates, isLast, safeIdx, showError, survey.slug]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!canProceed) {
      showError("这题对我们很重要，请先作答");
      return;
    }
    // 终止检查（最后一题也可能触发）
    if (currentTerminates) {
      setPhase("terminated");
      clearDraft(survey.slug);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        if (inst.question.required && !isAnswered(inst.question, answers[inst.key])) {
          showError(`第 ${i + 1} 题为必答题，请返回作答`);
          setIdx(i);
          setSubmitting(false);
          return;
        }
      }
      const payloadAnswers: AnswerPayload[] = instances
        .filter((inst) => isAnswered(inst.question, answers[inst.key]))
        .map((inst) => toPayload(inst, answers[inst.key]!));

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
  }, [
    submitting,
    canProceed,
    currentTerminates,
    instances,
    answers,
    survey.slug,
    navigate,
    showError,
  ]);

  // 键盘快捷键
  useEffect(() => {
    if (phase !== "questions") return;
    if (!current) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

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
        const q = current.question;
        if (q.type === "single_choice") {
          const opt = q.options[num - 1];
          if (opt) updateState({ singleOptionId: opt.id });
        } else if (q.type === "multiple_choice") {
          const opt = q.options[num - 1];
          if (opt) {
            const cur = answers[current.key]?.optionIds ?? [];
            const next = cur.includes(opt.id)
              ? cur.filter((id) => id !== opt.id)
              : [...cur, opt.id];
            const cfg = (q.config ?? {}) as { max_select?: number };
            if (cfg.max_select && next.length > cfg.max_select) return;
            updateState({ optionIds: next });
          }
        } else if (q.type === "likert_5" && num >= 1 && num <= 5) {
          updateState({ number: num });
        } else if (q.type === "rating_10" && num >= 0 && num <= 9) {
          updateState({ number: num });
        }
      } else if (e.key === "0" && current.question.type === "rating_10") {
        updateState({ number: 0 });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, current, answers, isLast, goPrev, goNext, handleSubmit, updateState]);

  const handleStart = useCallback(() => {
    setPhase("questions");
    setIdx(0);
    setAnswers({});
    setDirection("initial");
  }, []);

  const handleResume = useCallback(() => {
    if (initialDraft) {
      setAnswers(initialDraft.answers as Record<string, AnswerState>);
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

  if (phase === "terminated") {
    const cfg = (current?.question.config ?? {}) as {
      terminate_message?: string;
    };
    return (
      <TerminationScreen
        message={cfg.terminate_message}
        onRestart={handleDiscardDraft}
      />
    );
  }

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

  const renderQuestion = (inst: QuestionInstance) => {
    const q = inst.question;
    const s = answers[inst.key] ?? {};
    switch (q.type) {
      case "single_choice":
        return (
          <SingleChoice
            question={q}
            value={s.singleOptionId ?? null}
            onChange={(id) => updateState({ singleOptionId: id })}
            optionTexts={s.optionTexts}
            onOptionTextChange={(oid, t) =>
              updateState({
                optionTexts: { ...(s.optionTexts ?? {}), [oid]: t },
              })
            }
          />
        );
      case "multiple_choice":
        return (
          <MultipleChoice
            question={q}
            value={s.optionIds ?? []}
            onChange={(ids) => updateState({ optionIds: ids })}
            optionTexts={s.optionTexts}
            onOptionTextChange={(oid, t) =>
              updateState({
                optionTexts: { ...(s.optionTexts ?? {}), [oid]: t },
              })
            }
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
      case "matrix_likert":
        return (
          <MatrixLikert
            question={q}
            value={(s.matrix ?? {}) as MatrixAnswer}
            onChange={(m) => updateState({ matrix: m })}
          />
        );
      case "matrix_single":
        return (
          <MatrixSingle
            question={q}
            value={(s.matrix ?? {}) as MatrixAnswer}
            onChange={(m) => updateState({ matrix: m })}
          />
        );
      case "cbc_task":
        return (
          <CBCTask
            question={q}
            value={s.cbc}
            onChange={(c) => updateState({ cbc: c })}
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

  const questionText = renderQuestionText(current);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-10 pt-6 sm:pt-16 pb-28 sm:pb-16">
      <header className="hidden sm:block mb-14 animate-fade-in">
        <div className="chapter-mark mb-6">
          <span className="inline-block w-6 h-0.5 bg-wine-600" />
          {survey.title}
        </div>
      </header>

      <ProgressBar current={safeIdx} total={instances.length} />

      <div className="mt-6 sm:mt-16">
        <article key={`${current.key}-${direction}`} className={animClass}>
          <div className="mb-6 sm:mb-10">
            <div className="chapter-mark mb-4 text-paper-700">
              <span className="text-wine-600">
                Question {String(safeIdx + 1).padStart(2, "0")}
              </span>
              {current.question.required && (
                <span className="ml-2 text-wine-600">· 必答</span>
              )}
              {current.pipeOption && (
                <span className="ml-2 text-paper-600">
                  · {current.pipeOption.text}
                </span>
              )}
            </div>
            <h2 className="font-serif text-question text-paper-900 leading-[1.2] tracking-tight">
              {questionText}
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
              <span>{currentTerminates ? "结束问卷" : "继续"}</span>
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
              {submitting ? "提交中…" : currentTerminates ? "结束问卷" : "提交问卷"}
            </Button>
          )}
        </div>
      </nav>

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
