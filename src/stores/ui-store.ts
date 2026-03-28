import { create } from "zustand";
import type { NetworkSimulationConfig, RecordingState } from "@/types";

interface UIStore {
  // Panel visibility
  showMetrics: boolean;
  showSimulator: boolean;
  showParticipants: boolean;

  // Recording
  recordingState: RecordingState;
  recordingDuration: number;
  recordingSize: number;

  // Network simulation
  simulation: NetworkSimulationConfig;

  // Notifications
  toasts: Toast[];

  // Actions
  toggleMetrics: () => void;
  toggleSimulator: () => void;
  toggleParticipants: () => void;

  setRecordingState: (state: RecordingState) => void;
  setRecordingInfo: (duration: number, size: number) => void;

  setSimulation: (config: Partial<NetworkSimulationConfig>) => void;

  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  duration?: number;
}

export const useUIStore = create<UIStore>((set) => ({
  showMetrics: true,
  showSimulator: false,
  showParticipants: false,

  recordingState: "idle",
  recordingDuration: 0,
  recordingSize: 0,

  simulation: {
    enabled: false,
    latencyMs: 0,
    packetLossPercent: 0,
    bandwidthKbps: 0,
  },

  toasts: [],

  toggleMetrics: () => set((s) => ({ showMetrics: !s.showMetrics })),
  toggleSimulator: () => set((s) => ({ showSimulator: !s.showSimulator })),
  toggleParticipants: () =>
    set((s) => ({ showParticipants: !s.showParticipants })),

  setRecordingState: (recordingState) => set({ recordingState }),
  setRecordingInfo: (recordingDuration, recordingSize) =>
    set({ recordingDuration, recordingSize }),

  setSimulation: (config) =>
    set((s) => ({
      simulation: { ...s.simulation, ...config },
    })),

  addToast: (toast) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          ...toast,
          id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        },
      ],
    })),

  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),
}));
