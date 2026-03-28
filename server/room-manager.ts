import type { Room, Peer } from "./types";

const MAX_VIEWERS_PER_ROOM = 10;

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(roomId: string, host: Peer): Room {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const room: Room = {
      id: roomId,
      hostId: host.id,
      peers: new Map([[host.id, host]]),
      createdAt: Date.now(),
      maxViewers: MAX_VIEWERS_PER_ROOM,
    };

    host.roomId = roomId;
    host.isHost = true;
    this.rooms.set(roomId, room);

    console.log(`[RoomManager] Room ${roomId} created by ${host.id}`);
    return room;
  }

  joinRoom(roomId: string, peer: Peer): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    // Check capacity (excluding host)
    const viewerCount = room.peers.size - 1;
    if (viewerCount >= room.maxViewers) {
      throw new Error(`Room ${roomId} is full`);
    }

    peer.roomId = roomId;
    peer.isHost = false;
    room.peers.set(peer.id, peer);

    console.log(
      `[RoomManager] Peer ${peer.id} joined room ${roomId} (${room.peers.size} peers)`,
    );
    return room;
  }

  leaveRoom(peerId: string): { room: Room; wasHost: boolean } | null {
    for (const [roomId, room] of this.rooms) {
      if (room.peers.has(peerId)) {
        const wasHost = room.hostId === peerId;
        room.peers.delete(peerId);

        console.log(
          `[RoomManager] Peer ${peerId} left room ${roomId} (${room.peers.size} remaining)`,
        );

        // If the room is empty, remove it
        if (room.peers.size === 0) {
          this.rooms.delete(roomId);
          console.log(`[RoomManager] Room ${roomId} removed (empty)`);
          return { room, wasHost };
        }

        // If the host left, promote the next peer or close the room
        if (wasHost && room.peers.size > 0) {
          const nextPeer = room.peers.values().next().value;
          if (nextPeer) {
            room.hostId = nextPeer.id;
            nextPeer.isHost = true;
            console.log(
              `[RoomManager] New host for room ${roomId}: ${nextPeer.id}`,
            );
          }
        }

        return { room, wasHost };
      }
    }
    return null;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomForPeer(peerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.peers.has(peerId)) {
        return room;
      }
    }
    return undefined;
  }

  getPeerIds(roomId: string, excludePeerId?: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const ids: string[] = [];
    for (const id of room.peers.keys()) {
      if (id !== excludePeerId) ids.push(id);
    }
    return ids;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getTotalPeerCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.peers.size;
    }
    return count;
  }

  /** Clean up stale rooms older than maxAge (ms) */
  cleanup(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let removed = 0;
    for (const [roomId, room] of this.rooms) {
      if (now - room.createdAt > maxAgeMs && room.peers.size === 0) {
        this.rooms.delete(roomId);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[RoomManager] Cleaned up ${removed} stale rooms`);
    }
    return removed;
  }
}
