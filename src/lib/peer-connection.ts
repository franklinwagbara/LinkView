import {
  RTC_CONFIG,
  DATA_CHANNEL_CONFIG,
  CONTROL_CHANNEL_CONFIG,
} from "./constants";
import type { QualityTier } from "@/types";
import { QUALITY_PRESETS } from "./constants";

export type PeerConnectionEvents = {
  onTrack: (event: RTCTrackEvent) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
  onDataChannelMessage: (data: string) => void;
  onDataChannelOpen: () => void;
  onDataChannelClose: () => void;
  onNegotiationNeeded: () => void;
};

/**
 * Production-grade RTCPeerConnection wrapper.
 * Manages the lifecycle, tracks, data channels, and stats.
 */
export class PeerConnectionManager {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private controlChannel: RTCDataChannel | null = null;
  private events: Partial<PeerConnectionEvents>;
  private _closed = false;
  private _remoteDescriptionSet = false;
  private _pendingIceCandidates: RTCIceCandidateInit[] = [];

  constructor(events: Partial<PeerConnectionEvents> = {}) {
    this.events = events;
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.setupEventHandlers();
  }

  // ─── Getters ───────────────────────────────────────────────────────────

  get connection(): RTCPeerConnection {
    return this.pc;
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  get iceConnectionState(): RTCIceConnectionState {
    return this.pc.iceConnectionState;
  }

  get isClosed(): boolean {
    return this._closed;
  }

  get senders(): RTCRtpSender[] {
    return this.pc.getSenders();
  }

  // ─── Connection Setup ──────────────────────────────────────────────────

  private setupEventHandlers(): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onIceCandidate?.(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      this.events.onTrack?.(event);
    };

    this.pc.onconnectionstatechange = () => {
      this.events.onConnectionStateChange?.(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      this.events.onIceConnectionStateChange?.(this.pc.iceConnectionState);
    };

    this.pc.onnegotiationneeded = () => {
      this.events.onNegotiationNeeded?.();
    };

    this.pc.ondatachannel = (event) => {
      this.handleIncomingDataChannel(event.channel);
    };
  }

  // ─── SDP Negotiation ──────────────────────────────────────────────────

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this._remoteDescriptionSet = true;

    // Flush any ICE candidates that arrived before the remote description was set
    for (const candidate of this._pendingIceCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[PeerConnection] Failed to add queued ICE candidate:", err);
      }
    }
    this._pendingIceCandidates = [];
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    // Queue candidates until remote description is set to avoid race conditions
    if (!this._remoteDescriptionSet) {
      this._pendingIceCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("[PeerConnection] Failed to add ICE candidate:", err);
    }
  }

  // ─── Media Tracks ─────────────────────────────────────────────────────

  addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender {
    return this.pc.addTrack(track, stream);
  }

  addStream(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }
  }

  removeTrack(sender: RTCRtpSender): void {
    this.pc.removeTrack(sender);
  }

  replaceTrack(
    sender: RTCRtpSender,
    track: MediaStreamTrack | null,
  ): Promise<void> {
    return sender.replaceTrack(track);
  }

  // ─── Bitrate & Quality Control ─────────────────────────────────────────

  async setMaxBitrate(maxBitrateKbps: number): Promise<void> {
    for (const sender of this.pc.getSenders()) {
      if (sender.track?.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = maxBitrateKbps * 1000;
        await sender.setParameters(params);
      }
    }
  }

  async setMaxFrameRate(maxFrameRate: number): Promise<void> {
    for (const sender of this.pc.getSenders()) {
      if (sender.track?.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxFramerate = maxFrameRate;
        await sender.setParameters(params);
      }
    }
  }

  async applyQualityPreset(tier: QualityTier): Promise<void> {
    const preset = QUALITY_PRESETS[tier];
    if (!preset) return;

    for (const sender of this.pc.getSenders()) {
      if (sender.track?.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = preset.maxBitrate * 1000;
        params.encodings[0].maxFramerate = preset.maxFrameRate;

        // Scale down resolution
        if (preset.maxWidth < 1920) {
          params.encodings[0].scaleResolutionDownBy = 1920 / preset.maxWidth;
        } else {
          params.encodings[0].scaleResolutionDownBy = 1;
        }

        await sender.setParameters(params);
      }
    }
  }

  // ─── Data Channels ────────────────────────────────────────────────────

  createDataChannel(label: string = "data"): RTCDataChannel {
    this.dataChannel = this.pc.createDataChannel(label, DATA_CHANNEL_CONFIG);
    this.setupDataChannel(this.dataChannel);
    return this.dataChannel;
  }

  createControlChannel(): RTCDataChannel {
    this.controlChannel = this.pc.createDataChannel(
      "control",
      CONTROL_CHANNEL_CONFIG,
    );
    return this.controlChannel;
  }

  sendData(data: string): void {
    if (this.dataChannel?.readyState === "open") {
      this.dataChannel.send(data);
    }
  }

  sendControl(data: string): void {
    if (this.controlChannel?.readyState === "open") {
      this.controlChannel.send(data);
    }
  }

  private handleIncomingDataChannel(channel: RTCDataChannel): void {
    if (channel.label === "control") {
      this.controlChannel = channel;
    } else {
      this.dataChannel = channel;
      this.setupDataChannel(channel);
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => this.events.onDataChannelOpen?.();
    channel.onclose = () => this.events.onDataChannelClose?.();
    channel.onmessage = (event) =>
      this.events.onDataChannelMessage?.(event.data);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────

  async getStats(): Promise<RTCStatsReport> {
    return this.pc.getStats();
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  close(): void {
    if (this._closed) return;
    this._closed = true;

    this.dataChannel?.close();
    this.controlChannel?.close();

    // Remove all senders
    for (const sender of this.pc.getSenders()) {
      try {
        this.pc.removeTrack(sender);
      } catch {
        // Ignore if already removed
      }
    }

    this.pc.close();
  }

  /** Restart ICE for reconnection */
  async restartIce(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer({ iceRestart: true });
    await this.pc.setLocalDescription(offer);
    return offer;
  }
}
