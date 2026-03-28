"use client";

import React, { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChartDataPoint } from "@/types";

interface NetworkChartProps {
  data: ChartDataPoint[];
  color: string;
  label: string;
  unit: string;
  domain?: [number, number];
}

/** Custom tooltip to avoid default Recharts styling */
function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="text-white text-sm font-mono">
        {typeof payload[0].value === "number"
          ? payload[0].value.toFixed(1)
          : payload[0].value}{" "}
        <span className="text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

/**
 * Optimized real-time chart component for network metrics.
 * Uses memoization and windowed data to prevent thrashing.
 */
export const NetworkChart = memo(function NetworkChart({
  data,
  color,
  label,
  unit,
  domain,
}: NetworkChartProps) {
  const chartData = useMemo(() => data.slice(-30), [data]);

  const currentValue = useMemo(() => {
    if (chartData.length === 0) return "—";
    const last = chartData[chartData.length - 1];
    return last.value.toFixed(1);
  }, [chartData]);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-300">{label}</h4>
        <span className="text-sm font-mono" style={{ color }}>
          {currentValue} <span className="text-slate-500 text-xs">{unit}</span>
        </span>
      </div>

      <div className="h-[120px]">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`gradient-${label}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                domain={domain || ["auto", "auto"]}
              />
              <Tooltip
                content={<CustomTooltip unit={unit} />}
                cursor={{ stroke: "#475569", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${label})`}
                animationDuration={300}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs">
            Collecting data...
          </div>
        )}
      </div>
    </div>
  );
});
