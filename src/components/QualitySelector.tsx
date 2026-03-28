"use client";

import React, { memo } from "react";
import { useMetricsStore } from "@/stores/metrics-store";
import { cn } from "@/lib/utils";
import type { QualityTier } from "@/types";
import { Sliders, Zap } from "lucide-react";

interface QualitySelectorProps {
  onForceQuality: (tier: QualityTier) => void;
}

const tiers: { tier: QualityTier; label: string; desc: string }[] = [
  { tier: "high", label: "High", desc: "1080p / 3 Mbps" },
  { tier: "medium", label: "Medium", desc: "720p / 1.5 Mbps" },
  { tier: "low", label: "Low", desc: "480p / 500 Kbps" },
  { tier: "minimal", label: "Minimal", desc: "360p / 200 Kbps" },
];

export const QualitySelector = memo(function QualitySelector({
  onForceQuality,
}: QualitySelectorProps) {
  const currentTier = useMetricsStore((s) => s.qualityTier);

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Sliders className="w-4 h-4" />
        Quality Override
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {tiers.map(({ tier, label, desc }) => (
          <button
            key={tier}
            onClick={() => onForceQuality(tier)}
            className={cn(
              "flex flex-col items-start p-2.5 rounded-lg border text-left transition-all",
              tier === currentTier
                ? "bg-brand-600/15 border-brand-500/40 text-brand-300"
                : "bg-slate-900/50 border-slate-700/30 text-slate-400 hover:bg-slate-800 hover:text-slate-200",
            )}
          >
            <span className="text-xs font-semibold">{label}</span>
            <span className="text-[10px] opacity-70">{desc}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-slate-600 flex items-center gap-1">
        <Zap className="w-3 h-3" />
        Adaptive mode resumes after 5s of stable conditions
      </p>
    </div>
  );
});
