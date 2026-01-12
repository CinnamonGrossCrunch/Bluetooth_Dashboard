"use client";

import { useState } from "react";
import { LiveChart } from "./LiveChart";
import { TimeControls } from "./TimeControls";

interface WeightChartProps {
  weight?: number;
}

export function WeightChart({ weight }: WeightChartProps) {
  const [timeSpanSeconds, setTimeSpanSeconds] = useState(30);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const chartHeight = isExpanded ? 360 : 180;

  return (
    <div style={{ width: "100%" }}>
      <div className="panel">
        <div className="panel-header">
          <div className="label">Weight Chart</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="hint">
              {weight !== undefined ? `${weight.toFixed(2)} lbs` : "No data"}
            </div>
            
            <button 
              onClick={() => setIsPaused(!isPaused)}
              style={{
                padding: "6px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: isPaused ? "#ffc107" : "#28a745",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                padding: "6px 12px",
                border: "1px solid #ddd", 
                borderRadius: "4px",
                backgroundColor: "#007bff",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>
        
        <TimeControls 
          currentDuration={timeSpanSeconds}
          onDurationChange={setTimeSpanSeconds}
          label="Time Range"
        />
        
        <LiveChart 
          value={weight ?? 0} 
          label="Weight (lbs)" 
          timeSpanSeconds={timeSpanSeconds}
          color="#ff6b6b" // Red color to distinguish from height chart
          autoScale={true}
          yAxisBuffer={10} // 10% buffer above/below min/max
          height={chartHeight}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
}