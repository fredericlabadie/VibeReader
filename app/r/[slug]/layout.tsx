import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mix — VibeReader",
  description: "A VibeReader mix — book to songs or song to books, via Claude.",
};

export default function MixLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
