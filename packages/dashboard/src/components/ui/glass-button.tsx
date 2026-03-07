import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils.js";

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
          "active:scale-95",
          variant === "default" && "bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-sm text-[var(--text-primary)] hover:bg-[var(--glass-hover-bg)]",
          variant === "primary" && "bg-white/90 text-slate-900 shadow-md hover:bg-white dark:bg-white/20 dark:text-white dark:hover:bg-white/30",
          variant === "ghost" && "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]",
          size === "sm" && "h-8 px-3 text-xs gap-1.5",
          size === "md" && "h-10 px-4 text-sm gap-2",
          size === "lg" && "h-12 px-6 text-base gap-2",
          size === "icon" && "h-10 w-10",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

GlassButton.displayName = "GlassButton";
