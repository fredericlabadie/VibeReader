"use client";

import { useId, useState } from "react";

type Mode = "book_to_songs" | "song_to_books";
type MusicInputMode = "spotify" | "text";

function spotifySearchUrl(query: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

function openLibrarySearchUrl(title: string, author: string) {
  return `https://openlibrary.org/search?q=${encodeURIComponent(`${title} ${author}`)}`;
}

type BookAuthorCandidate = {
  title: string;
  author: string;
  note?: string;
};

type BookToSongsResult = {
  songListName: string;
  rationale: string;
  moodTags: string[];
  songs: Array<{ title: string; artist: string; whyItFits: string }>;
};

type SongToBooksResult = {
  rationale: string;
  books: Array<{ title: string; author: string; whyItFits: string }>;
};

export default function Home() {
  const uid = useId();
  const modeGroupLabelId = `${uid}-mode-group`;
  const bookTitleId = `${uid}-book-title`;
  const bookAuthorId = `${uid}-book-author`;
  const bookNotesId = `${uid}-book-notes`;
  const spotifyUrlId = `${uid}-spotify-url`;
  const musicArtistId = `${uid}-music-artist`;
  const musicTitleId = `${uid}-music-title`;
  const musicNotesId = `${uid}-music-notes`;

  const [mode, setMode] = useState<Mode>("book_to_songs");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const [musicInputMode, setMusicInputMode] = useState<MusicInputMode>("spotify");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicNotes, setMusicNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [digestSummary, setDigestSummary] = useState<string | null>(null);
  const [bookSongs, setBookSongs] = useState<BookToSongsResult | null>(null);
  const [songToBooks, setSongToBooks] = useState<SongToBooksResult | null>(null);
  const [authorCandidates, setAuthorCandidates] = useState<BookAuthorCandidate[] | null>(null);

  const canRunBook = mode === "book_to_songs" && !!bookTitle.trim() && !authorCandidates;
  const canRunSongToBooks =
    mode === "song_to_books" &&
    (musicInputMode === "spotify" ? !!spotifyUrl.trim() : !!(musicTitle.trim() && musicArtist.trim()));

  async function runFromCandidate(c: BookAuthorCandidate) {
    setBookTitle(c.title);
    setBookAuthor(c.author);
    setAuthorCandidates(null);
    setBusy(true);
    setError("");
    setBookSongs(null);
    setSongToBooks(null);
    setDigestSummary(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "book_to_songs",
          bookTitle: c.title.trim(),
          bookAuthor: c.author.trim(),
          bookNotes: bookNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.mode === "book_to_songs" && data.result) {
        setBookSongs(data.result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    setBusy(true);
    setError("");
    setBookSongs(null);
    setSongToBooks(null);
    setDigestSummary(null);
    if (mode === "song_to_books") {
      setAuthorCandidates(null);
    }
    try {
      const body =
        mode === "book_to_songs"
          ? {
              mode,
              bookTitle: bookTitle.trim(),
              ...(bookAuthor.trim() ? { bookAuthor: bookAuthor.trim() } : {}),
              bookNotes: bookNotes.trim() || undefined,
            }
          : musicInputMode === "spotify"
            ? { mode, spotifyUrl: spotifyUrl.trim() }
            : {
                mode,
                musicTitle: musicTitle.trim(),
                musicArtist: musicArtist.trim(),
                musicNotes: musicNotes.trim() || undefined,
              };

      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      if (data.mode === "book_to_songs") {
        if (data.step === "pick_author" && Array.isArray(data.candidates)) {
          setAuthorCandidates(data.candidates);
          return;
        }
        setAuthorCandidates(null);
        setBookSongs(data.result);
      } else {
        setSongToBooks(data.result);
        const d = data.digest as
          | {
              label?: string;
              kind?: string;
              mood?: { moodLabel?: string };
              trackCount?: number;
              analyzedTrackCount?: number;
            }
          | undefined;
        if (d?.label) {
          const n = d.analyzedTrackCount ?? d.trackCount ?? 0;
          setDigestSummary(
            `Spotify: ${d.label} · Song · mood: ${d.mood?.moodLabel ?? "—"} · ${n} track(s) used for averages`,
          );
        } else {
          setDigestSummary("Using song title + artist from your text (no Spotify audio data).");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="vr-page">
      <header className="vr-header">
        <h1 className="vr-title">VibeReader</h1>
        <p className="vr-lead">
          Two lookups: <strong>book → songs</strong> (a list of track ideas for what you&apos;re reading) and{" "}
          <strong>song → books</strong> (several novels that match one song). Suggestions are AI starters—not reviews.
        </p>
        <p className="vr-footnote">
          Song → books from Spotify uses a <strong>track link only</strong> (not albums or playlists). Text mode needs
          song title + artist. Double-check titles before you buy or stream.
        </p>
      </header>

      <div className="vr-card" aria-labelledby={modeGroupLabelId}>
        <p id={modeGroupLabelId} className="vr-card-title">
          Start here
        </p>
        <div className="vr-seg" role="group" aria-label="Choose direction">
          <button
            type="button"
            className="vr-seg-btn"
            aria-pressed={mode === "book_to_songs"}
            disabled={busy}
            onClick={() => {
              setMode("book_to_songs");
              setAuthorCandidates(null);
              setError("");
            }}
          >
            Book → songs
          </button>
          <button
            type="button"
            className="vr-seg-btn"
            aria-pressed={mode === "song_to_books"}
            disabled={busy}
            onClick={() => {
              setMode("song_to_books");
              setAuthorCandidates(null);
              setError("");
            }}
          >
            Song → books
          </button>
        </div>

        {authorCandidates && mode === "book_to_songs" ? (
          <div className="vr-field" style={{ marginTop: "1rem" }}>
            <p className="vr-label" style={{ marginBottom: "0.65rem" }}>
              Several books match that title—which author did you mean?
            </p>
            <ul className="vr-list" style={{ listStyle: "none", paddingLeft: 0 }}>
              {authorCandidates.map((c, i) => (
                <li key={`${c.author}-${c.title}-${i}`} style={{ marginBottom: "0.65rem" }}>
                  <button
                    type="button"
                    className="vr-btn-primary"
                    style={{ width: "100%", textAlign: "left", fontWeight: 600 }}
                    disabled={busy}
                    onClick={() => void runFromCandidate(c)}
                  >
                    <span style={{ display: "block" }}>
                      {c.title} — {c.author}
                    </span>
                    {c.note ? (
                      <span style={{ display: "block", fontWeight: 400, fontSize: "0.9rem", marginTop: "0.25rem" }}>
                        {c.note}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <p className="vr-hint" style={{ marginBottom: "0.75rem" }}>
              Or go back: add the author in the field below, clear this list, and press Get suggestions again.
            </p>
            <button
              type="button"
              className="vr-btn-primary"
              style={{ opacity: 0.85, marginBottom: "0.5rem" }}
              disabled={busy}
              onClick={() => {
                setAuthorCandidates(null);
              }}
            >
              Enter author manually instead
            </button>
          </div>
        ) : mode === "book_to_songs" ? (
          <>
            <div className="vr-field">
              <label className="vr-label" htmlFor={bookTitleId}>
                Book title
              </label>
              <input
                id={bookTitleId}
                className="vr-input"
                placeholder="e.g. The Left Hand of Darkness"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                disabled={busy}
                autoComplete="off"
              />
            </div>
            <div className="vr-field">
              <label className="vr-label" htmlFor={bookAuthorId}>
                Author <span style={{ fontWeight: 400, color: "var(--vr-text-subtle)" }}>(optional)</span>
              </label>
              <input
                id={bookAuthorId}
                className="vr-input"
                placeholder="Leave blank if unsure—we’ll ask you to pick when there are multiple matches"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                disabled={busy}
                autoComplete="off"
              />
            </div>
            <div className="vr-field">
              <label className="vr-label" htmlFor={bookNotesId}>
                Vibe notes <span style={{ fontWeight: 400, color: "var(--vr-text-subtle)" }}>(optional)</span>
              </label>
              <input
                id={bookNotesId}
                className="vr-input"
                placeholder="Genre, era, mood, or what you liked about it"
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                disabled={busy}
                autoComplete="off"
              />
            </div>
            <p className="vr-hint" style={{ marginBottom: "0.85rem" }}>
              You&apos;ll get a short mix name plus 10–16 song ideas (title + artist) to search and queue yourself.
            </p>
          </>
        ) : (
          <>
            <div className="vr-radio-row" role="radiogroup" aria-label="How should we read your song?">
              <label className="vr-radio">
                <input
                  type="radio"
                  name={`${uid}-music-src`}
                  checked={musicInputMode === "spotify"}
                  onChange={() => setMusicInputMode("spotify")}
                  disabled={busy}
                />
                Spotify track link
              </label>
              <label className="vr-radio">
                <input
                  type="radio"
                  name={`${uid}-music-src`}
                  checked={musicInputMode === "text"}
                  onChange={() => setMusicInputMode("text")}
                  disabled={busy}
                />
                Song in words
              </label>
            </div>

            {musicInputMode === "spotify" ? (
              <div className="vr-field">
                <label className="vr-label" htmlFor={spotifyUrlId}>
                  Spotify track URL
                </label>
                <input
                  id={spotifyUrlId}
                  className="vr-input"
                  placeholder="https://open.spotify.com/track/… or spotify:track:…"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                  inputMode="url"
                />
                <span className="vr-hint">
                  Share → Copy link from the song page. Album, artist, and playlist links are not supported for this
                  mode.
                </span>
              </div>
            ) : (
              <>
                <div className="vr-field">
                  <label className="vr-label" htmlFor={musicArtistId}>
                    Artist
                  </label>
                  <input
                    id={musicArtistId}
                    className="vr-input"
                    placeholder="Who recorded it?"
                    value={musicArtist}
                    onChange={(e) => setMusicArtist(e.target.value)}
                    disabled={busy}
                    autoComplete="off"
                  />
                </div>
                <div className="vr-field">
                  <label className="vr-label" htmlFor={musicTitleId}>
                    Song title
                  </label>
                  <input
                    id={musicTitleId}
                    className="vr-input"
                    placeholder="Track name"
                    value={musicTitle}
                    onChange={(e) => setMusicTitle(e.target.value)}
                    disabled={busy}
                    autoComplete="off"
                  />
                </div>
                <div className="vr-field">
                  <label className="vr-label" htmlFor={musicNotesId}>
                    Mood or genre hints <span style={{ fontWeight: 400, color: "var(--vr-text-subtle)" }}>(optional)</span>
                  </label>
                  <textarea
                    id={musicNotesId}
                    className="vr-textarea"
                    placeholder="Anything else that captures how it feels when you press play"
                    value={musicNotes}
                    onChange={(e) => setMusicNotes(e.target.value)}
                    disabled={busy}
                    rows={2}
                  />
                </div>
              </>
            )}
            <p className="vr-hint" style={{ marginBottom: "0.85rem" }}>
              We&apos;ll suggest several books in one pass—same energy as the song you named.
            </p>
          </>
        )}

        {!authorCandidates && (
          <div className="vr-actions">
            <button
              type="button"
              className="vr-btn-primary"
              onClick={() => void run()}
              disabled={busy || !(canRunBook || canRunSongToBooks)}
            >
              {busy ? "Thinking…" : "Get suggestions"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="vr-banner vr-banner--error" role="alert">
          {error}
        </div>
      )}
      {digestSummary && <div className="vr-banner vr-banner--info">{digestSummary}</div>}

      {(bookSongs || songToBooks) && (
        <section className="vr-results" aria-live="polite" aria-atomic="true">
          <h2 className="vr-results-heading">Suggestions</h2>

          {bookSongs && (
            <>
              <h3 className="vr-pick-title" style={{ marginTop: 0 }}>
                {bookSongs.songListName}
              </h3>
              <p className="vr-results-intro">{bookSongs.rationale}</p>
              {!!bookSongs.moodTags?.length && (
                <div className="vr-tags" aria-label="Mood tags">
                  {bookSongs.moodTags.map((tag) => (
                    <span key={tag} className="vr-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h4 className="vr-card-title" style={{ marginBottom: "0.65rem" }}>
                Suggested songs
              </h4>
              <ol className="vr-list">
                {bookSongs.songs.map((t, i) => (
                  <li key={`${t.artist}-${t.title}-${i}`}>
                    <strong>{t.artist}</strong> — {t.title}
                    <div className="vr-pick-note" style={{ marginTop: "0.35rem", marginBottom: "0.35rem" }}>
                      {t.whyItFits}
                    </div>
                    <a
                      className="vr-link"
                      href={spotifySearchUrl(`${t.artist} ${t.title}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Spotify search
                    </a>
                  </li>
                ))}
              </ol>
            </>
          )}

          {songToBooks && (
            <>
              <p className="vr-results-intro">{songToBooks.rationale}</p>
              <h3 className="vr-card-title" style={{ marginBottom: "0.35rem" }}>
                Books that fit the song
              </h3>
              <p className="vr-hint" style={{ marginBottom: "0.85rem" }}>
                Pick one to start—the order is loose, not a strict ranking.
              </p>
              <ol className="vr-list">
                {songToBooks.books.map((b, i) => (
                  <li key={`${b.author}-${b.title}-${i}`}>
                    <strong>{b.title}</strong> — {b.author}
                    <div className="vr-pick-note" style={{ marginTop: "0.35rem", marginBottom: "0.35rem" }}>
                      {b.whyItFits}
                    </div>
                    <a
                      className="vr-link"
                      href={openLibrarySearchUrl(b.title, b.author)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Look it up on Open Library
                    </a>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </main>
  );
}
