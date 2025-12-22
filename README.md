# VibeShift BLE Dashboard

Minimal Next.js (App Router, TypeScript) Web Bluetooth dashboard for Adafruit Feather nRF52840 Sense using Nordic UART Service.

## Quickstart

```bash
npm install
npm run dev
```

Open https://localhost:3000 in Chrome/Edge (or `http://localhost:3000` allowed for dev). Requires secure context for BLE.

## Deploy

Deploy directly to Vercel with defaults; no extra config needed. Secure HTTPS is required for Web Bluetooth.

## BLE

- Service UUID: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- TX (notify): `6e400003-b5a3-f393-e0a9-e50e24dcca9e`
- RX (write): `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- Requests devices with name prefix `StrongTrak` first, then falls back to service filter.

## Data Format

Newline-delimited ASCII lines such as `A:x,y,z`, `G:x,y,z`, `P:x,y,z`, `F:value`.

## UI

- Connect/disconnect + optional START/STOP writes
- Status + device info + last raw line
- Nominal weight input, Actual Force (F: or simulated from accel magnitude)
- Stroke indicator (from pos.z or accel.z with EMA smoothing)
- Lightweight canvas live chart

## Notes

- Web Bluetooth is not available on iOS Safari.
- If pairing fails, forget the device in OS Bluetooth settings and retry closer to the hardware.
