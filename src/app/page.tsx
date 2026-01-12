"use client";

import { useEffect, useMemo, useState } from "react";
import { BleClient, BleStatus, isWebBluetoothSupported } from "../lib/ble";
import { ParsedState } from "../lib/parser";
import { StrokeView } from "../components/StrokeView";
import { LiveChart } from "../components/LiveChart";
import { WeightChart } from "../components/WeightChart";
import { SerialOutput } from "../components/SerialOutput";
import { StatusDisplay } from "../components/StatusDisplay";
import { TimeControls } from "../components/TimeControls";

export default function Home() {
  const [status, setStatus] = useState<BleStatus>("idle");
  const [state, setState] = useState<ParsedState | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [nominalWeight, setNominalWeight] = useState<number>(50);
  const [deviceSummary, setDeviceSummary] = useState<string>("No device");
  const [supported, setSupported] = useState<boolean | null>(null);
  
  // Serial output state
  const [serialLines, setSerialLines] = useState<string[]>([]);
  const [serialPaused, setSerialPaused] = useState(false);
  
  // Status display state
  const [statusResponse, setStatusResponse] = useState<string | null>(null);

  const ble = useMemo(() => new BleClient(), []);

  useEffect(() => {
    const offState = ble.onState((s) => setState(s));
    const offStatus = ble.onStatus((s) => {
      setStatus(s);
      setDeviceSummary(ble.getDeviceSummary());
    });
    const offRawLine = ble.onRawLine((line) => {
      if (!serialPaused) {
        setSerialLines(prev => [...prev, `${new Date().toLocaleTimeString()}: ${line}`].slice(-1000)); // Keep last 1000 lines
      }
    });
    const offStatusResponse = ble.onStatusResponse((response) => {
      setStatusResponse(response);
    });
    
    return () => {
      offState();
      offStatus();
      offRawLine();
      offStatusResponse();
      ble.disconnect();
    };
  }, [ble, serialPaused]);

  useEffect(() => {
    setSupported(isWebBluetoothSupported());
  }, []);

  const handleConnect = async () => {
    setError(undefined);
    try {
      await ble.connect();
    } catch (err) {
      console.error(err);
      setStatus("error");
      const msg = (err as Error)?.message ?? "Failed to connect";
      setError(`Connection error: ${msg}`);
    }
  };

  const handleDisconnect = async () => {
    await ble.disconnect();
  };

  const handleSend = async (cmd: string) => {
    try {
      await ble.sendText(cmd.endsWith("\n") ? cmd : `${cmd}\n`);
      setError(undefined); // Clear any previous errors on success
    } catch (err) {
      console.error(err);
      setError("Send failed (is RX available?)");
    }
  };

  const handleTare = async () => {
    await handleSend("tare");
  };

  const handleCalibrate = async () => {
    const weight = prompt("Enter calibration weight in lbs (e.g., 5):");
    if (weight && !isNaN(parseFloat(weight)) && parseFloat(weight) > 0) {
      await handleSend(`cal ${weight}`);
    } else if (weight !== null) {
      setError("Invalid weight value");
    }
  };

  const handleRequestStatus = async () => {
    try {
      setStatusResponse(null); // Clear previous response
      await ble.requestStatus();
      setError(undefined);
    } catch (err) {
      console.error(err);
      setError("Status request failed");
    }
  };

  const handleSerialPause = () => setSerialPaused(true);
  const handleSerialResume = () => setSerialPaused(false);
  const handleSerialClear = () => setSerialLines([]);

  const canUseBle = supported === true;
  const accelMag = state?.accel
    ? Math.sqrt(
        state.accel.x * state.accel.x +
          state.accel.y * state.accel.y +
          state.accel.z * state.accel.z
      )
    : undefined;
  const simulatedForce = state?.force === undefined && accelMag !== undefined
    ? nominalWeight * accelMag
    : undefined;

  return (
    <main>
      <h1>VibeShift BLE Dashboard</h1>
      <p>Connect to your Adafruit Feather nRF52840 Sense (NUS) and stream motion.</p>

      {supported === false && (
        <div className="panel" style={{ borderColor: "var(--danger)" }}>
          <div className="label">Web Bluetooth not available</div>
          <p>Use Chrome/Edge on desktop or Android. iOS Safari does not support Web Bluetooth.</p>
        </div>
      )}

      <div className="status-row">
        <span className={`badge ${status === "connected" ? "good" : status === "error" ? "warn" : ""}`}>
          Status: {status}
        </span>
        <span className="badge">Device: {deviceSummary}</span>
        {state?.lastLine && <span className="badge">Last line: {state.lastLine}</span>}
      </div>

      <div className="status-row">
        <button onClick={handleConnect} disabled={!canUseBle || status === "requesting" || status === "connecting"}>
          {status === "connected" ? "Reconnect" : "Connect"}
        </button>
        <button onClick={handleDisconnect} disabled={status !== "connected" && status !== "connecting"}>
          Disconnect
        </button>
      </div>

      <div className="status-row">
        <button onClick={handleTare} disabled={status !== "connected"}>
          Tare (Zero Position & Weight)
        </button>
        <button onClick={handleCalibrate} disabled={status !== "connected"}>
          Calibrate Load Cell
        </button>
        <button onClick={handleRequestStatus} disabled={status !== "connected"}>
          Request Status
        </button>
      </div>

      {error && (
        <div className="panel" style={{ borderColor: "var(--danger)" }}>
          <div className="label">Error</div>
          <p>{error}</p>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div className="label">Session</div>
          <div className="hint">Secure context required (localhost or HTTPS)</div>
        </div>
        <div className="grid">
          <div className="field">
            <label className="label">Nominal Weight (kg)</label>
            <input
              type="number"
              value={nominalWeight}
              min={0}
              onChange={(e) => setNominalWeight(Number(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <div className="label">Actual Force</div>
            <div className="value">
              {state?.force !== undefined
                ? `${state.force.toFixed(2)} N`
                : simulatedForce !== undefined
                ? `${simulatedForce.toFixed(1)} N (sim)`
                : "--"}
            </div>
            <div className="hint">
              F: from device if present; otherwise simulated from accel magnitude.
            </div>
          </div>
          <div className="field">
            <div className="label">Weight (lbs)</div>
            <div className="value" style={{ fontSize: "2rem", fontWeight: "bold", color: state?.weight !== undefined ? "var(--accent)" : "inherit" }}>
              {state?.weight !== undefined
                ? `${state.weight.toFixed(2)} lbs`
                : "--"}
            </div>
            <div className="hint">
              Load cell reading from HX711
            </div>
          </div>
          <div className="field">
            <div className="label">Accel (x,y,z)</div>
            <div className="value">
              {state?.accel
                ? `${state.accel.x.toFixed(2)}, ${state.accel.y.toFixed(2)}, ${state.accel.z.toFixed(2)}`
                : "--"}
            </div>
          </div>
          <div className="field">
            <div className="label">Gyro (x,y,z)</div>
            <div className="value">
              {state?.gyro
                ? `${state.gyro.x.toFixed(2)}, ${state.gyro.y.toFixed(2)}, ${state.gyro.z.toFixed(2)}`
                : "--"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        <StrokeView 
          value={state?.heightCm} 
          title="Height" 
          subtitle={`Velocity: ${state?.velocityMs?.toFixed(2) ?? '--'} m/s`}
          minCm={0}
          maxCm={100}
        />
        <LiveChart value={state?.heightCm ?? 0} label="Height (cm)" />
      </div>

      {/* Full width weight chart */}
      <WeightChart weight={state?.weight} />

      {/* Full width status display */}
      <StatusDisplay 
        statusData={statusResponse}
        onRequestStatus={handleRequestStatus}
        isConnected={status === "connected"}
      />

      {/* Full width serial output */}
      <SerialOutput 
        data={serialLines}
        isPaused={serialPaused}
        onPause={handleSerialPause}
        onResume={handleSerialResume}
        onClear={handleSerialClear}
      />

      <div className="details">
        <details>
          <summary>Debug: raw last line</summary>
          <p>{state?.lastLine ?? "None yet"}</p>
        </details>
        <details>
          <summary>Troubleshooting</summary>
          <ul className="tips">
            <li>Use Chrome/Edge. iOS Safari is unsupported for Web Bluetooth.</li>
            <li>Power the Feather, ensure it is advertising NUS (StrongTrak prefix if configured).</li>
            <li>If pairing stalls, forget the device in OS Bluetooth settings and retry.</li>
            <li>Move closer; racks and steel plates attenuate RF.</li>
          </ul>
        </details>
      </div>
    </main>
  );
}
