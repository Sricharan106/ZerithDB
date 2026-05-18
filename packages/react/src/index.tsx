import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createApp } from "zerithdb-sdk";
import type { ZerithDBConfig } from "zerithdb-sdk";

const ZerithContext = createContext<any>(null);

export interface ZerithProviderProps {
  config: ZerithDBConfig;
  children: React.ReactNode;
}

/**
 * Global provider for ZerithDB.
 * Initializes the P2P client and makes it available via hooks.
 */
export const ZerithProvider: React.FC<ZerithProviderProps> = ({ config, children }) => {
  const client = useMemo(() => createApp(config), [JSON.stringify(config)]);

  return <ZerithContext.Provider value={client}>{children}</ZerithContext.Provider>;
};

/**
 * Access the underlying ZerithDB client directly.
 */
export const useZerith = () => {
  const context = useContext(ZerithContext);
  if (!context) {
    throw new Error("useZerith must be used within a ZerithProvider");
  }
  return context;
};

/**
 * Reactive hook to query a collection.
 * Automatically updates when local or remote (P2P) changes occur.
 */
export function useQuery<T = any>(collectionName: string) {
  const db = useZerith() as any;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const collection = db.collection(collectionName);

    // Subscribe to real-time updates (CRDT merges)
    const unsubscribe = collection.subscribe((docs: any[]) => {
      if (mounted) {
        setData(docs as T[]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [db, collectionName]);

  const insert = async (item: Partial<T>) => {
    return db.collection(collectionName).insert(item);
  };

  const remove = async (id: string) => {
    return db.collection(collectionName).delete(id);
  };

  return { data, loading, error, insert, remove };
}

/**
 * Reactive hook to track connected P2P peers.
 */
export function usePeers() {
  const app = useZerith() as any;
  const [peers, setPeers] = useState<any[]>(app.network.connectedPeers);

  useEffect(() => {
    const handleConnected = (peer: any) => {
      setPeers(app.network.connectedPeers);
    };
    const handleDisconnected = () => {
      setPeers(app.network.connectedPeers);
    };

    app.network.on("peer:connected", handleConnected);
    app.network.on("peer:disconnected", handleDisconnected);

    return () => {
      app.network.off("peer:connected", handleConnected);
      app.network.off("peer:disconnected", handleDisconnected);
    };
  }, [app]);

  return peers;
}

/**
 * Interactive visualizer for the P2P social graph of connected peers.
 */
export const PeerSocialGraph: React.FC<{ width?: number; height?: number }> = ({
  width = 600,
  height = 400,
}) => {
  const peers = usePeers();
  const app = useZerith() as any;
  const localPeerId = app.network.localPeerId || "me";

  // Simple force-directed-ish layout or circle layout
  const nodes = useMemo(() => {
    const all = [
      { peerId: localPeerId, isLocal: true },
      ...peers.map((p) => ({ ...p, isLocal: false })),
    ];
    return all.map((node, i) => {
      const angle = (i / all.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.35;
      return {
        ...node,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      };
    });
  }, [peers, localPeerId, width, height]);

  return (
    <div
      className="zerith-social-graph"
      style={{
        position: "relative",
        width,
        height,
        background: "#0f172a",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <svg width={width} height={height}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {nodes
          .filter((n) => !n.isLocal)
          .map((node) => (
            <line
              key={`edge-${node.peerId}`}
              x1={width / 2}
              y1={height / 2}
              x2={node.x}
              y2={node.y}
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.peerId} transform={`translate(${node.x}, ${node.y})`}>
            <circle
              r={node.isLocal ? 12 : 10}
              fill={node.isLocal ? "#3b82f6" : "#10b981"}
              filter="url(#glow)"
            />
            <text
              y={25}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
              fontFamily="Inter, sans-serif"
            >
              {node.isLocal ? "Me (Local)" : node.peerId.slice(0, 8)}
            </text>
          </g>
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          color: "#64748b",
          fontSize: "12px",
        }}
      >
        {peers.length} Peer(s) Connected
      </div>
    </div>
  );
};
