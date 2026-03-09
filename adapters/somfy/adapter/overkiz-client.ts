import https from "node:https";
import type {
  OverkizDevice,
  OverkizExecution,
  OverkizEvent,
} from "./types.js";

export class OverkizClient {
  private agent: https.Agent;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(host: string, token: string, port = 8443) {
    this.agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
    this.baseUrl = `https://${host}:${port}/enduser-mobile-web/1/enduserAPI`;
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  private request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const parsed = new URL(url);
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          method,
          agent: this.agent,
          headers: this.headers,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf-8");
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Overkiz API ${method} ${path}: HTTP ${res.statusCode} — ${raw}`));
              return;
            }
            if (!raw || raw.trim() === "") {
              resolve(undefined as T);
              return;
            }
            try {
              resolve(JSON.parse(raw) as T);
            } catch {
              reject(new Error(`Overkiz API: invalid JSON from ${path}`));
            }
          });
        },
      );
      req.on("error", reject);
      if (body !== undefined) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async getDevices(): Promise<OverkizDevice[]> {
    return this.request<OverkizDevice[]>("GET", "/setup/devices");
  }

  async executeCommand(execution: OverkizExecution): Promise<string> {
    const result = await this.request<{ execId: string }>("POST", "/exec/apply", execution);
    return result.execId;
  }

  async registerEventListener(): Promise<string> {
    const result = await this.request<{ id: string }>("POST", "/events/register");
    return result.id;
  }

  async fetchEvents(listenerId: string): Promise<OverkizEvent[]> {
    return this.request<OverkizEvent[]>("POST", `/events/${listenerId}/fetch`);
  }

  async ping(): Promise<boolean> {
    try {
      await this.request("GET", "/apiVersion");
      return true;
    } catch {
      return false;
    }
  }

  destroy(): void {
    this.agent.destroy();
  }
}
