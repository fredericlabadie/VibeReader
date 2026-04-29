import Anthropic from "@anthropic-ai/sdk";
import type { MusicListeningDigest, MusicListeningKind } from "@/lib/spotifyMusic";

const MODEL       = "claude-sonnet-4-5";
const MODEL_FAST  = "claude-haiku-4-5-20251001"; // factual lookups only

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

// ── Shared JSON shape strings ─────────────────────────────────────────────

const SONG_SHAPE =
  '{"songListName":string,"rationale":string,"moodTags":string[],"songs":[{"title":string,"artist":string,"whyItFits":string}]}';

const BOOK_SHAPE =
  '{"rationale":string,"books":[{"title":string,"author":string,"whyItFits":string}]}';

// ── Types ─────────────────────────────────────────────────────────────────

export type BookSongRow = { title: string; artist: string; whyItFits: string };

export type BookToSongsResult = {
  songListName: string;
  rationale: string;
  moodTags: string[];
  songs: BookSongRow[];
};

export type BookAuthorCandidate = {
  title: string;
  author: string;
  note?: string;
};

export type SongToBookItem = { title: string; author: string; whyItFits: string };

export type SongToBooksResult = {
  rationale: string;
  books: SongToBookItem[];
};

// ── Disambiguation ────────────────────────────────────────────────────────
// Uses Haiku — purely factual, no creativity needed.

export async function disambiguateBookAuthor(input: {
  bookTitle: string;
  bookNotes?: string;
}): Promise<{ candidates: BookAuthorCandidate[] }> {
  const anthropic = getClient();
  const hint = input.bookNotes?.trim() ? `\nHint: ${input.bookNotes.trim()}` : "";

  const message = await anthropic.messages.create({
    model: MODEL_FAST,
    max_tokens: 400,
    temperature: 0.2,
    system: `Return JSON only: {"candidates":[{"title":string,"author":string,"note":string}]}
List 1–6 published books matching the title. Return 1 if there is a clear dominant match. "note" is optional (year or series). Use canonical author names.`,
    messages: [{ role: "user", content: `Title: ${input.bookTitle.trim()}${hint}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<{ candidates: BookAuthorCandidate[] }>(text);
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length < 1) {
    throw new Error("Could not resolve that title to any books");
  }
  for (const c of parsed.candidates) {
    if (!c?.title?.trim() || !c?.author?.trim()) throw new Error("Invalid book candidate entry");
  }
  if (parsed.candidates.length > 6) parsed.candidates = parsed.candidates.slice(0, 6);
  return { candidates: parsed.candidates };
}

// ── Book → Songs ──────────────────────────────────────────────────────────

export async function recommendSongsFromBook(input: {
  bookTitle: string;
  bookAuthor: string;
  bookNotes?: string;
}): Promise<BookToSongsResult> {
  const anthropic = getClient();
  const payload = [
    `Title: ${input.bookTitle}`,
    `Author: ${input.bookAuthor}`,
    input.bookNotes?.trim() ? `Notes: ${input.bookNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1800,
    temperature: 0.72,
    system: `You are a music supervisor for readers. Given a book, return a cohesive playlist of songs that could soundtrack a read.

Return JSON only. Shape: ${SONG_SHAPE}

Rules:
- Exactly 12 songs. Real recordings that exist on Spotify.
- Match tone, era, geography, and emotional arc; order for a satisfying listen.
- whyItFits: one sentence, max 12 words.
- songListName: evocative mixtape title, not the book title.
- moodTags: 3–5 short tags.
- rationale: 2 sentences max.`,
    messages: [{ role: "user", content: payload }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<BookToSongsResult>(text);
  if (!parsed.songListName?.trim() || !Array.isArray(parsed.songs) || parsed.songs.length < 8) {
    throw new Error("Invalid song list recommendation shape");
  }
  for (const t of parsed.songs) {
    if (!t?.title?.trim() || !t?.artist?.trim() || !t?.whyItFits?.trim()) {
      throw new Error("Invalid song entry");
    }
  }
  return parsed;
}

// ── Song → Books (shared logic) ───────────────────────────────────────────

const BOOKS_SYSTEM = `You are a librarian matching fiction to a listening mood. Return several book ideas—not one winner.

Return JSON only. Shape: ${BOOK_SHAPE}

Rules:
- Exactly 8 published novels or story collections.
- whyItFits: one sentence, max 12 words.
- rationale: 2 sentences max.`;

export async function recommendBooksFromSongDigest(
  digest: MusicListeningDigest
): Promise<SongToBooksResult> {
  const anthropic = getClient();

  const lines = [
    `Song: ${digest.label}`,
    `Mood: ${digest.mood.moodLabel} — ${digest.mood.descriptors.slice(0, 4).join(", ")}`,
    `Audio: valence ${digest.avgFeatures.valence.toFixed(2)}, energy ${digest.avgFeatures.energy.toFixed(2)}, tempo ~${Math.round(digest.avgFeatures.tempo)} bpm, acousticness ${digest.avgFeatures.acousticness.toFixed(2)}`,
    digest.sampleTrackLines.length > 0
      ? `Track: ${digest.sampleTrackLines[0]}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    temperature: 0.55,
    system: BOOKS_SYSTEM,
    messages: [{ role: "user", content: `Recommend books for this song:\n${lines}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<SongToBooksResult>(text);
  if (!Array.isArray(parsed.books) || parsed.books.length < 5) {
    throw new Error("Invalid book recommendation shape");
  }
  return parsed;
}

export async function recommendBooksFromSongText(input: {
  songTitle: string;
  songArtist: string;
  songNotes?: string;
}): Promise<SongToBooksResult> {
  const anthropic = getClient();

  const lines = [
    `Song: ${input.songTitle.trim()} by ${input.songArtist.trim()}`,
    input.songNotes?.trim() ? `Notes: ${input.songNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1000,
    temperature: 0.55,
    system: BOOKS_SYSTEM,
    messages: [{ role: "user", content: `Recommend books for this song:\n${lines}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<SongToBooksResult>(text);
  if (!Array.isArray(parsed.books) || parsed.books.length < 5) {
    throw new Error("Invalid book recommendation shape");
  }
  return parsed;
}
