import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import type { Question } from "@/lib/types";
import { searchCities } from "@/data/chinaCities";

interface Props {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

// 按 key 选择候选词数据源
function suggestProvider(key: string | undefined): ((q: string) => string[]) | null {
  switch (key) {
    case "china_cities":
      return (q: string) => searchCities(q, 8);
    default:
      return null;
  }
}

export function TextShort({ question, value, onChange }: Props) {
  const cfg = (question.config ?? {}) as {
    placeholder?: string;
    suggestions_key?: string;
  };
  const placeholder = cfg.placeholder ?? "";
  const provider = useMemo(() => suggestProvider(cfg.suggestions_key), [cfg.suggestions_key]);

  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => {
    if (!provider) return [];
    return provider(value);
  }, [provider, value]);

  const showSuggestions = focused && provider && suggestions.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder || (provider ? "请选择或输入城市…" : "")}
          maxLength={200}
          autoComplete="off"
          style={provider ? { paddingRight: "2rem" } : undefined}
        />
        {provider && (
          <span
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-paper-400"
            style={{ fontSize: "0.75rem" }}
          >
            ▾
          </span>
        )}
      </div>
      {showSuggestions && (
        <ul
          className="absolute left-0 right-0 mt-1 z-10 bg-paper-50 border border-paper-300 rounded-sm shadow-lg max-h-64 overflow-auto"
          role="listbox"
        >
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // onMouseDown 而非 onClick，避免 blur 抢先触发
                  e.preventDefault();
                  onChange(s);
                  setFocused(false);
                }}
                className="w-full text-left px-4 py-2 font-serif text-base text-paper-900 hover:bg-paper-100"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
