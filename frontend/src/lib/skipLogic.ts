// Skip Logic 条件评估引擎
// 支持 question.config.show_if，格式：
// {
//   "show_if": {
//     "question_order": 0,          // 引用的题目 order (0-based)
//     "operator": "equals" | "not_equals" | "includes" | "not_includes" | "gte" | "lte",
//     "value": "option_value" | 5   // 对于 choice 题用 Option.value，数值题用 number
//   }
// }

import type { Question } from "./types";
import type { DraftAnswerState } from "./drafts";

type Operator =
  | "equals"
  | "not_equals"
  | "includes"
  | "not_includes"
  | "gte"
  | "lte";

interface ShowIfCondition {
  question_order: number;
  operator: Operator;
  value: string | number;
}

function isShowIfCondition(x: unknown): x is ShowIfCondition {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.question_order === "number" &&
    typeof o.operator === "string" &&
    (typeof o.value === "string" || typeof o.value === "number")
  );
}

/**
 * 判断单个条件是否满足。
 * 找不到引用题/引用题未作答时返回 false（默认隐藏）。
 */
function evaluateCondition(
  cond: ShowIfCondition,
  allQuestions: Question[],
  answers: Record<number, DraftAnswerState>
): boolean {
  const refQ = allQuestions[cond.question_order];
  if (!refQ) return false;
  const a = answers[refQ.id];
  if (!a) return false;

  switch (cond.operator) {
    case "equals":
    case "not_equals": {
      let matched = false;
      if (refQ.type === "single_choice") {
        const opt = refQ.options.find((o) => o.id === a.singleOptionId);
        matched = opt?.value === String(cond.value);
      } else if (
        refQ.type === "likert_5" ||
        refQ.type === "rating_10" ||
        refQ.type === "number"
      ) {
        matched = a.number === Number(cond.value);
      } else if (refQ.type === "text_short" || refQ.type === "text_long") {
        matched = (a.text ?? "").trim() === String(cond.value);
      } else if (refQ.type === "date") {
        matched = (a.date ?? "") === String(cond.value);
      }
      return cond.operator === "equals" ? matched : !matched;
    }

    case "includes":
    case "not_includes": {
      let matched = false;
      if (refQ.type === "multiple_choice") {
        const ids = a.optionIds ?? [];
        matched = ids.some((id) => {
          const opt = refQ.options.find((o) => o.id === id);
          return opt?.value === String(cond.value);
        });
      } else if (refQ.type === "text_short" || refQ.type === "text_long") {
        matched = (a.text ?? "").includes(String(cond.value));
      }
      return cond.operator === "includes" ? matched : !matched;
    }

    case "gte":
      return (a.number ?? Number.NEGATIVE_INFINITY) >= Number(cond.value);
    case "lte":
      return (a.number ?? Number.POSITIVE_INFINITY) <= Number(cond.value);

    default:
      return true;
  }
}

/**
 * 根据当前作答过滤出可见题目。
 * 对没有 show_if 的题目总是可见。
 */
export function getVisibleQuestions(
  allQuestions: Question[],
  answers: Record<number, DraftAnswerState>
): Question[] {
  return allQuestions.filter((q) => {
    const showIf = (q.config as Record<string, unknown> | null | undefined)
      ?.show_if;
    if (!showIf) return true;
    if (!isShowIfCondition(showIf)) return true;
    return evaluateCondition(showIf, allQuestions, answers);
  });
}
