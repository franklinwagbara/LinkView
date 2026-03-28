import type {
  QualityTier,
  ConnectionMetrics,
  NetworkSimulationConfig,
} from "@/types";
import { QUALITY_PRESETS, HEALTH_THRESHOLDS } from "./constants";
import { PeerConnectionManager } from "./peer-connection";

type QualityChangeCallback = (tier: QualityTier, reason: string) => void;

const TIER_ORDER: QualityTier[] = ["minimal", "low", "medium", "high"];

/**
 * Adaptive streaming engine that monitors connection metrics
 * and dynamically adjusts video quality to maintain smooth playback.
 *
 * Implements:
 * - Gradual quality degradation under poor conditions
 * - Conservative quality improvement when conditions stabilize
 * - Hysteresis to avoid quality oscillation
 */
export class AdaptiveStreamingEngine {
  private currentTier: QualityTier = "high";
  private stableCount = 0;
  private degradeCount = 0;
  private lastAdjustment = 0;
  private onQualityChange: QualityChangeCallback | null = null;
  private simulation: NetworkSimulationConfig = {
    enabled: false,
    latencyMs: 0,
    packetLossPercent: 0,
    bandwidthKbps: 0,
  };

  // Require stability for N consecutive intervals before upgrading
  private static readonly UPGRADE_THRESHOLD = 5;
  // Degrade immediately when conditions are poor
  private static readonly DEGRADE_THRESHOLD = 2;
  // Minimum time between adjustments (ms)
  private static readonly ADJUSTMENT_COOLDOWN = 3000;

  get currentQuality(): QualityTier {
    return this.currentTier;
  }

  get currentPreset() {
    return QUALITY_PRESETS[this.currentTier];
  }

  setQualityChangeCallback(cb: QualityChangeCallback): void {
    this.onQualityChange = cb;
  }

  setSimulation(config: NetworkSimulationConfig): void {
    this.simulation = config;
  }

  /**
   * Evaluate current metrics and adjust quality if needed.
   * Call this on every metrics collection interval.
   */
  async evaluate(
    metrics: ConnectionMetrics,
    pcManager: PeerConnectionManager,
  ): Promise<QualityTier> {
    const effectiveMetrics = this.applySimulation(metrics);
    const shouldDegrade = this.shouldDegrade(effectiveMetrics);
    const shouldUpgrade = this.shouldUpgrade(effectiveMetrics);

    const now = Date.now();
    const cooldownElapsed =
      now - this.lastAdjustment > AdaptiveStreamingEngine.ADJUSTMENT_COOLDOWN;

    if (shouldDegrade) {
      this.degradeCount++;
      this.stableCount = 0;

      if (
        this.degradeCount >= AdaptiveStreamingEngine.DEGRADE_THRESHOLD &&
        cooldownElapsed
      ) {
        const newTier = this.lowerTier();
        if (newTier !== this.currentTier) {
          const reason = this.getDegradeReason(effectiveMetrics);
          await this.applyTier(newTier, pcManager, reason);
        }
        this.degradeCount = 0;
      }
    } else if (shouldUpgrade) {
      this.stableCount++;
      this.degradeCount = 0;

      if (
        this.stableCount >= AdaptiveStreamingEngine.UPGRADE_THRESHOLD &&
        cooldownElapsed
      ) {
        const newTier = this.higherTier();
        if (newTier !== this.currentTier) {
          await this.applyTier(
            newTier,
            pcManager,
            "Network conditions improved",
          );
        }
        this.stableCount = 0;
      }
    } else {
      // Conditions are acceptable — hold current tier
      this.degradeCount = Math.max(0, this.degradeCount - 1);
    }

    // Apply simulation bandwidth cap
    if (this.simulation.enabled && this.simulation.bandwidthKbps > 0) {
      const capBitrate = Math.min(
        QUALITY_PRESETS[this.currentTier].maxBitrate,
        this.simulation.bandwidthKbps,
      );
      await pcManager.setMaxBitrate(capBitrate);
    }

    return this.currentTier;
  }

  private shouldDegrade(metrics: ConnectionMetrics): boolean {
    const t = HEALTH_THRESHOLDS;
    return (
      metrics.rtt > t.rtt.unstable ||
      metrics.packetLoss > t.packetLoss.unstable ||
      metrics.jitter > t.jitter.unstable
    );
  }

  private shouldUpgrade(metrics: ConnectionMetrics): boolean {
    const t = HEALTH_THRESHOLDS;
    return (
      metrics.rtt < t.rtt.good &&
      metrics.packetLoss < t.packetLoss.good &&
      metrics.jitter < t.jitter.good &&
      this.currentTier !== "high"
    );
  }

  private getDegradeReason(metrics: ConnectionMetrics): string {
    const reasons: string[] = [];
    const t = HEALTH_THRESHOLDS;
    if (metrics.rtt > t.rtt.unstable)
      reasons.push(`High RTT (${Math.round(metrics.rtt)}ms)`);
    if (metrics.packetLoss > t.packetLoss.unstable)
      reasons.push(`Packet loss (${metrics.packetLoss.toFixed(1)}%)`);
    if (metrics.jitter > t.jitter.unstable)
      reasons.push(`High jitter (${Math.round(metrics.jitter)}ms)`);
    return reasons.join(", ") || "Network degradation";
  }

  private lowerTier(): QualityTier {
    const idx = TIER_ORDER.indexOf(this.currentTier);
    return idx > 0 ? TIER_ORDER[idx - 1] : this.currentTier;
  }

  private higherTier(): QualityTier {
    const idx = TIER_ORDER.indexOf(this.currentTier);
    return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : this.currentTier;
  }

  private async applyTier(
    tier: QualityTier,
    pcManager: PeerConnectionManager,
    reason: string,
  ): Promise<void> {
    const prevTier = this.currentTier;
    this.currentTier = tier;
    this.lastAdjustment = Date.now();

    try {
      await pcManager.applyQualityPreset(tier);
      console.log(`[AdaptiveStreaming] ${prevTier} → ${tier}: ${reason}`);
      this.onQualityChange?.(tier, reason);
    } catch (err) {
      console.error("[AdaptiveStreaming] Failed to apply quality preset:", err);
      this.currentTier = prevTier;
    }
  }

  private applySimulation(metrics: ConnectionMetrics): ConnectionMetrics {
    if (!this.simulation.enabled) return metrics;

    return {
      ...metrics,
      rtt: metrics.rtt + this.simulation.latencyMs,
      packetLoss: Math.min(
        100,
        metrics.packetLoss + this.simulation.packetLossPercent,
      ),
    };
  }

  /** Force a specific quality tier (manual override) */
  async forceQuality(
    tier: QualityTier,
    pcManager: PeerConnectionManager,
  ): Promise<void> {
    await this.applyTier(tier, pcManager, "Manual override");
    this.stableCount = 0;
    this.degradeCount = 0;
  }

  reset(): void {
    this.currentTier = "high";
    this.stableCount = 0;
    this.degradeCount = 0;
    this.lastAdjustment = 0;
  }
}
