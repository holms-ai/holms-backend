import {
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  CloudHail,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import { useSpaces } from "../hooks/useSpaces.js";
import type { CardDefinition, CardProps } from "./types.js";

interface WeatherCardConfig {
  spaceId: string;
  sourceId?: string;
}

const conditionIcons: Record<string, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: Snowflake,
  sleet: CloudHail,
  fog: CloudFog,
  wind: Wind,
};

const conditionIconColors: Record<string, string> = {
  clear: "text-amber-400",
  "partly-cloudy": "text-amber-300",
  cloudy: "text-gray-400",
  rain: "text-blue-400",
  snow: "text-blue-200",
  sleet: "text-gray-400",
  fog: "text-gray-500",
  wind: "text-blue-300",
};

const conditionTints: Record<string, string> = {
  clear: "rgba(251, 191, 36, 0.08)",
  "partly-cloudy": "rgba(251, 191, 36, 0.05)",
  cloudy: "rgba(148, 163, 184, 0.06)",
  rain: "rgba(96, 165, 250, 0.10)",
  snow: "rgba(186, 230, 253, 0.10)",
  sleet: "rgba(148, 163, 184, 0.08)",
  fog: "rgba(148, 163, 184, 0.06)",
  wind: "rgba(148, 163, 184, 0.06)",
};

const conditionLabels: Record<string, string> = {
  clear: "Clear",
  "partly-cloudy": "Partly Cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  snow: "Snow",
  sleet: "Sleet",
  fog: "Fog",
  wind: "Windy",
};

function useWeather(config: WeatherCardConfig) {
  const { findWeatherSources } = useSpaces();

  const sources = findWeatherSources(config.spaceId);
  const source = config.sourceId
    ? sources.find((s) => s.source === config.sourceId)
    : sources[0];

  const state = source?.state ?? {};
  const temperature = typeof state.temperature === "number" ? state.temperature : null;
  const apparentTemp = typeof state.apparent_temperature === "number" ? state.apparent_temperature : null;
  const humidity = typeof state.humidity === "number" ? state.humidity : null;
  const condition = typeof state.condition === "string" ? state.condition : null;
  const windSpeed = typeof state.wind_speed === "number" ? state.wind_speed : null;
  const uvIndex = typeof state.uv_index === "number" ? state.uv_index : null;
  const reachable = source?.reachable ?? false;

  return {
    temperature,
    apparentTemp,
    humidity,
    condition,
    windSpeed,
    uvIndex,
    reachable,
    sourceId: source?.source,
  };
}

function WeatherCard({ config }: CardProps<WeatherCardConfig>) {
  const {
    temperature,
    apparentTemp,
    humidity,
    condition,
    windSpeed,
    uvIndex,
    reachable,
  } = useWeather(config);

  const ConditionIcon = (condition && conditionIcons[condition]) || Cloud;
  const iconColor = (condition && conditionIconColors[condition]) || "text-gray-400";
  const tint = condition ? conditionTints[condition] : undefined;
  const label = condition ? conditionLabels[condition] ?? condition : "Unknown";

  return (
    <div
      className="flex flex-col h-full"
      style={
        tint
          ? {
              background: `radial-gradient(ellipse at center, ${tint} 0%, transparent 70%)`,
              borderRadius: 16,
              margin: -16,
              padding: 16,
            }
          : undefined
      }
    >
      {/* Top row: feels-like + unreachable dot left, icon right */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {apparentTemp !== null && (
            <div className="text-[var(--text-tertiary)] text-sm">
              Feels like {Math.round(apparentTemp)}°
            </div>
          )}
          {!reachable && (
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: "var(--unreachable)",
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              />
              <span className="text-[11px] text-[var(--text-tertiary)]">Unreachable</span>
            </div>
          )}
        </div>
        <div className="p-2 rounded-xl bg-white/10">
          <ConditionIcon className={`w-8 h-8 ${iconColor}`} />
        </div>
      </div>

      {/* Temperature — large, light weight */}
      <div className="text-5xl font-light text-[var(--text-primary)] tabular-nums mb-1">
        {temperature !== null ? `${Math.round(temperature)}°` : "—"}
      </div>

      {/* Condition label */}
      <div className="text-sm text-[var(--text-secondary)] mb-auto">{label}</div>

      {/* Stats row — below separator */}
      {(humidity !== null || windSpeed !== null || uvIndex !== null) && (
        <div className="flex items-center gap-4 text-sm pt-3 mt-3 border-t border-white/10">
          {humidity !== null && (
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[var(--text-tertiary)] tabular-nums">
                {Math.round(humidity * 100)}%
              </span>
            </div>
          )}
          {windSpeed !== null && (
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[var(--text-tertiary)] tabular-nums">
                {Math.round(windSpeed)} km/h
              </span>
            </div>
          )}
          {uvIndex !== null && (
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[var(--text-tertiary)] tabular-nums">
                UV {Math.round(uvIndex)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const weatherCard: CardDefinition<WeatherCardConfig> = {
  type: "weather",
  label: "Weather",
  icon: CloudSun,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 2, h: 2 },
  component: WeatherCard,
};
