// lib/store.ts — Redis Cloud persistence for mixes
//
// Env vars — set these in Vercel dashboard → Settings → Environment Variables:
//   REDIS_URL  (full connection string, e.g. redis://:password@host:port)
//
// From your Redis Cloud dashboard:
//   Host: redis-11965.crce285.us-east-1-4.ec2.cloud.redislabs.com
//   Port: 11965
//   Password: find under Security → Default user → "Copy password"
//
// Format: redis://:PASSWORD@redis-11965.crce285.us-east-1-4.ec2.cloud.redislabs.com:11965

import { createClient } from "redis";

let _client: ReturnType<typeof createClient> | null = null;

async function getClient() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL not configured");

  if (_client && _client.isOpen) return _client;

  _client = createClient({ url, socket: { connectTimeout: 5000 } });
  _client.on("error", () => { _client = null; });
  await Promise.race([
    _client.connect(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connect timeout")), 5000)),
  ]);
  return _client;
}

export type StoredMix = {
  slug: string;
  kind: "book→songs" | "song→books";
  bookTitle?: string;
  bookAuthor?: string;
  songTitle?: string;
  songArtist?: string;
  digestSummary?: string | null;
  result: Record<string, unknown>;
  createdAt: number;
};

// ── Slug ──────────────────────────────────────────────────────────────────

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 36)
    .replace(/-+$/, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

// ── Write ─────────────────────────────────────────────────────────────────

export async function saveMix(data: Omit<StoredMix, "slug" | "createdAt">): Promise<string> {
  const redis = await getClient();
  const name =
    data.kind === "book→songs"
      ? (data.result as any).songListName ?? "mix"
      : `if-you-like-${data.songTitle ?? "song"}`;

  const slug = makeSlug(name);
  const mix: StoredMix = { ...data, slug, createdAt: Date.now() };

  const EX = 60 * 60 * 24 * 365; // 1 year
  await redis.set(`mix:${slug}`, JSON.stringify(mix), { EX });
  await redis.lPush("mixes:recent", slug);
  await redis.lTrim("mixes:recent", 0, 99); // keep 100 most recent
  return slug;
}

// ── Read ──────────────────────────────────────────────────────────────────

export async function getMix(slug: string): Promise<StoredMix | null> {
  try {
    const redis = await getClient();
    const raw = await redis.get(`mix:${slug}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredMix;
  } catch {
    return null;
  }
}

export async function getRecentMixes(count = 24): Promise<StoredMix[]> {
  try {
    const redis = await getClient();
    const slugs = await redis.lRange("mixes:recent", 0, count - 1);
    if (!slugs?.length) return [];
    const mixes = await Promise.all(slugs.map(s => getMix(s)));
    return mixes.filter((m): m is StoredMix => m !== null);
  } catch {
    return [];
  }
}
