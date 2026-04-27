"use client";

import { useState } from "react";

type Mode = "book_to_playlist" | "playlist_to_book";

function spotifyTrackSearchUrl(artist: string, title: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`;
}

function openLibrarySearchUrl(title: string, author: string) {
  return `https://openlibrary.org/search?q=${encodeURIComponent(`${title} ${author}`)}`;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("book_to_playlist");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [digestSummary, setDigestSummary] = useState<string | null>(null);
  const [bookToPl, setBookToPl] = useState<{
    playlistName: string;
    rationale: string;
    moodTags: string[];
    tracks: Array<{ title: string; artist: string; whyItFits: string }>;
  } | null>(null);
  const [plToBook, setPlToBook] = useState<{
    rationale: string;
    books: Array<{ title: string; author: string; whyItFits: string }>;
  } | null>(null);

  async function run() {
    setBusy(true);
    setError("");
    setBookToPl(null);
    setPlToBook(null);
    setDigestSummary(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "book_to_playlist"
            ? {
                mode,
                bookTitle: bookTitle.trim(),
                bookAuthor: bookAuthor.trim(),
                bookNotes: bookNotes.trim() || undefined,
              }
            : { mode, spotifyPlaylistUrl: playlistUrl.trim() },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.mode === "book_to_playlist") {
        setBookToPl(data.result);
      } else {
        setPlToBook(data.result);
        const d = data.digest as { playlistName?: string; mood?: { moodLabel?: string }; analyzedTrackCount?: number } | undefined;
        if (d) {
          setDigestSummary(
            `${d.playlistName ?? "Playlist"} · ${d.mood?.moodLabel ?? ""} · ${d.analyzedTrackCount ?? 0} tracks analyzed`,
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
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>Book ↔ Playlist</h1>
      <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "0.95rem" }}>
        Standalone tool (not part of Writers Room). Reuse the same <code style={{ color: "#d1d5db" }}>ANTHROPIC_API_KEY</code> and Spotify app credentials as in Writers Room <code style={{ color: "#d1d5db" }}>.env.local</code>.
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
            <option value="book_to_playlist">Book → playlist ideas</option>
            <option value="playlist_to_book">Playlist → book ideas</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || (mode === "book_to_playlist" && (!bookTitle.trim() || !bookAuthor.trim())) || (mode === "playlist_to_book" && !playlistUrl.trim())}
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

      {mode === "book_to_playlist" ? (
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
        <input
          placeholder="Public Spotify playlist URL"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          disabled={busy}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#111",
            color: "#eee",
            marginBottom: "20px",
          }}
        />
      )}

      {error && <p style={{ color: "#f87171", marginBottom: "16px" }}>{error}</p>}
      {digestSummary && <p style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: "12px" }}>{digestSummary}</p>}

      {bookToPl && (
        <section style={{ borderTop: "1px solid #222", paddingTop: "20px" }}>
          <h2 style={{ fontSize: "1.15rem", marginBottom: "8px" }}>{bookToPl.playlistName}</h2>
          <p style={{ color: "#a3a3a3", marginBottom: "12px" }}>{bookToPl.rationale}</p>
          {!!bookToPl.moodTags?.length && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {bookToPl.moodTags.map((tag) => (
                <span key={tag} style={{ fontSize: "0.75rem", border: "1px solid #14532d", borderRadius: 999, padding: "2px 10px", color: "#6ee7b7" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <ol style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {bookToPl.tracks.map((t, i) => (
              <li key={`${t.artist}-${t.title}-${i}`} style={{ marginBottom: "12px" }}>
                <strong>{t.artist}</strong> — {t.title}
                <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>{t.whyItFits}</div>
                <a href={spotifyTrackSearchUrl(t.artist, t.title)} target="_blank" rel="noopener noreferrer">
                  Search on Spotify
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {plToBook && (
        <section style={{ borderTop: "1px solid #222", paddingTop: "20px" }}>
          <p style={{ color: "#a3a3a3", marginBottom: "14px" }}>{plToBook.rationale}</p>
          <ol style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {plToBook.books.map((b, i) => (
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
