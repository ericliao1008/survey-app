import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  value: number | null;
  onChange: (value: number) => void;
}

const DEFAULT_LABELS = ["非常不同意", "不同意", "一般", "同意", "非常同意"];

export function Likert({ question, value, onChange }: Props) {
  const labels =
    ((question.config as { labels?: string[] } | null | undefined)?.labels) ??
    DEFAULT_LABELS;

  return (
    <div>
      <div className="grid grid-cols-5 gap-px bg-paper-300 border-y border-paper-300">
        {labels.map((label, i) => {
          const score = i + 1;
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`
                group relative flex flex-col items-center justify-center
                gap-2 sm:gap-3 min-h-[120px] sm:min-h-[152px] px-1 sm:px-2 py-4 sm:py-5
                bg-paper-50
                transition-all duration-500 ease-out-expo
                focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-wine-600 focus-visible:ring-inset
                ${selected ? "bg-paper-900 text-paper-50" : "text-paper-800 hover:bg-paper-100"}
              `}
            >
              <span
                className={`
                  font-serif text-[32px] sm:text-5xl tabular-nums leading-none
                  transition-colors duration-500
                  ${selected ? "text-paper-50" : "text-paper-900"}
                `}
              >
                {score}
              </span>
              <span
                className={`
                  font-sans text-[10px] sm:text-[13px] font-medium leading-[1.2] text-center break-words
                  ${selected ? "text-paper-200" : "text-paper-700 group-hover:text-paper-900"}
                `}
              >
                {label}
              </span>
              {selected && (
                <span className="absolute top-2 right-2 inline-block w-1.5 h-1.5 rounded-full bg-wine-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
