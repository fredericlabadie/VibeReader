import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://vibereader.fredericlabadie.com";

export const metadata: Metadata = {
  title: "VibeReader — Book ↔ Song",
  description:
    "tell me what you're reading; i'll hand you a list of songs. tell me what you're playing; i'll hand you a stack of novels.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "VibeReader — Book ↔ Song",
    description: "Book → songs or song → books. Recommendations by Claude, not genre tags.",
    url: SITE_URL,
    siteName: "VibeReader",
    type: "website",
    images: [
      {
        url: `/api/og?mixName=Damp+Walls%2C+Bright+Teeth&forBook=Mexican+Gothic&author=Moreno-Garcia&tracks=Cocteau+Twins+%C2%B7+Pale+Sun%7CMon+Laferte+%C2%B7+Cara+de+Ni%C3%B1a%7CTim+Hecker+%C2%B7+Garbage+Truck+Sea%7CChavela+Vargas+%C2%B7+La+Llorona&square=1`,
        width: 1080,
        height: 1080,
        alt: "VibeReader — a mixtape for Mexican Gothic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeReader — Book ↔ Song",
    description: "Book → songs or song → books. Recommendations by Claude, not genre tags.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">skip to content</a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
