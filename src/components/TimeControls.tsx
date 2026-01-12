"use client";

import { useState } from "react";

interface TimeControlsProps {
  currentDuration: number;
  onDurationChange: (duration: number) => void;
  label?: string;
}

const TIME_OPTIONS = [
  { label: "10s", value: 10 },
  { label: "20s", value: 20 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
];

export function TimeControls({ currentDuration, onDurationChange, label = "Time Range" }: TimeControlsProps) {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "8px",
      marginBottom: "12px",
      flexWrap: "wrap"
    }}>
      <span style={{ 
        fontSize: "14px", 
        fontWeight: "500",
        color: "#666",
        marginRight: "8px"
      }}>
        {label}:
      </span>
      
      {TIME_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onDurationChange(option.value)}
          style={{
            padding: "6px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            backgroundColor: currentDuration === option.value ? "#007bff" : "white",
            color: currentDuration === option.value ? "white" : "#333",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: currentDuration === option.value ? "600" : "400",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            if (currentDuration !== option.value) {
              e.currentTarget.style.backgroundColor = "#f8f9fa";
            }
          }}
          onMouseOut={(e) => {
            if (currentDuration !== option.value) {
              e.currentTarget.style.backgroundColor = "white";
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}