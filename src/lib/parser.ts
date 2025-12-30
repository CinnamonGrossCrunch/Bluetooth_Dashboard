export type Vector3 = { x: number; y: number; z: number };

export type ParsedState = {
  ts: number;
  accel?: Vector3;
  gyro?: Vector3;
  pos?: Vector3;
  force?: number;
  weight?: number;        // weight in lbs from load cell
  heightCm?: number;      // vertical position in cm
  velocityMs?: number;    // vertical velocity in m/s
  strokeProxy?: number;
  lastLine?: string;
};

const EMA_ALPHA = 0.18; // light smoothing for stroke proxy

export class LineParser {
  private state: ParsedState = { ts: Date.now() };
  private strokeEma: number | undefined;

  push(line: string): ParsedState {
    const trimmed = line.trim();
    this.state.lastLine = trimmed;
    if (!trimmed) {
      return { ...this.state };
    }

    // Handle CSV format: "height_cm,velocity_m/s" or "height_cm,velocity_m/s,weight_lbs"
    if (!trimmed.includes(":") && trimmed.includes(",")) {
      const parts = trimmed.split(",").map(p => parseFloat(p.trim()));
      if (parts.length >= 2 && parts.every(v => Number.isFinite(v))) {
        this.state.heightCm = parts[0];
        this.state.velocityMs = parts[1];
        if (parts.length >= 3) {
          this.state.weight = parts[2];
        }
        // Convert height to position vector for compatibility
        this.state.pos = { x: 0, y: 0, z: parts[0] / 100.0 }; // cm to meters
        this.state.ts = Date.now();
        this.state.strokeProxy = this.computeStrokeProxy();
        return { ...this.state };
      }
    }

    const prefix = trimmed[0]?.toUpperCase();
    const body = trimmed.slice(2).trim();

    if (trimmed[1] !== ":") {
      return { ...this.state };
    }

    if (prefix === "A") {
      const vec = this.parseVector(body);
      if (vec) this.state.accel = vec;
    } else if (prefix === "G") {
      const vec = this.parseVector(body);
      if (vec) this.state.gyro = vec;
    } else if (prefix === "P") {
      const vec = this.parseVector(body);
      if (vec) this.state.pos = vec;
    } else if (prefix === "F") {
      const forceVal = parseFloat(body);
      if (Number.isFinite(forceVal)) this.state.force = forceVal;
    } else if (prefix === "W") {
      // Weight in lbs (e.g., "W: 5.2")
      const weightVal = parseFloat(body);
      if (Number.isFinite(weightVal)) this.state.weight = weightVal;
    }

    this.state.ts = Date.now();
    this.state.strokeProxy = this.computeStrokeProxy();
    return { ...this.state };
  }

  getState(): ParsedState {
    return { ...this.state };
  }

  private parseVector(payload: string): Vector3 | undefined {
    const parts = payload.split(/[,\s]+/).filter(Boolean);
    if (parts.length < 3) return undefined;
    const [x, y, z] = parts.map((p) => parseFloat(p));
    if ([x, y, z].every((v) => Number.isFinite(v))) {
      return { x, y, z };
    }
    return undefined;
  }

  private computeStrokeProxy(): number | undefined {
    // Use heightCm directly (vertical position in cm from tare point)
    // This gives us meaningful stroke values like -10 to +50 cm
    const raw = this.state.heightCm ?? (this.state.pos?.z ? this.state.pos.z * 100 : undefined);
    if (raw === undefined || Number.isNaN(raw)) return this.strokeEma;
    if (this.strokeEma === undefined) {
      this.strokeEma = raw;
    } else {
      this.strokeEma = EMA_ALPHA * raw + (1 - EMA_ALPHA) * this.strokeEma;
    }
    return this.strokeEma;
  }
}
