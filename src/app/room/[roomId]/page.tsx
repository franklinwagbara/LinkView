"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useConnectionStore } from "@/stores/connection-store";
import { useUIStore } from "@/stores/ui-store";
import { VideoStream } from "@/components/VideoStream";
import { RoomHeader } from "@/components/RoomHeader";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ConnectionOverlay } from "@/components/ConnectionOverlay";
import { ControlPanel } from "@/components/ControlPanel";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { NetworkSimulator } from "@/components/NetworkSimulator";
import { QualitySelector } from "@/components/QualitySelector";
import { ParticipantList } from "@/components/ParticipantList";
import { ToastContainer } from "@/components/ToastContainer";
import { cn } from "@/lib/utils";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const {
    localStream,
    remoteStream,
    startSharing,
    stopSharing,
    disconnect,
    reconnect,
    forceQuality,
    updateSimulation,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
  } = useWebRTC(roomId);

  const role = useConnectionStore((s) => s.role);
  const isSharing = useConnectionStore((s) => s.isSharing);
  const connectionState = useConnectionStore((s) => s.connectionState);
  const showMetrics = useUIStore((s) => s.showMetrics);
  const showSimulator = useUIStore((s) => s.showSimulator);

  const handleDisconnect = React.useCallback(() => {
    disconnect();
    router.push("/");
  }, [disconnect, router]);

  const isHost = role === "host";
  const hasRemoteStream = !!remoteStream;
  const sidebarOpen = showMetrics || showSimulator;

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <RoomHeader roomId={roomId} />

      {/* Connection status bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/50 px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <ConnectionStatus />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative flex flex-col p-4 gap-4 overflow-hidden">
          {/* Connection Overlay */}
          <ConnectionOverlay onReconnect={reconnect} />

          {/* Main video (remote stream or local preview) */}
          <div className="flex-1 min-h-0">
            {hasRemoteStream ? (
              <VideoStream
                stream={remoteStream}
                label="Remote Screen"
                className="w-full h-full"
                objectFit="contain"
              />
            ) : isHost && localStream ? (
              <VideoStream
                stream={localStream}
                muted
                label="Your Screen (Preview)"
                className="w-full h-full"
                objectFit="contain"
              />
            ) : (
              <VideoStream
                stream={null}
                label={
                  isHost
                    ? 'Click "Share Screen" to begin'
                    : "Waiting for host to share screen..."
                }
                className="w-full h-full"
              />
            )}
          </div>

          {/* Picture-in-picture: local stream when remote is active */}
          {hasRemoteStream && isHost && localStream && (
            <div className="absolute top-6 right-6 w-48 h-36 z-20 shadow-2xl shadow-black/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <VideoStream
                stream={localStream}
                muted
                label="You"
                className="w-full h-full"
                objectFit="cover"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className={cn(
              "w-[360px] border-l border-slate-800/50 bg-slate-900/40 overflow-y-auto",
              "p-4 space-y-4 animate-fade-in",
            )}
          >
            {/* Participant list */}
            <ParticipantList />

            {/* Quality selector */}
            <QualitySelector onForceQuality={forceQuality} />

            {/* Network simulator */}
            {showSimulator && <NetworkSimulator onUpdate={updateSimulation} />}

            {/* Metrics dashboard */}
            {showMetrics && <MetricsDashboard />}
          </div>
        )}
      </div>

      {/* Controls */}
      <ControlPanel
        isSharing={isSharing}
        localStream={localStream}
        remoteStream={remoteStream}
        onStartSharing={startSharing}
        onStopSharing={stopSharing}
        onDisconnect={handleDisconnect}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onPauseRecording={pauseRecording}
        onResumeRecording={resumeRecording}
        onDownloadRecording={downloadRecording}
      />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}
