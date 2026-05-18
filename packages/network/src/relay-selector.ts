import type { PeerId } from "zerithdb-core";

/**
 * Implements intelligent peer selection for O(log n) network discovery.
 * Instead of a full mesh, each peer maintains a structured set of connections
 * based on XOR distance (Kademlia-style).
 */
export class RelaySelector {
  constructor(private readonly localPeerId: PeerId) {}

  /**
   * Given a list of available peers, returns the subset that this peer
   * should maintain active connections with to ensure O(log n) reachability.
   */
  selectPeers(allPeers: PeerId[], maxConnections: number = 20): PeerId[] {
    if (allPeers.length <= maxConnections) return allPeers;

    // Calculate XOR distance and group into buckets
    // For simplicity, we'll pick the 'closest' peers in different ID ranges
    const sorted = [...allPeers].sort((a, b) => {
      const distA = this.distance(this.localPeerId, a);
      const distB = this.distance(this.localPeerId, b);
      return this.compareDistances(distA, distB);
    });

    // Pick peers at exponential distances
    const selected = new Set<PeerId>();

    // Always include some closest peers
    for (let i = 0; i < Math.min(sorted.length, Math.floor(maxConnections / 2)); i++) {
      selected.add(sorted[i]);
    }

    // Pick peers across the ID space (fingers)
    for (let i = 1; i < 256 && selected.size < maxConnections; i *= 2) {
      const index = Math.min(sorted.length - 1, i);
      selected.add(sorted[index]);
    }

    return Array.from(selected);
  }

  /**
   * Determines if a message for a target should be handled by us
   * or relayed to another peer.
   */
  getNextHop(targetPeerId: PeerId, connectedPeers: PeerId[]): PeerId | null {
    if (connectedPeers.includes(targetPeerId)) return targetPeerId;

    let bestPeer = null;
    let minDistance = this.distance(this.localPeerId, targetPeerId);

    for (const peerId of connectedPeers) {
      const dist = this.distance(peerId, targetPeerId);
      if (this.compareDistances(dist, minDistance) < 0) {
        minDistance = dist;
        bestPeer = peerId;
      }
    }

    return bestPeer;
  }

  private distance(a: string, b: string): Uint8Array {
    // Simple XOR distance on first 16 bytes of UUID/ID
    // Assuming PeerId is a string (UUID)
    const bufA = new TextEncoder().encode(a.replace(/-/g, "").slice(0, 32));
    const bufB = new TextEncoder().encode(b.replace(/-/g, "").slice(0, 32));
    const dist = new Uint8Array(Math.min(bufA.length, bufB.length));
    for (let i = 0; i < dist.length; i++) {
      dist[i] = bufA[i] ^ bufB[i];
    }
    return dist;
  }

  private compareDistances(a: Uint8Array, b: Uint8Array): number {
    for (let i = 0; i < a.length; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return 0;
  }
}
