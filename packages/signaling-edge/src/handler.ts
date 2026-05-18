import { SignalMessage } from "./types.js";

export class SignalingRoom {
  peers: Map<string, WebSocket> = new Map();

  addPeer(peerId: string, ws: WebSocket) {
    // Send existing peers to the new peer
    const existingPeerIds = Array.from(this.peers.keys());
    const peerListMsg: SignalMessage = { type: "peer-list", payload: existingPeerIds };
    ws.send(JSON.stringify(peerListMsg));

    // Add the new peer
    this.peers.set(peerId, ws);

    // Notify others
    this.broadcast({ type: "peer-joined", peerId }, peerId);
  }

  removePeer(peerId: string) {
    if (this.peers.has(peerId)) {
      this.peers.delete(peerId);
      this.broadcast({ type: "peer-left", peerId });
    }
  }

  relay(fromPeerId: string, message: any) {
    // Standardize message from sender
    const msg = { ...message, from: fromPeerId };
    const serialized = JSON.stringify(msg);

    if (msg.to) {
      // Unicast
      const target = this.peers.get(msg.to);
      if (target && target.readyState === 1) {
        // 1 = OPEN
        target.send(serialized);
      }
    } else {
      // Broadcast to all except sender
      this.broadcastRaw(serialized, fromPeerId);
    }
  }

  broadcast(message: SignalMessage, excludePeerId?: string) {
    const serialized = JSON.stringify(message);
    this.broadcastRaw(serialized, excludePeerId);
  }

  private broadcastRaw(serialized: string, excludePeerId?: string) {
    for (const [peerId, ws] of this.peers.entries()) {
      if (peerId !== excludePeerId && ws.readyState === 1) {
        // 1 = OPEN
        ws.send(serialized);
      }
    }
  }
}
