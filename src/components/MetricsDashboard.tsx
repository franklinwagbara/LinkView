"use client";

import React, { memo } from "react";
import { NetworkChart } from "./NetworkChart";
import { useMetricsStore } from "@/stores/metrics-store";
import { useConnectionStore } from "@/stores/connection-store";
import {
  formatBitrate,
  formatBytes,
  getHealthClasses,
  getHealthColor,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Activity,
  Gauge,
  Wifi,
  MonitorPlay,
  ArrowUpDown,
  TrendingDown,
} from "lucide-react";

/**
 * Full metrics dashboard with live charts and stats.
 */
export const MetricsDashboard = memo(function MetricsDashboard() {
  const current = useMetricsStore((s) => s.current);
  const health = useMetricsStore((s) => s.health);
  const history = useMetricsStore((s) => s.history);
  const qualityTier = useMetricsStore((s) => s.qualityTier);
  const qualityReason = useMetricsStore((s) => s.qualityReason);
  const connectionState = useConnectionStore((s) => s.connectionState);
  const remotePeers = useConnectionStore((s) => s.remotePeers);

  if (connectionState !== "connected" || !current) {
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Network Insights
        </h3>
        <p className="text-slate-500 text-sm">
          Connect to a peer to see real-time metrics.
        </p>
      </div>
    );
  }

  const healthColor = getHealthColor(health);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Network Insights
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* RTT */}
          <MetricCard
            icon={<Gauge className="w-4 h-4" />}
            label="Latency (RTT)"
            value={`${Math.round(current.rtt)}ms`}
            color={
              current.rtt < 100
                ? "#10b981"
                : current.rtt < 200
                  ? "#f59e0b"
                  : "#ef4444"
            }
          />

          {/* Bitrate */}
          <MetricCard
            icon={<ArrowUpDown className="w-4 h-4" />}
            label="Bitrate"
            value={formatBitrate(current.bitrate)}
            color="#3b82f6"
          />

          {/* Packet Loss */}
          <MetricCard
            icon={<TrendingDown className="w-4 h-4" />}
            label="Packet Loss"
            value={`${current.packetLoss.toFixed(1)}%`}
            color={
              current.packetLoss < 1
                ? "#10b981"
                : current.packetLoss < 5
                  ? "#f59e0b"
                  : "#ef4444"
            }
          />

          {/* Jitter */}
          <MetricCard
            icon={<Wifi className="w-4 h-4" />}
            label="Jitter"
            value={`${Math.round(current.jitter)}ms`}
            color={
              current.jitter < 20
                ? "#10b981"
                : current.jitter < 50
                  ? "#f59e0b"
                  : "#ef4444"
            }
          />

          {/* Frame Rate */}
          <MetricCard
            icon={<MonitorPlay className="w-4 h-4" />}
            label="Frame Rate"
            value={`${Math.round(current.frameRate)} fps`}
            color="#8b5cf6"
          />

          {/* Resolution */}
          <MetricCard
            icon={<MonitorPlay className="w-4 h-4" />}
            label="Resolution"
            value={
              current.resolution.width > 0
                ? `${current.resolution.width}×${current.resolution.height}`
                : "—"
            }
            color="#06b6d4"
          />
        </div>

        {/* Quality Tier & Info */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Quality:</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium uppercase",
                getHealthClasses(health),
              )}
            >
              {qualityTier}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Peers:</span>
            <span className="text-xs text-slate-300 font-mono">
              {remotePeers.length}
            </span>
          </div>
        </div>

        {qualityReason && (
          <p className="mt-2 text-xs text-slate-500 italic">{qualityReason}</p>
        )}

        {/* Transfer Stats */}
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-4 text-xs text-slate-500">
          <span>↓ {formatBytes(current.bytesReceived)}</span>
          <span>↑ {formatBytes(current.bytesSent)}</span>
          <span>Lost: {current.packetsLost} pkts</span>
        </div>
      </div>

      {/* Charts */}
      <NetworkChart
        data={history.rtt}
        color="#f59e0b"
        label="Latency (RTT)"
        unit="ms"
        domain={[0, "auto"] as any}
      />

      <NetworkChart
        data={history.bitrate}
        color="#3b82f6"
        label="Bitrate"
        unit="kbps"
        domain={[0, "auto"] as any}
      />

      <NetworkChart
        data={history.packetLoss}
        color="#ef4444"
        label="Packet Loss"
        unit="%"
        domain={[0, "auto"] as any}
      />

      <NetworkChart
        data={history.jitter}
        color="#8b5cf6"
        label="Jitter"
        unit="ms"
        domain={[0, "auto"] as any}
      />

      <NetworkChart
        data={history.frameRate}
        color="#10b981"
        label="Frame Rate"
        unit="fps"
        domain={[0, "auto"] as any}
      />
    </div>
  );
});

// ─── Sub-components ────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const MetricCard = memo(function MetricCard({
  icon,
  label,
  value,
  color,
}: MetricCardProps) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-mono font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
});
