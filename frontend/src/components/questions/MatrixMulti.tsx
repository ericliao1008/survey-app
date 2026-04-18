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

export function MatrixMulti({ question, value, onChange }: Props) {
  const cfg = (question.config ?? {}) as {
    matrix_rows?: Row[];
    matrix_columns?: Col[];
    mutex_column?: string;
  };
  const rows = cfg.matrix_rows ?? [];
  const cols = cfg.matrix_columns ?? [];
  const mutex = cfg.mutex_column;

  const toggleCell = (rowValue: string, colValue: string) => {
    const current = value[rowValue];
    const curArr: string[] = Array.isArray(current) ? current : [];
    let next: string[];
    if (mutex && colValue === mutex) {
      // 选中互斥列 → 清空其他，只保留它
      next = curArr.includes(mutex) ? [] : [mutex];
    } else if (mutex && curArr.includes(mutex)) {
      // 当前只选了互斥列，点其他列 → 切换成只选那一列
      next = [colValue];
    } else {
      next = curArr.includes(colValue)
        ? curArr.filter((v) => v !== colValue)
        : [...curArr, colValue];
    }
    onChange({ ...value, [rowValue]: next });
  };

  return (
    <div>
      <p className="chapter-mark mb-4 text-paper-600">
        <span className="inline-block w-4 h-0.5 bg-paper-500" />
        每行可多选
        {mutex && (
          <span className="ml-2 text-paper-500">
            · 选「
            {cols.find((c) => c.value === mutex)?.text ?? mutex}
            」则其他互斥
          </span>
        )}
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
              const selected = Array.isArray(cur) ? cur : [];
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
                    const isOn = selected.includes(c.value);
                    return (
                      <td key={c.value} className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCell(row.value, c.value)}
                          aria-label={`${row.text}: ${c.text}`}
                          className={`
                            inline-flex items-center justify-center w-5 h-5 border-[1.5px] transition-all duration-200
                            ${
                              isOn
                                ? "bg-wine-600 border-wine-600"
                                : "border-paper-500 hover:border-paper-800"
                            }
                          `}
                        >
                          {isOn && (
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

      {/* 移动端 */}
      <div className="sm:hidden space-y-4">
        {rows.map((row) => {
          const cur = value[row.value];
          const selected = Array.isArray(cur) ? cur : [];
          return (
            <div key={row.value} className="border-y border-paper-300 py-4">
              <div className="font-serif text-base text-paper-900 mb-3">
                {row.text}
              </div>
              <div className="flex flex-wrap gap-2">
                {cols.map((c) => {
                  const isOn = selected.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleCell(row.value, c.value)}
                      className={`
                        px-3 py-2 rounded-sm border font-serif text-sm
                        ${
                          isOn
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

export function isMatrixMultiAnswered(
  question: Question,
  value: MatrixAnswer | undefined
): boolean {
  const rows = (question.config as { matrix_rows?: Row[] } | null)?.matrix_rows ?? [];
  if (rows.length === 0) return true;
  if (!value) return false;
  return rows.every((r) => {
    const v = value[r.value];
    return Array.isArray(v) && v.length > 0;
  });
}
