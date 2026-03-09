import {
  runAdapter,
  type Adapter,
  type AdapterFactory,
  type EntityRegistration,
  type EntityGroup,
  type RegistrationResult,
  type PropertyName,
  type DiscoverResult,
  type PairResult,
} from "@holms/adapter-sdk";
import type { SomfyAdapterConfig, OverkizDevice, OverkizEvent } from "./types.js";
import { SHADING_UI_CLASSES } from "./types.js";
import { OverkizClient } from "./overkiz-client.js";
import { discoverGateways, cloudLogin, generateLocalToken } from "./discovery.js";
import { deviceToEntity, stateToShading, shadingToCommands } from "./translators.js";

export class SomfyAdapter implements Adapter {
  private client: OverkizClient | null = null;
  private configured: boolean;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private listenerId: string | null = null;
  private devices = new Map<string, OverkizDevice>();
  private config: SomfyAdapterConfig;

  constructor(config: Record<string, unknown>) {
    this.config = config as unknown as SomfyAdapterConfig;
    if (!this.config.host || !this.config.token) {
      this.configured = false;
      return;
    }
    this.configured = true;
    this.client = new OverkizClient(
      this.config.host,
      this.config.token,
      this.config.port ?? 8443,
    );
  }

  async register(): Promise<RegistrationResult> {
    if (!this.configured || !this.client) return { entities: [] };

    let allDevices: OverkizDevice[];
    try {
      allDevices = await this.client.getDevices();
    } catch (err) {
      console.error(`[somfy] Failed to connect to gateway at ${this.config.host}: ${err instanceof Error ? err.message : err}`);
      console.error("[somfy] Re-run the Somfy setup to fix the adapter configuration.");
      return { entities: [] };
    }

    const registrations: EntityRegistration[] = [];
    const placeGroups = new Map<string, string[]>();

    for (const device of allDevices) {
      if (!SHADING_UI_CLASSES.has(device.definition.uiClass)) continue;

      const entity = deviceToEntity(device);
      if (!entity) continue;

      this.devices.set(device.deviceURL, device);
      registrations.push(entity);

      // Group by Overkiz place hierarchy
      const placeId = device.placeOID || "default";
      const group = placeGroups.get(placeId) ?? [];
      group.push(entity.entityId);
      placeGroups.set(placeId, group);
    }

    // Build groups from place hierarchy
    const groups: EntityGroup[] = [];
    for (const [placeId, entityIds] of placeGroups) {
      if (entityIds.length > 0) {
        groups.push({
          id: placeId,
          name: placeId === "default" ? "Ungrouped" : placeId,
          type: "room",
          entityIds,
        });
      }
    }

    return { entities: registrations, groups: groups.length > 0 ? groups : undefined };
  }

  async observe(entityId: string, property: PropertyName): Promise<Record<string, unknown>> {
    if (!this.configured || !this.client) throw new Error("Adapter not configured");
    if (property !== "shading") throw new Error(`Unsupported property: "${property}". Somfy adapter only supports "shading" — update the source property mapping.`);

    // Re-fetch device state
    const allDevices = await this.client.getDevices();
    const device = allDevices.find((d) => d.deviceURL === entityId);
    if (!device) throw new Error(`Unknown entity: ${entityId}`);

    this.devices.set(entityId, device);
    return stateToShading(device.states);
  }

  async execute(
    entityId: string,
    property: PropertyName,
    command: Record<string, unknown>,
  ): Promise<void> {
    if (!this.configured || !this.client) throw new Error("Adapter not configured");
    if (property !== "shading") throw new Error(`Unsupported property: "${property}". Somfy adapter only supports "shading" — update the source property mapping.`);

    const overkizCommands = shadingToCommands(command);
    if (overkizCommands.length === 0) return;

    await this.client.executeCommand({
      label: `holms-${Date.now()}`,
      actions: [
        {
          deviceURL: entityId,
          commands: overkizCommands,
        },
      ],
    });
  }

  async subscribe(
    cb: (entityId: string, property: PropertyName, state: Record<string, unknown>) => void,
  ): Promise<void> {
    if (!this.configured || !this.client || this.devices.size === 0) return;

    try {
      this.listenerId = await this.client.registerEventListener();
    } catch {
      // Event listener registration failed — fall back to polling without events
      this.listenerId = null;
    }

    const pollMs = this.config.poll_interval_ms ?? 5000;

    this.pollInterval = setInterval(async () => {
      try {
        if (this.listenerId) {
          await this.pollEvents(cb);
        } else {
          await this.pollAllDevices(cb);
        }
      } catch {
        // Silently retry on next poll
      }
    }, pollMs);
  }

  private async pollEvents(
    cb: (entityId: string, property: PropertyName, state: Record<string, unknown>) => void,
  ): Promise<void> {
    if (!this.client || !this.listenerId) return;

    let events: OverkizEvent[];
    try {
      events = await this.client.fetchEvents(this.listenerId);
    } catch {
      // Listener may have expired — re-register
      try {
        this.listenerId = await this.client.registerEventListener();
      } catch {
        this.listenerId = null;
      }
      return;
    }

    for (const event of events) {
      if (event.name === "DeviceStateChangedEvent" && event.deviceURL && event.deviceStates) {
        const device = this.devices.get(event.deviceURL);
        if (!device) continue;

        // Update cached states
        for (const newState of event.deviceStates) {
          const idx = device.states.findIndex((s) => s.name === newState.name);
          if (idx >= 0) {
            device.states[idx] = newState;
          } else {
            device.states.push(newState);
          }
        }

        const state = stateToShading(device.states);
        cb(event.deviceURL, "shading", state);
      }
    }
  }

  private async pollAllDevices(
    cb: (entityId: string, property: PropertyName, state: Record<string, unknown>) => void,
  ): Promise<void> {
    if (!this.client) return;

    const allDevices = await this.client.getDevices();
    for (const device of allDevices) {
      if (!this.devices.has(device.deviceURL)) continue;

      const prevDevice = this.devices.get(device.deviceURL)!;
      const prevState = stateToShading(prevDevice.states);
      const newState = stateToShading(device.states);

      this.devices.set(device.deviceURL, device);

      if (JSON.stringify(newState) !== JSON.stringify(prevState)) {
        cb(device.deviceURL, "shading", newState);
      }
    }
  }

  async ping(): Promise<boolean> {
    if (!this.configured || !this.client) return true;
    try {
      return await this.client.ping();
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.client?.destroy();
    this.devices.clear();
    this.listenerId = null;
  }

  async discover(_params: Record<string, unknown>): Promise<DiscoverResult> {
    const timeout = (_params.timeout as number) ?? 10000;
    const gateways = await discoverGateways(timeout);
    if (gateways.length === 0) {
      return {
        gateways: [],
        message: "No TaHoma gateways found on the network. Ensure the gateway is powered on and connected to the same network. mDNS must not be blocked between the daemon and the gateway.",
      };
    }
    return {
      gateways: gateways.map((g) => ({
        id: g.pin,
        name: g.name,
        address: g.host,
      })),
    };
  }

  async pair(params: Record<string, unknown>): Promise<PairResult> {
    const email = params.email as string;
    const password = params.password as string;
    const server = (params.server as string) ?? undefined;

    if (!email || !password) {
      return { success: false, error: "email and password are required (Somfy cloud credentials, used once for token generation)" };
    }

    try {
      // Step 1: Authenticate and fetch gateways from the account
      const { accessToken, gateways } = await cloudLogin(email, password, server);

      if (gateways.length === 0) {
        return { success: false, error: "No gateways found on this Somfy account. Register your TaHoma gateway in the Somfy app first." };
      }

      // Step 2: Pick gateway — use explicit gateway_pin if provided, otherwise first alive gateway
      const requestedPin = (params.gateway_pin ?? params.pin) as string | undefined;
      const gateway = requestedPin
        ? gateways.find((g) => g.gatewayId === requestedPin)
        : gateways.find((g) => g.alive) ?? gateways[0];

      if (!gateway) {
        return {
          success: false,
          error: `Gateway ${requestedPin} not found on this account. Available: ${gateways.map((g) => g.gatewayId).join(", ")}`,
        };
      }

      const gatewayPin = gateway.gatewayId;

      // Step 3: Generate local API token
      const token = await generateLocalToken(accessToken, gatewayPin, server);

      // Step 4: Resolve local gateway address
      let host = (params.address as string) || "";
      if (!host) {
        // Try mDNS to find the gateway's local IP
        const discovered = await discoverGateways(5000);
        const match = discovered.find((g) => g.pin === gatewayPin);
        host = match?.host ?? "";
      }

      if (!host) {
        // Could not auto-discover — need the user to provide the IP
        return {
          success: true,
          credentials: { token, gateway_pin: gatewayPin },
          message: `Token generated for gateway ${gatewayPin}, but the gateway was not found on the local network via mDNS. Ask the user for the local IP address of their TaHoma gateway (check their router's DHCP table or the TaHoma app). Then re-call pair with address set to that IP.`,
        };
      }

      return {
        success: true,
        credentials: { token, host, gateway_pin: gatewayPin },
        message: gateways.length > 1
          ? `Paired with gateway ${gatewayPin}. ${gateways.length} gateways on this account: ${gateways.map((g) => g.gatewayId).join(", ")}`
          : undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

const createSomfyAdapter: AdapterFactory = (config) => new SomfyAdapter(config);
export default createSomfyAdapter;

// Standalone entry point — when run as a process, start the SDK harness
runAdapter(createSomfyAdapter);
