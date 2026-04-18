// CBC（联合分析）方案生成：同一 visitor + 同一 task_index 稳定返回同一组方案。
//
// 设计约束（防止乱选 & 脏数据）：
// 1. 同一 visitor + 同一 task_index 用 seed 保证刷新一致
// 2. 同一题的 3 个方案在第一属性（通常是 origin 品牌来源）上**至少覆盖 2 种品牌，优先 3 种**
// 3. 避免"dominant 方案"：若某方案在所有属性上都不劣于另一方案，则重新抽样
// 4. 各属性水平在 3 个方案间分布尽量均衡（内层 Fisher-Yates shuffle 于每一属性）

import type { CBCProfile } from "./types";

export interface CBCAttribute {
  key: string;
  label: string;
  levels: { value: string; label: string }[];
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 判断 a 是否在所有属性上都等于或优于 b（用于 dominant 检测）
// 我们没有"优劣"排序信息，所以改为：检查是否有两方案完全相同（真 dominant 难以界定）。
function hasDuplicateProfile(profiles: CBCProfile[]): boolean {
  const seen = new Set<string>();
  for (const p of profiles) {
    const k = JSON.stringify(p);
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

// 主属性（默认第一个，通常是 origin 品牌来源）的覆盖度：至少 2 种，优先 3 种
function brandCoverage(
  profiles: CBCProfile[],
  primaryKey: string
): number {
  const set = new Set<string>();
  for (const p of profiles) set.add(p[primaryKey]);
  return set.size;
}

/**
 * 为单道 CBC 题目生成 3 个方案。
 * 约束：
 *  - 主属性（origin）覆盖 ≥ 2 种（优先 3 种）
 *  - 无重复方案
 *  - 其他属性水平内部 shuffle 以尽量覆盖全部 level
 */
export function generateCBCProfiles(
  attributes: CBCAttribute[],
  visitorId: string,
  taskIndex: number
): CBCProfile[] {
  if (attributes.length === 0) {
    return [{}, {}, {}];
  }
  const seed = hashString(`${visitorId}:cbc:${taskIndex}`);
  const rand = mulberry32(seed);
  const primaryKey = attributes[0].key; // 通常是 origin

  // 主属性：优先每个 profile 一种不同品牌；若只有 2 种品牌重复其中一个
  const primaryLevels = attributes[0].levels;
  const primarySlots: string[] = (() => {
    if (primaryLevels.length >= 3) {
      return shuffleInPlace(primaryLevels.map((l) => l.value), rand).slice(0, 3);
    }
    if (primaryLevels.length === 2) {
      // A B + 随机再来一个（让 2 种品牌都出现，第 3 个随机）
      const vals = [primaryLevels[0].value, primaryLevels[1].value];
      vals.push(primaryLevels[Math.floor(rand() * 2)].value);
      return shuffleInPlace(vals, rand);
    }
    return primaryLevels.map((l) => l.value).concat(Array(3).fill(primaryLevels[0]?.value ?? "")).slice(0, 3);
  })();

  // 其他属性：为每属性在 3 个方案之间做 shuffle（允许重复，但尽量均衡）
  const perAttrSlots: Record<string, string[]> = {};
  for (let i = 1; i < attributes.length; i++) {
    const attr = attributes[i];
    const levels = attr.levels.map((l) => l.value);
    let slots: string[];
    if (levels.length >= 3) {
      slots = shuffleInPlace([...levels], rand).slice(0, 3);
    } else {
      // 少于 3 个水平：重复补齐并打乱
      slots = [];
      for (let j = 0; j < 3; j++) slots.push(levels[j % levels.length]);
      shuffleInPlace(slots, rand);
    }
    perAttrSlots[attr.key] = slots;
  }

  // 组装 3 个 profile
  const assemble = (): CBCProfile[] => {
    const out: CBCProfile[] = [];
    for (let p = 0; p < 3; p++) {
      const prof: CBCProfile = { [primaryKey]: primarySlots[p] };
      for (const key of Object.keys(perAttrSlots)) {
        prof[key] = perAttrSlots[key][p];
      }
      out.push(prof);
    }
    return out;
  };

  let profiles = assemble();
  // 如果出现重复方案，重洗一次其他属性
  let retries = 0;
  while (hasDuplicateProfile(profiles) && retries < 10) {
    for (const key of Object.keys(perAttrSlots)) {
      shuffleInPlace(perAttrSlots[key], rand);
    }
    profiles = assemble();
    retries++;
  }

  // 校验品牌覆盖（期望至少 2 种，主属性 slots 构造时已保证）
  // 以防极端情况下失败，兜底一次 shuffle
  if (brandCoverage(profiles, primaryKey) < 2 && primaryLevels.length >= 2) {
    primarySlots[2] = primaryLevels.find((l) => l.value !== primarySlots[0])?.value ?? primarySlots[2];
    profiles = assemble();
  }

  return profiles;
}

/** 把 profile 的 value 转回 label 做展示。 */
export function profileLevelLabel(
  profile: CBCProfile,
  attr: CBCAttribute
): string {
  const v = profile[attr.key];
  const lvl = attr.levels.find((l) => l.value === v);
  return lvl?.label ?? v ?? "";
}
