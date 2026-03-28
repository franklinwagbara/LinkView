import type { ConnectionMetrics } from "@/types";
import { ema } from "./utils";

/**
 * Collects and computes WebRTC connection metrics from RTCStatsReport.
 * Uses exponential moving average for smoothing.
 */
export class MetricsCollector {
  private prevStats: {
    timestamp: number;
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsLost: number;
  } | null = null;

  private smoothedMetrics: ConnectionMetrics | null = null;

  /**
   * Parse an RTCStatsReport and return computed metrics.
   */
  async collect(pc: RTCPeerConnection): Promise<ConnectionMetrics | null> {
    try {
      const stats = await pc.getStats();
      return this.parse(stats);
    } catch {
      return null;
    }
  }

  private parse(stats: RTCStatsReport): ConnectionMetrics | null {
    let rtt = 0;
    let jitter = 0;
    let packetsLost = 0;
    let packetsReceived = 0;
    let bytesReceived = 0;
    let bytesSent = 0;
    let frameRate = 0;
    let width = 0;
    let height = 0;
    let bitrate = 0;

    const now = Date.now();

    stats.forEach((report) => {
      // Candidate pair stats (for RTT)
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        rtt = report.currentRoundTripTime
          ? report.currentRoundTripTime * 1000 // Convert to ms
          : rtt;
      }

      // Inbound RTP (receiver side)
      if (report.type === "inbound-rtp" && report.kind === "video") {
        jitter = report.jitter ? report.jitter * 1000 : jitter;
        packetsLost = report.packetsLost || 0;
        packetsReceived = report.packetsReceived || 0;
        bytesReceived = report.bytesReceived || 0;
        frameRate = report.framesPerSecond || 0;
        width = report.frameWidth || 0;
        height = report.frameHeight || 0;
      }

      // Outbound RTP (sender side)
      if (report.type === "outbound-rtp" && report.kind === "video") {
        bytesSent = report.bytesSent || 0;
        if (!frameRate) {
          frameRate = report.framesPerSecond || 0;
        }
        if (!width) {
          width = report.frameWidth || 0;
          height = report.frameHeight || 0;
        }
      }

      // Remote inbound RTP (for sender-side RTT)
      if (report.type === "remote-inbound-rtp" && report.kind === "video") {
        if (report.roundTripTime && !rtt) {
          rtt = report.roundTripTime * 1000;
        }
        if (report.jitter && !jitter) {
          jitter = report.jitter * 1000;
        }
      }
    });

    // Calculate bitrate from deltas
    if (this.prevStats) {
      const timeDelta = (now - this.prevStats.timestamp) / 1000;
      if (timeDelta > 0) {
        const receivedDelta = bytesReceived - this.prevStats.bytesReceived;
        const sentDelta = bytesSent - this.prevStats.bytesSent;
        const totalBytesDelta = Math.max(receivedDelta, sentDelta);
        bitrate = (totalBytesDelta * 8) / timeDelta / 1000; // kbps
      }
    }

    // Calculate packet loss percentage
    const totalPackets = packetsReceived + packetsLost;
    const packetLossPercent =
      totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

    // Store current values for next delta calculation
    this.prevStats = {
      timestamp: now,
      bytesReceived,
      bytesSent,
      packetsReceived,
      packetsLost,
    };

    const rawMetrics: ConnectionMetrics = {
      timestamp: now,
      rtt: Math.max(0, rtt),
      jitter: Math.max(0, jitter),
      packetLoss: Math.max(0, Math.min(100, packetLossPercent)),
      bitrate: Math.max(0, bitrate),
      frameRate: Math.max(0, frameRate),
      resolution: { width, height },
      bytesReceived,
      bytesSent,
      packetsLost,
      packetsReceived,
    };

    // Apply EMA smoothing
    if (this.smoothedMetrics) {
      this.smoothedMetrics = {
        ...rawMetrics,
        rtt: ema(rawMetrics.rtt, this.smoothedMetrics.rtt),
        jitter: ema(rawMetrics.jitter, this.smoothedMetrics.jitter),
        packetLoss: ema(
          rawMetrics.packetLoss,
          this.smoothedMetrics.packetLoss,
          0.2,
        ),
        bitrate: ema(rawMetrics.bitrate, this.smoothedMetrics.bitrate),
        frameRate: ema(rawMetrics.frameRate, this.smoothedMetrics.frameRate),
      };
    } else {
      this.smoothedMetrics = rawMetrics;
    }

    return { ...this.smoothedMetrics };
  }

  reset(): void {
    this.prevStats = null;
    this.smoothedMetrics = null;
  }
}
