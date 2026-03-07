import { createTRPCReact } from "@trpc/react-query";
import {
  httpBatchLink,
  splitLink,
  wsLink,
  createWSClient,
} from "@trpc/client";
import type { AppRouter } from "../../daemon/src/api/router.js";

export const trpc = createTRPCReact<AppRouter>();

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const httpUrl = `${window.location.origin}/trpc`;

export function createTrpcClient(getToken: () => string | null) {
  function getAuthHeaders(): Record<string, string> {
    const token = getToken();
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }

  function makeWsUrl(): string {
    const token = getToken();
    const base = `${wsProtocol}//${window.location.host}/trpc`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  }

  const wsClient = createWSClient({ url: makeWsUrl });

  const client = trpc.createClient({
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: wsLink({ client: wsClient }),
        false: httpBatchLink({ url: httpUrl, headers: getAuthHeaders }),
      }),
    ],
  });

  return { client, close: () => wsClient.close() };
}
