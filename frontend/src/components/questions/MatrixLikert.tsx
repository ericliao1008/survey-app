import type { Question, MatrixAnswer } from "@/lib/types";

interface Props {
  question: Question;
  value: MatrixAnswer;
  onChange: (next: MatrixAnswer) => void;
}

interface Row {
  value: string;
  text: string;
}

const DEFAULT_LABELS = ["非常不重要", "不重要", "一般", "重要", "非常重要"];

export function MatrixLikert({ question, value, onChange }: Props) {
  const cfg = (question.config ?? {}) as {
    matrix_rows?: Row[];
    labels?: string[];
  };
  const rows = cfg.matrix_rows ?? [];
  const labels = cfg.labels ?? DEFAULT_LABELS;

  const setCell = (rowValue: string, score: number) => {
    onChange({ ...value, [rowValue]: score });
  };

  return (
    <div>
      <p className="chapter-mark mb-4 text-paper-600">
        <span className="inline-block w-4 h-0.5 bg-paper-500" />
        请对每一行评分
      </p>

      {/* 桌面端：表格 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-paper-300">
              <th className="w-1/3 py-3 pr-4 text-left font-sans text-xs text-paper-600 uppercase tracking-wider">
                &nbsp;
              </th>
              {labels.map((l, i) => (
                <th
                  key={i}
                  className="py-3 px-2 text-center font-sans text-[11px] text-paper-600"
                >
                  <div className="font-serif text-xl text-paper-800 tabular-nums">
                    {i + 1}
                  </div>
                  <div className="mt-1 leading-tight">{l}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const cur = value[row.value];
              return (
                <tr
                  key={row.value}
                  className={`border-b border-paper-300 ${
                    ri % 2 === 1 ? "bg-paper-100/40" : ""
                  }`}
                >
                  <th className="py-4 pr-4 text-left font-serif text-base font-normal text-paper-900">
                    {row.text}
                  </th>
                  {labels.map((_, i) => {
                    const score = i + 1;
                    const selected = cur === score;
                    return (
                      <td key={i} className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setCell(row.value, score)}
                          aria-label={`${row.text} 评 ${score} 分`}
                          className={`
                            w-8 h-8 rounded-full border-[1.5px] transition-all duration-200
                            ${
                              selected
                                ? "bg-wine-600 border-wine-600"
                                : "border-paper-500 hover:border-paper-800"
                            }
                          `}
                        >
                          {selected && (
                            <span className="block w-2 h-2 rounded-full bg-paper-50 m-auto" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 移动端：每行一张卡片 */}
      <div className="sm:hidden space-y-4">
        {rows.map((row) => {
          const cur = value[row.value];
          return (
            <div
              key={row.value}
              className="border-y border-paper-300 py-4"
            >
              <div className="font-serif text-base text-paper-900 mb-3">
                {row.text}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {labels.map((l, i) => {
                  const score = i + 1;
                  const selected = cur === score;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCell(row.value, score)}
                      className={`
                        flex flex-col items-center justify-center gap-1 py-2 rounded-sm border
                        ${
                          selected
                            ? "bg-paper-900 text-paper-50 border-paper-900"
                            : "bg-paper-50 border-paper-300 text-paper-700"
                        }
                      `}
                    >
                      <span className="font-serif text-lg tabular-nums">
                        {score}
                      </span>
                      <span className="text-[10px] leading-tight">{l}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 辅助：所有行都已评分 */
export function isMatrixLikertAnswered(
  question: Question,
  value: MatrixAnswer | undefined
): boolean {
  const rows = (question.config as { matrix_rows?: Row[] } | null)?.matrix_rows ?? [];
  if (rows.length === 0) return true;
  if (!value) return false;
  return rows.every((r) => typeof value[r.value] === "number");
}
