import { create } from "zustand";
import type {
  ConnectionMetrics,
  ChartDataPoint,
  MetricsSnapshot,
  NetworkHealth,
  QualityTier,
} from "@/types";
import { METRICS_WINDOW_SIZE } from "@/lib/constants";
import { formatTime, getNetworkHealth } from "@/lib/utils";

interface MetricsStore {
  // Current metrics
  current: ConnectionMetrics | null;
  health: NetworkHealth;
  qualityTier: QualityTier;
  qualityReason: string;

  // Historical data for charts
  history: MetricsSnapshot;

  // Actions
  pushMetrics: (metrics: ConnectionMetrics) => void;
  setQuality: (tier: QualityTier, reason: string) => void;
  reset: () => void;
}

function createEmptySnapshot(): MetricsSnapshot {
  return {
    rtt: [],
    bitrate: [],
    packetLoss: [],
    jitter: [],
    frameRate: [],
  };
}

function pushPoint(
  arr: ChartDataPoint[],
  timestamp: number,
  value: number,
  maxSize: number,
): ChartDataPoint[] {
  const point: ChartDataPoint = {
    time: formatTime(timestamp),
    timestamp,
    value: Math.round(value * 100) / 100,
  };
  const next = [...arr, point];
  if (next.length > maxSize) {
    return next.slice(next.length - maxSize);
  }
  return next;
}

export const useMetricsStore = create<MetricsStore>((set) => ({
  current: null,
  health: "good",
  qualityTier: "high",
  qualityReason: "",
  history: createEmptySnapshot(),

  pushMetrics: (metrics) =>
    set((state) => {
      const ts = metrics.timestamp;
      const maxSize = METRICS_WINDOW_SIZE;

      return {
        current: metrics,
        health: getNetworkHealth(
          metrics.rtt,
          metrics.packetLoss,
          metrics.jitter,
        ),
        history: {
          rtt: pushPoint(state.history.rtt, ts, metrics.rtt, maxSize),
          bitrate: pushPoint(
            state.history.bitrate,
            ts,
            metrics.bitrate,
            maxSize,
          ),
          packetLoss: pushPoint(
            state.history.packetLoss,
            ts,
            metrics.packetLoss,
            maxSize,
          ),
          jitter: pushPoint(state.history.jitter, ts, metrics.jitter, maxSize),
          frameRate: pushPoint(
            state.history.frameRate,
            ts,
            metrics.frameRate,
            maxSize,
          ),
        },
      };
    }),

  setQuality: (tier, reason) =>
    set({ qualityTier: tier, qualityReason: reason }),

  reset: () =>
    set({
      current: null,
      health: "good",
      qualityTier: "high",
      qualityReason: "",
      history: createEmptySnapshot(),
    }),
}));
