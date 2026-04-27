import Anthropic from "@anthropic-ai/sdk";
import type { MusicListeningDigest } from "@/lib/spotifyMusic";

const MODEL = "claude-sonnet-4-5";

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey: key });
}

function extractJsonObject<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return parseable JSON");
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

export type BookToMusicOutputKind = "song" | "album";

export type BookToMusicSong = { title: string; artist: string; whyItFits: string };
export type BookToMusicAlbum = {
  title: string;
  artist: string;
  whyItFits: string;
  trackPicks: string[];
};

export type BookToMusicResult = {
  outputKind: BookToMusicOutputKind;
  rationale: string;
  moodTags: string[];
  song?: BookToMusicSong;
  album?: BookToMusicAlbum;
};

export async function recommendMusicFromBook(input: {
  bookTitle: string;
  bookAuthor: string;
  bookNotes?: string;
  outputKind: BookToMusicOutputKind;
}): Promise<BookToMusicResult> {
  const anthropic = getClient();
  const payload = [
    `Title: ${input.bookTitle}`,
    `Author: ${input.bookAuthor}`,
    input.bookNotes?.trim() ? `Notes / genre / vibe: ${input.bookNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const target =
    input.outputKind === "song"
      ? `Recommend exactly ONE song (a single track by a known artist) that captures the book's emotional core. Use a recording that exists on Spotify.`
      : `Recommend exactly ONE album (full LP/EP by a known artist) that fits the book as a listening arc—not a playlist of singles. Use a real release on Spotify. Include 3–5 song titles from that album in "trackPicks" as entry points.`;

  const shape =
    input.outputKind === "song"
      ? `{"outputKind":"song","rationale":string,"moodTags":string[],"song":{"title":string,"artist":string,"whyItFits":string}}`
      : `{"outputKind":"album","rationale":string,"moodTags":string[],"album":{"title":string,"artist":string,"whyItFits":string,"trackPicks":string[]}}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1600,
    temperature: 0.72,
    system: `You are a music supervisor for readers. Given a book, ${target}

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: ${shape}
- "whyItFits" is one short sentence.
- moodTags: 3–6 short tags.`,
    messages: [{ role: "user", content: `Book to match:\n\n${payload}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<BookToMusicResult>(text);
  if (parsed.outputKind !== input.outputKind) {
    throw new Error("Model returned the wrong output kind");
  }
  if (input.outputKind === "song") {
    const s = parsed.song;
    if (!s?.title?.trim() || !s?.artist?.trim() || !s?.whyItFits?.trim()) {
      throw new Error("Invalid song recommendation");
    }
  } else {
    const a = parsed.album;
    if (!a?.title?.trim() || !a?.artist?.trim() || !a?.whyItFits?.trim() || !Array.isArray(a.trackPicks) || a.trackPicks.length < 2) {
      throw new Error("Invalid album recommendation");
    }
  }
  return parsed;
}

export type MusicToBookItem = {
  title: string;
  author: string;
  whyItFits: string;
};

export type MusicToBookResult = {
  rationale: string;
  books: MusicToBookItem[];
};

function digestToPromptLines(digest: MusicListeningDigest): string {
  return [
    `${digest.kind === "track" ? "Track" : "Album"}: ${digest.label}`,
    `Spotify-derived tracks used for audio: ${digest.trackCount}.`,
    `Mood label: ${digest.mood.moodLabel}`,
    `Descriptors: ${digest.mood.descriptors.join(", ")}`,
    `Audio (0–1 except tempo BPM): valence ${digest.avgFeatures.valence.toFixed(2)}, energy ${digest.avgFeatures.energy.toFixed(2)}, danceability ${digest.avgFeatures.danceability.toFixed(2)}, acousticness ${digest.avgFeatures.acousticness.toFixed(2)}, tempo ~${Math.round(digest.avgFeatures.tempo)}`,
    "",
    digest.kind === "album" ? "Sample tracks from the album:" : "Track:",
    ...digest.sampleTrackLines.slice(0, 15).map((l) => `- ${l}`),
  ].join("\n");
}

export async function recommendBooksFromMusicDigest(digest: MusicListeningDigest): Promise<MusicToBookResult> {
  const anthropic = getClient();
  const digestText = digestToPromptLines(digest);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.55,
    system: `You are a librarian matching fiction to a specific piece of music.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: {"rationale": string, "books": [{"title": string, "author": string, "whyItFits": string}]}
- Recommend 5–8 published novels or story collections.
- "whyItFits" ties the book to this song or album in one sentence (mood, theme, narrative rhythm, or era).`,
    messages: [{ role: "user", content: `Recommend books that fit this recording:\n\n${digestText}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<MusicToBookResult>(text);
  if (!Array.isArray(parsed.books) || parsed.books.length < 3) {
    throw new Error("Invalid book recommendation shape");
  }
  return parsed;
}

export async function recommendBooksFromMusicText(input: {
  musicKind: "song" | "album";
  musicTitle: string;
  musicArtist: string;
}): Promise<MusicToBookResult> {
  const anthropic = getClient();
  const kindLabel = input.musicKind === "song" ? "song" : "album";
  const block = [
    `The user described a ${kindLabel} (no Spotify audio data).`,
    `Title: ${input.musicTitle.trim()}`,
    `Artist: ${input.musicArtist.trim()}`,
    "",
    "Infer likely mood, genre, and cultural context from this title and artist alone.",
  ].join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.55,
    system: `You are a librarian matching fiction to a song or album the user named.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: {"rationale": string, "books": [{"title": string, "author": string, "whyItFits": string}]}
- Recommend 5–8 published novels or story collections.
- "whyItFits" ties the book to this song or album in one sentence.`,
    messages: [{ role: "user", content: block }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<MusicToBookResult>(text);
  if (!Array.isArray(parsed.books) || parsed.books.length < 3) {
    throw new Error("Invalid book recommendation shape");
  }
  return parsed;
}
