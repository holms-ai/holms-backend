import { useState, useCallback } from "react";
import type { Layout, Layouts } from "react-grid-layout";
import type { CardInstance } from "../cards/types.js";
import { cardRegistry } from "../cards/registry.js";

const CARDS_KEY = "holms-dashboard-cards";
const LAYOUTS_KEY = "holms-dashboard-layouts";

const COLS = { lg: 12, md: 8, sm: 6, xs: 4 };
const BREAKPOINTS = { lg: 1280, md: 1024, sm: 768, xs: 0 };

function loadCards(): CardInstance[] {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadLayouts(): Layouts {
  try {
    const raw = localStorage.getItem(LAYOUTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCards(cards: CardInstance[]) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

function saveLayouts(layouts: Layouts) {
  localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts));
}

export function useGridLayout() {
  const [cards, setCards] = useState<CardInstance[]>(loadCards);
  const [layouts, setLayouts] = useState<Layouts>(loadLayouts);

  const addCard = useCallback((type: string, config: unknown) => {
    const def = cardRegistry.get(type);
    if (!def) return;
    const id = `${type}-${Date.now()}`;
    const newCard: CardInstance = { id, type, config };

    setCards((prev) => {
      const next = [...prev, newCard];
      saveCards(next);
      return next;
    });

    // Add layout item for all breakpoints
    setLayouts((prev) => {
      const next = { ...prev };
      for (const [bp, cols] of Object.entries(COLS)) {
        const bpLayouts = next[bp] || [];
        const w = Math.min(def.defaultSize.w, cols);
        const newItem: Layout = {
          i: id,
          x: 0,
          y: Infinity,
          w,
          h: def.defaultSize.h,
          minW: def.minSize.w,
          minH: def.minSize.h,
        };
        next[bp] = [...bpLayouts, newItem];
      }
      saveLayouts(next);
      return next;
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCards(next);
      return next;
    });
    setLayouts((prev) => {
      const next: Layouts = {};
      for (const [bp, items] of Object.entries(prev)) {
        next[bp] = (items as Layout[]).filter((l) => l.i !== id);
      }
      saveLayouts(next);
      return next;
    });
  }, []);

  const onLayoutChange = useCallback((_layout: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
    saveLayouts(allLayouts);
  }, []);

  return {
    cards,
    layouts,
    addCard,
    removeCard,
    onLayoutChange,
    breakpoints: BREAKPOINTS,
    cols: COLS,
    rowHeight: 100,
    margin: [16, 16] as [number, number],
  };
}
