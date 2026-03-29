import { WebSocketServer, WebSocket } from "ws";
import { RoomManager } from "./room-manager";
import type { Peer, SignalingMessage } from "./types";

const PING_INTERVAL_MS = 30000;
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes

export function setupSignaling(wss: WebSocketServer): void {
  const roomManager = new RoomManager();
  const peers = new Map<WebSocket, Peer>();

  // Periodic cleanup
  const cleanupInterval = setInterval(() => {
    roomManager.cleanup();
  }, CLEANUP_INTERVAL_MS);

  // Heartbeat
  const pingInterval = setInterval(() => {
    for (const [ws, peer] of peers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        handleDisconnect(ws);
      }
    }
  }, PING_INTERVAL_MS);

  wss.on("close", () => {
    clearInterval(cleanupInterval);
    clearInterval(pingInterval);
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[Signaling] New connection");

    ws.on("message", (data: Buffer | string) => {
      try {
        const message: SignalingMessage = JSON.parse(
          typeof data === "string" ? data : data.toString("utf8"),
        );
        handleMessage(ws, message);
      } catch (err) {
        console.error("[Signaling] Failed to parse message:", err);
        sendTo(ws, { type: "error", message: "Invalid message format" });
      }
    });

    ws.on("close", () => {
      handleDisconnect(ws);
    });

    ws.on("error", (err) => {
      console.error("[Signaling] WebSocket error:", err.message);
      handleDisconnect(ws);
    });
  });

  function handleMessage(ws: WebSocket, msg: SignalingMessage): void {
    switch (msg.type) {
      case "create-room":
        handleCreateRoom(ws, msg);
        break;
      case "join-room":
        handleJoinRoom(ws, msg);
        break;
      case "leave-room":
        handleLeaveRoom(ws);
        break;
      case "offer":
      case "answer":
      case "ice-candidate":
        handleRelay(ws, msg);
        break;
      case "ping":
        sendTo(ws, { type: "pong" });
        break;
      default:
        sendTo(ws, {
          type: "error",
          message: `Unknown message type: ${msg.type}`,
        });
    }
  }

  function handleCreateRoom(ws: WebSocket, msg: SignalingMessage): void {
    const { roomId, peerId } = msg;
    if (!roomId || !peerId) {
      sendTo(ws, { type: "error", message: "Missing roomId or peerId" });
      return;
    }

    // Check if peer is already registered from another room
    const existing = peers.get(ws);
    if (existing?.roomId) {
      roomManager.leaveRoom(existing.id);
    }

    const peer: Peer = {
      id: peerId,
      ws,
      roomId: null,
      isHost: false,
      joinedAt: Date.now(),
    };
    peers.set(ws, peer);

    try {
      // If room exists, join instead
      const existingRoom = roomManager.getRoom(roomId);
      if (existingRoom) {
        const room = roomManager.joinRoom(roomId, peer);
        const peerIds = roomManager.getPeerIds(roomId, peerId);

        sendTo(ws, {
          type: "room-joined",
          roomId,
          peerId,
          peers: peerIds,
          isHost: false,
        });

        // Notify existing peers
        broadcastToRoom(roomId, peerId, {
          type: "peer-joined",
          peerId,
          isHost: false,
        });
        return;
      }

      roomManager.createRoom(roomId, peer);

      sendTo(ws, {
        type: "room-created",
        roomId,
        peerId,
        isHost: true,
      });
    } catch (err: any) {
      sendTo(ws, { type: "error", message: err.message });
    }
  }

  function handleJoinRoom(ws: WebSocket, msg: SignalingMessage): void {
    const { roomId, peerId } = msg;
    if (!roomId || !peerId) {
      sendTo(ws, { type: "error", message: "Missing roomId or peerId" });
      return;
    }

    const existing = peers.get(ws);
    if (existing?.roomId) {
      roomManager.leaveRoom(existing.id);
    }

    const peer: Peer = {
      id: peerId,
      ws,
      roomId: null,
      isHost: false,
      joinedAt: Date.now(),
    };
    peers.set(ws, peer);

    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        // Auto-create the room if it doesn't exist and make this peer the host
        roomManager.createRoom(roomId, peer);
        sendTo(ws, {
          type: "room-created",
          roomId,
          peerId,
          isHost: true,
        });
        return;
      }

      roomManager.joinRoom(roomId, peer);
      const peerIds = roomManager.getPeerIds(roomId, peerId);

      sendTo(ws, {
        type: "room-joined",
        roomId,
        peerId,
        peers: peerIds,
        isHost: false,
      });

      // Notify existing peers
      broadcastToRoom(roomId, peerId, {
        type: "peer-joined",
        peerId,
        isHost: false,
      });
    } catch (err: any) {
      if (err.message.includes("full")) {
        sendTo(ws, { type: "room-full", roomId, message: err.message });
      } else {
        sendTo(ws, { type: "error", message: err.message });
      }
    }
  }

  function handleLeaveRoom(ws: WebSocket): void {
    const peer = peers.get(ws);
    if (!peer) return;

    const result = roomManager.leaveRoom(peer.id);
    if (result) {
      broadcastToRoom(result.room.id, peer.id, {
        type: "peer-left",
        peerId: peer.id,
      });
    }

    peers.delete(ws);
  }

  function handleRelay(ws: WebSocket, msg: SignalingMessage): void {
    const peer = peers.get(ws);
    if (!peer?.roomId) {
      console.warn(`[Signaling] Relay BLOCKED: peer not in room (type=${msg.type}, peerId=${peer?.id || 'unknown'})`);
      sendTo(ws, { type: "error", message: "Not in a room" });
      return;
    }

    const { to } = msg;
    console.log(`[Signaling] Relay ${msg.type}: ${peer.id} -> ${to || 'broadcast'} (room: ${peer.roomId})`);

    if (!to) {
      // Broadcast to all peers in the room
      const room = roomManager.getRoom(peer.roomId);
      if (!room) {
        console.warn(`[Signaling] Relay FAILED: room ${peer.roomId} not found`);
        return;
      }

      let sentCount = 0;
      for (const [targetId, targetPeer] of room.peers) {
        if (
          targetId !== peer.id &&
          targetPeer.ws.readyState === WebSocket.OPEN
        ) {
          sendTo(targetPeer.ws, { ...msg, from: peer.id });
          sentCount++;
        }
      }
      console.log(`[Signaling] Broadcast ${msg.type} to ${sentCount} peers`);
      return;
    }

    // Send to specific peer
    const room = roomManager.getRoom(peer.roomId);
    if (!room) {
      console.warn(`[Signaling] Relay FAILED: room ${peer.roomId} not found`);
      return;
    }

    const targetPeer = room.peers.get(to);
    if (!targetPeer) {
      console.warn(`[Signaling] Relay FAILED: target peer ${to} not found in room ${peer.roomId} (peers: ${[...room.peers.keys()].join(', ')})`);
      return;
    }
    if (targetPeer.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[Signaling] Relay FAILED: target peer ${to} WebSocket not open (state: ${targetPeer.ws.readyState})`);
      return;
    }

    sendTo(targetPeer.ws, { ...msg, from: peer.id });
  }

  function handleDisconnect(ws: WebSocket): void {
    const peer = peers.get(ws);
    if (!peer) return;

    console.log(`[Signaling] Peer ${peer.id} disconnected`);

    if (peer.roomId) {
      const result = roomManager.leaveRoom(peer.id);
      if (result) {
        broadcastToRoom(result.room.id, peer.id, {
          type: "peer-left",
          peerId: peer.id,
        });
      }
    }

    peers.delete(ws);
  }

  function sendTo(ws: WebSocket, msg: SignalingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function broadcastToRoom(
    roomId: string,
    excludePeerId: string,
    msg: SignalingMessage,
  ): void {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    for (const [peerId, peer] of room.peers) {
      if (peerId !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
        sendTo(peer.ws, msg);
      }
    }
  }

  console.log("[Signaling] Server initialized");
}
