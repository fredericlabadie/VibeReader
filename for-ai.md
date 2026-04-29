# for-ai.md — VibeReader
*Context document for AI assistants continuing development on this project.*

---

## What this is

VibeReader finds the sonic equivalent of a book, or the literary equivalent of a song. It uses Claude to reason about mood, texture, and thematic resonance — not genre tags. So *Blood Meridian* doesn't return Western soundtracks, and Joy Division doesn't just return bleak fiction.

**Live:** [vibereader.fredericlabadie.com](https://vibereader.fredericlabadie.com)
**Repo:** `fredericlabadie/VibeReader`
**Stack:** Next.js 14 (App Router) · TypeScript · Anthropic API · Spotify Web API (optional) · Vercel

---

## Architecture — it's simple

This is a thin wrapper. No database, no auth, no state beyond a single page.

```
app/page.tsx                 ← entire frontend (single page, all state here)
app/api/recommendations/     ← one POST route, handles both modes
lib/bookPlaylist.ts          ← all Claude calls (4 functions)
lib/spotifyMusic.ts          ← Spotify API client + URL resolution
lib/auth.ts                  ← API secret check (optional header gate)
middleware.ts                ← enforces API_SECRET on /api/* if set
```

No Supabase. No NextAuth. No multi-page routing.

---

## The two modes

**`book_to_songs`** — user gives a book title + optional author + notes → returns a playlist of 10-16 tracks with rationale.

**`song_to_books`** — user gives a Spotify URL **or** a manual track title + artist + notes → returns book recommendations with rationale.

---

## API — one endpoint

`POST /api/recommendations`

**Book → songs:**
```json
{ "mode": "book_to_songs", "bookTitle": "Beloved", "bookAuthor": "Toni Morrison" }
```

**Book → songs (author unknown):** omit `bookAuthor` → returns `{ step: "pick_author", candidates: [...] }` if ambiguous, or auto-resolves if only one match.

**Song → books (Spotify URL):**
```json
{ "mode": "song_to_books", "spotifyUrl": "https://open.spotify.com/track/..." }
```
The URL is resolved, audio features fetched from Spotify, and a rich `MusicListeningDigest` is built before the Claude call.

**Song → books (manual):**
```json
{ "mode": "song_to_books", "musicTitle": "Love Will Tear Us Apart", "musicArtist": "Joy Division" }
```

If `API_SECRET` env var is set, all `/api/*` requests must include `Authorization: Bearer <secret>`.

---

## Core functions in lib/bookPlaylist.ts

| Function | What it does |
|---|---|
| `disambiguateBookAuthor(input)` | Given a title, returns 1-8 candidate books with authors so the user can pick |
| `recommendSongsFromBook(input)` | Book → 10-16 songs with rationale. Returns `BookToSongsResult` |
| `recommendBooksFromSongDigest(digest)` | Spotify digest → book recommendations. Rich context from audio features |
| `recommendBooksFromSongText(input)` | Manual title/artist → book recommendations. Less context, still good |

All functions call `claude-sonnet-4-5` directly. All return typed JSON parsed from Claude's response via `extractJsonObject<T>()`.

**Return types:**
```ts
BookToSongsResult = {
  songListName: string;     // evocative mixtape-style name
  rationale: string;        // why this playlist fits the book
  moodTags: string[];       // 3-6 short tags
  songs: { title, artist, whyItFits }[];
}

SongToBooksResult = {
  rationale: string;
  books: { title, author, whyItFits }[];
}

MusicListeningDigest = {
  // Spotify-derived: track name, artists, album, audio features
  // (energy, valence, tempo, danceability, acousticness, etc.)
  // This struct is passed directly to recommendBooksFromSongDigest
}
```

---

## Spotify integration

`lib/spotifyMusic.ts` handles:
- **URL normalization** — cleans up share URLs, open.spotify.com links, etc.
- **Share URL resolution** — follows redirects on Spotify share URLs to get the canonical URL
- **Resource parsing** — extracts type (track/album/artist/playlist) and ID
- **Audio feature fetching** — calls Spotify Web API for danceability, energy, valence, tempo, etc.
- **Digest building** — assembles a `MusicListeningDigest` from track metadata + audio features

Spotify is **optional** — if `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` are not set, the Spotify URL path errors gracefully and the manual text path still works.

Client credentials flow only (no user OAuth needed).

---

## Frontend — app/page.tsx

Single page component. All state lives here. No external state library.

**Key state:**
```ts
mode: "book_to_songs" | "song_to_books"
musicInputMode: "spotify" | "text"
busy: boolean                    // disables form during API call
bookSongs: BookToSongsResult     // result for book→songs
songToBooks: SongToBooksResult   // result for song→books
digestSummary: string | null     // shown when Spotify URL was used
candidates: BookAuthorCandidate[]  // shown when author disambiguation needed
```

**Flow:**
1. User fills form → clicks submit
2. `fetch('/api/recommendations', { method: 'POST', body: JSON.stringify({...}) })`
3. If `step: "pick_author"` in response → show candidate picker → user selects → re-submit with chosen author
4. Otherwise render results

Results link out to:
- Songs → Spotify search URL for the track
- Books → Open Library search URL

---

## Env vars

```env
ANTHROPIC_API_KEY=         # required
SPOTIFY_CLIENT_ID=         # optional — enables Spotify URL mode
SPOTIFY_CLIENT_SECRET=     # optional
API_SECRET=                # optional — gates /api/* with Bearer token
NEXT_PUBLIC_API_SECRET=    # must match API_SECRET (sent from browser)
```

---

## Gotchas

- **Spotify track links only** — album, artist, and playlist URLs return a 400. Only `open.spotify.com/track/...` is supported in song→books mode.
- **`extractJsonObject<T>()`** — Claude is prompted to return raw JSON but sometimes wraps in markdown fences. This function strips fences before parsing. It throws if no `{...}` is found — let it bubble to the API route's catch block.
- **Author disambiguation** — the frontend must handle `step: "pick_author"` as a two-step flow. The first call returns candidates; the second call includes the selected `bookAuthor`.
- **`maxDuration = 60`** — set on the recommendations route because Claude calls can take 10-20s. Required for Vercel Hobby plan limits.
- **No streaming** — responses are buffered, not streamed. The `busy` state covers the wait.

---

## What could be built next (ideas, not commitments)

- Spotify playlist creation — OAuth user token → create a real playlist from the song recommendations
- Album mode — currently only track links; album→books or book→album could be a third mode
- Save/share results — no DB today; could add a simple read-only share URL with query params or a short-lived token
- Better UI — the current UI is functional but minimal; the design language from Writers Room (dark theme, mono type, agent-style cards) could be a nice port
- Rate limiting — no protection today beyond the optional API_SECRET
- Artist mode — given an artist's discography, suggest a reading list for their whole catalogue

---

## Deploy

Push to main → Vercel auto-deploys. No migrations, no build steps beyond `next build`.
