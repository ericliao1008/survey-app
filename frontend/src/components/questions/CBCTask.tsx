import { useMemo } from "react";
import type { Question, CBCAnswer } from "@/lib/types";
import { generateCBCProfiles, profileLevelLabel, type CBCAttribute } from "@/lib/cbc";
import { getVisitorId } from "@/lib/visitor";

interface Props {
  question: Question;
  value: CBCAnswer | undefined;
  onChange: (next: CBCAnswer) => void;
}

export function CBCTask({ question, value, onChange }: Props) {
  const cfg = (question.config ?? {}) as {
    cbc_attributes?: CBCAttribute[];
    cbc_task_index?: number;
    cbc_none_label?: string;
  };
  const attributes = cfg.cbc_attributes ?? [];
  const taskIndex = cfg.cbc_task_index ?? 0;
  const noneLabel = cfg.cbc_none_label ?? "都不选";

  // 为当前 visitor 生成稳定的 3 个方案（刷新也保持一致）
  const profiles = useMemo(
    () => generateCBCProfiles(attributes, getVisitorId(), taskIndex),
    [attributes, taskIndex]
  );

  // 回写的 value 始终包含 profiles 快照，便于后端保留所见方案
  const setChoice = (choice: CBCAnswer["choice"]) => {
    onChange({ profiles, choice });
  };

  const current = value?.choice ?? null;
  const letters: CBCAnswer["choice"][] = ["A", "B", "C"];

  return (
    <div>
      <p className="chapter-mark mb-4 text-paper-600">
        <span className="inline-block w-4 h-0.5 bg-paper-500" />
        比较下面三款产品，选择您最愿意购买的一款
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {profiles.map((profile, i) => {
          const letter = letters[i];
          const selected = current === letter;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setChoice(letter)}
              className={`
                text-left p-4 sm:p-5 rounded-sm border-[1.5px] transition-all duration-200
                ${
                  selected
                    ? "border-wine-600 bg-wine-600/5 shadow-sm"
                    : "border-paper-300 bg-paper-50 hover:border-paper-500"
                }
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`
                    font-serif text-2xl tabular-nums
                    ${selected ? "text-wine-600" : "text-paper-700"}
                  `}
                >
                  方案{letter}
                </span>
                <span
                  className={`
                    inline-flex items-center justify-center w-5 h-5 rounded-full border-[1.5px]
                    ${
                      selected
                        ? "border-wine-600 bg-wine-600"
                        : "border-paper-500"
                    }
                  `}
                >
                  {selected && (
                    <span className="block w-1.5 h-1.5 rounded-full bg-paper-50" />
                  )}
                </span>
              </div>
              <dl className="space-y-2 text-sm">
                {attributes.map((attr) => (
                  <div key={attr.key}>
                    <dt className="font-sans text-[11px] text-paper-600 uppercase tracking-wider">
                      {attr.label}
                    </dt>
                    <dd className="font-serif text-paper-900 leading-snug">
                      {profileLevelLabel(profile, attr)}
                    </dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setChoice("none")}
          className={`
            w-full py-3 rounded-sm border font-serif text-base transition-colors
            ${
              current === "none"
                ? "bg-paper-900 text-paper-50 border-paper-900"
                : "bg-paper-50 text-paper-800 border-paper-300 hover:border-paper-500"
            }
          `}
        >
          {noneLabel}
        </button>
      </div>
    </div>
  );
}

export function isCBCAnswered(value: CBCAnswer | undefined): boolean {
  return !!value && value.choice != null;
}
