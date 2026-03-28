import type { QualityPreset, HealthThresholds } from "@/types";

// ─── WebRTC Configuration ──────────────────────────────────────────────────

const stunUrls = (
  process.env.NEXT_PUBLIC_STUN_URLS ||
  "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302,stun:stun3.l.google.com:19302,stun:stun4.l.google.com:19302"
).split(",");

const iceServers: RTCIceServer[] = [{ urls: stunUrls }];

// Add TURN servers from environment variables
if (process.env.NEXT_PUBLIC_TURN_URLS) {
  iceServers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URLS.split(","),
    username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
  });
} else if (process.env.NEXT_PUBLIC_TURN_URL) {
  iceServers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
  });
} else {
  // Free TURN relay servers (OpenRelay by Metered.ca) — required for
  // cross-network connections where STUN alone can't traverse symmetric NATs.
  // These are free community TURN servers; replace with your own for production.
  iceServers.push(
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "e9b4139634a9e32ab5641fa5",
      credential: "IhmXfxTVIkgxZLzl",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "e9b4139634a9e32ab5641fa5",
      credential: "IhmXfxTVIkgxZLzl",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "e9b4139634a9e32ab5641fa5",
      credential: "IhmXfxTVIkgxZLzl",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "e9b4139634a9e32ab5641fa5",
      credential: "IhmXfxTVIkgxZLzl",
    },
  );
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceTransportPolicy: "all",
};

// ─── Quality Presets ────────────────────────────────────────────────────────

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  high: {
    tier: "high",
    maxBitrate: 3000,
    maxWidth: 1920,
    maxHeight: 1080,
    maxFrameRate: 30,
  },
  medium: {
    tier: "medium",
    maxBitrate: 1500,
    maxWidth: 1280,
    maxHeight: 720,
    maxFrameRate: 24,
  },
  low: {
    tier: "low",
    maxBitrate: 500,
    maxWidth: 854,
    maxHeight: 480,
    maxFrameRate: 15,
  },
  minimal: {
    tier: "minimal",
    maxBitrate: 200,
    maxWidth: 640,
    maxHeight: 360,
    maxFrameRate: 10,
  },
};

// ─── Health Thresholds ──────────────────────────────────────────────────────

export const HEALTH_THRESHOLDS: HealthThresholds = {
  rtt: { good: 100, unstable: 200, poor: 400 },
  packetLoss: { good: 1, unstable: 5, poor: 15 },
  jitter: { good: 20, unstable: 50, poor: 100 },
};

// ─── Metrics Configuration ─────────────────────────────────────────────────

export const METRICS_INTERVAL_MS = 1000; // Collect stats every 1 second
export const METRICS_WINDOW_SIZE = 60; // Keep 60 data points (60 seconds)
export const METRICS_CHART_POINTS = 30; // Show 30 points on charts

// ─── Reconnection Configuration ─────────────────────────────────────────────

export const RECONNECT_BASE_DELAY_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 30000;
export const RECONNECT_MAX_ATTEMPTS = 10;
export const RECONNECT_BACKOFF_FACTOR = 1.5;

// ─── Signaling Configuration ────────────────────────────────────────────────

export const SIGNALING_PING_INTERVAL_MS = 15000;
export const SIGNALING_PONG_TIMEOUT_MS = 5000;

// ─── Display Media Constraints ──────────────────────────────────────────────

export const DEFAULT_DISPLAY_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 48000,
  },
};

// ─── DataChannel Configuration ──────────────────────────────────────────────

export const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true,
  maxRetransmits: 3,
};

export const CONTROL_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: false,
  maxRetransmits: 0,
};

// ─── Room Configuration ─────────────────────────────────────────────────────

export const MAX_VIEWERS_PER_ROOM = 10;
export const ROOM_ID_LENGTH = 6;

// ─── Recording Configuration ────────────────────────────────────────────────

export const RECORDING_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
  "video/mp4",
];

export const RECORDING_TIMESLICE_MS = 1000;
