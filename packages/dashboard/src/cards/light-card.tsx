import { useState, useCallback, useRef, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { GlassSwitch } from "../components/ui/glass-switch.js";
import { GlassSlider } from "../components/ui/glass-slider.js";
import { useSpaces } from "../hooks/useSpaces.js";
import { trpc } from "../trpc.js";
import type { CardDefinition, CardProps } from "./types.js";

interface LightCardConfig {
  spaceId: string;
  sourceId?: string;
}

function useLight(config: LightCardConfig) {
  const { findIlluminationSources } = useSpaces();
  const influence = trpc.spaces.influence.useMutation();

  const sources = findIlluminationSources(config.spaceId);
  const source = config.sourceId
    ? sources.find((s) => s.source === config.sourceId)
    : sources[0];

  const state = source?.state ?? {};
  const on = state.on === true;
  const brightness = typeof state.brightness === "number" ? state.brightness : 100;
  const colorTemp = typeof state.color_temp === "number" ? state.color_temp : 50;
  const features = source?.features ?? [];
  const reachable = source?.reachable ?? false;
  const hasBrightness = features.includes("brightness");
  const hasColorTemp = features.includes("color_temp");

  // Optimistic local state
  const [localOn, setLocalOn] = useState<boolean | null>(null);
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localColorTemp, setLocalColorTemp] = useState<number | null>(null);

  // Clear optimistic state when server state catches up
  useEffect(() => {
    if (localOn !== null) setLocalOn(null);
  }, [on]);
  useEffect(() => {
    if (localBrightness !== null) setLocalBrightness(null);
  }, [brightness]);
  useEffect(() => {
    if (localColorTemp !== null) setLocalColorTemp(null);
  }, [colorTemp]);

  const send = useCallback(
    (params: Record<string, unknown>) => {
      influence.mutate({
        space: config.spaceId,
        target: {
          property: "illumination",
          source: config.sourceId,
        },
        params,
      });
    },
    [influence, config.spaceId, config.sourceId],
  );

  const toggle = useCallback(() => {
    const next = !(localOn ?? on);
    setLocalOn(next);
    send({ on: next });
  }, [on, localOn, send]);

  // Debounced brightness
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setBrightness = useCallback(
    (v: number) => {
      setLocalBrightness(v);
      if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
      brightnessTimer.current = setTimeout(() => send({ brightness: v }), 150);
    },
    [send],
  );

  // Debounced color temp
  const colorTempTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setColorTemp = useCallback(
    (v: number) => {
      setLocalColorTemp(v);
      if (colorTempTimer.current) clearTimeout(colorTempTimer.current);
      colorTempTimer.current = setTimeout(() => send({ color_temp: v }), 150);
    },
    [send],
  );

  return {
    on: localOn ?? on,
    brightness: localBrightness ?? brightness,
    colorTemp: localColorTemp ?? colorTemp,
    hasBrightness,
    hasColorTemp,
    reachable,
    sourceId: source?.source,
    toggle,
    setBrightness,
    setColorTemp,
  };
}

function LightCard({ config }: CardProps<LightCardConfig>) {
  const {
    on,
    brightness,
    colorTemp,
    hasBrightness,
    hasColorTemp,
    reachable,
    toggle,
    setBrightness,
    setColorTemp,
  } = useLight(config);

  // Ambient glow: warm/cool tint based on color_temp when on
  const glowColor = on
    ? colorTemp < 40
      ? `rgba(251, 191, 36, ${0.08 + (brightness / 100) * 0.07})`
      : colorTemp > 60
        ? `rgba(96, 165, 250, ${0.08 + (brightness / 100) * 0.07})`
        : `rgba(255, 255, 255, ${0.04 + (brightness / 100) * 0.06})`
    : undefined;

  return (
    <div className="flex flex-col gap-3 h-full justify-center" style={glowColor ? { background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`, borderRadius: 16, margin: -16, padding: 16 } : undefined}>
      {/* Header: status + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb
            className="w-5 h-5"
            style={{ color: on ? "var(--on-color)" : "var(--off-color)" }}
          />
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: !reachable
                ? "var(--unreachable)"
                : on
                  ? "var(--on-color)"
                  : "var(--off-color)",
              animation: !reachable ? "pulse-glow 2s ease-in-out infinite" : undefined,
            }}
          />
        </div>
        <GlassSwitch checked={on} onCheckedChange={toggle} size="md" />
      </div>

      {/* Brightness */}
      {hasBrightness && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-tertiary)]">Brightness</span>
            <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">{Math.round(brightness)}%</span>
          </div>
          <GlassSlider
            value={[brightness]}
            onValueChange={([v]) => setBrightness(v)}
            min={1}
            max={100}
            step={1}
            gradient="bg-gradient-to-r from-white/20 to-white/60"
          />
        </div>
      )}

      {/* Color Temperature */}
      {hasColorTemp && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-tertiary)]">Temperature</span>
          </div>
          <GlassSlider
            value={[colorTemp]}
            onValueChange={([v]) => setColorTemp(v)}
            min={0}
            max={100}
            step={1}
            gradient="bg-gradient-to-r from-[var(--warm-white)] to-[var(--cool-white)]"
          />
        </div>
      )}
    </div>
  );
}

export const lightCard: CardDefinition<LightCardConfig> = {
  type: "light",
  label: "Light",
  icon: Lightbulb,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 2, h: 2 },
  component: LightCard,
};
