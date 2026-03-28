"use client";

import React, { memo } from "react";
import { useConnectionStore } from "@/stores/connection-store";
import { Loader2, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionOverlayProps {
  onReconnect?: () => void;
}

/**
 * Overlay shown when connecting, reconnecting, or disconnected.
 */
export const ConnectionOverlay = memo(function ConnectionOverlay({
  onReconnect,
}: ConnectionOverlayProps) {
  const connectionState = useConnectionStore((s) => s.connectionState);
  const error = useConnectionStore((s) => s.error);

  if (connectionState === "connected" || connectionState === "idle") {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <div className="text-center max-w-sm px-6">
        {connectionState === "connecting" && (
          <>
            <Loader2 className="w-10 h-10 text-brand-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Connecting...
            </h3>
            <p className="text-sm text-slate-400">
              Establishing peer-to-peer connection
            </p>
          </>
        )}

        {connectionState === "reconnecting" && (
          <>
            <RefreshCw className="w-10 h-10 text-amber-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Reconnecting...
            </h3>
            <p className="text-sm text-slate-400">
              Connection lost. Attempting to reconnect...
            </p>
          </>
        )}

        {connectionState === "disconnected" && (
          <>
            <WifiOff className="w-10 h-10 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Disconnected
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {error || "The connection was closed"}
            </p>
            {onReconnect && (
              <button
                onClick={onReconnect}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
              >
                Reconnect
              </button>
            )}
          </>
        )}

        {connectionState === "failed" && (
          <>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Connection Failed
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {error || "Unable to establish connection"}
            </p>
            {onReconnect && (
              <button
                onClick={onReconnect}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
              >
                Try Again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
