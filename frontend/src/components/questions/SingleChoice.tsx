import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  value: number | null;
  onChange: (optionId: number) => void;
}

export function SingleChoice({ question, value, onChange }: Props) {
  return (
    <ul className="divide-y divide-paper-300 border-t border-b border-paper-300">
      {question.options.map((opt, i) => {
        const selected = value === opt.id;
        return (
          <li key={opt.id}>
            <button
              type="button"
              onClick={() => onChange(opt.id)}
              className={`
                group relative w-full text-left flex items-center gap-5 sm:gap-6
                py-5 sm:py-6 pl-5 pr-2 -mx-2 rounded-sm
                transition-all duration-300 ease-out-expo
                focus:outline-none focus-visible:bg-paper-100 focus-visible:ring-2 focus-visible:ring-wine-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-200
                ${selected ? "text-paper-900 bg-wine-600/[0.035]" : "text-paper-800 hover:text-paper-900"}
              `}
            >
              {/* 左侧装饰条 —— 编辑式强调 */}
              <span
                aria-hidden="true"
                className={`
                  absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full
                  transition-all duration-300 ease-out-expo
                  ${selected ? "h-[70%] bg-wine-600" : "h-0 bg-transparent"}
                `}
              />
              <span
                className={`
                  font-serif text-base font-semibold tabular-nums shrink-0 w-6
                  transition-colors duration-300
                  ${selected ? "text-wine-600" : "text-paper-500 group-hover:text-paper-700"}
                `}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span
                className={`
                  inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[1.5px] shrink-0
                  transition-all duration-300
                  ${
                    selected
                      ? "border-wine-600 bg-wine-600"
                      : "border-paper-500 group-hover:border-paper-800"
                  }
                `}
              >
                {selected && <span className="w-1.5 h-1.5 rounded-full bg-paper-50" />}
              </span>
              <span
                className={`
                  font-serif text-lg sm:text-xl leading-snug flex-1
                  ${selected ? "font-medium" : ""}
                `}
              >
                {opt.text}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
