import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils.js";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle";
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border transition-colors duration-200",
          variant === "default" && "bg-[var(--glass-bg)] border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]",
          variant === "elevated" && "bg-[var(--glass-hover-bg)] border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]",
          variant === "subtle" && "bg-[var(--glass-bg)]/50 border-transparent backdrop-blur-sm",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

GlassCard.displayName = "GlassCard";
