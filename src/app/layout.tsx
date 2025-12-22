import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeShift BLE Dashboard",
  description: "Web Bluetooth dashboard for Adafruit Feather nRF52840 Sense",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
