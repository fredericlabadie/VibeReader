import {
  recommendBooksFromMusicDigest,
  recommendBooksFromMusicText,
  recommendMusicFromBook,
} from "@/lib/bookPlaylist";
import { fetchMusicListeningDigest } from "@/lib/spotifyMusic";
import { NextResponse } from "next/server";

type Mode = "book_to_music" | "music_to_book";

// POST /api/recommendations — no auth; deploy behind Vercel or add your own gate if exposing publicly.
export async function POST(req: Request) {
  let body: {
    mode?: Mode;
    bookTitle?: string;
    bookAuthor?: string;
    bookNotes?: string;
    outputKind?: "song" | "album";
    spotifyUrl?: string;
    musicKind?: "song" | "album";
    musicTitle?: string;
    musicArtist?: string;
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
      const outputKind = body.outputKind;
      if (!bookTitle || !bookAuthor) {
        return NextResponse.json({ error: "bookTitle and bookAuthor are required" }, { status: 400 });
      }
      if (outputKind !== "song" && outputKind !== "album") {
        return NextResponse.json({ error: "outputKind must be song or album" }, { status: 400 });
      }
      const result = await recommendMusicFromBook({
        bookTitle,
        bookAuthor,
        bookNotes: body.bookNotes?.trim(),
        outputKind,
      });
      return NextResponse.json({ mode, result });
    }

    const url = body.spotifyUrl?.trim() ?? "";
    const title = body.musicTitle?.trim() ?? "";
    const artist = body.musicArtist?.trim() ?? "";
    const musicKind = body.musicKind;

    if (url) {
      const digest = await fetchMusicListeningDigest(url);
      const result = await recommendBooksFromMusicDigest(digest);
      return NextResponse.json({ mode, digest, result });
    }

    if (!title || !artist) {
      return NextResponse.json(
        { error: "Either spotifyUrl (track or album link) or both musicTitle and musicArtist are required" },
        { status: 400 },
      );
    }
    if (musicKind !== "song" && musicKind !== "album") {
      return NextResponse.json({ error: "musicKind must be song or album when using text input" }, { status: 400 });
    }
    const result = await recommendBooksFromMusicText({
      musicKind,
      musicTitle: title,
      musicArtist: artist,
    });
    return NextResponse.json({ mode, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recommendation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
