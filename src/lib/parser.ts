export type Vector3 = { x: number; y: number; z: number };

export type ParsedState = {
  ts: number;
  accel?: Vector3;
  gyro?: Vector3;
  pos?: Vector3;
  force?: number;
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
    const raw = this.state.pos?.z ?? this.state.accel?.z;
    if (raw === undefined || Number.isNaN(raw)) return this.strokeEma;
    if (this.strokeEma === undefined) {
      this.strokeEma = raw;
    } else {
      this.strokeEma = EMA_ALPHA * raw + (1 - EMA_ALPHA) * this.strokeEma;
    }
    return this.strokeEma;
  }
}
