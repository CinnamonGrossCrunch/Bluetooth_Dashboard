"use client";

import { useEffect, useRef, useState } from "react";

interface SerialOutputProps {
  data: string[];
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
}

export function SerialOutput({ data, isPaused, onPause, onResume, onClear }: SerialOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Auto-scroll to bottom unless manually scrolled up
  useEffect(() => {
    if (!autoScroll || isPaused) return;
    
    const container = containerRef.current;
    if (container) {
      const isScrolledToBottom = 
        container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
      
      if (isScrolledToBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [data, autoScroll, isPaused]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      const isAtBottom = 
        container.scrollHeight - container.clientHeight <= container.scrollTop + 5;
      setAutoScroll(isAtBottom);
    }
  };

  return (
    <div className="panel" style={{ width: "100%" }}>
      <div className="panel-header">
        <div className="label">Serial Output</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            onClick={isPaused ? onResume : onPause}
            style={{ 
              backgroundColor: isPaused ? "#28a745" : "#ffc107",
              color: isPaused ? "white" : "black",
              border: "none",
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button 
            onClick={onClear}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              border: "none", 
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Clear
          </button>
          <div style={{ fontSize: "12px", color: "#666", alignSelf: "center" }}>
            {data.length} lines
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: "300px",
          overflowY: "auto",
          backgroundColor: "#1a1a1a",
          color: "#00ff00",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "8px",
          border: "1px solid #333",
          whiteSpace: "pre-wrap"
        }}
      >
        {data.slice(-100).map((line, index) => (
          <div key={index} style={{ marginBottom: "2px" }}>
            {line}
          </div>
        ))}
        {data.length === 0 && (
          <div style={{ color: "#666", fontStyle: "italic" }}>
            No serial data received yet...
          </div>
        )}
      </div>
      
      {!autoScroll && (
        <div style={{ 
          position: "absolute", 
          bottom: "20px", 
          right: "20px",
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px"
        }}>
          Scroll to bottom to auto-follow
        </div>
      )}
    </div>
  );
}