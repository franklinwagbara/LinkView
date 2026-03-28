"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { generateRoomId } from "@/lib/utils";
import {
  Link2,
  MonitorPlay,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Users,
  Activity,
  Globe,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = useCallback(() => {
    const roomId = generateRoomId();
    router.push(`/room/${roomId}`);
  }, [router]);

  const handleJoin = useCallback(() => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Please enter a room code");
      return;
    }
    if (code.length < 4) {
      setError("Room code must be at least 4 characters");
      return;
    }
    setError("");
    router.push(`/room/${code}`);
  }, [joinCode, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleJoin();
    },
    [handleJoin],
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              LinkView
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="hidden sm:inline">WebRTC-Powered</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-xs font-medium text-brand-400 mb-6">
              <Zap className="w-3.5 h-3.5" />
              Sub-300ms Latency Target
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
              Browser-Based
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">
                Remote Viewing
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Share and view screens directly between browsers with real-time
              network insights, adaptive streaming, and production-grade
              resilience.
            </p>
          </div>

          {/* Actions */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-16">
            {/* Create Room */}
            <button
              onClick={handleCreate}
              className="group relative flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-brand-600/20 to-brand-700/10 border border-brand-500/30 rounded-2xl hover:border-brand-400/50 transition-all hover:shadow-xl hover:shadow-brand-500/10"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center group-hover:bg-brand-600/30 transition-colors">
                <MonitorPlay className="w-7 h-7 text-brand-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Create Room
                </h3>
                <p className="text-xs text-slate-400">
                  Share your screen with others
                </p>
              </div>
              <ArrowRight className="absolute right-4 top-4 w-4 h-4 text-brand-500/50 group-hover:text-brand-400 transition-colors" />
            </button>

            {/* Join Room */}
            <div className="flex flex-col items-center gap-3 p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-white mb-1">
                  Join Room
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Enter a room code to view
                </p>
              </div>
              <div className="w-full space-y-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter room code"
                  maxLength={10}
                  className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50"
                />
                {error && (
                  <p className="text-xs text-red-400 text-center">{error}</p>
                )}
                <button
                  onClick={handleJoin}
                  className="w-full py-2 bg-slate-700/80 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              icon={<Activity className="w-5 h-5 text-amber-400" />}
              title="Live Metrics"
              description="Real-time RTT, jitter, packet loss, and bitrate monitoring"
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5 text-emerald-400" />}
              title="Adaptive Quality"
              description="Automatic bitrate and resolution adjustment"
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5 text-blue-400" />}
              title="Resilient"
              description="Auto-reconnect, ICE restart, graceful degradation"
            />
            <FeatureCard
              icon={<Globe className="w-5 h-5 text-purple-400" />}
              title="P2P Direct"
              description="Browser-to-browser, no media relay servers"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>LinkView — WebRTC Remote Viewing Platform</span>
          <span>Powered by WebRTC + Next.js</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-slate-800/20 border border-slate-800/50 rounded-xl">
      <div className="mb-2">{icon}</div>
      <h4 className="text-sm font-semibold text-slate-200 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
