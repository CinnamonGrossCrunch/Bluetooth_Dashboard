"use client";

import React, { useEffect, useRef } from "react";

const MAX_POINTS = 300;
const FPS = 30;

export function LiveChart({ value, label }: { value?: number; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<number[]>([]);
  const rafRef = useRef<number>();
  const lastDrawRef = useRef<number>(0);

  useEffect(() => {
    if (value === undefined || Number.isNaN(value)) return;
    const next = dataRef.current.slice(-MAX_POINTS + 1);
    next.push(value);
    dataRef.current = next;
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (ts: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (ts - lastDrawRef.current < 1000 / FPS) return;
      lastDrawRef.current = ts;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const data = dataRef.current;
      if (!data.length) return;

      const min = Math.min(...data);
      const max = Math.max(...data);
      const span = max - min || 1;
      const stepX = width / Math.max(data.length - 1, 1);

      ctx.strokeStyle = "#7ae0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((val, i) => {
        const x = i * stepX;
        const y = height - ((val - min) / span) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = "#223443";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="label">{label ?? "Live Chart"}</div>
        <div className="hint">{value !== undefined ? value.toFixed(2) : "--"}</div>
      </div>
      <canvas ref={canvasRef} width={600} height={180} className="chart-canvas" />
    </div>
  );
}
