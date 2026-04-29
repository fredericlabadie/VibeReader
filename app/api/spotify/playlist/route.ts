// POST /api/spotify/playlist
// Given an access token + song list, searches Spotify for each track,
// creates a public playlist, adds the tracks, returns the playlist URL.

import { NextResponse } from "next/server";

type Song = { title: string; artist: string };

async function spotifyGet(url: string, token: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Spotify ${r.status}: ${await r.text()}`);
  return r.json();
}

async function spotifyPost(url: string, token: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Spotify ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function POST(req: Request) {
  const { accessToken, songs, playlistName, bookTitle } = await req.json() as {
    accessToken: string;
    songs: Song[];
    playlistName: string;
    bookTitle: string;
  };

  if (!accessToken || !songs?.length) {
    return NextResponse.json({ error: "accessToken and songs required" }, { status: 400 });
  }

  try {
    // 1. Get current user's ID
    const me = await spotifyGet("https://api.spotify.com/v1/me", accessToken);

    // 2. Search for each track (parallel, cap at 16)
    const results: Array<{ idx: number; uri: string | null }> = [];
    const notFound: string[] = [];

    await Promise.all(songs.slice(0, 16).map(async (s, idx) => {
      try {
        const q = encodeURIComponent(`track:${s.title} artist:${s.artist}`);
        const res = await spotifyGet(
          `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
          accessToken
        );
        const uri = res?.tracks?.items?.[0]?.uri ?? null;
        results.push({ idx, uri });
        if (!uri) notFound.push(`${s.artist} — ${s.title}`);
      } catch {
        results.push({ idx, uri: null });
        notFound.push(`${s.artist} — ${s.title}`);
      }
    }));

    // Sort by original index to preserve tracklist order
    const trackUris = results
      .sort((a, b) => a.idx - b.idx)
      .map(r => r.uri)
      .filter((u): u is string => u !== null);

    if (!trackUris.length) {
      return NextResponse.json({ error: "None of the tracks could be found on Spotify." }, { status: 404 });
    }

    // 3. Create the playlist
    const playlist = await spotifyPost(
      `https://api.spotify.com/v1/users/${me.id}/playlists`,
      accessToken,
      {
        name: playlistName,
        description: `A VibeReader mix for "${bookTitle}" · vibereader.fredericlabadie.com`,
        public: true,
      }
    );

    // 4. Add tracks
    await spotifyPost(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      accessToken,
      { uris: trackUris }
    );

    return NextResponse.json({
      playlistUrl: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
      playlistId: playlist.id,
      tracksAdded: trackUris.length,
      notFound,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
