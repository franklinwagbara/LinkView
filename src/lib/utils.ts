import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NetworkHealth } from "@/types";
import { HEALTH_THRESHOLDS, ROOM_ID_LENGTH } from "./constants";

/** Merge Tailwind CSS classes with conflict resolution */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Generate a random room ID */
export function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars
  let result = "";
  const array = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(array);
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/** Generate a unique peer ID */
export function generatePeerId(): string {
  return `peer-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/** Format bytes into human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Format bitrate into human-readable string */
export function formatBitrate(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${Math.round(kbps)} kbps`;
}

/** Format duration in seconds to HH:MM:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format timestamp to HH:MM:SS for chart axis */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

/** Determine network health from metrics */
export function getNetworkHealth(
  rtt: number,
  packetLoss: number,
  jitter: number,
): NetworkHealth {
  const t = HEALTH_THRESHOLDS;

  if (
    rtt <= t.rtt.good &&
    packetLoss <= t.packetLoss.good &&
    jitter <= t.jitter.good
  ) {
    return "excellent";
  }
  if (
    rtt <= t.rtt.unstable &&
    packetLoss <= t.packetLoss.unstable &&
    jitter <= t.jitter.unstable
  ) {
    return "good";
  }
  if (
    rtt <= t.rtt.poor &&
    packetLoss <= t.packetLoss.poor &&
    jitter <= t.jitter.poor
  ) {
    return "unstable";
  }
  if (rtt > t.rtt.poor || packetLoss > t.packetLoss.poor) {
    return "critical";
  }
  return "poor";
}

/** Get color for network health */
export function getHealthColor(health: NetworkHealth): string {
  switch (health) {
    case "excellent":
      return "#10b981"; // emerald-500
    case "good":
      return "#22c55e"; // green-500
    case "unstable":
      return "#f59e0b"; // amber-500
    case "poor":
      return "#ef4444"; // red-500
    case "critical":
      return "#dc2626"; // red-600
  }
}

/** Get Tailwind color classes for network health */
export function getHealthClasses(health: NetworkHealth): string {
  switch (health) {
    case "excellent":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "good":
      return "text-green-400 bg-green-500/10 border-green-500/30";
    case "unstable":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "poor":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    case "critical":
      return "text-red-500 bg-red-600/10 border-red-600/30";
  }
}

/** Determine the signaling server URL */
export function getSignalingUrl(): string {
  if (process.env.NEXT_PUBLIC_SIGNALING_URL) {
    return process.env.NEXT_PUBLIC_SIGNALING_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
  return "ws://localhost:3000/ws";
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Exponential moving average for smoothing metrics */
export function ema(
  current: number,
  previous: number,
  alpha: number = 0.3,
): number {
  return alpha * current + (1 - alpha) * previous;
}
