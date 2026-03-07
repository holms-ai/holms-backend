import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "./trpc.js";
import { ThemeProvider, useTheme } from "./context/ThemeContext.js";
import { DeviceTokenProvider, useDeviceToken } from "./context/DeviceTokenContext.js";
import { PairingScreen } from "./components/PairingScreen.js";
import App from "./App.js";
import "./styles/globals.css";
import "./styles/grid.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function DeviceTokenGate() {
  const { token, setToken } = useDeviceToken();

  if (!token) {
    return <PairingScreen onPaired={setToken} />;
  }

  return <AuthenticatedApp token={token} />;
}

function AuthenticatedApp({ token }: { token: string }) {
  const getToken = React.useCallback(() => token, [token]);
  const { client, close } = React.useMemo(
    () => createTrpcClient(getToken),
    [getToken],
  );

  React.useEffect(() => () => { close(); }, [close]);

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function ThemedRoot() {
  const { resolved } = useTheme();

  React.useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(resolved);
  }, [resolved]);

  return <DeviceTokenGate />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DeviceTokenProvider>
      <ThemeProvider>
        <ThemedRoot />
      </ThemeProvider>
    </DeviceTokenProvider>
  </React.StrictMode>,
);
