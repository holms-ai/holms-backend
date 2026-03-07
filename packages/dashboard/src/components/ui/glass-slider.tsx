import { forwardRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../lib/utils.js";

export interface GlassSliderProps extends SliderPrimitive.SliderProps {
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  gradient?: string;
}

export const GlassSlider = forwardRef<HTMLSpanElement, GlassSliderProps>(
  ({ className, trackClassName, rangeClassName, thumbClassName, gradient, ...props }, ref) => {
    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            "relative h-2 w-full grow overflow-hidden rounded-full",
            "bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-sm",
            trackClassName,
          )}
        >
          <SliderPrimitive.Range
            className={cn(
              "absolute h-full rounded-full",
              gradient || "bg-white/40",
              rangeClassName,
            )}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block h-5 w-5 rounded-full bg-white shadow-md border border-white/50",
            "transition-transform hover:scale-110 focus-visible:outline-none",
            thumbClassName,
          )}
        />
      </SliderPrimitive.Root>
    );
  },
);

GlassSlider.displayName = "GlassSlider";
