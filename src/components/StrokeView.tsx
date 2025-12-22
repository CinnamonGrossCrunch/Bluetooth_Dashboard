"use client";

import React from "react";

type Props = {
  value?: number;
  title?: string;
  subtitle?: string;
};

function normalize(value?: number): number {
  if (value === undefined || Number.isNaN(value)) return 0.5;
  // Compress extremes with tanh-like mapping for stability.
  const scaled = Math.tanh(value / 12);
  return Math.min(1, Math.max(0, 0.5 + scaled / 2));
}

export function StrokeView({ value, title = "Stroke", subtitle }: Props) {
  const pct = normalize(value) * 100;
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="label">{title}</div>
          {subtitle && <div className="hint">{subtitle}</div>}
        </div>
        <div className="value">{value !== undefined ? value.toFixed(2) : "--"}</div>
      </div>
      <div className="stroke-container">
        <div className="stroke-track">
          <div className="stroke-fill" style={{ height: `${pct}%` }} />
          <div className="stroke-marker" style={{ bottom: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
