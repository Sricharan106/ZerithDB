import { useState, useEffect } from "react";
import { Editor } from "./Editor";
import { useZerithDoc } from "./useZerithDoc";
import "./App.css";

function OnlinePeersIndicator({ provider }: { provider: any }) {
  const [peers, setPeers] = useState<number>(0);

  useEffect(() => {
    if (!provider) return;

    const updatePeers = () => {
      setPeers(provider.awareness.getStates().size);
    };

    provider.awareness.on("change", updatePeers);
    updatePeers();

    return () => {
      provider.awareness.off("change", updatePeers);
    };
  }, [provider]);

  return (
    <div className="peers-indicator">
      <span className="dot"></span>
      {peers} {peers === 1 ? "person" : "people"} editing
    </div>
  );
}

function SyncStatusBadge({ app }: { app: any }) {
  const [status, setStatus] = useState({ synced: false, connectedPeers: 0 });

  useEffect(() => {
    if (!app) return;

    const updateStatus = (state: any) => {
      setStatus({
        synced: state.synced,
        connectedPeers: state.connectedPeers,
      });
    };

    app.sync.on("state:change", updateStatus);
    updateStatus(app.sync.state);

    return () => {
      app.sync.off("state:change", updateStatus);
    };
  }, [app]);

  return (
    <div className={`status-badge ${status.synced ? "online" : "offline"}`}>
      {status.synced ? "Online" : "Offline"} ({status.connectedPeers} peers)
    </div>
  );
}

export default function App() {
  const docId = "demo-collab-doc";
  const { provider, app } = useZerithDoc(docId);

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <h1>📝 ZerithDB Collab</h1>
          <OnlinePeersIndicator provider={provider} />
        </div>
        <p className="subtitle">
          Open this page in another tab to see real-time collaboration. No server required.
        </p>
      </header>

      <main>
        <Editor docId={docId} />
      </main>

      <footer>
        <SyncStatusBadge app={app} />
        <div className="powered-by">Powered by ZerithDB + TipTap</div>
      </footer>
    </div>
  );
}
