import { SignalingRoom } from "../handler.js";

export const runtime = "edge";

const rooms = new Map<string, SignalingRoom>();

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get("roomId");
  const peerId = url.searchParams.get("peerId");

  if (!roomId || !peerId) {
    return new Response("Missing roomId or peerId", { status: 400 });
  }

  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    return new Response("Expected upgrade to websocket", { status: 426 });
  }

  // @ts-ignore - WebSocketPair is not in standard types but available in some edge runtimes
  const { 0: client, 1: server } = new WebSocketPair();

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new SignalingRoom());
  }
  const room = rooms.get(roomId)!;

  room.addPeer(peerId, server);

  server.accept();
  server.addEventListener("message", (event: any) => {
    try {
      const msg = JSON.parse(event.data);
      room.relay(peerId, msg);
    } catch (e) {
      console.error("Failed to parse message", e);
    }
  });

  server.addEventListener("close", () => {
    room.removePeer(peerId);
    if (room.peers.size === 0) {
      rooms.delete(roomId);
    }
  });

  return new Response(null, {
    status: 101,
    // @ts-ignore
    webSocket: client,
  });
}
