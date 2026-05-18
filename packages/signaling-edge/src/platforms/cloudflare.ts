import { SignalingRoom } from "../handler.js";

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace;
}

export class SignalingDurableObject {
  private room = new SignalingRoom();
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const peerId = url.searchParams.get("peerId");

    if (!peerId) {
      return new Response("Missing peerId", { status: 400 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected upgrade to websocket", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    this.room.addPeer(peerId, server);

    server.accept();
    server.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        this.room.relay(peerId, msg);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    });

    server.addEventListener("close", () => {
      this.room.removePeer(peerId);
    });

    server.addEventListener("error", () => {
      this.room.removePeer(peerId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");

    if (!roomId) {
      return new Response("Missing roomId", { status: 400 });
    }

    const id = env.SIGNALING_ROOM.idFromName(roomId);
    const stub = env.SIGNALING_ROOM.get(id);

    return stub.fetch(request);
  },
};
