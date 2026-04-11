import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", rows = 5, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`
          w-full px-0 py-3 resize-none
          bg-transparent border-0 border-b-[1.5px] border-paper-400
          text-paper-900 placeholder:text-paper-500
          text-lg font-sans leading-relaxed
          transition-all duration-300 ease-out-expo
          focus:outline-none focus:border-paper-900
          ${className}
        `}
        {...rest}
      />
    );
  }
);
