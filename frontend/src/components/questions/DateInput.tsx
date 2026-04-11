import { Input } from "@/components/ui/Input";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function DateInput({ value, onChange }: Props) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
