"use client";

import React, { memo } from "react";
import { useConnectionStore } from "@/stores/connection-store";
import { cn } from "@/lib/utils";
import { Link2, Copy, Check, ExternalLink } from "lucide-react";

interface RoomHeaderProps {
  roomId: string;
}

export const RoomHeader = memo(function RoomHeader({
  roomId,
}: RoomHeaderProps) {
  const role = useConnectionStore((s) => s.role);
  const connectionState = useConnectionStore((s) => s.connectionState);
  const remotePeers = useConnectionStore((s) => s.remotePeers);
  const [copied, setCopied] = React.useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  return (
    <div className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-xl px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Brand + Room ID */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight hidden sm:inline">
              LinkView
            </span>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-700" />

          {/* Room ID */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">
              Room
            </span>
            <code className="bg-slate-800/80 text-brand-400 px-2.5 py-1 rounded-md text-sm font-mono border border-slate-700/50">
              {roomId}
            </code>
          </div>

          {/* Role badge */}
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
              role === "host"
                ? "bg-brand-500/10 text-brand-400 border-brand-500/30"
                : "bg-slate-700/50 text-slate-400 border-slate-600/50",
            )}
          >
            {role || "..."}
          </span>
        </div>

        {/* Right: Share link + peer count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {remotePeers.length} peer{remotePeers.length !== 1 ? "s" : ""}{" "}
            connected
          </span>

          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              copied
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-slate-800 text-slate-300 border-slate-700/50 hover:bg-slate-700 hover:text-white",
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
