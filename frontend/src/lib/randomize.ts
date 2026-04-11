// Fisher-Yates 洗牌，用于选项随机化以消除首位偏好 (primacy effect)
// 题目 config.randomize_options = true 时启用

import type { Question } from "./types";

export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 对需要随机化的题目 shuffle 其选项，返回新数组。
 * 不影响不需要随机化的题目。
 */
export function randomizeQuestionOptions(questions: Question[]): Question[] {
  return questions.map((q) => {
    const cfg = q.config as Record<string, unknown> | null | undefined;
    if (cfg?.randomize_options === true && q.options.length > 1) {
      return { ...q, options: shuffle(q.options) };
    }
    return q;
  });
}
