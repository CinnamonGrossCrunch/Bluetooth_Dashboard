"use client";

import React from "react";

type Props = {
  value?: number;
  title?: string;
  subtitle?: string;
  minCm?: number;
  maxCm?: number;
};

function normalize(value: number | undefined, min: number, max: number): number {
  if (value === undefined || Number.isNaN(value)) return 0;
  // Linear mapping from min-max range to 0-1
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

// Generate ruler tick marks
function generateTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) {
    ticks.push(v);
  }
  return ticks;
}

export function StrokeView({ 
  value, 
  title = "Stroke", 
  subtitle,
  minCm = 0,
  maxCm = 100 
}: Props) {
  const pct = normalize(value, minCm, maxCm) * 100;
  const step = maxCm <= 50 ? 10 : 20; // Tick every 10cm or 20cm depending on range
  const ticks = generateTicks(minCm, maxCm, step);
  
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="label">{title}</div>
          {subtitle && <div className="hint">{subtitle}</div>}
        </div>
        <div className="value">{value !== undefined ? `${value.toFixed(1)} cm` : "--"}</div>
      </div>
      <div className="stroke-container">
        {/* Ruler on the left */}
        <div className="stroke-ruler">
          {ticks.map((tick) => {
            const tickPct = ((tick - minCm) / (maxCm - minCm)) * 100;
            return (
              <div 
                key={tick} 
                className="ruler-tick" 
                style={{ bottom: `${tickPct}%` }}
              >
                <span className="ruler-label">{tick}</span>
                <span className="ruler-line" />
              </div>
            );
          })}
        </div>
        {/* Stroke bar */}
        <div className="stroke-track">
          <div className="stroke-fill" style={{ height: `${pct}%` }} />
          <div className="stroke-marker" style={{ bottom: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
