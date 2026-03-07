import { useState } from "react";
import { GlassCard } from "./ui/glass-card.js";
import { GlassButton } from "./ui/glass-button.js";
import { cardRegistry } from "../cards/registry.js";
import { trpc } from "../trpc.js";
import { X } from "lucide-react";

interface AddCardPickerProps {
  onAdd: (type: string, config: unknown) => void;
  onClose: () => void;
}

export function AddCardPicker({ onAdd, onClose }: AddCardPickerProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const { data: capabilities } = trpc.spaces.capabilities.useQuery();

  const cardTypes = Array.from(cardRegistry.entries());

  // Filter spaces by property type relevant to selected card
  const propertyForType: Record<string, string> = {
    light: "illumination",
    weather: "weather",
  };

  const requiredProperty = selectedType ? propertyForType[selectedType] : undefined;

  const availableSpaces = capabilities?.spaces.filter((sp) => {
    if (requiredProperty) {
      return sp.properties.some((p) => p.property === requiredProperty);
    }
    return true;
  });

  const selectedSpaceCap = availableSpaces?.find((s) => s.space === selectedSpace);
  const availableSources = selectedSpaceCap?.properties
    .filter((p) => requiredProperty ? p.property === requiredProperty : true)
    .flatMap((p) => p.sources);

  const handleAdd = () => {
    if (!selectedType || !selectedSpace) return;
    onAdd(selectedType, { spaceId: selectedSpace, sourceId: selectedSource || undefined });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <GlassCard className="w-full max-w-md p-6 animate-glass-in" variant="elevated">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Card</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Card type */}
        {!selectedType && (
          <div className="grid grid-cols-2 gap-3">
            {cardTypes.map(([key, def]) => {
              const Icon = def.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover-bg)] transition-colors"
                >
                  <Icon className="w-6 h-6 text-[var(--text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{def.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Space */}
        {selectedType && !selectedSpace && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Select a space</p>
            {availableSpaces?.map((sp) => (
              <button
                key={sp.space}
                onClick={() => setSelectedSpace(sp.space)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover-bg)] transition-colors text-left"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{sp.displayName}</span>
                {sp.floor && <span className="text-xs text-[var(--text-tertiary)]">{sp.floor}</span>}
              </button>
            ))}
            <GlassButton variant="ghost" size="sm" onClick={() => setSelectedType(null)} className="mt-2">
              Back
            </GlassButton>
          </div>
        )}

        {/* Step 3: Source (optional, or confirm) */}
        {selectedType && selectedSpace && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Select a source (or add all)</p>
            <GlassButton variant="primary" onClick={handleAdd}>
              Add all sources in {selectedSpaceCap?.displayName}
            </GlassButton>
            {availableSources && availableSources.length > 1 && (
              <>
                <div className="text-xs text-[var(--text-tertiary)] text-center my-1">or pick one</div>
                {availableSources.map((src) => (
                  <button
                    key={src.source}
                    onClick={() => {
                      setSelectedSource(src.source);
                      onAdd(selectedType, { spaceId: selectedSpace, sourceId: src.source });
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover-bg)] transition-colors text-left"
                  >
                    <span className="text-sm text-[var(--text-primary)]">{src.role}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">{src.source}</span>
                  </button>
                ))}
              </>
            )}
            <GlassButton variant="ghost" size="sm" onClick={() => setSelectedSpace(null)} className="mt-2">
              Back
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
