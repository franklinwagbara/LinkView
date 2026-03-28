"use client";

import React, { memo } from "react";
import { useConnectionStore } from "@/stores/connection-store";
import { useMetricsStore } from "@/stores/metrics-store";
import { cn, getHealthClasses, formatBitrate } from "@/lib/utils";
import { Users, Monitor, Eye, Signal } from "lucide-react";

/**
 * List of connected participants with their status.
 */
export const ParticipantList = memo(function ParticipantList() {
  const peerId = useConnectionStore((s) => s.peerId);
  const role = useConnectionStore((s) => s.role);
  const remotePeers = useConnectionStore((s) => s.remotePeers);
  const connectionState = useConnectionStore((s) => s.connectionState);
  const health = useMetricsStore((s) => s.health);

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Participants ({remotePeers.length + 1})
      </h3>

      <div className="space-y-2">
        {/* Self */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              role === "host" ? "bg-brand-500/20" : "bg-slate-700",
            )}
          >
            {role === "host" ? (
              <Monitor className="w-4 h-4 text-brand-400" />
            ) : (
              <Eye className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">
              You
              <span className="ml-1.5 text-xs text-slate-500">
                ({role || "..."})
              </span>
            </p>
            <p className="text-[10px] font-mono text-slate-600 truncate">
              {peerId?.slice(0, 16)}
            </p>
          </div>
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              connectionState === "connected"
                ? "bg-emerald-400"
                : "bg-slate-600",
            )}
          />
        </div>

        {/* Remote Peers */}
        {remotePeers.map((peer) => (
          <div
            key={peer}
            className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50"
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <Signal className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-300 truncate">Peer</p>
              <p className="text-[10px] font-mono text-slate-600 truncate">
                {peer.slice(0, 16)}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        ))}

        {remotePeers.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-2">
            No other participants yet
          </p>
        )}
      </div>
    </div>
  );
});
