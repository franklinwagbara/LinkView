import { WebSocket } from "ws";

// ─── Server-Side Types ──────────────────────────────────────────────────────

export interface Peer {
  id: string;
  ws: WebSocket;
  roomId: string | null;
  isHost: boolean;
  joinedAt: number;
}

export interface Room {
  id: string;
  hostId: string;
  peers: Map<string, Peer>;
  createdAt: number;
  maxViewers: number;
}

export interface SignalingMessage {
  type: string;
  roomId?: string;
  peerId?: string;
  from?: string;
  to?: string;
  sdp?: unknown;
  candidate?: unknown;
  peers?: string[];
  message?: string;
  isHost?: boolean;
}
