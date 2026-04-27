# VibeReader — Book ↔ Song

Small **Next.js** app with two **AI lookups** (Claude):

1. **Book → songs** — From a book title (author optional), get a named list of **song** ideas (title + artist) that fit the read.
2. **Song → books** — From **one song** (Spotify **track** link, or song title + artist in text), get **several** novel suggestions.

If you omit the author on book → songs and several well-known books share the title, the API returns candidates and the UI asks you to pick an author before generating songs.

**Repo:** [github.com/fredericlabadie/VibeReader](https://github.com/fredericlabadie/VibeReader)

This project is **separate** from [Writers Room](https://github.com/fredericlabadie/writers-room). You can copy the same API keys into `.env.local` here:

- `ANTHROPIC_API_KEY` (required)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — optional; required only for **Song → books** via Spotify **track** URL (audio summaries). Text-only song → books works without Spotify.
- `SPOTIFY_MARKET` (optional, default `US`) — ISO **3166-1 alpha-2** country code for any Spotify calls that still use a market (rare in the song-only flow).

Default dev port is **3001** so it can run next to Writers Room on `3000`.

## Setup

```bash
cp .env.example .env.local
# Paste keys (same names as Writers Room where applicable)

npm install
npm run dev
# → http://localhost:3001
```

## Deploy

Works on Vercel like any Next app: set the same env vars in the project settings. The recommendations route sets `maxDuration` to **60** seconds.

## API

`POST /api/recommendations` with JSON:

**Book → songs**

- `{ "mode": "book_to_songs", "bookTitle", "bookNotes?" }` — author omitted → response may be disambiguation (see below).
- `{ "mode": "book_to_songs", "bookTitle", "bookAuthor", "bookNotes?" }` — author known → song list directly.
- Response **song list**: `{ "mode": "book_to_songs", "result": { "songListName", "rationale", "moodTags", "songs": [{ "title", "artist", "whyItFits" }] } }` (typically 10–16 songs).
- Response **pick author** (when title alone matches several books): `{ "mode": "book_to_songs", "step": "pick_author", "candidates": [{ "title", "author", "note?" }] }` — resend with the chosen `bookTitle` and `bookAuthor` from one row.

**Song → books**

- `{ "mode": "song_to_books", "spotifyUrl" }` — must resolve to a **track** only (not album, artist, or playlist).
- `{ "mode": "song_to_books", "musicTitle", "musicArtist", "musicNotes?" }` — text description of one song.

Response `result`: `{ "rationale", "books": [{ "title", "author", "whyItFits" }] }` (typically **at least six** books). With Spotify, the response may also include `digest` (listening summary used for prompting).

There is **no authentication** on this route; if you expose the app publicly, consider adding your own protection (e.g. Vercel deployment protection or a shared secret header).
