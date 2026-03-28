"use client";

import React, { memo } from "react";
import { cn, getHealthClasses } from "@/lib/utils";
import { useConnectionStore } from "@/stores/connection-store";
import { useMetricsStore } from "@/stores/metrics-store";
import type { ConnectionState, NetworkHealth } from "@/types";

function getStateLabel(state: ConnectionState): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "reconnecting":
      return "Reconnecting";
    case "disconnected":
      return "Disconnected";
    case "failed":
      return "Failed";
  }
}

function getHealthLabel(health: NetworkHealth): string {
  switch (health) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "unstable":
      return "Unstable";
    case "poor":
      return "Poor";
    case "critical":
      return "Critical";
  }
}

function getStateClasses(state: ConnectionState): string {
  switch (state) {
    case "connected":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "connecting":
    case "reconnecting":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "disconnected":
    case "failed":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  }
}

export const ConnectionStatus = memo(function ConnectionStatus() {
  const connectionState = useConnectionStore((s) => s.connectionState);
  const health = useMetricsStore((s) => s.health);
  const current = useMetricsStore((s) => s.current);
  const qualityTier = useMetricsStore((s) => s.qualityTier);

  const isActive = connectionState === "connected";

  return (
    <div className="flex items-center gap-3">
      {/* Connection State Badge */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
          getStateClasses(connectionState),
        )}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            connectionState === "connected" && "bg-emerald-400 animate-pulse",
            (connectionState === "connecting" ||
              connectionState === "reconnecting") &&
              "bg-amber-400 animate-pulse",
            (connectionState === "disconnected" ||
              connectionState === "failed") &&
              "bg-red-400",
            connectionState === "idle" && "bg-slate-400",
          )}
        />
        {getStateLabel(connectionState)}
      </div>

      {/* Network Health Badge */}
      {isActive && current && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
            getHealthClasses(health),
          )}
        >
          <span className="inline-block w-1.5 h-3 rounded-sm bg-current opacity-60" />
          {getHealthLabel(health)}
        </div>
      )}

      {/* Quick Metrics */}
      {isActive && current && (
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
          <span title="Round Trip Time">
            RTT:{" "}
            <span className="text-slate-200 font-mono">
              {Math.round(current.rtt)}ms
            </span>
          </span>
          <span title="Bitrate">
            BR:{" "}
            <span className="text-slate-200 font-mono">
              {Math.round(current.bitrate)}kbps
            </span>
          </span>
          <span title="Quality Tier">
            Q:{" "}
            <span className="text-slate-200 font-mono uppercase">
              {qualityTier}
            </span>
          </span>
        </div>
      )}
    </div>
  );
});
