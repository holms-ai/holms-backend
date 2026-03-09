import type { PropertyDomain } from "./index.js";

export const shading: PropertyDomain = {
  name: "shading",
  displayName: "Shading",
  stateFields: {
    position: { type: "number", description: "Cover position 0 (closed) to 100 (open)", min: 0, max: 100 },
    tilt: { type: "number", description: "Slat angle 0 (closed) to 100 (open)", min: 0, max: 100 },
    moving: { type: "boolean", description: "Whether the cover is currently moving" },
    open: { type: "boolean", description: "Whether the cover is open" },
  },
  commandFields: {
    position: { type: "number", min: 0, max: 100 },
    tilt: { type: "number", min: 0, max: 100 },
    open: { type: "boolean" },
    stop: { type: "boolean", description: "Stop movement" },
  },
  features: ["position", "tilt", "stop", "my_position"],
  roles: ["roller_shutter", "screen", "blind", "awning", "curtain", "pergola", "shutter"],
};
