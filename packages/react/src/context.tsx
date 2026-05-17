import React, { createContext, useState, useEffect } from "react";
import { createApp } from "zerithdb-sdk";
import type { ZerithDBApp, ZerithDBConfig } from "zerithdb-sdk";

export const ZerithContext = createContext<ZerithDBApp | null>(null);

export interface ZerithProviderProps {
  config: ZerithDBConfig;
  children: React.ReactNode;
}

/**
 * Global provider for ZerithDB.
 * Initializes the P2P client and makes it available via hooks.
 * Disposes the previous client on config change or unmount to prevent
 * memory/connection leaks.
 */
export const ZerithProvider: React.FC<ZerithProviderProps> = ({ config, children }) => {
  const configStr = JSON.stringify(config);
  const [client, setClient] = useState(() => createApp(config));

  // Dispose on unmount or when config changes (new client replaces old one)
  useEffect(() => {
    const app = createApp(config);
    setClient(app);
    return () => {
      void app.dispose();
    };
  }, [configStr]);

  return <ZerithContext.Provider value={client}>{children}</ZerithContext.Provider>;
};
