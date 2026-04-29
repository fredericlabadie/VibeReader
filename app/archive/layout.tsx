import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archive — VibeReader",
  description: "Every mix anyone's made, in chronological order.",
};

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
