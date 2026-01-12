"use client";

import React, { useEffect, useRef, useState } from "react";

const FPS = 30;
const SAMPLE_RATE = 4; // Assuming ~4Hz from firmware

interface DataPoint {
  value: number;
  timestamp: number;
}

interface LiveChartProps {
  value?: number;
  label?: string;
  timeSpanSeconds?: number; // External time control
  color?: string;
  autoScale?: boolean; // Enable auto-scaling Y-axis
  yAxisBuffer?: number; // Buffer percentage for Y-axis (default 10%)
  isPaused?: boolean; // Pause display updates
  height?: number; // Chart height in pixels
}

export function LiveChart({ 
  value, 
  label, 
  timeSpanSeconds = 30, 
  color = "#7ae0ff",
  autoScale = false,
  yAxisBuffer = 10,
  isPaused = false,
  height = 180 
}: LiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<DataPoint[]>([]);
  const rafRef = useRef<number>();
  const lastDrawRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0); // Track when paused started

  useEffect(() => {
    if (value === undefined || Number.isNaN(value) || isPaused) return;
    
    const now = Date.now();
    const newPoint = { value, timestamp: now };
    
    // Add new point and filter by time window
    const cutoffTime = now - (timeSpanSeconds * 1000);
    const filteredData = dataRef.current.filter(point => point.timestamp > cutoffTime);
    filteredData.push(newPoint);
    
    dataRef.current = filteredData;
  }, [value, timeSpanSeconds, isPaused]);

  // Track pause state changes
  useEffect(() => {
    if (isPaused) {
      pauseTimeRef.current = Date.now();
    }
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (ts: number) => {
      // Only continue animation if not paused
      if (!isPaused) {
        rafRef.current = requestAnimationFrame(draw);
      }
      
      if (ts - lastDrawRef.current < 1000 / FPS) return;
      lastDrawRef.current = ts;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      
      const data = dataRef.current;
      if (!data.length) return;

      // Filter data within time window
      // When paused, use the pause time as the reference point instead of current time
      const referenceTime = isPaused ? pauseTimeRef.current : Date.now();
      const cutoffTime = referenceTime - (timeSpanSeconds * 1000);
      const visibleData = data.filter(point => point.timestamp > cutoffTime);
      
      if (!visibleData.length) return;

      const values = visibleData.map(p => p.value);
      let min = Math.min(...values);
      let max = Math.max(...values);
      
      // Auto-scaling with buffer
      if (autoScale && values.length > 1) {
        const range = max - min;
        const buffer = range * (yAxisBuffer / 100);
        min = min - buffer;
        max = max + buffer;
      }
      
      const span = max - min || 1;
      
      // Calculate time-based X positions
      const timeSpanMs = timeSpanSeconds * 1000;
      const stepX = width / timeSpanMs;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      visibleData.forEach((point, i) => {
        const timeFromOldest = point.timestamp - (referenceTime - timeSpanMs);
        const x = (timeFromOldest / timeSpanMs) * width;
        const y = height - ((point.value - min) / span) * height;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw time grid lines and labels
      ctx.strokeStyle = "#334455";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#8ca6b8";
      
      // Determine number of grid lines based on time span
      let gridCount = 4;
      let labelInterval = timeSpanSeconds / 4;
      
      if (timeSpanSeconds <= 30) {
        gridCount = timeSpanSeconds / 5; // Every 5 seconds for short spans
        labelInterval = 5;
      } else if (timeSpanSeconds <= 120) {
        gridCount = 6; // Every 20-30 seconds
        labelInterval = timeSpanSeconds / 6;
      } else {
        gridCount = 5; // Every 1-2 minutes for long spans  
        labelInterval = timeSpanSeconds / 5;
      }
      
      for (let i = 1; i < gridCount; i++) {
        const x = (i / gridCount) * width;
        
        // Grid line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // Time label
        const timeAgo = timeSpanSeconds - (i / gridCount * timeSpanSeconds);
        let label = "";
        if (timeSpanSeconds <= 60) {
          label = `${Math.round(timeAgo)}s`;
        } else {
          const minutes = Math.floor(timeAgo / 60);
          const seconds = Math.round(timeAgo % 60);
          label = seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
        }
        
        ctx.fillText(label, x + 2, 12);
      }
      
      // "Now" label at right edge
      ctx.fillText("now", width - 25, 12);
      
      ctx.setLineDash([]);

      // Y-axis grid and labels (if auto-scaling enabled)
      if (autoScale && values.length > 1) {
        ctx.strokeStyle = "#334455";
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 3]);
        ctx.fillStyle = "#8ca6b8";
        ctx.font = "10px monospace";
        
        // Calculate integer-based Y-axis ticks with decimal subdivisions for tight ranges
        const range = max - min;
        const minInt = Math.floor(min);
        const maxInt = Math.ceil(max);
        const integerRange = maxInt - minInt;
        
        // Use 7 ticks for collapsed, 15 for expanded
        const targetTicks = height && height > 300 ? 15 : 7;
        
        const tickValues: number[] = [];
        const midPointTicks: number[] = [];
        
        if (range < 0.1) {
          // Very small range: use fine decimal steps
          const step = range / (targetTicks - 1);
          const startVal = Math.floor(min / step) * step;
          for (let val = startVal; val <= max + step; val += step) {
            if (val >= min && val <= max) {
              tickValues.push(val);
            }
          }
        } else if (integerRange <= 3 && range < 5) {
          // Tight range with few integers: add 0.10 increments
          const step = height && height > 300 ? 0.1 : 0.2; // 0.1 for expanded, 0.2 for collapsed
          
          // Generate main ticks at step intervals
          const startVal = Math.floor(min / step) * step;
          for (let val = startVal; val <= max + step; val += step) {
            if (val >= min && val <= max) {
              tickValues.push(val);
            }
          }
          
          // Generate mid-point ticks between main ticks
          for (let i = 0; i < tickValues.length - 1; i++) {
            const midPoint = (tickValues[i] + tickValues[i + 1]) / 2;
            if (midPoint >= min && midPoint <= max) {
              midPointTicks.push(midPoint);
            }
          }
        } else if (integerRange <= targetTicks) {
          // Medium range: use integer steps
          for (let val = minInt; val <= maxInt; val++) {
            if (val >= min && val <= max) {
              tickValues.push(val);
            }
          }
          
          // Add mid-point ticks at 0.5 intervals between integers
          for (let val = minInt; val < maxInt; val++) {
            const midPoint = val + 0.5;
            if (midPoint >= min && midPoint <= max) {
              midPointTicks.push(midPoint);
            }
          }
        } else {
          // Large range: use larger integer steps
          const step = Math.ceil(integerRange / (targetTicks - 1));
          for (let val = minInt; val <= maxInt; val += step) {
            if (val >= min && val <= max) {
              tickValues.push(val);
            }
          }
          
          // Add mid-point ticks between large steps
          for (let i = 0; i < tickValues.length - 1; i++) {
            const midPoint = (tickValues[i] + tickValues[i + 1]) / 2;
            if (midPoint >= min && midPoint <= max) {
              midPointTicks.push(midPoint);
            }
          }
        }
        
        // Draw the main ticks with labels
        for (const value of tickValues) {
          const y = height - ((value - min) / range) * height;
          
          // Horizontal grid line (full opacity)
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
          
          // Y-axis label - integers shown as whole numbers, decimals with appropriate precision
          const isWholeNumber = Math.abs(value - Math.round(value)) < 0.001;
          let label: string;
          if (isWholeNumber) {
            label = value.toFixed(0);
          } else if (range < 0.1) {
            label = value.toFixed(3);
          } else {
            label = value.toFixed(1);
          }
          ctx.fillText(label, 5, y - 5);
        }
        
        // Draw the mid-point ticks (50% opacity, no labels)
        ctx.globalAlpha = 0.5;
        for (const value of midPointTicks) {
          const y = height - ((value - min) / range) * height;
          
          // Horizontal grid line (50% opacity)
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0; // Reset opacity
        
        ctx.setLineDash([]);
      }

      // Border
      ctx.strokeStyle = "#223443";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    };

    // Start/restart animation based on pause state
    if (!isPaused) {
      rafRef.current = requestAnimationFrame(draw);
    }
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [timeSpanSeconds, color, autoScale, yAxisBuffer, height, isPaused]); // Added isPaused to dependencies

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="label">{label ?? "Live Chart"}</div>
        <div className="hint">{value !== undefined ? value.toFixed(3) : "--"}</div>
      </div>
      <canvas ref={canvasRef} width={600} height={height} className="chart-canvas" />
    </div>
  );
}
