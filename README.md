# VibeReader — Book ↔ Music

Small **Next.js** app: turn a **book** into a **named playlist** of track ideas (Claude), or get **several book** suggestions from **music**—via a Spotify **track, album, artist, or public user playlist** link (audio features where applicable), or a **text description** of a song, album, artist, or playlist. Spotify-owned editorial playlists are often unavailable to the Web API; use a user playlist, artist link, or text when that happens.

**Repo:** [github.com/fredericlabadie/VibeReader](https://github.com/fredericlabadie/VibeReader)

This project is **separate** from [Writers Room](https://github.com/fredericlabadie/writers-room). You can copy the same API keys into `.env.local` here:

- `ANTHROPIC_API_KEY` (required)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — for Spotify links and for **typed artist name** (Spotify search → top tracks → books). Optional if you only use text for song/album/playlist without Spotify.
- `SPOTIFY_MARKET` (optional, default `US`) — ISO **3166-1 alpha-2** country code (two letters, e.g. `FR`) for artist top tracks; invalid values are ignored. Artist URLs try several markets, then fall back to **track search** if top-tracks is blocked (HTTP 403) or empty—audio features may be neutral when Spotify withholds that endpoint for your app.

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

- `{ "mode": "music_to_book", "spotifyUrl" }` — Spotify **track**, **album**, **artist**, or **public user playlist** link (many Spotify-owned editorial playlists return 404 to the Web API; see [Spotify’s Nov 2024 Web API changes](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api))
- `{ "mode": "music_to_book", "musicKind": "song" | "album", "musicTitle", "musicArtist", "musicNotes?" }`
- `{ "mode": "music_to_book", "musicKind": "artist", "musicArtist", "musicTitle?", "musicNotes?" }` — tries Spotify artist search when credentials exist; otherwise Claude-only
- `{ "mode": "music_to_book", "musicKind": "playlist", "musicTitle", "musicArtist?", "musicNotes?" }` — playlist **name** in `musicTitle`; optional curator in `musicArtist`
- Response `result`: `{ "rationale", "books": [{ "title", "author", "whyItFits" }] }` (typically **at least six** books).

There is **no authentication** on this route; if you expose the app publicly, consider adding your own protection (e.g. Vercel deployment protection or a shared secret header).
