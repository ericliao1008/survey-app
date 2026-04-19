import type { Question } from "@/lib/types";

interface OptionExtra {
  text_placeholder?: string;
  require_text?: boolean;
}

interface Props {
  question: Question;
  value: number | null;
  onChange: (optionId: number) => void;
  optionTexts?: Record<number, string>;
  onOptionTextChange?: (optionId: number, text: string) => void;
}

export function SingleChoice({
  question,
  value,
  onChange,
  optionTexts,
  onOptionTextChange,
}: Props) {
  const cfg = (question.config ?? {}) as {
    option_extras?: Record<string, OptionExtra>;
  };
  const optionExtras = cfg.option_extras ?? {};

  return (
    <ul className="divide-y divide-paper-300 border-t border-b border-paper-300">
      {question.options.map((opt, i) => {
        const selected = value === opt.id;
        const extra = optionExtras[opt.value];
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
            {selected && extra && onOptionTextChange && (() => {
              const curText = optionTexts?.[opt.id] ?? "";
              const missing = extra.require_text && curText.trim().length === 0;
              return (
                <div
                  className="pl-14 pr-2 pb-5 -mt-2 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={curText}
                    onChange={(e) => onOptionTextChange(opt.id, e.target.value)}
                    placeholder={
                      (extra.text_placeholder ?? "请填写") +
                      (extra.require_text ? "（必填）" : "")
                    }
                    className={`
                      w-full bg-transparent border-0 border-b focus:ring-0 outline-none font-serif text-base text-paper-900 placeholder:text-paper-500 py-2
                      ${missing ? "border-wine-600" : "border-paper-400 focus:border-wine-600"}
                    `}
                  />
                  {missing && (
                    <p className="mt-1 font-sans text-xs text-wine-600">
                      请填写具体内容
                    </p>
                  )}
                </div>
              );
            })()}
          </li>
        );
      })}
    </ul>
  );
}
