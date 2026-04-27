"use client";

import { useState } from "react";

type Mode = "book_to_music" | "music_to_book";
type MusicInputMode = "spotify" | "text";

function spotifySearchUrl(query: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

function openLibrarySearchUrl(title: string, author: string) {
  return `https://openlibrary.org/search?q=${encodeURIComponent(`${title} ${author}`)}`;
}

type BookToMusicResult = {
  outputKind: "song" | "album";
  rationale: string;
  moodTags: string[];
  song?: { title: string; artist: string; whyItFits: string };
  album?: { title: string; artist: string; whyItFits: string; trackPicks: string[] };
};

type MusicToBookResult = {
  rationale: string;
  books: Array<{ title: string; author: string; whyItFits: string }>;
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("book_to_music");
  const [outputKind, setOutputKind] = useState<"song" | "album">("song");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const [musicInputMode, setMusicInputMode] = useState<MusicInputMode>("spotify");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicKind, setMusicKind] = useState<"song" | "album">("song");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [digestSummary, setDigestSummary] = useState<string | null>(null);
  const [bookToMusic, setBookToMusic] = useState<BookToMusicResult | null>(null);
  const [musicToBook, setMusicToBook] = useState<MusicToBookResult | null>(null);

  const canRunBook =
    mode === "book_to_music" && bookTitle.trim() && bookAuthor.trim();
  const canRunMusic =
    mode === "music_to_book" &&
    (musicInputMode === "spotify"
      ? !!spotifyUrl.trim()
      : !!musicTitle.trim() && !!musicArtist.trim());

  async function run() {
    setBusy(true);
    setError("");
    setBookToMusic(null);
    setMusicToBook(null);
    setDigestSummary(null);
    try {
      const body =
        mode === "book_to_music"
          ? {
              mode,
              bookTitle: bookTitle.trim(),
              bookAuthor: bookAuthor.trim(),
              bookNotes: bookNotes.trim() || undefined,
              outputKind,
            }
          : musicInputMode === "spotify"
            ? { mode, spotifyUrl: spotifyUrl.trim() }
            : {
                mode,
                musicTitle: musicTitle.trim(),
                musicArtist: musicArtist.trim(),
                musicKind,
              };

      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.mode === "book_to_music") {
        setBookToMusic(data.result);
      } else {
        setMusicToBook(data.result);
        const d = data.digest as { label?: string; kind?: string; mood?: { moodLabel?: string }; trackCount?: number } | undefined;
        if (d?.label) {
          setDigestSummary(
            `${d.label} · ${d.kind === "album" ? "Album" : "Track"} · ${d.mood?.moodLabel ?? ""} · ${d.trackCount ?? 0} track(s) for audio`,
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 48px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>VibeReader</h1>
      <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "0.95rem" }}>
        Match a <strong>book</strong> to one <strong>song</strong> or <strong>album</strong>, or go the other way: name a <strong>song/album</strong> (or paste a Spotify track/album link) and get <strong>book</strong> ideas.{" "}
        <code style={{ color: "#d1d5db" }}>ANTHROPIC_API_KEY</code> is required; Spotify credentials are only needed if you use a Spotify link for music → books.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
        <label style={{ color: "#888", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
          Mode
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            disabled={busy}
            style={{ background: "#111", color: "#ddd", border: "1px solid #333", borderRadius: 6, padding: "6px 10px" }}
          >
            <option value="book_to_music">Book → one song or album</option>
            <option value="music_to_book">Song / album → books</option>
          </select>
        </label>
        {mode === "book_to_music" && (
          <label style={{ color: "#888", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
            Suggest
            <select
              value={outputKind}
              onChange={(e) => setOutputKind(e.target.value as "song" | "album")}
              disabled={busy}
              style={{ background: "#111", color: "#ddd", border: "1px solid #333", borderRadius: 6, padding: "6px 10px" }}
            >
              <option value="song">One song</option>
              <option value="album">One album</option>
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !(canRunBook || canRunMusic)}
          style={{
            background: "#14532d",
            border: "1px solid #166534",
            color: "#6ee7b7",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Working…" : "Get suggestions"}
        </button>
      </div>

      {mode === "book_to_music" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <input
            placeholder="Book title"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            disabled={busy}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eee" }}
          />
          <input
            placeholder="Author"
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
            disabled={busy}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eee" }}
          />
          <input
            placeholder="Genre / mood notes (optional)"
            value={bookNotes}
            onChange={(e) => setBookNotes(e.target.value)}
            disabled={busy}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eee" }}
          />
        </div>
      ) : (
        <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <span style={{ color: "#888", fontSize: "0.85rem" }}>Music source</span>
            <label style={{ color: "#ccc", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="radio"
                name="musicIn"
                checked={musicInputMode === "spotify"}
                onChange={() => setMusicInputMode("spotify")}
                disabled={busy}
              />
              Spotify track or album link
            </label>
            <label style={{ color: "#ccc", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="radio"
                name="musicIn"
                checked={musicInputMode === "text"}
                onChange={() => setMusicInputMode("text")}
                disabled={busy}
              />
              Artist and title (no Spotify)
            </label>
          </div>
          {musicInputMode === "spotify" ? (
            <input
              placeholder="https://open.spotify.com/track/… or …/album/…"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              disabled={busy}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #333",
                background: "#111",
                color: "#eee",
              }}
            />
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <label style={{ color: "#888", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  This is a
                  <select
                    value={musicKind}
                    onChange={(e) => setMusicKind(e.target.value as "song" | "album")}
                    disabled={busy}
                    style={{ background: "#111", color: "#ddd", border: "1px solid #333", borderRadius: 6, padding: "6px 10px" }}
                  >
                    <option value="song">Song</option>
                    <option value="album">Album</option>
                  </select>
                </label>
              </div>
              <input
                placeholder="Artist name"
                value={musicArtist}
                onChange={(e) => setMusicArtist(e.target.value)}
                disabled={busy}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eee" }}
              />
              <input
                placeholder={musicKind === "song" ? "Song title" : "Album title"}
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                disabled={busy}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#eee" }}
              />
            </>
          )}
        </div>
      )}

      {error && <p style={{ color: "#f87171", marginBottom: "16px" }}>{error}</p>}
      {digestSummary && <p style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: "12px" }}>{digestSummary}</p>}

      {bookToMusic && (
        <section style={{ borderTop: "1px solid #222", paddingTop: "20px" }}>
          <p style={{ color: "#a3a3a3", marginBottom: "14px" }}>{bookToMusic.rationale}</p>
          {!!bookToMusic.moodTags?.length && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {bookToMusic.moodTags.map((tag) => (
                <span key={tag} style={{ fontSize: "0.75rem", border: "1px solid #14532d", borderRadius: 999, padding: "2px 10px", color: "#6ee7b7" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {bookToMusic.outputKind === "song" && bookToMusic.song && (
            <div style={{ marginBottom: "8px" }}>
              <h2 style={{ fontSize: "1.15rem", marginBottom: "8px" }}>
                {bookToMusic.song.artist} — {bookToMusic.song.title}
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "0.95rem", marginBottom: "10px" }}>{bookToMusic.song.whyItFits}</p>
              <a href={spotifySearchUrl(`${bookToMusic.song.artist} ${bookToMusic.song.title}`)} target="_blank" rel="noopener noreferrer">
                Search on Spotify
              </a>
            </div>
          )}
          {bookToMusic.outputKind === "album" && bookToMusic.album && (
            <div style={{ marginBottom: "8px" }}>
              <h2 style={{ fontSize: "1.15rem", marginBottom: "8px" }}>
                {bookToMusic.album.artist} — {bookToMusic.album.title}
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "0.95rem", marginBottom: "10px" }}>{bookToMusic.album.whyItFits}</p>
              {!!bookToMusic.album.trackPicks?.length && (
                <p style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "10px" }}>
                  Try: {bookToMusic.album.trackPicks.join(" · ")}
                </p>
              )}
              <a href={spotifySearchUrl(`${bookToMusic.album.artist} ${bookToMusic.album.title} album`)} target="_blank" rel="noopener noreferrer">
                Search on Spotify
              </a>
            </div>
          )}
        </section>
      )}

      {musicToBook && (
        <section style={{ borderTop: "1px solid #222", paddingTop: "20px" }}>
          <p style={{ color: "#a3a3a3", marginBottom: "14px" }}>{musicToBook.rationale}</p>
          <ol style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {musicToBook.books.map((b, i) => (
              <li key={`${b.author}-${b.title}-${i}`} style={{ marginBottom: "12px" }}>
                <strong>{b.title}</strong> — {b.author}
                <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>{b.whyItFits}</div>
                <a href={openLibrarySearchUrl(b.title, b.author)} target="_blank" rel="noopener noreferrer">
                  Search Open Library
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
