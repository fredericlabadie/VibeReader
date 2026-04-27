import { checkApiSecret } from "@/lib/auth";
import {
  disambiguateBookAuthor,
  recommendBooksFromSongDigest,
  recommendBooksFromSongText,
  recommendSongsFromBook,
} from "@/lib/bookPlaylist";
import {
  fetchListeningDigestFromSpotifyUrl,
  normalizeSpotifyPaste,
  parseSpotifyResourceUrl,
  resolveSpotifyShareUrl,
} from "@/lib/spotifyMusic";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type Mode = "book_to_songs" | "song_to_books";

// POST /api/recommendations — no auth; deploy behind Vercel or add your own gate if exposing publicly.
export async function POST(req: Request) {
  const authError = checkApiSecret(req);
  if (authError) return authError;

  let body: {
    mode?: Mode;
    bookTitle?: string;
    bookAuthor?: string;
    bookNotes?: string;
    spotifyUrl?: string;
    musicTitle?: string;
    musicArtist?: string;
    musicNotes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "book_to_songs" && mode !== "song_to_books") {
    return NextResponse.json(
      { error: 'mode must be "book_to_songs" or "song_to_books"' },
      { status: 400 },
    );
  }

  try {
    if (mode === "book_to_songs") {
      const bookTitle = body.bookTitle?.trim() ?? "";
      const bookAuthor = body.bookAuthor?.trim() ?? "";
      const bookNotes = body.bookNotes?.trim();

      if (!bookTitle) {
        return NextResponse.json({ error: "bookTitle is required" }, { status: 400 });
      }

      if (!bookAuthor) {
        const { candidates } = await disambiguateBookAuthor({ bookTitle, bookNotes });
        if (candidates.length === 1) {
          const c = candidates[0];
          const result = await recommendSongsFromBook({
            bookTitle: c.title,
            bookAuthor: c.author,
            bookNotes,
          });
          return NextResponse.json({ mode, result });
        }
        return NextResponse.json({ mode, step: "pick_author", candidates });
      }

      const result = await recommendSongsFromBook({
        bookTitle,
        bookAuthor,
        bookNotes,
      });
      return NextResponse.json({ mode, result });
    }

    /* song_to_books */
    const url = normalizeSpotifyPaste(body.spotifyUrl ?? "");
    const title = body.musicTitle?.trim() ?? "";
    const artist = body.musicArtist?.trim() ?? "";
    const songNotes = body.musicNotes?.trim();

    if (url) {
      const resolved = await resolveSpotifyShareUrl(url);
      const parsed = parseSpotifyResourceUrl(resolved);
      if (!parsed || parsed.type !== "track") {
        return NextResponse.json(
          {
            error:
              "Song → books only accepts a Spotify **song** (track) link. Album, artist, and playlist links are not supported.",
          },
          { status: 400 },
        );
      }
      const digest = await fetchListeningDigestFromSpotifyUrl(resolved);
      const result = await recommendBooksFromSongDigest(digest);
      return NextResponse.json({ mode, digest, result });
    }

    if (!title || !artist) {
      return NextResponse.json(
        { error: "For text mode, song title and artist are required (or paste a Spotify track link)." },
        { status: 400 },
      );
    }

    const result = await recommendBooksFromSongText({
      songTitle: title,
      songArtist: artist,
      songNotes: songNotes,
    });
    return NextResponse.json({ mode, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recommendation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
