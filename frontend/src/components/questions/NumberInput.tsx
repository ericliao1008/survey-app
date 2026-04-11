import { Input } from "@/components/ui/Input";
import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  value: number | null;
  onChange: (value: number | null) => void;
}

export function NumberInput({ question, value, onChange }: Props) {
  const config = (question.config as { min?: number; max?: number; placeholder?: string } | null | undefined) ?? {};
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value === null ? "" : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          onChange(null);
        } else {
          const n = Number(v);
          onChange(Number.isFinite(n) ? n : null);
        }
      }}
      placeholder={config.placeholder ?? "请输入数字"}
      min={config.min}
      max={config.max}
    />
  );
}
