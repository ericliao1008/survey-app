import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "outline" | "link";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-paper-900 text-paper-50 hover:bg-paper-800 active:bg-paper-900 disabled:bg-paper-300 disabled:text-paper-500 shadow-paper hover:shadow-paper-lg",
  outline:
    "bg-transparent text-paper-900 border-[1.5px] border-paper-400 hover:border-paper-900 hover:text-paper-900 active:bg-paper-100 disabled:text-paper-500 disabled:border-paper-300",
  ghost:
    "bg-transparent text-paper-800 hover:bg-paper-100 hover:text-paper-900 active:bg-paper-200 disabled:text-paper-500",
  link:
    "bg-transparent text-paper-800 hover:text-wine-600 underline underline-offset-4 decoration-paper-400 hover:decoration-wine-600",
};

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    fullWidth,
    loading = false,
    disabled,
    className = "",
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`
        group inline-flex items-center justify-center gap-2
        h-[52px] px-8 rounded-full
        text-[14px] font-sans font-medium tracking-wide
        transition-all duration-300 ease-out-expo
        focus:outline-none focus-visible:ring-2 focus-visible:ring-paper-900 focus-visible:ring-offset-4 focus-visible:ring-offset-paper-200
        disabled:cursor-not-allowed
        ${fullWidth ? "w-full" : ""}
        ${variants[variant]}
        ${className}
      `}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
