export type SignalMessage =
  | { type: "offer"; sdp: string; roomId: string; peerId: string; to?: string }
  | { type: "answer"; sdp: string; roomId: string; peerId: string; to?: string }
  | { type: "ice-candidate"; candidate: string; roomId: string; peerId: string; to?: string }
  | { type: "join"; roomId: string; peerId: string }
  | { type: "leave"; roomId: string; peerId: string }
  | { type: "peer-joined"; peerId: string }
  | { type: "peer-left"; peerId: string }
  | { type: "peer-list"; payload: string[] };

export interface Peer {
  peerId: string;
  ws: WebSocket;
}
