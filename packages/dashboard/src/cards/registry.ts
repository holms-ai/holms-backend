import type { CardDefinition } from "./types.js";
import { lightCard } from "./light-card.js";
import { weatherCard } from "./weather-card.js";

export const cardRegistry = new Map<string, CardDefinition<any>>([
  [lightCard.type, lightCard],
  [weatherCard.type, weatherCard],
]);
