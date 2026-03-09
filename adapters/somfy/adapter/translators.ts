import type { EntityRegistration } from "@holms/adapter-sdk";
import type { OverkizDevice, OverkizState, OverkizCommand } from "./types.js";
import { SHADING_UI_CLASSES } from "./types.js";

// ── Device → Entity ────────────────────────────────────────────────────────

export function deviceToEntity(device: OverkizDevice): EntityRegistration | null {
  if (!SHADING_UI_CLASSES.has(device.definition.uiClass)) return null;

  const features = resolveFeatures(device);

  return {
    entityId: device.deviceURL,
    displayName: device.label,
    properties: [
      {
        property: "shading",
        features,
        commandHints: {
          position: { type: "number", min: 0, max: 100, description: "Cover position 0 (closed) to 100 (open)" },
          open: { type: "boolean", description: "Open or close the cover" },
          stop: { type: "boolean", description: "Stop movement" },
        },
      },
    ],
  };
}

function resolveFeatures(device: OverkizDevice): string[] {
  const commandNames = new Set(device.definition.commands.map((c) => c.commandName));
  const features: string[] = [];

  if (commandNames.has("setClosure") || commandNames.has("setPosition")) {
    features.push("position");
  }
  if (commandNames.has("setOrientation") || commandNames.has("setClosureAndOrientation")) {
    features.push("tilt");
  }
  if (commandNames.has("stop") || commandNames.has("my")) {
    features.push("stop");
  }
  if (commandNames.has("my") || commandNames.has("setMemorized")) {
    features.push("my_position");
  }

  return features;
}

// ── State Translation ──────────────────────────────────────────────────────

/**
 * Convert Overkiz device states to Habitat shading state.
 *
 * Position inversion: Overkiz closure 0=open, 100=closed → Habitat 0=closed, 100=open
 */
export function stateToShading(states: OverkizState[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const state of states) {
    switch (state.name) {
      case "core:ClosureState":
        // Invert: Overkiz 0=open → Habitat 100=open
        result.position = 100 - (state.value as number);
        result.open = (state.value as number) < 100;
        break;
      case "core:OpenClosedState":
        result.open = state.value === "open";
        break;
      case "core:MovingState":
        result.moving = state.value !== undefined && state.value !== false;
        break;
      case "core:SlateOrientationState":
        // Invert: Overkiz 0=closed → Habitat 0=closed (same direction for tilt)
        result.tilt = state.value as number;
        break;
      case "core:TargetClosureState":
        // Presence of a target different from current indicates moving
        result.moving = true;
        break;
    }
  }

  // Default moving to false if not set
  if (result.moving === undefined) {
    result.moving = false;
  }

  return result;
}

// ── Command Translation ────────────────────────────────────────────────────

/**
 * Convert Habitat shading commands to Overkiz commands.
 *
 * Position inversion: Habitat position 75 (75% open) → Overkiz setClosure(25)
 */
export function shadingToCommands(command: Record<string, unknown>): OverkizCommand[] {
  const commands: OverkizCommand[] = [];

  if (command.stop === true) {
    commands.push({ name: "stop" });
    return commands; // Stop overrides everything
  }

  if (command.open === true) {
    commands.push({ name: "open" });
  } else if (command.open === false) {
    commands.push({ name: "close" });
  }

  if (typeof command.position === "number") {
    // Invert: Habitat position 75 → Overkiz closure 25
    const closure = 100 - command.position;
    commands.push({ name: "setClosure", parameters: [closure] });
  }

  if (typeof command.tilt === "number") {
    commands.push({ name: "setOrientation", parameters: [command.tilt] });
  }

  return commands;
}
