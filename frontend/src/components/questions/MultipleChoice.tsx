import type { Question } from "@/lib/types";

interface OptionExtra {
  text_placeholder?: string;
  require_text?: boolean; // 选中此项后必须填写文本
}

interface Props {
  question: Question;
  value: number[];
  onChange: (optionIds: number[]) => void;
  optionTexts?: Record<number, string>;
  onOptionTextChange?: (optionId: number, text: string) => void;
}

export function MultipleChoice({
  question,
  value,
  onChange,
  optionTexts,
  onOptionTextChange,
}: Props) {
  const cfg = (question.config ?? {}) as {
    max_select?: number;
    min_select?: number;
    option_extras?: Record<string, OptionExtra>;
  };
  const maxSelect = cfg.max_select;
  const minSelect = cfg.min_select;
  const optionExtras = cfg.option_extras ?? {};

  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (maxSelect && value.length >= maxSelect) {
        return;
      }
      onChange([...value, id]);
    }
  };

  return (
    <div>
      <p className="chapter-mark mb-4 text-paper-600">
        <span className="inline-block w-4 h-0.5 bg-paper-500" />
        {minSelect && maxSelect && minSelect === maxSelect
          ? `必选 ${minSelect} 项`
          : maxSelect
            ? `可多选 · 最多选 ${maxSelect} 项`
            : "可多选"}
        {(maxSelect || minSelect) && (
          <span className="ml-2 text-paper-500">
            （已选 {value.length}
            {maxSelect ? `/${maxSelect}` : ""}）
          </span>
        )}
      </p>
      <ul className="divide-y divide-paper-300 border-t border-b border-paper-300">
        {question.options.map((opt, i) => {
          const selected = value.includes(opt.id);
          const atMax = !!maxSelect && value.length >= maxSelect && !selected;
          const extra = optionExtras[opt.value];
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => toggle(opt.id)}
                disabled={atMax}
                className={`
                  group relative w-full text-left flex items-center gap-5 sm:gap-6
                  py-5 sm:py-6 pl-5 pr-2 -mx-2 rounded-sm
                  transition-all duration-300 ease-out-expo
                  focus:outline-none focus-visible:bg-paper-100 focus-visible:ring-2 focus-visible:ring-wine-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-200
                  ${selected ? "text-paper-900 bg-wine-600/[0.035]" : "text-paper-800 hover:text-paper-900"}
                  ${atMax ? "opacity-40 cursor-not-allowed" : ""}
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
                    inline-flex items-center justify-center w-[18px] h-[18px] border-[1.5px] shrink-0
                    transition-all duration-300
                    ${
                      selected
                        ? "border-wine-600 bg-wine-600"
                        : "border-paper-500 group-hover:border-paper-800"
                    }
                  `}
                >
                  {selected && (
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3 h-3 text-paper-50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        d="M3 8l3 3 7-7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
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
                        选中此项后请填写具体名称
                      </p>
                    )}
                  </div>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
