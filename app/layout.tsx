import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book ↔ Playlist",
  description: "Suggest a playlist from a book, or books from a public Spotify playlist",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
