"use client";

import React, { memo, useState, useCallback } from "react";
import { useConnectionStore } from "@/stores/connection-store";
import { useUIStore } from "@/stores/ui-store";
import { cn, formatDuration } from "@/lib/utils";
import {
  MonitorUp,
  MonitorOff,
  BarChart3,
  Zap,
  CircleDot,
  Square,
  Download,
  PhoneOff,
  Maximize2,
  Users,
  Settings,
  Pause,
  Play,
} from "lucide-react";

interface ControlPanelProps {
  isSharing: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onStartSharing: () => void;
  onStopSharing: () => void;
  onDisconnect: () => void;
  onStartRecording: (stream: MediaStream) => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onDownloadRecording: () => void;
}

/**
 * Bottom control bar with all room actions.
 */
export const ControlPanel = memo(function ControlPanel({
  isSharing,
  localStream,
  remoteStream,
  onStartSharing,
  onStopSharing,
  onDisconnect,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onDownloadRecording,
}: ControlPanelProps) {
  const role = useConnectionStore((s) => s.role);
  const connectionState = useConnectionStore((s) => s.connectionState);

  const toggleMetrics = useUIStore((s) => s.toggleMetrics);
  const toggleSimulator = useUIStore((s) => s.toggleSimulator);
  const showMetrics = useUIStore((s) => s.showMetrics);
  const showSimulator = useUIStore((s) => s.showSimulator);

  const recordingState = useUIStore((s) => s.recordingState);
  const recordingDuration = useUIStore((s) => s.recordingDuration);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleRecordToggle = useCallback(() => {
    if (recordingState === "idle" || recordingState === "stopped") {
      const stream = remoteStream || localStream;
      if (stream) {
        onStartRecording(stream);
      }
    } else if (recordingState === "recording") {
      onStopRecording();
    }
  }, [
    recordingState,
    remoteStream,
    localStream,
    onStartRecording,
    onStopRecording,
  ]);

  const handleRecordPause = useCallback(() => {
    if (recordingState === "recording") {
      onPauseRecording();
    } else if (recordingState === "paused") {
      onResumeRecording();
    }
  }, [recordingState, onPauseRecording, onResumeRecording]);

  const isConnected = connectionState === "connected";
  const isHost = role === "host";

  return (
    <div className="bg-slate-900/90 border-t border-slate-700/50 backdrop-blur-xl px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Screen sharing controls */}
        <div className="flex items-center gap-2">
          {isHost && (
            <>
              {!isSharing ? (
                <ControlButton
                  icon={<MonitorUp className="w-4 h-4" />}
                  label="Share Screen"
                  onClick={onStartSharing}
                  variant="primary"
                  disabled={!isConnected}
                />
              ) : (
                <ControlButton
                  icon={<MonitorOff className="w-4 h-4" />}
                  label="Stop Sharing"
                  onClick={onStopSharing}
                  variant="danger"
                />
              )}
            </>
          )}

          {/* Recording */}
          <ControlButton
            icon={
              recordingState === "recording" ? (
                <Square className="w-3.5 h-3.5" />
              ) : (
                <CircleDot className="w-4 h-4" />
              )
            }
            label={
              recordingState === "recording"
                ? `Stop (${formatDuration(recordingDuration)})`
                : recordingState === "paused"
                  ? "Recording Paused"
                  : "Record"
            }
            onClick={handleRecordToggle}
            variant={recordingState === "recording" ? "danger" : "default"}
            disabled={!isConnected && recordingState === "idle"}
          />

          {recordingState === "recording" || recordingState === "paused" ? (
            <ControlButton
              icon={
                recordingState === "paused" ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )
              }
              label={recordingState === "paused" ? "Resume" : "Pause"}
              onClick={handleRecordPause}
              variant="default"
            />
          ) : null}

          {recordingState === "stopped" && (
            <ControlButton
              icon={<Download className="w-4 h-4" />}
              label="Download"
              onClick={onDownloadRecording}
              variant="default"
            />
          )}
        </div>

        {/* Center: Toggle panels */}
        <div className="flex items-center gap-2">
          <ControlButton
            icon={<BarChart3 className="w-4 h-4" />}
            label="Metrics"
            onClick={toggleMetrics}
            variant={showMetrics ? "active" : "default"}
          />
          <ControlButton
            icon={<Zap className="w-4 h-4" />}
            label="Simulator"
            onClick={toggleSimulator}
            variant={showSimulator ? "active" : "default"}
          />
          <ControlButton
            icon={<Maximize2 className="w-4 h-4" />}
            label="Fullscreen"
            onClick={toggleFullscreen}
            variant="default"
          />
        </div>

        {/* Right: Disconnect */}
        <div className="flex items-center gap-2">
          <ControlButton
            icon={<PhoneOff className="w-4 h-4" />}
            label="Leave"
            onClick={onDisconnect}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
});

// ─── Control Button ─────────────────────────────────────────────────────────

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "danger" | "active";
  disabled?: boolean;
}

const ControlButton = memo(function ControlButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/50",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "default" &&
          "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50",
        variant === "primary" &&
          "bg-brand-600 text-white hover:bg-brand-500 border border-brand-500/50 shadow-lg shadow-brand-500/20",
        variant === "danger" &&
          "bg-red-600/80 text-white hover:bg-red-500 border border-red-500/50",
        variant === "active" &&
          "bg-brand-600/20 text-brand-400 border border-brand-500/30 hover:bg-brand-600/30",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
});
