import { create } from "zustand";
import type { ConnectionState, RoomRole } from "@/types";

interface ConnectionStore {
  // State
  connectionState: ConnectionState;
  iceState: RTCIceConnectionState | null;
  signalingConnected: boolean;
  peerId: string | null;
  remotePeers: string[];

  // Room
  roomId: string | null;
  role: RoomRole | null;
  isSharing: boolean;

  // Error
  error: string | null;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setIceState: (state: RTCIceConnectionState) => void;
  setSignalingConnected: (connected: boolean) => void;
  setPeerId: (id: string) => void;
  setRoom: (roomId: string, role: RoomRole) => void;
  setIsSharing: (sharing: boolean) => void;
  addPeer: (peerId: string) => void;
  removePeer: (peerId: string) => void;
  setPeers: (peers: string[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  connectionState: "idle" as ConnectionState,
  iceState: null as RTCIceConnectionState | null,
  signalingConnected: false,
  peerId: null as string | null,
  remotePeers: [] as string[],
  roomId: null as string | null,
  role: null as RoomRole | null,
  isSharing: false,
  error: null as string | null,
};

export const useConnectionStore = create<ConnectionStore>((set) => ({
  ...initialState,

  setConnectionState: (connectionState) =>
    set({ connectionState, error: null }),
  setIceState: (iceState) => set({ iceState }),
  setSignalingConnected: (signalingConnected) => set({ signalingConnected }),
  setPeerId: (peerId) => set({ peerId }),

  setRoom: (roomId, role) => set({ roomId, role }),
  setIsSharing: (isSharing) => set({ isSharing }),

  addPeer: (peerId) =>
    set((state) => ({
      remotePeers: state.remotePeers.includes(peerId)
        ? state.remotePeers
        : [...state.remotePeers, peerId],
    })),

  removePeer: (peerId) =>
    set((state) => ({
      remotePeers: state.remotePeers.filter((id) => id !== peerId),
    })),

  setPeers: (peers) => set({ remotePeers: peers }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
