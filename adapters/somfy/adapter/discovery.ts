import https from "node:https";
import type { DiscoveredGateway } from "./types.js";

/**
 * Discover TaHoma gateways on the local network via mDNS.
 * Browses for `_kizbox._tcp.local` services.
 */
export async function discoverGateways(timeoutMs = 10_000): Promise<DiscoveredGateway[]> {
  const mod = await import("bonjour-service");
  const BonjourClass = mod.Bonjour ?? mod.default;
  const bonjour = new BonjourClass();

  return new Promise<DiscoveredGateway[]>((resolve) => {
    const gateways: DiscoveredGateway[] = [];
    const seen = new Set<string>();

    const browser = bonjour.find({ type: "kizbox" }, (service: any) => {
      const ip = (service.addresses as string[] | undefined)?.find((a: string) => a.includes("."));
      if (!ip || seen.has(ip)) return;
      seen.add(ip);

      // Extract gateway PIN from TXT record or hostname
      const pin = service.txt?.gateway_pin
        ?? service.txt?.pin
        ?? extractPinFromHost(service.host ?? "");

      gateways.push({
        pin: pin || "unknown",
        host: service.host ?? ip,
        name: service.name ?? `TaHoma (${ip})`,
      });
    });

    setTimeout(() => {
      browser.stop();
      bonjour.destroy();
      resolve(gateways);
    }, timeoutMs);
  });
}

function extractPinFromHost(host: string): string {
  // Host is typically "gateway-XXXX-XXXX-XXXX.local"
  const match = host.match(/gateway-(\d{4}-\d{4}-\d{4})/);
  return match ? match[1] : "";
}

// ── Cloud API Types ────────────────────────────────────────────────────────

export interface CloudGateway {
  gatewayId: string;
  alive: boolean;
  mode: string;
  connectivity: { status: string };
  functions?: string;
  subType?: number;
}

export interface PairResultData {
  token: string;
  gateway_pin: string;
  host: string;
}

/**
 * Authenticate with Somfy cloud and list gateways on the account.
 * Returns cloud access token + gateway list so the caller can pick one.
 */
export async function cloudLogin(
  email: string,
  password: string,
  server = "ha101-1.overkiz.com",
): Promise<{ accessToken: string; gateways: CloudGateway[] }> {
  // Step 1: Somfy OAuth2 — get cloud access token via JWT grant
  const tokenBody = new URLSearchParams({
    grant_type: "password",
    username: email,
    password,
    client_id: "0d8e920c-1478-11e7-a377-02dd59bd3041_1ewvaqmclfogo4kcsoo0c8k4kso884owg08sg8c40sk4go4ksg",
    client_secret: "12k73w1n540g8o4cokg0cw84cog840k84cwggscwg884004kgk",
  }).toString();

  const cloudToken = await httpsPost<{ access_token: string }>(
    "accounts.somfy.com",
    "/oauth/oauth/v2/token/jwt",
    tokenBody,
    { "Content-Type": "application/x-www-form-urlencoded" },
  );

  // Step 2: Fetch gateways from the account
  const gateways = await httpsGet<CloudGateway[]>(
    server,
    "/enduser-mobile-web/enduserAPI/setup/gateways",
    { Authorization: `Bearer ${cloudToken.access_token}` },
  );

  return { accessToken: cloudToken.access_token, gateways };
}

/**
 * Generate a local API token for a specific gateway.
 *
 * Flow:
 * 1. Generate a token via the cloud API
 * 2. Activate the token on the gateway
 *
 * Cloud credentials are used once and never stored.
 */
export async function generateLocalToken(
  accessToken: string,
  gatewayPin: string,
  server = "ha101-1.overkiz.com",
): Promise<string> {
  const generateResult = await httpsGet<{ token: string }>(
    server,
    `/enduser-mobile-web/enduserAPI/config/${gatewayPin}/local/tokens/generate`,
    { Authorization: `Bearer ${accessToken}` },
  );

  const localToken = generateResult.token;

  await httpsPost(
    server,
    `/enduser-mobile-web/enduserAPI/config/${gatewayPin}/local/tokens`,
    JSON.stringify({ label: "holms", token: localToken, scope: "devmode" }),
    {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  );

  return localToken;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function httpsPost<T>(
  hostname: string,
  path: string,
  body: string,
  headers: Record<string, string>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const req = https.request(
      { hostname, port: 443, path, method: "POST", headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTPS POST ${hostname}${path}: HTTP ${res.statusCode} — ${raw}`));
            return;
          }
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            reject(new Error(`Invalid JSON from ${hostname}${path}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpsGet<T>(
  hostname: string,
  path: string,
  headers: Record<string, string>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const req = https.request(
      { hostname, port: 443, path, method: "GET", headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTPS GET ${hostname}${path}: HTTP ${res.statusCode} — ${raw}`));
            return;
          }
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            reject(new Error(`Invalid JSON from ${hostname}${path}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}
