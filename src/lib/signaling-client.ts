import type { SignalingMessage } from "@/types";
import {
  SIGNALING_PING_INTERVAL_MS,
  SIGNALING_PONG_TIMEOUT_MS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  RECONNECT_MAX_ATTEMPTS,
  RECONNECT_BACKOFF_FACTOR,
} from "./constants";
import { getSignalingUrl } from "./utils";

export type SignalingEvent =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error"
  | "message";

type EventCallback = (data?: any) => void;

/**
 * Production-grade WebSocket signaling client with:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat (ping/pong) keepalive
 * - Message queuing during disconnection
 * - Event-driven architecture
 */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Map<string, Set<EventCallback>>();
  private messageQueue: SignalingMessage[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;
  private _intentionalClose = false;

  constructor(url?: string) {
    this.url = url || getSignalingUrl();
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  // ─── Connection ────────────────────────────────────────────────────────

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this._intentionalClose = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.startPing();
        this.flushQueue();
        this.emit("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: SignalingMessage = JSON.parse(event.data);
          if (msg.type === "pong") {
            this.handlePong();
            return;
          }
          this.emit("message", msg);
        } catch {
          console.error("[Signaling] Failed to parse message");
        }
      };

      this.ws.onclose = () => {
        this._isConnected = false;
        this.stopPing();
        this.emit("disconnected");

        if (!this._intentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        this.emit("error", err);
      };
    } catch (err) {
      this.emit("error", err);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this._intentionalClose = true;
    this.stopPing();
    this.clearReconnect();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this._isConnected = false;
  }

  // ─── Messaging ─────────────────────────────────────────────────────────

  send(message: SignalingMessage): void {
    if (this._isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this._isConnected) {
      const msg = this.messageQueue.shift()!;
      this.send(msg);
    }
  }

  // ─── Heartbeat ─────────────────────────────────────────────────────────

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this._isConnected) {
        this.send({ type: "ping" });
        this.pongTimer = setTimeout(() => {
          console.warn("[Signaling] Pong timeout - connection may be dead");
          this.ws?.close();
        }, SIGNALING_PONG_TIMEOUT_MS);
      }
    }, SIGNALING_PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private handlePong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // ─── Reconnection ─────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      console.error("[Signaling] Max reconnection attempts reached");
      this.emit("error", new Error("Max reconnection attempts reached"));
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS *
        Math.pow(RECONNECT_BACKOFF_FACTOR, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS,
    );

    this.reconnectAttempts++;
    console.log(
      `[Signaling] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`,
    );

    this.emit("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  // ─── Event Emitter ─────────────────────────────────────────────────────

  on(event: SignalingEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Signaling] Error in ${event} handler:`, err);
        }
      }
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  destroy(): void {
    this.disconnect();
    this.listeners.clear();
    this.messageQueue = [];
  }
}
