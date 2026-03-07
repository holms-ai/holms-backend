import { useState, useRef, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useGridLayout } from "../hooks/useGridLayout.js";
import { cardRegistry } from "../cards/registry.js";
import { CardShell } from "./CardShell.js";
import { AddCardPicker } from "./AddCardPicker.js";
import { GlassButton } from "./ui/glass-button.js";
import { Pencil, Plus, Check } from "lucide-react";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function GridBoard() {
  const {
    cards,
    layouts,
    addCard,
    removeCard,
    onLayoutChange,
    breakpoints,
    cols,
    rowHeight,
    margin,
  } = useGridLayout();

  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCardDimensions = useCallback(
    (id: string): { width: number; height: number } => {
      // Approximate from layout — will be refined by actual DOM
      const bp = "lg"; // default
      const bpLayouts = layouts[bp] as Array<{ i: string; w: number; h: number }> | undefined;
      const layout = bpLayouts?.find((l) => l.i === id);
      if (!layout) return { width: 200, height: 200 };
      const colWidth = (window.innerWidth - margin[0] * (cols[bp as keyof typeof cols] + 1)) / cols[bp as keyof typeof cols];
      return {
        width: layout.w * colWidth + (layout.w - 1) * margin[0],
        height: layout.h * rowHeight + (layout.h - 1) * margin[1],
      };
    },
    [layouts, cols, rowHeight, margin],
  );

  return (
    <div ref={containerRef} className="h-dvh flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 p-4 flex-shrink-0">
        {editMode && (
          <GlassButton size="sm" onClick={() => setShowPicker(true)}>
            <Plus className="w-4 h-4" />
            Add Card
          </GlassButton>
        )}
        <GlassButton
          size="icon"
          variant={editMode ? "primary" : "ghost"}
          onClick={() => setEditMode((v) => !v)}
          className="w-8 h-8"
        >
          {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </GlassButton>
      </div>

      {/* Grid */}
      <div className={`flex-1 overflow-auto px-2 ${editMode ? "" : "grid-static"}`}>
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
            <p className="text-[var(--text-tertiary)] text-sm">No cards yet</p>
            <GlassButton size="sm" onClick={() => { setEditMode(true); setShowPicker(true); }}>
              <Plus className="w-4 h-4" />
              Add your first card
            </GlassButton>
          </div>
        ) : (
          <ResponsiveGridLayout
            layouts={layouts}
            breakpoints={breakpoints}
            cols={cols}
            rowHeight={rowHeight}
            margin={margin}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
            compactType="vertical"
            useCSSTransforms
          >
            {cards.map((card) => {
              const def = cardRegistry.get(card.type);
              if (!def) return <div key={card.id} />;
              const Component = def.component;
              const dims = getCardDimensions(card.id);
              return (
                <div key={card.id} className={editMode ? "drag-handle" : ""}>
                  <CardShell
                    title={def.label}
                    editMode={editMode}
                    onRemove={() => removeCard(card.id)}
                  >
                    <Component
                      config={card.config as any}
                      width={dims.width}
                      height={dims.height}
                    />
                  </CardShell>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>

      {showPicker && (
        <AddCardPicker
          onAdd={(type: string, config: unknown) => {
            addCard(type, config);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
