# VibeReader — Book ↔ Song / Album

Small **Next.js** app: suggest **one song or one album** from a book (Claude), or **book ideas** from a **song or album**—either a **Spotify track/album URL** (optional audio features via Spotify Web API) or **artist + title** typed in (Claude only).

**Repo:** [github.com/fredericlabadie/VibeReader](https://github.com/fredericlabadie/VibeReader)

This project is **separate** from [Writers Room](https://github.com/fredericlabadie/writers-room). You can copy the same API keys into `.env.local` here:

- `ANTHROPIC_API_KEY` (required)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` (only if you use a **Spotify track or album link** for music → books)

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

Works on Vercel like any Next app: set the same env vars in the project settings.

## API

`POST /api/recommendations` with JSON:

- `{ "mode": "book_to_music", "bookTitle", "bookAuthor", "bookNotes?", "outputKind": "song" | "album" }`
- `{ "mode": "music_to_book", "spotifyUrl" }` — open.spotify.com (or spotify:) **track** or **album** link
- `{ "mode": "music_to_book", "musicKind": "song" | "album", "musicTitle", "musicArtist" }` — no Spotify call

There is **no authentication** on this route; if you expose the app publicly, consider adding your own protection (e.g. Vercel deployment protection or a shared secret header).
