import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils.js";

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl px-4 py-3 text-center text-2xl font-semibold tracking-[0.3em]",
          "bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-sm",
          "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
          "focus:outline-none focus:border-white/40 focus:bg-[var(--glass-hover-bg)]",
          "transition-all duration-200",
          className,
        )}
        {...props}
      />
    );
  },
);

GlassInput.displayName = "GlassInput";
