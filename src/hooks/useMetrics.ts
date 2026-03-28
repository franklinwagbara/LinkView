"use client";

import { useEffect, useRef, useCallback } from "react";
import { MetricsCollector } from "@/lib/metrics-collector";
import { AdaptiveStreamingEngine } from "@/lib/adaptive-streaming";
import { PeerConnectionManager } from "@/lib/peer-connection";
import { useMetricsStore } from "@/stores/metrics-store";
import { useUIStore } from "@/stores/ui-store";
import { METRICS_INTERVAL_MS } from "@/lib/constants";
import type { NetworkSimulationConfig, QualityTier } from "@/types";

/**
 * Hook that manages metrics collection and adaptive streaming.
 * Runs a continuous loop to collect WebRTC stats and adjust quality.
 */
export function useMetrics(pcManager: PeerConnectionManager | null) {
  const collectorRef = useRef(new MetricsCollector());
  const engineRef = useRef(new AdaptiveStreamingEngine());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushMetrics = useMetricsStore((s) => s.pushMetrics);
  const setQuality = useMetricsStore((s) => s.setQuality);
  const simulation = useUIStore((s) => s.simulation);

  // Set up quality change callback
  useEffect(() => {
    engineRef.current.setQualityChangeCallback((tier, reason) => {
      setQuality(tier, reason);
    });
  }, [setQuality]);

  // Update simulation config
  useEffect(() => {
    engineRef.current.setSimulation(simulation);
  }, [simulation]);

  // Start/stop metrics collection when pcManager changes
  useEffect(() => {
    if (!pcManager || pcManager.isClosed) {
      stopCollection();
      return;
    }

    startCollection(pcManager);

    return () => {
      stopCollection();
    };
  }, [pcManager]); // eslint-disable-line react-hooks/exhaustive-deps

  function startCollection(pc: PeerConnectionManager) {
    stopCollection();

    intervalRef.current = setInterval(async () => {
      if (pc.isClosed) {
        stopCollection();
        return;
      }

      const metrics = await collectorRef.current.collect(pc.connection);
      if (metrics) {
        pushMetrics(metrics);
        await engineRef.current.evaluate(metrics, pc);
      }
    }, METRICS_INTERVAL_MS);
  }

  function stopCollection() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  const forceQuality = useCallback(
    async (tier: QualityTier) => {
      if (pcManager && !pcManager.isClosed) {
        await engineRef.current.forceQuality(tier, pcManager);
        setQuality(tier, "Manual override");
      }
    },
    [pcManager, setQuality],
  );

  const updateSimulation = useCallback((config: NetworkSimulationConfig) => {
    useUIStore.getState().setSimulation(config);
    engineRef.current.setSimulation(config);
  }, []);

  const reset = useCallback(() => {
    stopCollection();
    collectorRef.current = new MetricsCollector();
    engineRef.current.reset();
    useMetricsStore.getState().reset();
  }, []);

  return { forceQuality, updateSimulation, reset };
}
