import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeReader — Book ↔ Music",
  description:
    "Playlist ideas from a book, or a stack of book ideas from a track, album, artist, or playlist—via Spotify or plain text.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="vr-app">{children}</body>
    </html>
  );
}
