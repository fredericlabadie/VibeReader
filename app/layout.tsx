import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeReader — Book ↔ Song / Album",
  description: "Suggest one song or album from a book, or book ideas from a song or album",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
