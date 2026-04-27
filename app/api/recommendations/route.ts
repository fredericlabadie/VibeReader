import {
  recommendBooksFromMusicDigest,
  recommendBooksFromMusicText,
  recommendPlaylistFromBook,
} from "@/lib/bookPlaylist";
import type { MusicTextKind } from "@/lib/bookPlaylist";
import {
  fetchArtistDigestBySearchQuery,
  fetchListeningDigestFromSpotifyUrl,
  normalizeSpotifyPaste,
} from "@/lib/spotifyMusic";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type Mode = "book_to_music" | "music_to_book";

function isMusicTextKind(x: unknown): x is MusicTextKind {
  return x === "song" || x === "album" || x === "artist" || x === "playlist";
}

// POST /api/recommendations — no auth; deploy behind Vercel or add your own gate if exposing publicly.
export async function POST(req: Request) {
  let body: {
    mode?: Mode;
    bookTitle?: string;
    bookAuthor?: string;
    bookNotes?: string;
    spotifyUrl?: string;
    musicKind?: string;
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
  if (mode !== "book_to_music" && mode !== "music_to_book") {
    return NextResponse.json({ error: "mode must be book_to_music or music_to_book" }, { status: 400 });
  }

  try {
    if (mode === "book_to_music") {
      const bookTitle = body.bookTitle?.trim() ?? "";
      const bookAuthor = body.bookAuthor?.trim() ?? "";
      if (!bookTitle || !bookAuthor) {
        return NextResponse.json({ error: "bookTitle and bookAuthor are required" }, { status: 400 });
      }
      const result = await recommendPlaylistFromBook({
        bookTitle,
        bookAuthor,
        bookNotes: body.bookNotes?.trim(),
      });
      return NextResponse.json({ mode, result });
    }

    const url = normalizeSpotifyPaste(body.spotifyUrl ?? "");
    const title = body.musicTitle?.trim() ?? "";
    const artist = body.musicArtist?.trim() ?? "";
    const musicNotes = body.musicNotes?.trim();
    const musicKind = body.musicKind;

    if (url) {
      const digest = await fetchListeningDigestFromSpotifyUrl(url);
      const result = await recommendBooksFromMusicDigest(digest);
      return NextResponse.json({ mode, digest, result });
    }

    if (!isMusicTextKind(musicKind)) {
      return NextResponse.json(
        {
          error:
            "Paste a Spotify link in the Spotify field, or choose \"Describe in text\" and set type to song, album, artist, or playlist with the matching fields.",
        },
        { status: 400 },
      );
    }

    if (musicKind === "song" || musicKind === "album") {
      if (!title || !artist) {
        return NextResponse.json(
          { error: "For song or album (text mode), musicTitle and musicArtist are required" },
          { status: 400 },
        );
      }
      const result = await recommendBooksFromMusicText({
        musicKind,
        musicTitle: title,
        musicArtist: artist,
        musicNotes,
      });
      return NextResponse.json({ mode, result });
    }

    if (musicKind === "artist") {
      if (!artist) {
        return NextResponse.json({ error: "For artist (text mode), musicArtist is required" }, { status: 400 });
      }
      try {
        const digest = await fetchArtistDigestBySearchQuery(artist);
        const result = await recommendBooksFromMusicDigest(digest);
        return NextResponse.json({ mode, digest, result });
      } catch {
        const result = await recommendBooksFromMusicText({
          musicKind: "artist",
          musicTitle: title,
          musicArtist: artist,
          musicNotes,
        });
        return NextResponse.json({ mode, result });
      }
    }

    /* playlist text */
    if (!title) {
      return NextResponse.json(
        { error: "For playlist (text mode), musicTitle should be the playlist name" },
        { status: 400 },
      );
    }
    const result = await recommendBooksFromMusicText({
      musicKind: "playlist",
      musicTitle: title,
      musicArtist: artist,
      musicNotes,
    });
    return NextResponse.json({ mode, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recommendation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
