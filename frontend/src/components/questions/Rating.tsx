import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  value: number | null;
  onChange: (value: number) => void;
}

export function Rating({ value, onChange }: Props) {
  const scores = Array.from({ length: 11 }, (_, i) => i); // 0..10

  return (
    <div>
      {/*
        移动端：grid-cols-6，11 项自动换行为两行 (0-5 / 6-10+空)
        桌面端 (sm+)：grid-cols-11，单行铺开
      */}
      <div className="grid grid-cols-6 sm:grid-cols-11 gap-px bg-paper-300 border border-paper-300">
        {scores.map((s) => {
          const selected = value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`
                group aspect-square flex items-center justify-center
                min-h-[52px]
                bg-paper-50
                font-serif text-xl sm:text-3xl font-medium tabular-nums
                transition-all duration-400 ease-out-expo
                focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-wine-600 focus-visible:ring-inset
                ${
                  selected
                    ? "bg-paper-900 text-paper-50"
                    : "text-paper-800 hover:bg-paper-100 hover:text-paper-900"
                }
              `}
              aria-label={`${s} 分`}
              aria-pressed={selected}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-4">
        <span className="chapter-mark text-paper-600">
          <span className="inline-block w-4 h-0.5 bg-paper-500" />
          绝不会推荐
        </span>
        <span className="chapter-mark text-paper-600">
          一定会推荐
          <span className="inline-block w-4 h-0.5 bg-paper-500" />
        </span>
      </div>
    </div>
  );
}
