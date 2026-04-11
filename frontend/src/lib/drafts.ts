// 问卷作答草稿持久化
// 用于断点续填：用户刷新/关闭后仍能恢复未完成的答卷

import { getVisitorId } from "./visitor";

export type DraftAnswerState = {
  text?: string;
  number?: number | null;
  optionIds?: number[];
  singleOptionId?: number | null;
  date?: string;
};

export interface Draft {
  slug: string;
  visitorId: string;
  idx: number;
  answers: Record<number, DraftAnswerState>;
  updatedAt: number; // ms timestamp
}

const VERSION = 1;
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 天过期

function key(slug: string): string {
  return `survey_draft_v${VERSION}_${slug}_${getVisitorId()}`;
}

export function saveDraft(
  slug: string,
  idx: number,
  answers: Record<number, DraftAnswerState>
): void {
  try {
    // 空草稿不保存
    if (idx === 0 && Object.keys(answers).length === 0) {
      return;
    }
    const draft: Draft = {
      slug,
      visitorId: getVisitorId(),
      idx,
      answers,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key(slug), JSON.stringify(draft));
  } catch {
    // 配额超限 / 隐私模式 — 静默失败
  }
}

export function loadDraft(slug: string): Draft | null {
  try {
    const raw = localStorage.getItem(key(slug));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    // 过期清理
    if (Date.now() - draft.updatedAt > MAX_AGE_MS) {
      clearDraft(slug);
      return null;
    }
    // 完整性校验
    if (typeof draft.idx !== "number" || typeof draft.answers !== "object") {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(slug: string): void {
  try {
    localStorage.removeItem(key(slug));
  } catch {
    // ignore
  }
}

export function hasDraft(slug: string): boolean {
  return loadDraft(slug) !== null;
}
