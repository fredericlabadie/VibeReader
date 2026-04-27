# Book ↔ Playlist tool

Small **Next.js** app: suggest **track ideas from a book** (Claude only), or **books from a public Spotify playlist** (Spotify Web API audio features + Claude).

This repo is **separate** from [Writers Room](https://github.com/fredericlabadie/writers-room). You can copy the same API keys into `.env.local` here:

- `ANTHROPIC_API_KEY`
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` (needed for playlist → books)

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

- `{ "mode": "book_to_playlist", "bookTitle", "bookAuthor", "bookNotes?" }`
- `{ "mode": "playlist_to_book", "spotifyPlaylistUrl" }`

There is **no authentication** on this route; if you expose the app publicly, consider adding your own protection (e.g. Vercel deployment protection or a shared secret header).
