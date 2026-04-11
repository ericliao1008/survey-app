interface Props {
  current: number;
  total: number;
}

function getMilestone(current: number, total: number): string | null {
  if (total <= 1) return null;
  const pos = current + 1;
  if (pos === total) return "最后一题";
  const pct = pos / total;
  if (pct >= 0.8) return "即将完成";
  if (pct >= 0.5) return "已过半程";
  if (pct >= 0.25) return "渐入佳境";
  return null;
}

export function ProgressBar({ current, total }: Props) {
  const step = Math.min(current + 1, total);
  const milestone = getMilestone(current, total);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-3 gap-4">
        <div className="chapter-mark">
          <span className="inline-block w-6 h-0.5 bg-wine-600" />
          <span>PROGRESS</span>
          {milestone && (
            <span
              key={milestone}
              className="ml-1 text-paper-700 animate-fade-in"
            >
              · {milestone}
            </span>
          )}
        </div>
        <div className="font-serif text-paper-700 text-base tabular-nums shrink-0">
          <span className="text-paper-900 text-lg font-medium">
            {String(step).padStart(2, "0")}
          </span>
          <span className="mx-1.5 text-paper-500">/</span>
          <span>{String(total).padStart(2, "0")}</span>
        </div>
      </div>

      {/* 节段式进度：每题一段 */}
      <div
        className="flex items-center gap-1 sm:gap-1.5"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`进度 ${step} / ${total}`}
      >
        {Array.from({ length: total }, (_, i) => {
          const state =
            i < current ? "done" : i === current ? "current" : "future";
          return (
            <span
              key={i}
              className={`
                flex-1 h-0.5 rounded-full transition-all duration-500 ease-out-expo
                ${state === "done" ? "bg-paper-900" : ""}
                ${state === "current" ? "bg-wine-600 h-1" : ""}
                ${state === "future" ? "bg-paper-300" : ""}
              `}
            />
          );
        })}
      </div>
    </div>
  );
}
