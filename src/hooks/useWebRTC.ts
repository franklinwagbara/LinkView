"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { PeerConnectionManager } from "@/lib/peer-connection";
import { captureDisplay, stopStream } from "@/lib/media";
import { useSignaling } from "./useSignaling";
import { useMetrics } from "./useMetrics";
import { useRecording } from "./useRecording";
import { useConnectionStore } from "@/stores/connection-store";
import { useMetricsStore } from "@/stores/metrics-store";
import { useUIStore } from "@/stores/ui-store";
import { generatePeerId } from "@/lib/utils";
import type { SignalingMessage, RoomRole } from "@/types";

/**
 * Main WebRTC orchestration hook.
 * Manages peer connections, signaling, media streams, and ties everything together.
 */
export function useWebRTC(roomId: string) {
  // Refs for mutable objects
  const peerConnections = useRef<Map<string, PeerConnectionManager>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );
  const peerIdRef = useRef<string>(generatePeerId());
  const roleRef = useRef<RoomRole | null>(null);
  const hasJoinedRef = useRef(false);

  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [activePcManager, setActivePcManager] =
    useState<PeerConnectionManager | null>(null);

  // Connection store
  const {
    setConnectionState,
    setIceState,
    setPeerId,
    setRoom,
    setIsSharing,
    addPeer,
    removePeer,
    setPeers,
    setError,
    reset: resetConnection,
  } = useConnectionStore();

  // Metrics hook (needs active PC manager)
  const {
    forceQuality,
    updateSimulation,
    reset: resetMetrics,
  } = useMetrics(activePcManager);

  // Recording hook
  const recording = useRecording();

  // Handle signaling messages
  const handleSignalingMessage = useCallback(
    async (msg: SignalingMessage) => {
      switch (msg.type) {
        case "room-created":
          roleRef.current = "host";
          setRoom(roomId, "host");
          setConnectionState("connected");
          console.log("[WebRTC] Room created, we are the host");
          break;

        case "room-joined":
          roleRef.current = "viewer";
          setRoom(roomId, "viewer");
          // Stay in "connecting" — wait for actual WebRTC peer connection
          if (msg.peers) {
            setPeers(msg.peers);
          }
          console.log("[WebRTC] Joined room as viewer, peers:", msg.peers);

          // As a viewer, initiate connections to existing peers
          if (msg.peers) {
            for (const peerId of msg.peers) {
              await initiateConnection(peerId);
            }
          }
          break;

        case "peer-joined":
          if (msg.peerId) {
            addPeer(msg.peerId);
            console.log("[WebRTC] Peer joined:", msg.peerId);

            // If we're the host with an active stream, create offer to new peer
            if (roleRef.current === "host" && localStreamRef.current) {
              await initiateConnection(msg.peerId);
            }
          }
          break;

        case "peer-left":
          if (msg.peerId) {
            removePeer(msg.peerId);
            closePeerConnection(msg.peerId);
            console.log("[WebRTC] Peer left:", msg.peerId);
          }
          break;

        case "offer":
          if (msg.from && msg.sdp) {
            await handleOffer(msg.from, msg.sdp);
          }
          break;

        case "answer":
          if (msg.from && msg.sdp) {
            await handleAnswer(msg.from, msg.sdp);
          }
          break;

        case "ice-candidate":
          if (msg.from && msg.candidate) {
            await handleIceCandidate(msg.from, msg.candidate);
          }
          break;

        case "room-full":
          setError("Room is full");
          setConnectionState("failed");
          break;

        case "error":
          setError(msg.message || "Unknown error");
          break;
      }
    },
    [roomId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Initialize signaling
  const { send: sendSignaling, reconnect } = useSignaling(
    handleSignalingMessage,
  );

  // Join the room once signaling is connected
  useEffect(() => {
    const unsub = useConnectionStore.subscribe((state) => {
      if (state.signalingConnected && !hasJoinedRef.current) {
        hasJoinedRef.current = true;
        setPeerId(peerIdRef.current);
        setConnectionState("connecting");

        sendSignaling({
          type: "create-room",
          roomId,
          peerId: peerIdRef.current,
        });
      }
    });

    // Check if already connected
    if (
      useConnectionStore.getState().signalingConnected &&
      !hasJoinedRef.current
    ) {
      hasJoinedRef.current = true;
      setPeerId(peerIdRef.current);
      setConnectionState("connecting");

      sendSignaling({
        type: "create-room",
        roomId,
        peerId: peerIdRef.current,
      });
    }

    return unsub;
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Peer Connection Management ─────────────────────────────────────────

  function createPeerConnection(remotePeerId: string): PeerConnectionManager {
    const existing = peerConnections.current.get(remotePeerId);
    if (existing && !existing.isClosed) {
      return existing;
    }

    const pcManager = new PeerConnectionManager({
      onIceCandidate: (candidate) => {
        sendSignaling({
          type: "ice-candidate",
          candidate: candidate.toJSON(),
          to: remotePeerId,
          from: peerIdRef.current,
        });
      },

      onTrack: (event) => {
        console.log("[WebRTC] Received track:", event.track.kind);
        if (event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setRemoteStream(event.streams[0]);
        }
      },

      onConnectionStateChange: (state) => {
        console.log(`[WebRTC] Connection state (${remotePeerId}):`, state);
        mapConnectionState(state);
      },

      onIceConnectionStateChange: (state) => {
        setIceState(state);

        // Handle ICE failures with restart
        if (state === "failed") {
          console.warn("[WebRTC] ICE failed, attempting restart");
          handleIceRestart(remotePeerId);
        }
      },

      onDataChannelMessage: (data) => {
        console.log("[WebRTC] DataChannel message:", data);
      },
    });

    // Add local tracks if we're sharing
    if (localStreamRef.current) {
      pcManager.addStream(localStreamRef.current);
    }

    // Data channel is created by the initiator (offerer) only — NOT here.
    // The answerer receives it via ondatachannel.

    peerConnections.current.set(remotePeerId, pcManager);
    setActivePcManager(pcManager);

    return pcManager;
  }

  async function initiateConnection(remotePeerId: string): Promise<void> {
    try {
      const pcManager = createPeerConnection(remotePeerId);

      // Only the initiator (offerer) creates the data channel
      pcManager.createDataChannel();

      const offer = await pcManager.createOffer();

      sendSignaling({
        type: "offer",
        sdp: offer,
        to: remotePeerId,
        from: peerIdRef.current,
      });
    } catch (err: any) {
      console.error("[WebRTC] Failed to initiate connection:", err);
      setError(`Connection failed: ${err.message}`);
    }
  }

  async function handleOffer(
    from: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void> {
    try {
      let pcManager = peerConnections.current.get(from);

      // Handle glare: both sides sent offers simultaneously
      if (pcManager && !pcManager.isClosed) {
        const signalingState = pcManager.connection.signalingState;
        if (signalingState === "have-local-offer") {
          // Tiebreak by peer ID — higher ID wins (keeps their offer)
          if (peerIdRef.current > from) {
            console.log("[WebRTC] Glare: ignoring incoming offer (our ID wins)");
            return;
          }
          // They win — discard our offer and accept theirs
          console.log("[WebRTC] Glare: accepting incoming offer (their ID wins)");
          pcManager.close();
          peerConnections.current.delete(from);
          pcManager = undefined;
        }
      }

      if (!pcManager || pcManager.isClosed) {
        pcManager = createPeerConnection(from);
      }

      await pcManager.setRemoteDescription(sdp);

      // Flush pending ICE candidates from the external queue
      const pending = pendingCandidates.current.get(from) || [];
      for (const candidate of pending) {
        await pcManager.addIceCandidate(candidate);
      }
      pendingCandidates.current.delete(from);

      const answer = await pcManager.createAnswer();

      sendSignaling({
        type: "answer",
        sdp: answer,
        to: from,
        from: peerIdRef.current,
      });
    } catch (err: any) {
      console.error("[WebRTC] Failed to handle offer:", err);
      setError(`Offer handling failed: ${err.message}`);
    }
  }

  async function handleAnswer(
    from: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void> {
    try {
      const pcManager = peerConnections.current.get(from);
      if (!pcManager) {
        console.warn("[WebRTC] No connection for answer from:", from);
        return;
      }
      await pcManager.setRemoteDescription(sdp);

      // Flush pending ICE candidates
      const pending = pendingCandidates.current.get(from) || [];
      for (const candidate of pending) {
        await pcManager.addIceCandidate(candidate);
      }
      pendingCandidates.current.delete(from);
    } catch (err: any) {
      console.error("[WebRTC] Failed to handle answer:", err);
    }
  }

  async function handleIceCandidate(
    from: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const pcManager = peerConnections.current.get(from);
    if (!pcManager) {
      // Queue the candidate until we have a connection
      if (!pendingCandidates.current.has(from)) {
        pendingCandidates.current.set(from, []);
      }
      pendingCandidates.current.get(from)!.push(candidate);
      return;
    }
    await pcManager.addIceCandidate(candidate);
  }

  async function handleIceRestart(remotePeerId: string): Promise<void> {
    const pcManager = peerConnections.current.get(remotePeerId);
    if (!pcManager || pcManager.isClosed) return;

    try {
      const offer = await pcManager.restartIce();
      sendSignaling({
        type: "offer",
        sdp: offer,
        to: remotePeerId,
        from: peerIdRef.current,
      });
    } catch (err) {
      console.error("[WebRTC] ICE restart failed:", err);
    }
  }

  function closePeerConnection(remotePeerId: string): void {
    const pcManager = peerConnections.current.get(remotePeerId);
    if (pcManager) {
      pcManager.close();
      peerConnections.current.delete(remotePeerId);
    }

    // If this was our active connection, clear it
    if (peerConnections.current.size === 0) {
      setActivePcManager(null);
      setRemoteStream(null);
      remoteStreamRef.current = null;
    } else {
      // Set the next available connection as active
      const next = peerConnections.current.values().next().value;
      if (next) setActivePcManager(next);
    }
  }

  function mapConnectionState(state: RTCPeerConnectionState): void {
    const current = useConnectionStore.getState().connectionState;

    switch (state) {
      case "new":
      case "connecting":
        // Don't revert host from "connected" to "connecting" —
        // the host is already in the room and using the UI.
        if (current !== "connected") {
          setConnectionState("connecting");
        }
        break;
      case "connected":
        setConnectionState("connected");
        break;
      case "disconnected":
        setConnectionState("reconnecting");
        break;
      case "failed":
        setConnectionState("failed");
        setError(
          "Peer-to-peer connection failed. " +
          "If peers are on different networks, a TURN server is required."
        );
        break;
      case "closed":
        setConnectionState("disconnected");
        break;
    }
  }

  // ─── Public Actions ─────────────────────────────────────────────────────

  const startSharing = useCallback(async () => {
    try {
      const stream = await captureDisplay();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsSharing(true);

      // Listen for browser "stop sharing" button
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopSharing();
      });

      // Add tracks to all existing peer connections
      for (const [peerId, pcManager] of peerConnections.current) {
        if (!pcManager.isClosed) {
          pcManager.addStream(stream);

          // Renegotiate
          try {
            const offer = await pcManager.createOffer();
            sendSignaling({
              type: "offer",
              sdp: offer,
              to: peerId,
              from: peerIdRef.current,
            });
          } catch (err) {
            console.error("[WebRTC] Failed to renegotiate:", err);
          }
        }
      }

      useUIStore.getState().addToast({
        type: "success",
        message: "Screen sharing started",
        duration: 3000,
      });
    } catch (err: any) {
      console.error("[WebRTC] Failed to start sharing:", err);
      setError(err.message);
      useUIStore.getState().addToast({
        type: "error",
        message: err.message,
        duration: 5000,
      });
    }
  }, [sendSignaling]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSharing = useCallback(() => {
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setIsSharing(false);

    useUIStore.getState().addToast({
      type: "info",
      message: "Screen sharing stopped",
      duration: 3000,
    });
  }, [setIsSharing]);

  const disconnect = useCallback(() => {
    // Stop sharing
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);

    // Close all peer connections
    for (const [, pcManager] of peerConnections.current) {
      pcManager.close();
    }
    peerConnections.current.clear();
    pendingCandidates.current.clear();

    setActivePcManager(null);
    setRemoteStream(null);
    remoteStreamRef.current = null;

    // Leave room via signaling
    sendSignaling({ type: "leave-room" });

    // Reset state
    hasJoinedRef.current = false;
    resetConnection();
    resetMetrics();
    recording.resetRecording();
  }, [sendSignaling, resetConnection, resetMetrics, recording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream(localStreamRef.current);
      for (const [, pcManager] of peerConnections.current) {
        pcManager.close();
      }
      peerConnections.current.clear();
    };
  }, []);

  return {
    // Streams
    localStream,
    remoteStream,

    // Actions
    startSharing,
    stopSharing,
    disconnect,
    reconnect,

    // Quality control
    forceQuality,
    updateSimulation,

    // Recording
    ...recording,
  };
}
