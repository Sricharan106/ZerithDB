import { useState, useEffect } from "react";
import { createApp, type ZerithDBApp } from "zerithdb-sdk";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

export function useZerithDoc(docId: string) {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<{ awareness: Awareness } | null>(null);
  const [app, setApp] = useState<ZerithDBApp | null>(null);

  useEffect(() => {
    const newApp = createApp({
      appId: "collab-editor-demo",
      sync: {
        // In a real app, you'd use a production signaling server
        signalingUrl: "wss://signal.zerithdb.dev",
      },
    });

    // Get the Yjs doc and awareness instance from ZerithDB
    const doc = newApp.sync.getYDoc(docId);
    const awareness = newApp.sync.getAwareness(docId);

    setYdoc(doc);
    setProvider({ awareness });
    setApp(newApp);

    // Enable sync to start connecting to peers
    newApp.sync.enable();

    return () => {
      newApp.dispose();
    };
  }, [docId]);

  return { ydoc, provider, app };
}
