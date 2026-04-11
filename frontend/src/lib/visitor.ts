/** 生成并持久化 visitor_id（匿名身份标识，用于防重复提交）。 */
const KEY = "survey_visitor_id";

function randomId(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = randomId();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // localStorage 不可用时回退到会话内生成
    return randomId();
  }
}

export function hasSubmitted(slug: string): boolean {
  try {
    return localStorage.getItem(`survey_submitted_${slug}`) === "1";
  } catch {
    return false;
  }
}

export function markSubmitted(slug: string) {
  try {
    localStorage.setItem(`survey_submitted_${slug}`, "1");
  } catch {
    // ignore
  }
}
