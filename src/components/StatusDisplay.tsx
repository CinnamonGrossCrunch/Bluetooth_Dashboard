"use client";

import { useState } from "react";

interface StatusDisplayProps {
  statusData: string | null;
  onRequestStatus: () => void;
  isConnected: boolean;
}

export function StatusDisplay({ statusData, onRequestStatus, isConnected }: StatusDisplayProps) {
  return (
    <div className="panel" style={{ width: "100%" }}>
      <div className="panel-header">
        <div className="label">Device Status</div>
        <button 
          onClick={onRequestStatus}
          disabled={!isConnected}
          style={{
            backgroundColor: isConnected ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            padding: "6px 16px",
            borderRadius: "4px",
            cursor: isConnected ? "pointer" : "not-allowed"
          }}
        >
          Request Status
        </button>
      </div>
      
      <div style={{
        minHeight: "150px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: "4px",
        padding: "12px",
        fontFamily: "monospace",
        fontSize: "14px",
        whiteSpace: "pre-line"
      }}>
        {statusData ? (
          <div>
            <div style={{ 
              fontWeight: "bold", 
              marginBottom: "8px",
              color: "#495057"
            }}>
              Latest Status Response:
            </div>
            <div style={{ color: "#212529" }}>
              {statusData}
            </div>
          </div>
        ) : (
          <div style={{ 
            color: "#6c757d", 
            fontStyle: "italic",
            textAlign: "center",
            paddingTop: "40px"
          }}>
            {isConnected 
              ? "Click 'Request Status' to get device information"
              : "Connect to device to request status"
            }
          </div>
        )}
      </div>
    </div>
  );
}