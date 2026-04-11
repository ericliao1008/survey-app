import { Textarea } from "@/components/ui/Textarea";
import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function TextLong({ question, value, onChange }: Props) {
  const placeholder = (question.config as { placeholder?: string } | null | undefined)?.placeholder ?? "";
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={6}
      maxLength={2000}
    />
  );
}
