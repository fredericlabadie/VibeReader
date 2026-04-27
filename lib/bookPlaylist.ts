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

export type BookToPlaylistTrack = { title: string; artist: string; whyItFits: string };

export type BookToPlaylistResult = {
  playlistName: string;
  rationale: string;
  moodTags: string[];
  tracks: BookToPlaylistTrack[];
};

export async function recommendPlaylistFromBook(input: {
  bookTitle: string;
  bookAuthor: string;
  bookNotes?: string;
}): Promise<BookToPlaylistResult> {
  const anthropic = getClient();
  const payload = [
    `Title: ${input.bookTitle}`,
    `Author: ${input.bookAuthor}`,
    input.bookNotes?.trim() ? `Notes / genre / vibe: ${input.bookNotes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const shape =
    '{"playlistName":string,"rationale":string,"moodTags":string[],"tracks":[{"title":string,"artist":string,"whyItFits":string}]}';

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3200,
    temperature: 0.72,
    system: `You are a music supervisor for readers. Given a book, propose a cohesive listening playlist (many tracks) that could soundtrack a read or capture the book's arc.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: ${shape}
- 10–16 tracks. Each must be a real recording that exists on Spotify (well-known artists preferred).
- Match tone, era, geography, and emotional arc implied by the book; order tracks for a satisfying listen.
- "whyItFits" is one short sentence per track.
- playlistName: evocative, like a real playlist title (not the book title alone).
- moodTags: 3–6 short tags.`,
    messages: [{ role: "user", content: `Build a playlist for this book:\n\n${payload}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<BookToPlaylistResult>(text);
  if (!parsed.playlistName?.trim() || !Array.isArray(parsed.tracks) || parsed.tracks.length < 8) {
    throw new Error("Invalid playlist recommendation shape");
  }
  for (const t of parsed.tracks) {
    if (!t?.title?.trim() || !t?.artist?.trim() || !t?.whyItFits?.trim()) {
      throw new Error("Invalid playlist track entry");
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

function kindLabel(kind: MusicListeningKind): string {
  switch (kind) {
    case "track":
      return "Track";
    case "album":
      return "Album";
    case "playlist":
      return "Playlist";
    case "artist":
      return "Artist (top tracks profile)";
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
            `Top tracks used for averaged audio: ${digest.analyzedTrackCount}.`,
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
    digest.kind === "track" ? "Track:" : "Sample tracks:",
    ...digest.sampleTrackLines.slice(0, 15).map((l) => `- ${l}`),
  ].join("\n");
}

export async function recommendBooksFromMusicDigest(digest: MusicListeningDigest): Promise<MusicToBookResult> {
  const anthropic = getClient();
  const digestText = digestToPromptLines(digest);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2200,
    temperature: 0.55,
    system: `You are a librarian matching fiction to music. The reader wants several book ideas—not one winner.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: {"rationale": string, "books": [{"title": string, "author": string, "whyItFits": string}]}
- Recommend 6–10 published novels or story collections (at least six). Order is loose, not a strict ranking.
- "whyItFits" ties the book to this listening context in one sentence (mood, theme, pacing, or era).`,
    messages: [{ role: "user", content: `Recommend books that fit this listening profile:\n\n${digestText}` }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<MusicToBookResult>(text);
  if (!Array.isArray(parsed.books) || parsed.books.length < 5) {
    throw new Error("Invalid book recommendation shape");
  }
  return parsed;
}

export type MusicTextKind = "song" | "album" | "artist" | "playlist";

export async function recommendBooksFromMusicText(input: {
  musicKind: MusicTextKind;
  musicTitle: string;
  musicArtist: string;
  musicNotes?: string;
}): Promise<MusicToBookResult> {
  const anthropic = getClient();
  const notes = input.musicNotes?.trim();

  let block: string;
  if (input.musicKind === "song") {
    block = [
      "The user described a song (no Spotify audio data).",
      `Title: ${input.musicTitle.trim()}`,
      `Artist: ${input.musicArtist.trim()}`,
      notes ? `Notes: ${notes}` : "",
      "",
      "Infer mood, genre, and era from the title and artist.",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (input.musicKind === "album") {
    block = [
      "The user described an album (no Spotify audio data).",
      `Album: ${input.musicTitle.trim()}`,
      `Artist: ${input.musicArtist.trim()}`,
      notes ? `Notes: ${notes}` : "",
      "",
      "Infer overall sonic and emotional character from the names.",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (input.musicKind === "artist") {
    block = [
      "The user named a musical artist only (no Spotify audio data).",
      `Artist: ${input.musicArtist.trim()}`,
      input.musicTitle.trim() ? `Extra context: ${input.musicTitle.trim()}` : "",
      notes ? `Notes: ${notes}` : "",
      "",
      "Infer typical catalog vibe, era, and themes from the artist name and any notes.",
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    block = [
      "The user described a playlist by name only (no track list or Spotify data).",
      `Playlist name: ${input.musicTitle.trim()}`,
      input.musicArtist.trim() ? `Curator / context: ${input.musicArtist.trim()}` : "",
      notes ? `Mood or genre hints: ${notes}` : "",
      "",
      "Infer what books might match a reader who loves this kind of playlist.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2200,
    temperature: 0.55,
    system: `You are a librarian matching fiction to how someone listens. Offer a small stack of reads—not a single pick.

Rules:
- Output ONLY a single JSON object (no markdown outside the JSON).
- Shape: {"rationale": string, "books": [{"title": string, "author": string, "whyItFits": string}]}
- Recommend 6–10 published novels or story collections (at least six). Order is suggestive, not a strict ranking.
- "whyItFits" is one sentence linking the book to the music context.`,
    messages: [{ role: "user", content: block }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const parsed = extractJsonObject<MusicToBookResult>(text);
  if (!Array.isArray(parsed.books) || parsed.books.length < 5) {
    throw new Error("Invalid book recommendation shape");
  }
  return parsed;
}
