import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeReader — Book ↔ Song",
  description:
    "Book → song ideas from a novel, or several book ideas from one song—via Spotify track link or plain text.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="vr-app">{children}</body>
    </html>
  );
}
