// ── Somfy Adapter Config ────────────────────────────────────────────────────

export interface SomfyAdapterConfig {
  host: string;              // gateway-XXXX-XXXX-XXXX.local or IP
  token: string;             // local API bearer token
  gateway_pin: string;       // XXXX-XXXX-XXXX
  port?: number;             // default 8443
  poll_interval_ms?: number; // default 5000
}

// ── Overkiz API Types ──────────────────────────────────────────────────────

export interface OverkizDevice {
  deviceURL: string;
  label: string;
  controllableName: string;
  definition: OverkizDeviceDefinition;
  states: OverkizState[];
  available: boolean;
  enabled: boolean;
  placeOID: string;
  widget: string;
  type: number;
}

export interface OverkizDeviceDefinition {
  commands: OverkizCommandDefinition[];
  states: OverkizStateDefinition[];
  widgetName: string;
  uiClass: string;
  qualifiedName: string;
}

export interface OverkizCommandDefinition {
  commandName: string;
  nparams: number;
}

export interface OverkizStateDefinition {
  qualifiedName: string;
  type: string;
}

export interface OverkizState {
  name: string;
  type: number;
  value: unknown;
}

export interface OverkizExecution {
  label: string;
  actions: OverkizAction[];
}

export interface OverkizAction {
  deviceURL: string;
  commands: OverkizCommand[];
}

export interface OverkizCommand {
  name: string;
  parameters?: unknown[];
}

export interface OverkizEvent {
  timestamp: number;
  name: string;
  deviceURL?: string;
  deviceStates?: OverkizState[];
  execId?: string;
  newState?: string;
  oldState?: string;
  failureType?: string;
}

// ── Discovery Types ────────────────────────────────────────────────────────

export interface DiscoveredGateway {
  pin: string;
  host: string;
  name: string;
}

// ── Shading UIClasses we handle ────────────────────────────────────────────

export const SHADING_UI_CLASSES = new Set([
  "RollerShutter",
  "ExteriorScreen",
  "Screen",
  "Shutter",
  "Awning",
  "Curtain",
  "Pergola",
  "ExteriorVenetianBlind",
  "VenetianBlind",
  "SwingingShutter",
]);
