"use client";

import { useEffect, useRef, useCallback } from "react";
import { SignalingClient } from "@/lib/signaling-client";
import { useConnectionStore } from "@/stores/connection-store";
import type { SignalingMessage } from "@/types";

type MessageHandler = (msg: SignalingMessage) => void;

/**
 * Hook that manages the WebSocket signaling connection.
 * Provides methods to send signaling messages and subscribe to events.
 */
export function useSignaling(onMessage: MessageHandler) {
  const clientRef = useRef<SignalingClient | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const { setSignalingConnected, setConnectionState, setError } =
    useConnectionStore();

  // Initialize client once
  useEffect(() => {
    const client = new SignalingClient();
    clientRef.current = client;

    const unsubConnected = client.on("connected", () => {
      setSignalingConnected(true);
      console.log("[useSignaling] Connected to signaling server");
    });

    const unsubDisconnected = client.on("disconnected", () => {
      setSignalingConnected(false);
    });

    const unsubReconnecting = client.on("reconnecting", () => {
      setConnectionState("reconnecting");
    });

    const unsubError = client.on("error", (err: any) => {
      console.error("[useSignaling] Error:", err);
      setError(err?.message || "Signaling connection error");
    });

    const unsubMessage = client.on("message", (msg: SignalingMessage) => {
      onMessageRef.current(msg);
    });

    client.connect();

    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubReconnecting();
      unsubError();
      unsubMessage();
      client.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((message: SignalingMessage) => {
    clientRef.current?.send(message);
  }, []);

  const reconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current?.connect();
  }, []);

  return { send, reconnect };
}
