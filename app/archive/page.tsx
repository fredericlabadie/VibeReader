import { getRecentMixes } from "@/lib/store";
import ArchiveClient from "./client";

export const revalidate = 60; // ISR: regenerate every 60 seconds

export default async function ArchivePage() {
  const mixes = await getRecentMixes(24).catch(() => []);
  return <ArchiveClient mixes={mixes} />;
}
