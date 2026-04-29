// lib/store.ts — Upstash Redis persistence for mixes
//
// Env vars (set automatically when you add an Upstash Redis integration in Vercel):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// To set up: Vercel dashboard → Storage → Browse Marketplace → Upstash Redis
// Connect the store to your project and Vercel sets the env vars automatically.

import { Redis } from "@upstash/redis";

function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash Redis not configured");
  return new Redis({ url, token });
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

// ── Slug ─────────────────────────────────────────────────────────────────

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
  const redis = getRedis();
  const name =
    data.kind === "book→songs"
      ? (data.result as any).songListName ?? "mix"
      : `if-you-like-${data.songTitle ?? "song"}`;

  const slug = makeSlug(name);
  const mix: StoredMix = { ...data, slug, createdAt: Date.now() };

  await redis.set(`mix:${slug}`, mix, { ex: 60 * 60 * 24 * 365 }); // 1-year TTL
  await redis.lpush("mixes:recent", slug);
  await redis.ltrim("mixes:recent", 0, 99); // keep 100 most recent
  return slug;
}

// ── Read ──────────────────────────────────────────────────────────────────

export async function getMix(slug: string): Promise<StoredMix | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get<StoredMix>(`mix:${slug}`);
    return raw ?? null;
  } catch {
    return null;
  }
}

export async function getRecentMixes(count = 24): Promise<StoredMix[]> {
  try {
    const redis = getRedis();
    const slugs = await redis.lrange<string>("mixes:recent", 0, count - 1);
    if (!slugs?.length) return [];
    const mixes = await Promise.all(slugs.map(s => getMix(s)));
    return mixes.filter((m): m is StoredMix => m !== null);
  } catch {
    return [];
  }
}
