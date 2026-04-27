# VibeReader — Book ↔ Music

Small **Next.js** app: turn a **book** into a **named playlist** of track ideas (Claude), or get **several book** suggestions from **music**—via a Spotify **track, album, artist, or public playlist** link (audio features where applicable), or a **text description** of a song, album, artist, or playlist.

**Repo:** [github.com/fredericlabadie/VibeReader](https://github.com/fredericlabadie/VibeReader)

This project is **separate** from [Writers Room](https://github.com/fredericlabadie/writers-room). You can copy the same API keys into `.env.local` here:

- `ANTHROPIC_API_KEY` (required)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — for Spotify links and for **typed artist name** (Spotify search → top tracks → books). Optional if you only use text for song/album/playlist without Spotify.
- `SPOTIFY_MARKET` (optional, default `US`) — market code for artist top tracks.

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

Works on Vercel like any Next app: set the same env vars in the project settings. The recommendations route sets `maxDuration` to **60** seconds for longer playlist generations.

## API

`POST /api/recommendations` with JSON:

**Book → playlist**

- `{ "mode": "book_to_music", "bookTitle", "bookAuthor", "bookNotes?" }`
- Response `result`: `{ "playlistName", "rationale", "moodTags", "tracks": [{ "title", "artist", "whyItFits" }] }` (typically 10–16 tracks).

**Music → books (several titles)**

- `{ "mode": "music_to_book", "spotifyUrl" }` — Spotify **track**, **album**, **artist**, or **public playlist** link
- `{ "mode": "music_to_book", "musicKind": "song" | "album", "musicTitle", "musicArtist", "musicNotes?" }`
- `{ "mode": "music_to_book", "musicKind": "artist", "musicArtist", "musicTitle?", "musicNotes?" }` — tries Spotify artist search when credentials exist; otherwise Claude-only
- `{ "mode": "music_to_book", "musicKind": "playlist", "musicTitle", "musicArtist?", "musicNotes?" }` — playlist **name** in `musicTitle`; optional curator in `musicArtist`
- Response `result`: `{ "rationale", "books": [{ "title", "author", "whyItFits" }] }` (typically **at least six** books).

There is **no authentication** on this route; if you expose the app publicly, consider adding your own protection (e.g. Vercel deployment protection or a shared secret header).
