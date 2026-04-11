import { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`
        relative bg-paper-50 rounded-[20px] shadow-paper
        border border-paper-300
        ${className}
      `}
      {...rest}
    />
  );
}
