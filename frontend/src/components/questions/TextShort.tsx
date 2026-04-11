import { Input } from "@/components/ui/Input";
import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function TextShort({ question, value, onChange }: Props) {
  const placeholder = (question.config as { placeholder?: string } | null | undefined)?.placeholder ?? "";
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={200}
    />
  );
}
