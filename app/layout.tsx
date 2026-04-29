import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeReader — Book ↔ Song",
  description:
    "tell me what you're reading; i'll hand you a list of songs. tell me what you're playing; i'll hand you a stack of novels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
