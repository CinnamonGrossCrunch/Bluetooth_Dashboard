import { LineParser, ParsedState } from "./parser";

export const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify from device -> browser
export const NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write from browser -> device

export type BleStatus =
  | "idle"
  | "requesting"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type NavigatorWithBluetooth = Navigator & { bluetooth?: Bluetooth };

export function isWebBluetoothSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean((navigator as NavigatorWithBluetooth).bluetooth);
}

export class BleClient {
  private device?: BluetoothDevice;
  private txChar?: BluetoothRemoteGATTCharacteristic;
  private rxChar?: BluetoothRemoteGATTCharacteristic;
  private lineBuffer = "";
  private decoder = new TextDecoder("utf-8");
  private parser = new LineParser();
  private stateListeners = new Set<(state: ParsedState) => void>();
  private statusListeners = new Set<(status: BleStatus) => void>();
  private currentStatus: BleStatus = "idle";
  private boundNotificationHandler?: (event: Event) => void;
  private boundDisconnectHandler?: (event: Event) => void;
  private connecting = false;

  onState(cb: (state: ParsedState) => void): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  onStatus(cb: (status: BleStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.currentStatus);
    return () => this.statusListeners.delete(cb);
  }

  getDeviceSummary(): string {
    if (!this.device) return "No device";
    const name = this.device.name ?? "Unknown";
    return `${name} (${this.device.id})`;
  }

  getState(): ParsedState {
    return this.parser.getState();
  }

  async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;

    try {
      if (!isWebBluetoothSupported()) {
        throw new Error("Web Bluetooth not supported in this browser.");
      }

      this.setStatus("requesting");
      const device = await this.requestDeviceWithFallback();
      this.device = device;

      if (device.gatt?.connected) {
        device.gatt.disconnect();
      }

      this.boundDisconnectHandler = () => {
        this.cleanup();
        this.setStatus("disconnected");
      };
      device.addEventListener("gattserverdisconnected", this.boundDisconnectHandler);

      this.setStatus("connecting");
      const server = await device.gatt!.connect();

      const service = await server.getPrimaryService(NUS_SERVICE_UUID);
      this.txChar = await service.getCharacteristic(NUS_TX_UUID);
      this.rxChar = await service.getCharacteristic(NUS_RX_UUID);

      this.boundNotificationHandler = (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (!target?.value) return;
        this.handleChunk(target.value);
      };

      await this.txChar.startNotifications();
      this.txChar.addEventListener("characteristicvaluechanged", this.boundNotificationHandler);

      this.setStatus("connected");
    } catch (err) {
      await this.disconnect();
      this.setStatus("error");
      this.connecting = false;
      throw err;
    }

    this.connecting = false;
  }

  async disconnect(): Promise<void> {
    if (this.txChar && this.boundNotificationHandler) {
      this.txChar.removeEventListener("characteristicvaluechanged", this.boundNotificationHandler);
    }
    if (this.device && this.boundDisconnectHandler) {
      this.device.removeEventListener("gattserverdisconnected", this.boundDisconnectHandler);
    }
    this.boundNotificationHandler = undefined;
    this.boundDisconnectHandler = undefined;
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.cleanup();
    this.setStatus("disconnected");
  }

  async sendText(text: string): Promise<void> {
    if (!this.rxChar) return;
    const encoder = new TextEncoder();
    await this.rxChar.writeValueWithoutResponse(encoder.encode(text));
  }

  private setStatus(status: BleStatus) {
    this.currentStatus = status;
    for (const cb of this.statusListeners) cb(status);
  }

  private handleChunk(dataView: DataView) {
    const chunk = this.decoder.decode(dataView);
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split(/\r?\n/);
    this.lineBuffer = lines.pop() ?? ""; // keep remainder
    for (const line of lines) {
      const parsed = this.parser.push(line);
      for (const cb of this.stateListeners) cb(parsed);
    }
  }

  private cleanup() {
    this.txChar = undefined;
    this.rxChar = undefined;
    this.lineBuffer = "";
  }

  private async requestDeviceWithFallback(): Promise<BluetoothDevice> {
    const nav = (typeof navigator !== "undefined" ? (navigator as NavigatorWithBluetooth) : undefined);
    if (!nav?.bluetooth) {
      throw new Error("Web Bluetooth unavailable in this context.");
    }

    // For testing: show all devices immediately
    // TODO: Re-enable filters once you confirm your device name/service
    return nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [NUS_SERVICE_UUID],
    });

    /* Original filtered approach - uncomment once device is identified:
    try {
      return await nav.bluetooth.requestDevice({
        filters: [{ namePrefix: "StrongTrak" }],
        optionalServices: [NUS_SERVICE_UUID],
      });
    } catch (err) {
      console.warn("namePrefix request failed; trying NUS service filter", err);
      try {
        return await nav.bluetooth.requestDevice({
          filters: [{ services: [NUS_SERVICE_UUID as BluetoothServiceUUID] }],
          optionalServices: [NUS_SERVICE_UUID],
        });
      } catch (err2) {
        console.warn("service filter failed; showing all devices", err2);
        return nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [NUS_SERVICE_UUID],
        });
      }
    }
    */
  }
}
