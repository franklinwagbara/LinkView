// ─── Signaling Message Types ───────────────────────────────────────────────

export type SignalingMessageType =
  | "create-room"
  | "join-room"
  | "leave-room"
  | "room-created"
  | "room-joined"
  | "room-full"
  | "peer-joined"
  | "peer-left"
  | "offer"
  | "answer"
  | "ice-candidate"
  | "error"
  | "ping"
  | "pong";

export interface SignalingMessage {
  type: SignalingMessageType;
  roomId?: string;
  peerId?: string;
  from?: string;
  to?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  peers?: string[];
  message?: string;
  isHost?: boolean;
}

// ─── Connection & Room Types ───────────────────────────────────────────────

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed";

export type RoomRole = "host" | "viewer";

export interface RoomInfo {
  roomId: string;
  role: RoomRole;
  peerId: string;
  peers: string[];
  isSharing: boolean;
}

// ─── Metrics Types ─────────────────────────────────────────────────────────

export interface ConnectionMetrics {
  timestamp: number;
  rtt: number; // Round Trip Time in ms
  jitter: number; // Jitter in ms
  packetLoss: number; // Packet loss percentage (0-100)
  bitrate: number; // Current bitrate in kbps
  frameRate: number; // Frames per second
  resolution: {
    width: number;
    height: number;
  };
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  packetsReceived: number;
}

export type NetworkHealth =
  | "excellent"
  | "good"
  | "unstable"
  | "poor"
  | "critical";

export interface HealthThresholds {
  rtt: { good: number; unstable: number; poor: number };
  packetLoss: { good: number; unstable: number; poor: number };
  jitter: { good: number; unstable: number; poor: number };
}

// ─── Quality Tiers ──────────────────────────────────────────────────────────

export type QualityTier = "high" | "medium" | "low" | "minimal";

export interface QualityPreset {
  tier: QualityTier;
  maxBitrate: number; // kbps
  maxWidth: number;
  maxHeight: number;
  maxFrameRate: number;
}

// ─── Remote Control Types ──────────────────────────────────────────────────

export type RemoteControlEventType =
  | "mouse-move"
  | "mouse-click"
  | "mouse-scroll"
  | "key-down"
  | "key-up";

export interface RemoteControlEvent {
  type: RemoteControlEventType;
  x?: number;
  y?: number;
  button?: number;
  deltaX?: number;
  deltaY?: number;
  key?: string;
  code?: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  timestamp: number;
}

// ─── DataChannel Message Types ─────────────────────────────────────────────

export type DataChannelMessageType =
  | "remote-control"
  | "cursor-position"
  | "chat"
  | "metrics-sync";

export interface DataChannelMessage {
  type: DataChannelMessageType;
  payload: unknown;
  timestamp: number;
}

// ─── Network Simulation ────────────────────────────────────────────────────

export interface NetworkSimulationConfig {
  enabled: boolean;
  latencyMs: number; // Added latency in ms
  packetLossPercent: number; // 0-100
  bandwidthKbps: number; // Max bandwidth in kbps (0 = unlimited)
}

// ─── Recording ─────────────────────────────────────────────────────────────

export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export interface RecordingInfo {
  state: RecordingState;
  startTime: number | null;
  duration: number;
  size: number;
  mimeType: string;
}

// ─── Chart Data ────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  time: string;
  timestamp: number;
  value: number;
}

export interface MetricsSnapshot {
  rtt: ChartDataPoint[];
  bitrate: ChartDataPoint[];
  packetLoss: ChartDataPoint[];
  jitter: ChartDataPoint[];
  frameRate: ChartDataPoint[];
}
