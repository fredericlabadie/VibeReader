// POST /api/spotify/token
// Exchanges a PKCE auth code for an access token.
// client_id only — no secret needed for PKCE.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { code, verifier, redirectUri } = await req.json();
  if (!code || !verifier || !redirectUri) {
    return NextResponse.json({ error: "code, verifier, redirectUri required" }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "SPOTIFY_CLIENT_ID not configured" }, { status: 500 });
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error_description ?? "Token exchange failed" }, { status: 400 });
  return NextResponse.json({ accessToken: data.access_token });
}
