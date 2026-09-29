import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";

export default Input;
