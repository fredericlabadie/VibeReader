"use client";

import { useId, useState } from "react";

type Mode = "book_to_music" | "music_to_book";
type MusicInputMode = "spotify" | "text";
type TextMusicKind = "song" | "album" | "artist" | "playlist";

function spotifySearchUrl(query: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

function openLibrarySearchUrl(title: string, author: string) {
  return `https://openlibrary.org/search?q=${encodeURIComponent(`${title} ${author}`)}`;
}

type BookToPlaylistResult = {
  playlistName: string;
  rationale: string;
  moodTags: string[];
  tracks: Array<{ title: string; artist: string; whyItFits: string }>;
};

type MusicToBookResult = {
  rationale: string;
  books: Array<{ title: string; author: string; whyItFits: string }>;
};

function digestKindWord(kind: string | undefined): string {
  if (kind === "album") return "Album";
  if (kind === "playlist") return "Playlist";
  if (kind === "artist") return "Artist";
  if (kind === "track") return "Track";
  return "Music";
}

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

  const [mode, setMode] = useState<Mode>("book_to_music");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const [musicInputMode, setMusicInputMode] = useState<MusicInputMode>("spotify");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [textMusicKind, setTextMusicKind] = useState<TextMusicKind>("song");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicNotes, setMusicNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [digestSummary, setDigestSummary] = useState<string | null>(null);
  const [bookPlaylist, setBookPlaylist] = useState<BookToPlaylistResult | null>(null);
  const [musicToBook, setMusicToBook] = useState<MusicToBookResult | null>(null);

  const canRunBook =
    mode === "book_to_music" && bookTitle.trim() && bookAuthor.trim();

  const canRunMusicText =
    textMusicKind === "song" || textMusicKind === "album"
      ? !!(musicTitle.trim() && musicArtist.trim())
      : textMusicKind === "artist"
        ? !!musicArtist.trim()
        : !!musicTitle.trim();

  const canRunMusic =
    mode === "music_to_book" &&
    (musicInputMode === "spotify" ? !!spotifyUrl.trim() : canRunMusicText);

  async function run() {
    setBusy(true);
    setError("");
    setBookPlaylist(null);
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
            }
          : musicInputMode === "spotify"
            ? { mode, spotifyUrl: spotifyUrl.trim() }
            : {
                mode,
                musicKind: textMusicKind,
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
      if (data.mode === "book_to_music") {
        setBookPlaylist(data.result);
      } else {
        setMusicToBook(data.result);
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
            `Using Spotify data for: ${d.label} · ${digestKindWord(d.kind)} · mood: ${d.mood?.moodLabel ?? "—"} · ${n} track(s) analyzed`,
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
    <main className="vr-page">
      <header className="vr-header">
        <h1 className="vr-title">VibeReader</h1>
        <p className="vr-lead">
          Soundtrack your shelf: turn a novel into a hand-built playlist, or aim your headphones at the page and collect a
          small stack of books that share the same mood as your favorite track, album, artist, or playlist.
        </p>
        <p className="vr-footnote">
          Suggestions are playful starting points from an AI—not reviews. Double-check titles before you buy or stream. Spotify
          links (and typed artist names when keys are set) use real audio data; plain-text descriptions lean on names and
          vibes alone.
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
            aria-pressed={mode === "book_to_music"}
            disabled={busy}
            onClick={() => setMode("book_to_music")}
          >
            Playlist for my book
          </button>
          <button
            type="button"
            className="vr-seg-btn"
            aria-pressed={mode === "music_to_book"}
            disabled={busy}
            onClick={() => setMode("music_to_book")}
          >
            Books for my music
          </button>
        </div>

        {mode === "book_to_music" ? (
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
                Author
              </label>
              <input
                id={bookAuthorId}
                className="vr-input"
                placeholder="e.g. Ursula K. Le Guin"
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
              You&apos;ll get a named playlist and a dozen-ish track ideas to queue—chapter by chapter, not a single song.
            </p>
          </>
        ) : (
          <>
            <div className="vr-radio-row" role="radiogroup" aria-label="How should we read your music?">
              <label className="vr-radio">
                <input
                  type="radio"
                  name={`${uid}-music-src`}
                  checked={musicInputMode === "spotify"}
                  onChange={() => setMusicInputMode("spotify")}
                  disabled={busy}
                />
                Paste a Spotify link
              </label>
              <label className="vr-radio">
                <input
                  type="radio"
                  name={`${uid}-music-src`}
                  checked={musicInputMode === "text"}
                  onChange={() => setMusicInputMode("text")}
                  disabled={busy}
                />
                Describe it in words
              </label>
            </div>

            {musicInputMode === "spotify" ? (
              <div className="vr-field">
                <label className="vr-label" htmlFor={spotifyUrlId}>
                  Spotify URL
                </label>
                <input
                  id={spotifyUrlId}
                  className="vr-input"
                  placeholder="Track, album, artist page, or public playlist"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                  inputMode="url"
                />
                <span className="vr-hint">
                  Copy the link from Spotify&apos;s share menu. Playlists need to be public so we can read the track list.
                </span>
              </div>
            ) : (
              <>
                <div className="vr-field">
                  <label className="vr-label" htmlFor={`${uid}-text-kind`}>
                    What are you describing?
                  </label>
                  <select
                    id={`${uid}-text-kind`}
                    className="vr-select"
                    value={textMusicKind}
                    onChange={(e) => setTextMusicKind(e.target.value as TextMusicKind)}
                    disabled={busy}
                  >
                    <option value="song">A song</option>
                    <option value="album">An album</option>
                    <option value="artist">An artist</option>
                    <option value="playlist">A playlist (by name)</option>
                  </select>
                </div>

                {(textMusicKind === "song" || textMusicKind === "album") && (
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
                        {textMusicKind === "song" ? "Song title" : "Album title"}
                      </label>
                      <input
                        id={musicTitleId}
                        className="vr-input"
                        placeholder={textMusicKind === "song" ? "Track name" : "Release name"}
                        value={musicTitle}
                        onChange={(e) => setMusicTitle(e.target.value)}
                        disabled={busy}
                        autoComplete="off"
                      />
                    </div>
                  </>
                )}

                {textMusicKind === "artist" && (
                  <>
                    <div className="vr-field">
                      <label className="vr-label" htmlFor={musicArtistId}>
                        Artist name
                      </label>
                      <input
                        id={musicArtistId}
                        className="vr-input"
                        placeholder="Who are you in the mood for?"
                        value={musicArtist}
                        onChange={(e) => setMusicArtist(e.target.value)}
                        disabled={busy}
                        autoComplete="off"
                      />
                    </div>
                    <div className="vr-field">
                      <label className="vr-label" htmlFor={musicTitleId}>
                        Extra detail <span style={{ fontWeight: 400, color: "var(--vr-text-subtle)" }}>(optional)</span>
                      </label>
                      <input
                        id={musicTitleId}
                        className="vr-input"
                        placeholder="Era, side project, or what you like about them"
                        value={musicTitle}
                        onChange={(e) => setMusicTitle(e.target.value)}
                        disabled={busy}
                        autoComplete="off"
                      />
                    </div>
                  </>
                )}

                {textMusicKind === "playlist" && (
                  <>
                    <div className="vr-field">
                      <label className="vr-label" htmlFor={musicTitleId}>
                        Playlist name
                      </label>
                      <input
                        id={musicTitleId}
                        className="vr-input"
                        placeholder="What do you call it?"
                        value={musicTitle}
                        onChange={(e) => setMusicTitle(e.target.value)}
                        disabled={busy}
                        autoComplete="off"
                      />
                    </div>
                    <div className="vr-field">
                      <label className="vr-label" htmlFor={musicArtistId}>
                        Curator or context <span style={{ fontWeight: 400, color: "var(--vr-text-subtle)" }}>(optional)</span>
                      </label>
                      <input
                        id={musicArtistId}
                        className="vr-input"
                        placeholder="Your handle, a radio show, or where you found it"
                        value={musicArtist}
                        onChange={(e) => setMusicArtist(e.target.value)}
                        disabled={busy}
                        autoComplete="off"
                      />
                    </div>
                  </>
                )}

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
              We&apos;ll suggest several books in one go—like a book club that only talks in mixtapes.
            </p>
          </>
        )}

        <div className="vr-actions">
          <button type="button" className="vr-btn-primary" onClick={() => void run()} disabled={busy || !(canRunBook || canRunMusic)}>
            {busy ? "Thinking…" : "Get suggestions"}
          </button>
        </div>
      </div>

      {error && (
        <div className="vr-banner vr-banner--error" role="alert">
          {error}
        </div>
      )}
      {digestSummary && <div className="vr-banner vr-banner--info">{digestSummary}</div>}

      {(bookPlaylist || musicToBook) && (
        <section className="vr-results" aria-live="polite" aria-atomic="true">
          <h2 className="vr-results-heading">Suggestions</h2>

          {bookPlaylist && (
            <>
              <h3 className="vr-pick-title" style={{ marginTop: 0 }}>
                {bookPlaylist.playlistName}
              </h3>
              <p className="vr-results-intro">{bookPlaylist.rationale}</p>
              {!!bookPlaylist.moodTags?.length && (
                <div className="vr-tags" aria-label="Mood tags">
                  {bookPlaylist.moodTags.map((tag) => (
                    <span key={tag} className="vr-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h4 className="vr-card-title" style={{ marginBottom: "0.65rem" }}>
                Your next listen, track by track
              </h4>
              <ol className="vr-list">
                {bookPlaylist.tracks.map((t, i) => (
                  <li key={`${t.artist}-${t.title}-${i}`}>
                    <strong>{t.artist}</strong> — {t.title}
                    <div className="vr-pick-note" style={{ marginTop: "0.35rem", marginBottom: "0.35rem" }}>
                      {t.whyItFits}
                    </div>
                    <a className="vr-link" href={spotifySearchUrl(`${t.artist} ${t.title}`)} target="_blank" rel="noopener noreferrer">
                      Open in Spotify search
                    </a>
                  </li>
                ))}
              </ol>
            </>
          )}

          {musicToBook && (
            <>
              <p className="vr-results-intro">{musicToBook.rationale}</p>
              <h3 className="vr-card-title" style={{ marginBottom: "0.35rem" }}>
                A small stack of reads
              </h3>
              <p className="vr-hint" style={{ marginBottom: "0.85rem" }}>
                Pick one to start—the order is loose, not a strict ranking.
              </p>
              <ol className="vr-list">
                {musicToBook.books.map((b, i) => (
                  <li key={`${b.author}-${b.title}-${i}`}>
                    <strong>{b.title}</strong> — {b.author}
                    <div className="vr-pick-note" style={{ marginTop: "0.35rem", marginBottom: "0.35rem" }}>
                      {b.whyItFits}
                    </div>
                    <a className="vr-link" href={openLibrarySearchUrl(b.title, b.author)} target="_blank" rel="noopener noreferrer">
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
