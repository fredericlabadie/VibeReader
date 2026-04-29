// lib/store.ts — Redis persistence via Vercel's native Redis integration (node-redis)
//
// Env var set automatically by Vercel when you connect Redis from the Storage tab:
//   REDIS_URL
//
// node-redis v5 uses async connect/disconnect. We create a client per call
// (safe for serverless — each invocation is short-lived).

import { createClient } from "redis";

async function withRedis<T>(fn: (r: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL not configured");
  const redis = createClient({ url });
  await redis.connect();
  try {
    return await fn(redis);
  } finally {
    await redis.disconnect();
  }
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
  const name =
    data.kind === "book→songs"
      ? (data.result as any).songListName ?? "mix"
      : `if-you-like-${data.songTitle ?? "song"}`;

  const slug = makeSlug(name);
  const mix: StoredMix = { ...data, slug, createdAt: Date.now() };
  const ONE_YEAR = 60 * 60 * 24 * 365;

  await withRedis(async (r) => {
    await r.set(`mix:${slug}`, JSON.stringify(mix), { EX: ONE_YEAR });
    await r.lPush("mixes:recent", slug);
    await r.lTrim("mixes:recent", 0, 99);
  });

  return slug;
}

// ── Read ──────────────────────────────────────────────────────────────────

export async function getMix(slug: string): Promise<StoredMix | null> {
  try {
    return await withRedis(async (r) => {
      const raw = await r.get(`mix:${slug}`);
      if (!raw) return null;
      return JSON.parse(raw) as StoredMix;
    });
  } catch {
    return null;
  }
}

export async function getRecentMixes(count = 24): Promise<StoredMix[]> {
  try {
    return await withRedis(async (r) => {
      const slugs = await r.lRange("mixes:recent", 0, count - 1);
      if (!slugs?.length) return [];
      const raws = await Promise.all(slugs.map(s => r.get(`mix:${s}`)));
      return raws
        .filter((v): v is string => v !== null)
        .map(v => JSON.parse(v) as StoredMix);
    });
  } catch {
    return [];
  }
}
