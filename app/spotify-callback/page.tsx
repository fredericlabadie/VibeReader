"use client";

// /spotify-callback — handles the Spotify OAuth PKCE redirect
// Reads the auth code, exchanges for a token, creates the playlist,
// then redirects back to the home page with the result.

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const P = {
  paper: "#efe7d6", ink: "#161410", red: "#d3411e", yellow: "#f5c842",
  fade: "#7d7464", paperDark: "#e6dcc7",
};
const F = {
  display: "'Fraunces', serif",
  mono: "'DM Mono', 'Courier New', monospace",
  serif: "'Newsreader', Georgia, serif",
};

type Status = "exchanging" | "creating" | "done" | "error";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("exchanging");
  const [message, setMessage] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [notFound, setNotFound] = useState<string[]>([]);
  const hasRun = useRef(false); // prevent double-fire in StrictMode

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const code = searchParams?.get("code");
    const returnedState = searchParams?.get("state");
    const error = searchParams?.get("error");

    if (error || !code) {
      setStatus("error");
      setMessage(error === "access_denied" ? "You declined the Spotify permission. No playlist was created." : "Spotify authorisation failed.");
      return;
    }

    // Retrieve stored PKCE verifier, state, and mix data — wrapped in try/catch for private browsing
    let verifier: string | null = null;
    let mixRaw: string | null = null;
    let storedState: string | null = null;
    try {
      verifier = sessionStorage.getItem("vr_pkce_verifier");
      mixRaw = sessionStorage.getItem("vr_pending_mix");
      storedState = sessionStorage.getItem("vr_pkce_state");
    } catch {
      setStatus("error");
      setMessage("Session storage is blocked — try disabling private browsing mode or allowing storage for this site.");
      return;
    }

    const redirectUri = `${window.location.origin}/spotify-callback`;

    // Verify state param to prevent CSRF
    if (storedState && returnedState !== storedState) {
      setStatus("error");
      setMessage("State mismatch — this authorisation link may have been tampered with. Please try again.");
      return;
    }

    if (!verifier || !mixRaw) {
      setStatus("error");
      setMessage("Session data lost — please try again from the result page.");
      return;
    }

    const mix = JSON.parse(mixRaw) as {
      songs: Array<{ title: string; artist: string }>;
      playlistName: string;
      bookTitle: string;
    };

    // 1. Exchange code for token
    fetch("/api/spotify/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, verifier, redirectUri }),
    })
      .then(r => r.json())
      .then(async ({ accessToken, error: tokenErr }) => {
        if (tokenErr || !accessToken) throw new Error(tokenErr ?? "Token exchange failed");

        // Clear PKCE verifier
        sessionStorage.removeItem("vr_pkce_verifier");
        sessionStorage.removeItem("vr_pkce_state");

        // 2. Create playlist
        setStatus("creating");
        const res = await fetch("/api/spotify/playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, ...mix }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Playlist creation failed");

        sessionStorage.removeItem("vr_pending_mix");
        setPlaylistUrl(data.playlistUrl);
        setNotFound(data.notFound ?? []);
        setStatus("done");
      })
      .catch(err => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [searchParams]);

  if (status === "done") {
    return (
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: P.red, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 16 }}>
          side a · playlist ready
        </div>
        <h1 style={{ fontFamily: F.display, fontSize: 56, fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.03em", color: P.ink, marginBottom: 24 }}>
          it&apos;s on<br /><em style={{ color: P.red, fontWeight: 400 }}>spotify.</em>
        </h1>
        <a href={playlistUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", padding: "14px 28px", background: "#1DB954", color: "#000", fontFamily: F.display, fontStyle: "italic", fontSize: 20, fontWeight: 700, border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.ink}`, textDecoration: "none", marginBottom: 16 }}>
          ↗ open playlist on spotify
        </a>
        {notFound.length > 0 && (
          <div style={{ marginTop: 20, padding: "12px 16px", background: P.paperDark, border: `1.5px dashed ${P.ink}55`, textAlign: "left" }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: P.fade, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
              {notFound.length} track{notFound.length > 1 ? "s" : ""} not found on spotify
            </div>
            {notFound.map((t, i) => (
              <div key={i} style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.fade, lineHeight: 1.6 }}>· {t}</div>
            ))}
            <div style={{ fontFamily: F.mono, fontSize: 9, color: P.fade, marginTop: 8 }}>search for these manually to complete your mix.</div>
          </div>
        )}
        <button onClick={() => router.push("/")}
          style={{ marginTop: 24, display: "block", width: "100%", padding: "11px 0", background: "transparent", color: P.fade, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", border: `1.5px solid ${P.ink}55`, cursor: "pointer" }}>
          ← back to vibereader
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <div style={{ fontFamily: F.display, fontStyle: "italic", fontWeight: 700, fontSize: 90, color: `${P.ink}14`, marginBottom: -20 }}>?!</div>
        <h2 style={{ fontFamily: F.display, fontSize: 48, fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.025em", color: P.ink, marginBottom: 16 }}>
          something<br /><em style={{ color: P.red, fontWeight: 400 }}>went wrong.</em>
        </h2>
        <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 16, color: P.fade, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <button onClick={() => router.push("/")}
          style={{ padding: "11px 22px", background: P.ink, color: P.paper, fontFamily: F.display, fontStyle: "italic", fontSize: 17, fontWeight: 700, border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.red}`, cursor: "pointer" }}>
          ← try again
        </button>
      </div>
    );
  }

  // Loading states
  const stages = { exchanging: "connecting to spotify…", creating: "building your playlist…" };
  return (
    <div style={{ textAlign: "center", maxWidth: 420 }}>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: P.red, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 20 }}>
        {status === "creating" ? "side a · in production" : "authorising…"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {/* Static cassette reels */}
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${P.ink}`, background: P.ink, display: "flex", alignItems: "center", justifyContent: "center", animation: "vrSpin 1.5s linear infinite" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: P.paper }} />
            </div>
          ))}
        </div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, color: P.ink }}>{stages[status as keyof typeof stages]}</div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.08em", marginTop: 8 }}>do not close this tab</div>
      </div>
      <style>{`@keyframes vrSpin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,400&family=Newsreader:ital,opsz,wght@1,6..72,400&family=DM+Mono:wght@400&display=swap');`}</style>
    </div>
  );
}

export default function SpotifyCallbackPage() {
  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(#16141011 1px, transparent 1px)`, backgroundSize: "3px 3px", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Suspense fallback={<div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: P.fade }}>loading…</div>}>
        <CallbackInner />
      </Suspense>
    </div>
  );
}
