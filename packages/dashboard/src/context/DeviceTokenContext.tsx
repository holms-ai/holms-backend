import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface DeviceTokenContextValue {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

const DeviceTokenContext = createContext<DeviceTokenContextValue | null>(null);

const STORAGE_KEY = "holms-dashboard-device-token";

export function DeviceTokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenRaw] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || stored === "undefined" || stored === "null") return null;
    return stored;
  });

  const setToken = useCallback((t: string) => {
    localStorage.setItem(STORAGE_KEY, t);
    setTokenRaw(t);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTokenRaw(null);
  }, []);

  return (
    <DeviceTokenContext.Provider value={{ token, setToken, clearToken }}>
      {children}
    </DeviceTokenContext.Provider>
  );
}

export function useDeviceToken(): DeviceTokenContextValue {
  const ctx = useContext(DeviceTokenContext);
  if (!ctx) throw new Error("useDeviceToken must be used within DeviceTokenProvider");
  return ctx;
}
