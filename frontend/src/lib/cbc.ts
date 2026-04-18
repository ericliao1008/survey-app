// CBC（联合分析）方案生成：同一 visitor + 同一 task_index 稳定返回同一组方案。
//
// 使用 visitor_id 和 task_index 做 seed，保证用户刷新页面后看到的方案一致，
// 但不同用户/不同题目之间是"随机"的。简化的属性水平均匀抽样（非正交设计）。

import type { CBCProfile } from "./types";

export interface CBCAttribute {
  key: string;
  label: string;
  levels: { value: string; label: string }[];
}

// Mulberry32 PRNG，32-bit seed → float in [0,1)
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

// 字符串 → 32-bit 哈希（djb2）
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * 为单道 CBC 题目生成 3 个方案。
 * 约束：同一道题内 3 个方案不完全相同（尽量避免属性全部一致）。
 */
export function generateCBCProfiles(
  attributes: CBCAttribute[],
  visitorId: string,
  taskIndex: number
): CBCProfile[] {
  const seed = hashString(`${visitorId}:cbc:${taskIndex}`);
  const rand = mulberry32(seed);
  const profiles: CBCProfile[] = [];
  const seen = new Set<string>();

  for (let p = 0; p < 3; p++) {
    let profile: CBCProfile = {};
    let tries = 0;
    do {
      profile = {};
      for (const attr of attributes) {
        const lvl = attr.levels[Math.floor(rand() * attr.levels.length)];
        profile[attr.key] = lvl.value;
      }
      tries++;
    } while (seen.has(JSON.stringify(profile)) && tries < 20);
    seen.add(JSON.stringify(profile));
    profiles.push(profile);
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
