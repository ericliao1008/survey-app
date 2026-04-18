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

interface Col {
  value: string;
  text: string;
}

export function MatrixSingle({ question, value, onChange }: Props) {
  const cfg = (question.config ?? {}) as {
    matrix_rows?: Row[];
    matrix_columns?: Col[];
  };
  const rows = cfg.matrix_rows ?? [];
  const cols = cfg.matrix_columns ?? [];

  const setCell = (rowValue: string, colValue: string) => {
    onChange({ ...value, [rowValue]: colValue });
  };

  return (
    <div>
      <p className="chapter-mark mb-4 text-paper-600">
        <span className="inline-block w-4 h-0.5 bg-paper-500" />
        每行选一项
      </p>

      {/* 桌面端：表格 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-paper-300">
              <th className="w-1/3 py-3 pr-4 text-left" />
              {cols.map((c) => (
                <th
                  key={c.value}
                  className="py-3 px-2 text-center font-sans text-xs text-paper-700"
                >
                  {c.text}
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
                  {cols.map((c) => {
                    const selected = cur === c.value;
                    return (
                      <td key={c.value} className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => setCell(row.value, c.value)}
                          aria-label={`${row.text}: ${c.text}`}
                          className={`
                            w-6 h-6 rounded-full border-[1.5px] transition-all duration-200
                            ${
                              selected
                                ? "bg-wine-600 border-wine-600"
                                : "border-paper-500 hover:border-paper-800"
                            }
                          `}
                        >
                          {selected && (
                            <span className="block w-1.5 h-1.5 rounded-full bg-paper-50 m-auto" />
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
              <div className="flex flex-wrap gap-2">
                {cols.map((c) => {
                  const selected = cur === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCell(row.value, c.value)}
                      className={`
                        px-3 py-2 rounded-sm border font-serif text-sm
                        ${
                          selected
                            ? "bg-paper-900 text-paper-50 border-paper-900"
                            : "bg-paper-50 border-paper-300 text-paper-800"
                        }
                      `}
                    >
                      {c.text}
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

export function isMatrixSingleAnswered(
  question: Question,
  value: MatrixAnswer | undefined
): boolean {
  const rows = (question.config as { matrix_rows?: Row[] } | null)?.matrix_rows ?? [];
  if (rows.length === 0) return true;
  if (!value) return false;
  return rows.every((r) => typeof value[r.value] === "string" && value[r.value] !== "");
}
