"use client";

import React, { memo, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import {
  Zap,
  Gauge,
  Wifi,
  WifiOff,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface NetworkSimulatorProps {
  onUpdate: (config: any) => void;
}

/**
 * Network simulation panel for demo/testing.
 * Allows simulating degraded network conditions.
 */
export const NetworkSimulator = memo(function NetworkSimulator({
  onUpdate,
}: NetworkSimulatorProps) {
  const simulation = useUIStore((s) => s.simulation);
  const setSimulation = useUIStore((s) => s.setSimulation);

  const toggle = useCallback(() => {
    const newEnabled = !simulation.enabled;
    setSimulation({ enabled: newEnabled });
    onUpdate({ ...simulation, enabled: newEnabled });
  }, [simulation, setSimulation, onUpdate]);

  const updateLatency = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const latencyMs = parseInt(e.target.value, 10);
      setSimulation({ latencyMs });
      onUpdate({ ...simulation, latencyMs });
    },
    [simulation, setSimulation, onUpdate],
  );

  const updatePacketLoss = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const packetLossPercent = parseInt(e.target.value, 10);
      setSimulation({ packetLossPercent });
      onUpdate({ ...simulation, packetLossPercent });
    },
    [simulation, setSimulation, onUpdate],
  );

  const updateBandwidth = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const bandwidthKbps = parseInt(e.target.value, 10);
      setSimulation({ bandwidthKbps });
      onUpdate({ ...simulation, bandwidthKbps });
    },
    [simulation, setSimulation, onUpdate],
  );

  const applyPreset = useCallback(
    (preset: {
      latencyMs: number;
      packetLossPercent: number;
      bandwidthKbps: number;
    }) => {
      const config = { ...preset, enabled: true };
      setSimulation(config);
      onUpdate({ ...config });
    },
    [setSimulation, onUpdate],
  );

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Network Simulator
        </h3>
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
            simulation.enabled
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-slate-700/50 text-slate-400 border border-slate-600/50",
          )}
        >
          {simulation.enabled ? (
            <ToggleRight className="w-4 h-4" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          {simulation.enabled ? "Active" : "Inactive"}
        </button>
      </div>

      {/* Presets */}
      <div className="flex gap-2 mb-4">
        <PresetButton
          label="3G"
          onClick={() =>
            applyPreset({
              latencyMs: 200,
              packetLossPercent: 5,
              bandwidthKbps: 500,
            })
          }
          active={simulation.enabled}
        />
        <PresetButton
          label="Unstable"
          onClick={() =>
            applyPreset({
              latencyMs: 300,
              packetLossPercent: 15,
              bandwidthKbps: 300,
            })
          }
          active={simulation.enabled}
        />
        <PresetButton
          label="Terrible"
          onClick={() =>
            applyPreset({
              latencyMs: 500,
              packetLossPercent: 25,
              bandwidthKbps: 100,
            })
          }
          active={simulation.enabled}
        />
        <PresetButton
          label="Reset"
          onClick={() =>
            applyPreset({
              latencyMs: 0,
              packetLossPercent: 0,
              bandwidthKbps: 0,
            })
          }
          active={simulation.enabled}
          variant="reset"
        />
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <SliderControl
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="Added Latency"
          value={simulation.latencyMs}
          min={0}
          max={1000}
          step={10}
          unit="ms"
          onChange={updateLatency}
          disabled={!simulation.enabled}
        />

        <SliderControl
          icon={<WifiOff className="w-3.5 h-3.5" />}
          label="Packet Loss"
          value={simulation.packetLossPercent}
          min={0}
          max={50}
          step={1}
          unit="%"
          onChange={updatePacketLoss}
          disabled={!simulation.enabled}
        />

        <SliderControl
          icon={<Wifi className="w-3.5 h-3.5" />}
          label="Bandwidth Cap"
          value={simulation.bandwidthKbps}
          min={0}
          max={5000}
          step={50}
          unit="kbps"
          postLabel={simulation.bandwidthKbps === 0 ? "Unlimited" : undefined}
          onChange={updateBandwidth}
          disabled={!simulation.enabled}
        />
      </div>
    </div>
  );
});

// ─── Sub-components ────────────────────────────────────────────────────────

function PresetButton({
  label,
  onClick,
  active,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  variant?: "default" | "reset";
}) {
  return (
    <button
      onClick={onClick}
      disabled={!active && variant !== "reset"}
      className={cn(
        "px-3 py-1 rounded-lg text-xs font-medium transition-colors border",
        variant === "reset"
          ? "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700"
          : "bg-slate-700/50 text-slate-300 border-slate-600/50 hover:bg-slate-700 hover:text-white",
        "disabled:opacity-40 disabled:cursor-not-allowed",
      )}
    >
      {label}
    </button>
  );
}

function SliderControl({
  icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  postLabel,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  postLabel?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-40")}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          {icon}
          {label}
        </span>
        <span className="text-xs font-mono text-slate-300">
          {postLabel || `${value} ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-brand-500
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-brand-400
          [&::-webkit-slider-thumb]:cursor-pointer
          disabled:cursor-not-allowed"
      />
    </div>
  );
}
