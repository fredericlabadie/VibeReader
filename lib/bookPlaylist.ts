import Anthropic from "@anthropic-ai/sdk";
import type { MusicListeningDigest, MusicListeningKind } from "@/lib/spotifyMusic";

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
  /** Optional disambiguator, e.g. year or subtitle */
  note?: string;
};

/**
 * When the reader gives a title without an author, list likely books so they can pick
 * (or we auto-pick when there is exactly one candidate).
 */
export async function disambiguateBookAuthor(input: {
  bookTitle: string;
  bookNotes?: string;
}): Promise<{ candidates: BookAuthorCandidate[] }> {
  const anthropic = getClient();
  const lines = [
    `User's book title (author unknown): ${input.bookTitle.trim()}`,
    input.bookNotes?.trim() ? `Extra hints: ${input.bookNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    temperature: 0.35,
    system: `You help disambiguate books. The user entered a title but not an author.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: {"candidates":[{"title":string,"author":string,"note":string}]}
- "note" is optional (short: year, series, or one disambiguating phrase); omit or use "" if not needed.
- List 1–8 distinct published books that plausibly match this title (same or very similar title, or clear match to hints).
- If one edition is overwhelmingly the usual meaning, return exactly one candidate.
- If several famous books share the title, return multiple so the user can choose.
- Use canonical English title spellings and author names as commonly shelved.`,
    messages: [{ role: "user", content: lines }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<{ candidates: BookAuthorCandidate[] }>(text);
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length < 1) {
    throw new Error("Could not resolve that title to any books");
  }
  for (const c of parsed.candidates) {
    if (!c?.title?.trim() || !c?.author?.trim()) {
      throw new Error("Invalid book candidate entry");
    }
  }
  if (parsed.candidates.length > 8) {
    parsed.candidates = parsed.candidates.slice(0, 8);
  }
  return { candidates: parsed.candidates };
}

export async function recommendSongsFromBook(input: {
  bookTitle: string;
  bookAuthor: string;
  bookNotes?: string;
}): Promise<BookToSongsResult> {
  const anthropic = getClient();
  const payload = [
    `Title: ${input.bookTitle}`,
    `Author: ${input.bookAuthor}`,
    input.bookNotes?.trim() ? `Notes / genre / vibe: ${input.bookNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const shape =
    '{"songListName":string,"rationale":string,"moodTags":string[],"songs":[{"title":string,"artist":string,"whyItFits":string}]}';

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3200,
    temperature: 0.72,
    system: `You are a music supervisor for readers. Given a book, propose a cohesive list of **song** ideas (individual tracks, not playlists as objects) that could soundtrack a read or capture the book's arc.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: ${shape}
- 10–16 songs. Each must be a real recording that exists on Spotify (well-known artists preferred).
- Match tone, era, geography, and emotional arc implied by the book; order for a satisfying listen.
- "whyItFits" is one short sentence per song.
- songListName: evocative, like a mixtape title (not the book title alone).
- moodTags: 3–6 short tags.`,
    messages: [{ role: "user", content: `Build song suggestions for this book:\n\n${payload}` }],
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

export type SongToBookItem = {
  title: string;
  author: string;
  whyItFits: string;
};

export type SongToBooksResult = {
  rationale: string;
  books: SongToBookItem[];
};

function kindLabel(kind: MusicListeningKind): string {
  switch (kind) {
    case "track":
      return "Song (track)";
    case "album":
      return "Album";
    case "playlist":
      return "Playlist";
    case "artist":
      return "Artist";
    default:
      return "Recording";
  }
}

function digestToPromptLines(digest: MusicListeningDigest): string {
  const head =
    digest.kind === "playlist"
      ? [
          `Playlist: ${digest.label}`,
          `Tracks in playlist (reported): ${digest.trackCount}. Averaged audio from: ${digest.analyzedTrackCount} tracks.`,
        ]
      : digest.kind === "artist"
        ? [
            `${kindLabel(digest.kind)}: ${digest.label}`,
            `Tracks used for averaged audio: ${digest.analyzedTrackCount}.`,
          ]
        : [
            `${kindLabel(digest.kind)}: ${digest.label}`,
            `Tracks used for averaged audio: ${digest.analyzedTrackCount}.`,
          ];

  return [
    ...head,
    `Mood label: ${digest.mood.moodLabel}`,
    `Descriptors: ${digest.mood.descriptors.join(", ")}`,
    `Audio (0–1 except tempo BPM): valence ${digest.avgFeatures.valence.toFixed(2)}, energy ${digest.avgFeatures.energy.toFixed(2)}, danceability ${digest.avgFeatures.danceability.toFixed(2)}, acousticness ${digest.avgFeatures.acousticness.toFixed(2)}, tempo ~${Math.round(digest.avgFeatures.tempo)}`,
    "",
    digest.kind === "track" ? "Song:" : "Sample tracks:",
    ...digest.sampleTrackLines.slice(0, 15).map((l) => `- ${l}`),
  ].join("\n");
}

export async function recommendBooksFromSongDigest(digest: MusicListeningDigest): Promise<SongToBooksResult> {
  const anthropic = getClient();
  const digestText = digestToPromptLines(digest);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2200,
    temperature: 0.55,
    system: `You are a librarian matching fiction to a **single song** (or a tight listening context derived from one song). The reader wants several book ideas—not one winner.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: {"rationale": string, "books": [{"title": string, "author": string, "whyItFits": string}]}
- Recommend 6–10 published novels or story collections (at least six). Order is loose, not a strict ranking.
- "whyItFits" ties the book to this song's mood, theme, pacing, or era in one sentence.`,
    messages: [{ role: "user", content: `Recommend books that fit this song / listening profile:\n\n${digestText}` }],
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
  const notes = input.songNotes?.trim();
  const block = [
    "The user described one song (no Spotify audio data).",
    `Title: ${input.songTitle.trim()}`,
    `Artist: ${input.songArtist.trim()}`,
    notes ? `Notes: ${notes}` : "",
    "",
    "Infer mood, genre, and era from the title and artist.",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2200,
    temperature: 0.55,
    system: `You are a librarian matching fiction to how someone listens. The reader named **one song** and wants several book ideas—not a single pick.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: {"rationale": string, "books": [{"title": string, "author": string, "whyItFits": string}]}
- Recommend 6–10 published novels or story collections (at least six). Order is suggestive, not a strict ranking.
- "whyItFits" is one sentence linking the book to this song in plain language.`,
    messages: [{ role: "user", content: block }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<SongToBooksResult>(text);
  if (!Array.isArray(parsed.books) || parsed.books.length < 5) {
    throw new Error("Invalid book recommendation shape");
  }
  return parsed;
}
