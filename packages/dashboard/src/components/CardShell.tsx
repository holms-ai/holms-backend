import type { ReactNode } from "react";
import { GlassCard } from "./ui/glass-card.js";
import { X } from "lucide-react";

interface CardShellProps {
  children: ReactNode;
  title?: string;
  editMode?: boolean;
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function CardShell({ children, title, editMode, onRemove, className, style }: CardShellProps) {
  return (
    <GlassCard className={`h-full flex flex-col overflow-hidden relative ${className ?? ""}`} style={style}>
      {editMode && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {title && (
        <div className="px-4 pt-3 pb-1 text-xs font-medium text-[var(--text-secondary)] truncate">
          {title}
        </div>
      )}
      <div className="flex-1 min-h-0 px-4 pb-3">
        {children}
      </div>
    </GlassCard>
  );
}
