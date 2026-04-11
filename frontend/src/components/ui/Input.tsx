import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`
          w-full h-14 px-0 py-2
          bg-transparent border-0 border-b-[1.5px] border-paper-400
          text-paper-900 placeholder:text-paper-500
          text-lg font-sans
          transition-all duration-300 ease-out-expo
          focus:outline-none focus:border-paper-900
          disabled:text-paper-500
          ${className}
        `}
        {...rest}
      />
    );
  }
);
