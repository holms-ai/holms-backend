import { forwardRef } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils.js";

export interface GlassSwitchProps extends SwitchPrimitive.SwitchProps {
  size?: "sm" | "md" | "lg";
}

export const GlassSwitch = forwardRef<HTMLButtonElement, GlassSwitchProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizes = {
      sm: { track: "h-5 w-9", thumb: "h-3.5 w-3.5 data-[state=checked]:translate-x-[17px]" },
      md: { track: "h-7 w-12", thumb: "h-5 w-5 data-[state=checked]:translate-x-[22px]" },
      lg: { track: "h-8 w-14", thumb: "h-6 w-6 data-[state=checked]:translate-x-[26px]" },
    };

    const s = sizes[size];

    return (
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors",
          "bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-sm",
          "data-[state=checked]:bg-[var(--on-color)] data-[state=checked]:border-[var(--on-color)]",
          s.track,
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-md transition-transform duration-200",
            "translate-x-[3px]",
            s.thumb,
          )}
        />
      </SwitchPrimitive.Root>
    );
  },
);

GlassSwitch.displayName = "GlassSwitch";
