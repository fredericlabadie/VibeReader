"use client";

import { useState, useEffect } from "react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ── Design tokens ─────────────────────────────────────────────────────────
const P = {
  paper: "#efe7d6", paperDark: "#e6dcc7", ink: "#161410", ink2: "#2a2622",
  red: "#d3411e", blue: "#1f3aa6", yellow: "#f5c842", green: "#7aa86b", fade: "#7d7464",
};
const F = {
  display: "'Fraunces', serif",
  serif:   "'Newsreader', Georgia, serif",
  mono:    "'DM Mono', 'Courier New', monospace",
  ui:      "'Inter', system-ui, sans-serif",
};

// ── Helpers ───────────────────────────────────────────────────────────────
function spotifySearchUrl(q: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
}
function goodreadsUrl(title: string, author: string) {
  return `https://www.goodreads.com/search?q=${encodeURIComponent(`${title} ${author}`)}`;
}
function worldcatUrl(title: string, author: string) {
  return `https://worldcat.org/search?q=${encodeURIComponent(`${title} ${author}`)}`;
}
function bookshopUrl(title: string) {
  return `https://bookshop.org/search?keywords=${encodeURIComponent(title)}`;
}


// ── Spotify PKCE helpers ──────────────────────────────────────────────────
function generateVerifier(): string {
  const arr = new Uint8Array(64);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...Array.from(arr))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
async function startSpotifyAuth(songs: Array<{title:string;artist:string}>, playlistName: string, bookTitle: string) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) { alert("Spotify export is not configured on this deployment."); return; }
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = Math.random().toString(36).slice(2);
  try {
    sessionStorage.setItem("vr_pkce_verifier", verifier);
    sessionStorage.setItem("vr_pkce_state", state);
    sessionStorage.setItem("vr_pending_mix", JSON.stringify({ songs, playlistName, bookTitle }));
  } catch {
    alert("Session storage is blocked. Try disabling private browsing mode to export playlists.");
    return;
  }
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: `${window.location.origin}/spotify-callback`,
    scope: "playlist-modify-public playlist-modify-private",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

// ── Types ─────────────────────────────────────────────────────────────────
type Mode = "book_to_songs" | "song_to_books";
type MusicInputMode = "spotify" | "text";
type BookAuthorCandidate = { title: string; author: string; note?: string };
type BookToSongsResult = {
  songListName: string; rationale: string; moodTags: string[];
  songs: Array<{ title: string; artist: string; whyItFits: string }>;
};
type SongToBooksResult = {
  rationale: string;
  books: Array<{ title: string; author: string; whyItFits: string }>;
};

// ── Primitive components ──────────────────────────────────────────────────

function ZineLogo({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 0, fontFamily: F.display, fontSize: size, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", color: P.ink }}>
      <span>vibe</span>
      <span style={{ fontStyle: "italic", fontWeight: 400, color: P.red }}>reader</span>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: P.red, marginLeft: 4, transform: `translateY(-${size * 0.42}px)`, display: "inline-block" }} />
    </div>
  );
}

function Stamp({ children, color, rotate = -4, size = 11 }: { children: React.ReactNode; color: string; rotate?: number; size?: number }) {
  return (
    <span style={{ display: "inline-block", transform: `rotate(${rotate}deg)`, padding: "4px 10px", border: `2px solid ${color}`, color, fontFamily: F.mono, fontSize: size, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "transparent", userSelect: "none" }}>
      {children}
    </span>
  );
}

function Tape({ children, rotate = -2, bg = P.yellow }: { children: React.ReactNode; rotate?: number; bg?: string }) {
  return (
    <span className="vr-tape-hover" style={{ display: "inline-block", transform: `rotate(${rotate}deg)`, padding: "3px 10px", background: bg, color: P.ink, fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: "0 1px 0 rgba(0,0,0,0.15)", userSelect: "none" }}>
      {children}
    </span>
  );
}

function CassetteSpine({ side, label }: { side: string; label: string }) {
  return (
    <div style={{ width: "100%", background: P.ink, color: P.paper, padding: "8px 14px", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 10, textTransform: "uppercase" }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${P.paper}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontStyle: "italic", fontSize: 13, fontWeight: 700, color: P.yellow, flexShrink: 0 }}>{side}</span>
      <span style={{ flex: 1, borderTop: `1px dashed ${P.paper}55`, height: 1 }} />
      <span style={{ flex: 3, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: P.paper }}>{label}</span>
      <span style={{ flex: 1, borderTop: `1px dashed ${P.paper}55`, height: 1 }} />
      <span style={{ color: P.yellow, flexShrink: 0 }}>vr-tape · cr02</span>
    </div>
  );
}

function Reel({ running, scale = 1 }: { running: boolean; scale?: number }) {
  const s = scale;
  const cls = running ? "vr-reel-spin" : "";
  return (
    <div className={cls} style={{ width: 36 * s, height: 36 * s, borderRadius: 99, border: `2px solid ${P.paper}`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: P.ink }}>
      <div style={{ width: 8 * s, height: 8 * s, borderRadius: 99, background: P.paper }} />
      {[0, 60, 120, 180, 240, 300].map(deg => (
        <div key={deg} style={{ position: "absolute", width: 1.5, height: 9 * s, background: P.paper, transform: `rotate(${deg}deg) translateY(-${10 * s}px)`, transformOrigin: `center ${10 * s}px`, opacity: 0.7 }} />
      ))}
    </div>
  );
}

function CassetteReels({ running, scale = 1 }: { running: boolean; scale?: number }) {
  return (
    <div style={{ display: "flex", gap: 14 * scale, alignItems: "center" }}>
      <Reel running={running} scale={scale} />
      <Reel running={running} scale={scale} />
    </div>
  );
}

// Generative typographic cover — square
function MiniCover({ title, idx, w = 100 }: { title: string; idx: number; w?: number }) {
  const palettes = [
    { bg: P.red, fg: P.paper },
    { bg: P.blue, fg: P.paper },
    { bg: P.ink, fg: P.yellow },
    { bg: P.yellow, fg: P.ink },
    { bg: P.paper, fg: P.ink, stroke: P.ink },
    { bg: P.green, fg: P.ink },
  ];
  const c = palettes[idx % palettes.length];
  const trunc = title.length > 16 ? title.slice(0, 14) + "…" : title;
  return (
    <div style={{ width: w, height: w, background: c.bg, color: c.fg, fontFamily: F.display, padding: 8, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "stroke" in c ? `inset 0 0 0 1.5px ${(c as any).stroke}` : "none", flexShrink: 0 }}>
      <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.75 }}>{String(idx + 1).padStart(2, "0")} · vr</div>
      <div style={{ fontStyle: "italic", fontWeight: 600, fontSize: 13, lineHeight: 1.0, letterSpacing: "-0.02em", wordBreak: "break-word" }}>{trunc}</div>
    </div>
  );
}

// Generative cover for tracklist rows
function TrackCover({ title, idx, w = 72 }: { title: string; idx: number; w?: number }) {
  const palettes = [
    { bg: P.red, fg: P.paper },
    { bg: P.blue, fg: P.paper },
    { bg: P.ink, fg: P.yellow },
    { bg: P.yellow, fg: P.ink },
    { bg: P.paper, fg: P.ink, stroke: P.ink },
    { bg: P.green, fg: P.ink },
  ];
  const c = palettes[idx % palettes.length];
  const trunc = title.length > 22 ? title.slice(0, 20) + "…" : title;
  return (
    <div style={{ width: w, height: w, background: c.bg, color: c.fg, fontFamily: F.display, padding: 7, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "stroke" in c ? `inset 0 0 0 1.5px ${(c as any).stroke}` : "none", flexShrink: 0 }}>
      <div style={{ fontFamily: F.mono, fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.75 }}>{String(idx + 1).padStart(2, "0")}</div>
      <div style={{ fontStyle: "italic", fontWeight: 600, fontSize: 11, lineHeight: 1.0, letterSpacing: "-0.02em", wordBreak: "break-word" }}>{trunc}</div>
    </div>
  );
}

// Generative book cover — rectangular
function BookCover({ title, idx, w = 156, h = 220 }: { title: string; idx: number; w?: number; h?: number }) {
  const palettes = [
    { bg: P.blue, fg: P.paper },
    { bg: P.red, fg: P.yellow },
    { bg: P.green, fg: P.ink },
    { bg: P.ink, fg: P.paper },
    { bg: P.yellow, fg: P.ink },
    { bg: P.paper, fg: P.ink, stroke: P.ink },
  ];
  const c = palettes[idx % palettes.length];
  return (
    <div style={{ width: w, height: h, background: c.bg, color: c.fg, padding: 12, fontFamily: F.display, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: `5px 5px 0 ${P.ink}`, flexShrink: 0, border: "stroke" in c ? `1.5px solid ${(c as any).stroke}` : "none" }}>
      <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.75 }}>· vibereader pick</div>
      <div style={{ fontStyle: "italic", fontWeight: 700, fontSize: w > 130 ? 22 : 16, lineHeight: 1.0, letterSpacing: "-0.02em" }}>{title}</div>
    </div>
  );
}

// Masthead for results / loading / disambig
function ZineMasthead({ crumb, onBack }: { crumb: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: `1.5px solid ${P.ink}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <ZineLogo size={22} />
        <span style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.16em", textTransform: "uppercase" }}>· issue 037 · {crumb}</span>
      </div>
      <div style={{ display: "flex", gap: 18, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", color: P.ink, textTransform: "uppercase", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: P.ink }}>← back</button>
        <button onClick={onBack} style={{ padding: "5px 12px", background: P.ink, color: P.paper, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", border: "none", cursor: "pointer" }}>start over ↓</button>
      </div>
    </div>
  );
}

// Form field — underline-only zine style
function ZineField({ label, value, onChange, placeholder, large, mono, textarea, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  large?: boolean; mono?: boolean; textarea?: boolean; disabled?: boolean;
}) {
  const baseInput: React.CSSProperties = {
    width: "100%", border: "none", borderBottom: `1.5px solid ${P.ink}`, paddingBottom: 4,
    background: "transparent", outline: "none", color: P.ink,
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.16em", color: P.fade, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} disabled={disabled}
          style={{ ...baseInput, fontFamily: F.serif, fontStyle: "italic", fontSize: 17, lineHeight: 1.5, resize: "none" }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ ...baseInput, fontFamily: mono ? F.mono : F.display, fontStyle: !mono ? "italic" : "normal", fontWeight: !mono ? 500 : 400, fontSize: large ? 26 : mono ? 14 : 20 }} />
      )}
    </div>
  );
}

// ── Recently-mixed sample data (static) ──────────────────────────────────
const RECENT_MIXES = [
  ["Damp Walls, Bright Teeth", "Mexican Gothic"],
  ["The Quiet on the Marsh", "Piranesi"],
  ["Sun Through Cellophane", "Sing, Unburied, Sing"],
  ["Iron Birds", "The Goldfinch"],
  ["Velvet Drowned", "Beloved"],
  ["Cigarette in the Rain", "Trust Exercise"],
];

// ── Error: bad Spotify link ──────────────────────────────────────────────
function ErrorScreenSpotify({ url, onBack }: { url: string; onBack: () => void }) {
  const linkType = url.includes("/album/") ? "album" : url.includes("/artist/") ? "artist" : url.includes("/playlist/") ? "playlist" : "non-track link";
  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, padding: "36px 48px", position: "relative", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <ZineLogo size={20} />
        <span style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.14em", textTransform: "uppercase" }}>· error · track only</span>
      </div>
      <div style={{ position: "absolute", top: 32, right: 48 }}><Stamp color={P.red} rotate={7}>track only!</Stamp></div>

      <h2 style={{ fontFamily: F.display, fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 700, lineHeight: 0.92, letterSpacing: "-0.025em", color: P.ink, maxWidth: 560 }}>
        that link goes to<br />an <em style={{ fontWeight: 400, color: P.red }}>{linkType}</em>.
      </h2>
      <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 17, lineHeight: 1.55, color: P.ink2, marginTop: 16, maxWidth: 460 }}>
        VibeReader needs a <em>single track</em> to read the vibe — one song at a time. Albums and playlists won&apos;t work yet.
      </p>

      <div style={{ marginTop: 22, padding: 16, background: P.paperDark, border: `1.5px solid ${P.ink}`, maxWidth: 520 }}>
        <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.14em", color: P.fade, textTransform: "uppercase", marginBottom: 6 }}>you sent</div>
        <div style={{ fontFamily: F.mono, fontSize: 12, color: P.ink, wordBreak: "break-all", borderBottom: `1.5px dashed ${P.ink}55`, paddingBottom: 8 }}>
          {url.replace(/https?:\/\/(open\.)?spotify\.com\//, "open.spotify.com/").slice(0, 60)}
          {url.length > 60 ? "…" : ""}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.14em", color: P.fade, textTransform: "uppercase", marginTop: 12, marginBottom: 6 }}>try this instead</div>
        <div style={{ fontFamily: F.mono, fontSize: 12, color: P.ink2 }}>
          open.spotify.com/<span style={{ background: P.green + "44", color: P.ink, padding: "0 4px" }}>track</span>/…
        </div>
      </div>

      <button className="vr-cta" onClick={onBack}
        style={{ marginTop: 22, padding: "11px 22px", background: P.ink, color: P.paper, fontFamily: F.display, fontSize: 16, fontWeight: 700, fontStyle: "italic", border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.red}`, cursor: "pointer" }}>
        paste a track link →
      </button>
      <p style={{ marginTop: 12, fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.fade }}>
        tip: share → copy link from the song page on Spotify, not the album.
      </p>
    </div>
  );
}

// ── Error: tape jam (generic API failure) ─────────────────────────────────
function ErrorScreenTapeJam({ errorMsg, onBack, onRetry }: { errorMsg: string; onBack: () => void; onRetry: () => void }) {
  const reqId = Math.random().toString(36).slice(2, 8).toUpperCase();
  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, padding: "36px 48px", position: "relative", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <ZineLogo size={20} />
        <span style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.14em", textTransform: "uppercase" }}>· tape jam</span>
      </div>
      {/* Watermark */}
      <div style={{ position: "absolute", top: 28, right: 36, fontFamily: F.display, fontStyle: "italic", fontWeight: 700, fontSize: 90, color: `${P.ink}14`, userSelect: "none", lineHeight: 1 }}>?!</div>

      <h2 style={{ fontFamily: F.display, fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 700, lineHeight: 0.92, letterSpacing: "-0.025em", color: P.ink, maxWidth: 520 }}>
        the reels<br /><em style={{ fontWeight: 400, color: P.red }}>got tangled.</em>
      </h2>
      <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 17, lineHeight: 1.55, color: P.ink2, marginTop: 16, maxWidth: 480 }}>
        claude didn&apos;t come back this time. could be the title&apos;s too obscure, the API&apos;s having a moment, or your connection is gauzy.
      </p>

      <div style={{ marginTop: 20, padding: 14, background: P.paperDark, border: `1.5px solid ${P.ink}`, fontFamily: F.mono, fontSize: 11, color: P.ink2, letterSpacing: "0.04em", maxWidth: 520 }}>
        <div style={{ marginBottom: 4, color: P.fade, textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 10 }}>request id · {reqId}</div>
        <code style={{ fontFamily: F.mono, fontSize: 11, wordBreak: "break-all" }}>{errorMsg || "POST /api/recommendations → error"}</code>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <button className="vr-cta" onClick={onRetry}
          style={{ padding: "11px 22px", background: P.red, color: P.paper, fontFamily: F.display, fontSize: 16, fontWeight: 700, fontStyle: "italic", border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.ink}`, cursor: "pointer" }}>
          ↻ try again
        </button>
        <button onClick={onBack}
          style={{ padding: "11px 22px", background: "transparent", color: P.ink, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", border: `2px solid ${P.ink}`, cursor: "pointer" }}>
          describe in text →
        </button>
      </div>

      <p style={{ position: "absolute", bottom: 36, left: 48, right: 48, fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.fade, lineHeight: 1.5 }}>
        <em>tip:</em> for very obscure books, try adding the author. claude is great with the canon, weaker with self-published.
      </p>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────
const LOADING_STAGES = [
  "reading the book",
  "pulling at threads",
  "auditioning songs",
  "sequencing side a",
  "naming the mix",
];
function LoadingScreen({ book, onBack }: { book: string; onBack: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % LOADING_STAGES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, color: P.ink, fontFamily: F.ui, position: "relative", overflow: "hidden" }}>
      <ZineMasthead crumb="now mixing" onBack={onBack} />

      {/* Scrolling tape strip */}
      <div style={{ height: 24, background: P.yellow, borderBottom: `2px solid ${P.ink}`, borderTop: `2px solid ${P.ink}`, overflow: "hidden" }}>
        <div className="vr-tape-marquee" style={{ display: "flex", gap: 24, whiteSpace: "nowrap", fontFamily: F.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: P.ink, paddingTop: 5 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i}>★ now mixing · do not eject · side a in progress · please hold · made with claude ·&nbsp;</span>
          ))}
        </div>
      </div>

      <div className="vr-loading-grid" style={{ padding: "80px 80px 0", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 80, alignItems: "center" }}>
        {/* Left */}
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase", marginBottom: 16 }}>side a · in production</div>
          <h1 style={{ fontFamily: F.display, fontSize: 96, fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.035em", color: P.ink }}>
            claude is<br />
            <span style={{ fontStyle: "italic", fontWeight: 400, color: P.red }}>mixing</span> a mix<br />
            for you.
          </h1>
          <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10 }}>
            {LOADING_STAGES.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i <= step ? 1 : 0.32, transition: "opacity .3s" }}>
                <span style={{ width: 16, textAlign: "right", fontFamily: F.mono, fontSize: 11, color: P.fade, letterSpacing: "0.12em" }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ width: 14, height: 14, border: `1.5px solid ${P.ink}`, background: i < step ? P.ink : i === step ? P.red : "transparent", display: "inline-block", position: "relative", flexShrink: 0 }}>
                  {i < step && <span style={{ position: "absolute", inset: 0, color: P.paper, fontSize: 10, lineHeight: "13px", textAlign: "center", fontFamily: F.mono, fontWeight: 700 }}>✓</span>}
                </span>
                <span style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, color: P.ink, fontWeight: i === step ? 500 : 400 }}>{s}{i === step && "…"}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, fontFamily: F.serif, fontStyle: "italic", fontSize: 15, color: P.fade, lineHeight: 1.5 }}>
            usually about <span style={{ fontFamily: F.mono, fontSize: 13, color: P.ink, fontStyle: "normal" }}>15 sec</span> · don&apos;t refresh, the tape will eat itself
          </div>
        </div>

        {/* Right: cassette deck */}
        <div className="vr-loading-deck" style={{ display: "flex", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "absolute", top: -16, right: 20 }}><Stamp color={P.blue} rotate={8}>do not eject</Stamp></div>
          <div style={{ width: 340, padding: 28, background: P.ink, color: P.paper, boxShadow: `8px 8px 0 ${P.red}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: P.yellow }}>
              <span>vr-tape · cr02</span><span>side a · 90min</span>
            </div>
            <div style={{ marginTop: 18, padding: 18, background: P.paper, border: `2px solid ${P.ink}` }}>
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
                <CassetteReels running={true} scale={1.3} />
              </div>
              <div style={{ height: 18, background: P.paperDark, border: `1.5px solid ${P.ink}`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${((step + 1) / LOADING_STAGES.length) * 100}%`, background: P.red, transition: "width .8s ease-out" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: P.paper, mixBlendMode: "difference", filter: "invert(1)" }}>{LOADING_STAGES[step]}…</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: F.mono, fontSize: 9, color: P.ink }}>
                <span>00:0{step}</span><span>{(((step + 1) / LOADING_STAGES.length) * 100).toFixed(0)}%</span><span>est ~15s</span>
              </div>
            </div>
            <div style={{ marginTop: 16, fontFamily: F.display, fontStyle: "italic", fontWeight: 600, fontSize: 20, color: P.paper, letterSpacing: "-0.01em" }}>
              for <em style={{ color: P.yellow }}>{book || "your book"}</em>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 40, left: 80, right: 80, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 15, color: P.fade, maxWidth: 420, lineHeight: 1.5 }}>
          while you wait — every mix gets a name and a side-a theme. some get noir. some get pastoral.
        </div>
        <Tape rotate={3}>★ patience · the good stuff is coming ★</Tape>
      </div>
    </div>
  );
}

// ── Disambiguation screen ─────────────────────────────────────────────────
function DisambigScreen({ query, candidates, busy, onPick, onBack }: {
  query: string;
  candidates: BookAuthorCandidate[];
  busy: boolean;
  onPick: (c: BookAuthorCandidate) => void;
  onBack: () => void;
}) {
  const [pick, setPick] = useState(0);
  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, color: P.ink, fontFamily: F.ui, position: "relative" }}>
      <ZineMasthead crumb="wait — which one?" onBack={onBack} />

      <div className="vr-disambig-grid" style={{ padding: "40px 56px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 80 }}>
        {/* Left */}
        <div className="vr-disambig-left">
          <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase", marginBottom: 14 }}>more than one match</div>
          <h1 style={{ fontFamily: F.display, fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.035em", color: P.ink }}>
            <span style={{ fontSize: 80 }}>&ldquo;<em style={{ fontWeight: 400, color: P.red, fontStyle: "italic" }}>{query}</em>&rdquo;</span>
            <br />
            <span style={{ fontSize: 56 }}>is, helpfully,</span>
            <br />
            <span style={{ fontSize: 80, position: "relative", display: "inline-block" }}>
              {candidates.length} books.
              <span style={{ position: "absolute", left: -4, right: -4, bottom: 12, height: 14, background: P.yellow, zIndex: -1 }} />
            </span>
          </h1>
          <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, lineHeight: 1.5, color: P.ink2, marginTop: 22, maxWidth: 540 }}>
            point at the one you mean and we&apos;ll mix it. if none of these are it, retype with the author next to the title.
          </p>
          <div style={{ marginTop: 24, padding: 16, background: P.paperDark, border: `1.5px dashed ${P.ink}55`, fontFamily: F.mono, fontSize: 11, color: P.ink2, letterSpacing: "0.04em" }}>
            <span style={{ color: P.fade, textTransform: "uppercase", letterSpacing: "0.16em", fontSize: 10 }}>shortcut · </span>
            try <em style={{ background: P.yellow, padding: "0 6px", fontStyle: "normal", color: P.ink }}>{query} by {candidates[0]?.author}</em> next time
          </div>
        </div>

        {/* Right: candidate cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {candidates.map((c, i) => (
            <button key={i} className="vr-candidate-card" onClick={() => setPick(i)}
              style={{ textAlign: "left", padding: "18px 22px", background: pick === i ? P.ink : P.paperDark, color: pick === i ? P.paper : P.ink, border: `2px solid ${P.ink}`, boxShadow: pick === i ? `5px 5px 0 ${P.red}` : `3px 3px 0 ${P.ink}33`, transform: pick === i ? "translate(-2px,-2px)" : `rotate(${i % 2 === 0 ? -0.6 : 0.5}deg)`, cursor: "pointer", display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 18, alignItems: "center", fontFamily: "inherit" }}>
              <div style={{ fontFamily: F.display, fontStyle: "italic", fontWeight: 700, fontSize: 52, color: pick === i ? P.yellow : P.red, lineHeight: 0.9 }}>{String.fromCharCode(65 + i)}</div>
              <div>
                <div style={{ fontFamily: F.display, fontSize: 24, fontStyle: "italic", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.015em" }}>{c.title}</div>
                <div style={{ fontFamily: F.mono, fontSize: 11, marginTop: 4, letterSpacing: "0.08em", color: pick === i ? `${P.paper}cc` : P.fade }}>by <span style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}>{c.author}</span></div>
                {c.note && <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, marginTop: 6, color: pick === i ? `${P.paper}dd` : P.ink2, lineHeight: 1.4 }}>{c.note}</div>}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: pick === i ? P.yellow : P.fade, paddingLeft: 8 }}>
                {pick === i ? "✓ this one" : "pick →"}
              </div>
            </button>
          ))}
          <button className="vr-cta" disabled={busy} onClick={() => onPick(candidates[pick])}
            style={{ marginTop: 6, padding: "14px 20px", background: P.red, color: P.paper, fontFamily: F.display, fontSize: 19, fontWeight: 700, fontStyle: "italic", border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.ink}`, cursor: busy ? "wait" : "pointer", letterSpacing: "-0.01em" }}>
            {busy ? "mixing…" : `mix "${candidates[pick]?.title}" →`}
          </button>
          <div style={{ marginTop: 4, fontFamily: F.mono, fontSize: 10, color: P.fade, textAlign: "center", letterSpacing: "0.08em" }}>
            or — <span style={{ borderBottom: `1px solid ${P.fade}`, cursor: "pointer" }} onClick={onBack}>retype with the author</span>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", top: 130, right: 56 }}><Stamp color={P.blue} rotate={-8}>be specific!</Stamp></div>
    </div>
  );
}

// ── Book → Songs result screen ────────────────────────────────────────────
function SongResultScreen({ result, bookTitle, bookAuthor, onBack, onReroll }: {
  result: BookToSongsResult;
  bookTitle: string;
  bookAuthor?: string;
  onBack: () => void;
  onReroll: (notes: string) => void;
}) {
  const [rerollNotes, setRerollNotes] = useState("");
  const [showReroll, setShowReroll] = useState(false);
  const [copied, setCopied] = useState(false);

  const nameParts = result.songListName.includes(",")
    ? [result.songListName.split(",")[0] + ",", result.songListName.split(",").slice(1).join(",").trim()]
    : [result.songListName, ""];

  function copyAsText() {
    const lines = [
      result.songListName,
      `for: ${bookTitle}${bookAuthor ? ` · ${bookAuthor}` : ""}`,
      "",
      result.rationale,
      "",
      "tracklist:",
      ...result.songs.map((s, i) => `${String(i + 1).padStart(2, "0")}. ${s.artist} — ${s.title}\n    ${s.whyItFits}`),
      "",
      "vibereader.fredericlabadie.com · made with claude · always double-check titles",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, color: P.ink, fontFamily: F.ui }}>
      <ZineMasthead crumb="side a · just mixed" onBack={onBack} />

      {/* Hero */}
      <div className="vr-result-hero" style={{ padding: "32px 56px 0", display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 56, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase", marginBottom: 8 }}>
            side a · book → songs · {result.songs.length} tracks
          </div>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 16, color: P.fade, marginBottom: 14 }}>
            for <em style={{ color: P.ink, fontStyle: "normal", fontWeight: 600 }}>{bookTitle}</em>{bookAuthor && <> · {bookAuthor}</>}
          </div>
          <h1 style={{ fontFamily: F.display, fontSize: "clamp(56px, 8vw, 110px)", fontWeight: 700, lineHeight: 0.86, letterSpacing: "-0.04em", color: P.ink }}>
            {nameParts[0]}<br />
            {nameParts[1] && <span style={{ fontStyle: "italic", fontWeight: 400, color: P.red }}>{nameParts[1]}</span>}
          </h1>
          <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 20, lineHeight: 1.5, color: P.ink, marginTop: 22, maxWidth: 620, fontWeight: 400 }}>
            {result.rationale}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
            {result.moodTags.map((t, i) => (
              <span key={t} style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "5px 12px", border: `1.5px solid ${P.ink}`, background: i === 0 ? P.yellow : "transparent" }}>· {t}</span>
            ))}
          </div>
          {/* Actions */}
          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <a href={spotifySearchUrl(result.songListName)} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "13px 20px", background: P.ink, color: P.paper, fontFamily: F.display, fontStyle: "italic", fontSize: 17, fontWeight: 700, border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.red}`, textDecoration: "none" }}>
              ↗ open in spotify
            </a>
            <button onClick={() => setShowReroll(v => !v)} className="vr-cta-outline"
              style={{ padding: "13px 20px", background: "transparent", color: P.ink, fontFamily: F.display, fontStyle: "italic", fontSize: 17, fontWeight: 600, border: `2px solid ${P.ink}`, cursor: "pointer" }}>
              ↻ reroll with notes
            </button>
            <button onClick={copyAsText}
              style={{ padding: "13px 18px", background: "transparent", color: P.ink, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", border: `2px solid ${P.ink}`, cursor: "pointer" }}>
              {copied ? "copied! ✓" : "copy as text ⎘"}
            </button>
            <button onClick={() => {
              const tracks = result.songs.map(s => `${s.artist} · ${s.title}`).join("|");
              const url = `/api/og?mixName=${encodeURIComponent(result.songListName)}&forBook=${encodeURIComponent(bookTitle)}&author=${encodeURIComponent(bookAuthor ?? "")}&tracks=${encodeURIComponent(tracks)}&square=1`;
              const a = document.createElement("a"); a.href = url; a.download = `${result.songListName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; a.click();
            }}
              style={{ padding: "13px 18px", background: "transparent", color: P.ink, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", border: `2px solid ${P.ink}`, cursor: "pointer" }}>
              save card ↓
            </button>
            <button onClick={() => startSpotifyAuth(result.songs, result.songListName, bookTitle)}
              style={{ padding: "13px 20px", background: "#1DB954", color: "#000", fontFamily: F.display, fontStyle: "italic", fontSize: 17, fontWeight: 700, border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.ink}`, cursor: "pointer" }}>
              + save to spotify
            </button>
          </div>
          <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 9, color: P.fade, letterSpacing: "0.06em" }}>opens search · queue is on you</div>
        </div>

        {/* Cassette card */}
        <div className="vr-cassette-card-col" style={{ position: "relative", paddingTop: 8 }}>
          <div style={{ position: "absolute", top: -8, right: 8 }}><Stamp color={P.red} rotate={8}>just mixed</Stamp></div>
          <div style={{ background: P.paperDark, border: `2px solid ${P.ink}`, padding: 22, transform: "rotate(-1.5deg)", boxShadow: `8px 8px 0 ${P.ink}` }}>
            <CassetteSpine side="A" label={result.songListName} />
            <div style={{ marginTop: 14, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: P.fade }}>
              {result.moodTags[0] || "mix"}
            </div>
            <div style={{ fontFamily: F.display, fontSize: 28, fontStyle: "italic", fontWeight: 600, color: P.ink, marginTop: 4, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              {result.songListName.split(",")[0]}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
              <a href={spotifySearchUrl(result.songListName)} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, padding: "8px 0", textAlign: "center", background: P.ink, color: P.paper, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>spotify</a>
              <span style={{ flex: 1, padding: "8px 0", textAlign: "center", border: `1.5px solid ${P.ink}`, color: P.ink, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "default" }}>apple</span>
              <span style={{ flex: 1, padding: "8px 0", textAlign: "center", border: `1.5px solid ${P.ink}`, color: P.ink, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "default" }}>youtube</span>
            </div>
            <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 9, color: P.fade, letterSpacing: "0.06em", textAlign: "center", fontStyle: "italic" }}>opens search · queue is on you</div>
          </div>
          <div style={{ position: "absolute", bottom: -18, left: -8 }}><Tape rotate={-6}>do not erase</Tape></div>
        </div>
      </div>

      {/* Reroll panel */}
      {showReroll && (
        <div style={{ margin: "24px 56px 0", padding: "22px 28px", background: P.paperDark, border: `2px solid ${P.ink}` }}>
          <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.16em", color: P.fade, textTransform: "uppercase", marginBottom: 8 }}>add a vibe note</div>
          <textarea value={rerollNotes} onChange={e => setRerollNotes(e.target.value)} rows={2} placeholder='e.g. "more strings, less voice" or "latin only"'
            style={{ width: "100%", border: "none", borderBottom: `1.5px solid ${P.ink}`, background: "transparent", fontFamily: F.serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.5, color: P.ink, resize: "none", outline: "none", paddingBottom: 4 }} />
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button className="vr-cta" onClick={() => { onReroll(rerollNotes); setShowReroll(false); }}
              style={{ padding: "11px 20px", background: P.red, color: P.paper, fontFamily: F.display, fontStyle: "italic", fontSize: 16, fontWeight: 700, border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.ink}`, cursor: "pointer" }}>reroll</button>
            <button onClick={() => setShowReroll(false)}
              style={{ padding: "11px 16px", background: "transparent", color: P.ink, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: `2px solid ${P.ink}`, cursor: "pointer" }}>cancel</button>
          </div>
        </div>
      )}

      {/* Tracklist */}
      <div className="vr-tracklist" style={{ padding: "30px 56px 16px", borderTop: `2px solid ${P.ink}`, marginTop: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>tracklist</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.05em" }}>tap any to search · double-check titles before you queue</div>
        </div>
        <div className="vr-tracklist-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, columnGap: 40 }}>
          {result.songs.map((s, i) => (
            <a key={i} className="vr-track-row" href={spotifySearchUrl(`${s.artist} ${s.title}`)} target="_blank" rel="noopener noreferrer"
              style={{ display: "grid", gridTemplateColumns: "40px 72px 1fr", gap: 14, padding: "12px 6px", borderBottom: `1px dotted ${P.ink}55`, alignItems: "flex-start", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontFamily: F.display, fontSize: 28, fontStyle: "italic", fontWeight: 700, color: i < 3 ? P.red : P.ink, lineHeight: 0.95, letterSpacing: "-0.02em" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <TrackCover title={s.title} idx={i} w={72} />
              <div>
                <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, color: P.ink, lineHeight: 1.15, letterSpacing: "-0.005em" }}>{s.title}</div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>· {s.artist}</div>
                <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.ink2, marginTop: 6, lineHeight: 1.5 }}>{s.whyItFits}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Bottom reroll strip */}
      <div className="vr-reroll" style={{ margin: "8px 56px 0", padding: "22px 28px", background: P.ink, color: P.paper, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.45, maxWidth: 620 }}>
          want a different angle? add a vibe note like <em style={{ color: P.yellow }}>&ldquo;more strings, less voice&rdquo;</em> or <em style={{ color: P.yellow }}>&ldquo;latin only&rdquo;</em> and reroll.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowReroll(true)}
            style={{ padding: "11px 20px", background: P.red, color: P.paper, fontFamily: F.display, fontStyle: "italic", fontSize: 16, fontWeight: 700, border: `2px solid ${P.paper}`, cursor: "pointer" }}>reroll with notes</button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "24px 56px 40px", display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.08em", textTransform: "uppercase", flexWrap: "wrap", gap: 8 }}>
        <span>vibereader · issue 037 · {new Date().getFullYear()}</span>
        <span>made with claude · always double-check titles</span>
      </div>
    </div>
  );
}

// ── Song → Books result screen ────────────────────────────────────────────
function BookResultScreen({ result, songTitle, songArtist, digestSummary, onBack }: {
  result: SongToBooksResult;
  songTitle: string;
  songArtist?: string;
  digestSummary: string | null;
  onBack: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, color: P.ink, fontFamily: F.ui }}>
      <ZineMasthead crumb="side b · the stack" onBack={onBack} />

      <div style={{ padding: "32px 56px 0", display: "grid", gridTemplateColumns: "300px 1fr", gap: 56, alignItems: "flex-start" }}>
        {/* Record */}
        <div style={{ position: "relative", width: 300, height: 300 }}>
          <div className="vr-record" style={{ width: 300, height: 300, borderRadius: "50%", background: `repeating-radial-gradient(circle, ${P.ink} 0 1px, ${P.ink2} 1px 4px)`, position: "relative", boxShadow: `0 8px 0 ${P.ink}33, inset 0 0 0 4px ${P.ink}` }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 114, height: 114, borderRadius: "50%", background: P.red, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: P.paper, padding: 10, textAlign: "center" }}>
              <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase" }}>side a · 33⅓</div>
              <div style={{ fontFamily: F.display, fontSize: 15, fontStyle: "italic", fontWeight: 700, lineHeight: 1.0, marginTop: 4, letterSpacing: "-0.01em" }}>{songTitle}</div>
              {songArtist && <div style={{ fontFamily: F.mono, fontSize: 8, marginTop: 3, letterSpacing: "0.1em", textTransform: "uppercase" }}>{songArtist}</div>}
              <div style={{ width: 7, height: 7, background: P.ink, borderRadius: 99, marginTop: 5 }} />
            </div>
          </div>
          <div style={{ position: "absolute", top: -8, right: -10 }}><Stamp color={P.blue} rotate={10}>{result.books.length} books</Stamp></div>
        </div>

        {/* Right */}
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase", marginBottom: 10 }}>side b · song → books</div>
          <h1 style={{ fontFamily: F.display, fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.035em", color: P.ink }}>
            <span style={{ fontSize: "clamp(48px, 7vw, 88px)" }}>if you like<br />
              <em style={{ fontWeight: 400, color: P.red, fontStyle: "italic" }}>this song,</em><br />
              <span style={{ position: "relative", display: "inline-block" }}>
                read these.
                <span style={{ position: "absolute", left: -4, right: -4, bottom: 10, height: 14, background: P.yellow, zIndex: -1 }} />
              </span>
            </span>
          </h1>
          <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, lineHeight: 1.5, color: P.ink, marginTop: 20, maxWidth: 580 }}>
            {result.rationale}
          </p>
          {digestSummary && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: P.paperDark, border: `1.5px dashed ${P.ink}55`, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontFamily: F.display, fontStyle: "italic", fontWeight: 700, fontSize: 13, color: P.red, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>spotify digest →</span>
              <span style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.ink2 }}>{digestSummary}</span>
            </div>
          )}
        </div>
      </div>

      {/* The stack */}
      <div style={{ padding: "36px 56px 0", borderTop: `2px solid ${P.ink}`, marginTop: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
          <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>the stack · {result.books.length} books</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: P.fade }}>each book is a track on side b</div>
        </div>
        <div className="vr-book-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 30, columnGap: 50 }}>
          {result.books.map((b, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "156px 1fr", gap: 22, alignItems: "flex-start", paddingBottom: 24, borderBottom: i >= result.books.length - 2 ? "none" : `1px dotted ${P.ink}55` }}>
              <div className="vr-book-hover" style={{ transform: i % 2 === 0 ? "rotate(-1.5deg)" : "rotate(1.2deg)" }}>
                <BookCover title={b.title} idx={i} />
              </div>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase" }}>· track {String(i + 1).padStart(2, "0")}</div>
                <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 600, fontStyle: "italic", color: P.ink, lineHeight: 1.05, marginTop: 4, letterSpacing: "-0.015em" }}>{b.title}</div>
                <div style={{ fontFamily: F.mono, fontSize: 11, color: P.ink2, marginTop: 6, letterSpacing: "0.05em" }}>by <span style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>{b.author}</span></div>
                <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.ink2, marginTop: 10, lineHeight: 1.5 }}>{b.whyItFits}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <a href={goodreadsUrl(b.title, b.author)} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "3px 10px", border: `1.5px solid ${P.ink}`, color: P.ink, textDecoration: "none" }}>goodreads ↗</a>
                  <a href={bookshopUrl(b.title)} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "3px 10px", border: `1.5px solid ${P.ink}`, color: P.ink, textDecoration: "none" }}>bookshop ↗</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "32px 56px 40px" }}>
        <CassetteSpine side="B" label={`if you like ${songTitle}${songArtist ? ` · ${songArtist}` : ""} · read these · ${result.books.length} books`} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Home() {
  const [mode, setMode] = useState<Mode>("book_to_songs");
  const [musicInputMode, setMusicInputMode] = useState<MusicInputMode>("spotify");

  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicNotes, setMusicNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"spotify_album" | "tape_jam" | null>(null);
  const [digestSummary, setDigestSummary] = useState<string | null>(null);
  const [bookSongs, setBookSongs] = useState<BookToSongsResult | null>(null);
  const [songToBooks, setSongToBooks] = useState<SongToBooksResult | null>(null);
  const [authorCandidates, setAuthorCandidates] = useState<BookAuthorCandidate[] | null>(null);

  // Result metadata for result screens
  const [lastBookTitle, setLastBookTitle] = useState("");
  const [lastBookAuthor, setLastBookAuthor] = useState("");
  const [lastSongTitle, setLastSongTitle] = useState("");
  const [lastSongArtist, setLastSongArtist] = useState("");

  const canRunBook = mode === "book_to_songs" && !!bookTitle.trim() && !authorCandidates;
  const canRunSong = mode === "song_to_books" && (musicInputMode === "spotify" ? !!spotifyUrl.trim() : !!(musicTitle.trim() && musicArtist.trim()));

  async function callApi(body: Record<string, unknown>) {
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiSecret ? { Authorization: `Bearer ${apiSecret}` } : {}) },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  async function run(extraNotes?: string) {
    setBusy(true);
    setError("");
    setBookSongs(null);
    setSongToBooks(null);
    setDigestSummary(null);
    if (mode === "song_to_books") setAuthorCandidates(null);

    try {
      const body = mode === "book_to_songs"
        ? { mode, bookTitle: bookTitle.trim(), ...(bookAuthor.trim() ? { bookAuthor: bookAuthor.trim() } : {}), bookNotes: (extraNotes ?? bookNotes).trim() || undefined }
        : musicInputMode === "spotify"
          ? { mode, spotifyUrl: spotifyUrl.trim() }
          : { mode, musicTitle: musicTitle.trim(), musicArtist: musicArtist.trim(), musicNotes: (extraNotes ?? musicNotes).trim() || undefined };

      const data = await callApi(body);

      if (data.mode === "book_to_songs") {
        if (data.step === "pick_author" && Array.isArray(data.candidates)) {
          setAuthorCandidates(data.candidates); return;
        }
        setLastBookTitle(bookTitle); setLastBookAuthor(bookAuthor);
        setBookSongs(data.result);
      } else {
        setLastSongTitle(musicInputMode === "text" ? musicTitle : "song");
        setLastSongArtist(musicInputMode === "text" ? musicArtist : "");
        setSongToBooks(data.result);
        const d = data.digest as any;
        if (d?.label) setDigestSummary(`${d.label} · mood: ${d.mood?.moodLabel ?? "—"}`);
        else setDigestSummary("using song title + artist from your text (no spotify audio data).");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      if (/album|playlist|artist|non.track|only accepts.*track|track.*link/i.test(msg)) setErrorType("spotify_album");
      else setErrorType("tape_jam");
    } finally {
      setBusy(false);
    }
  }

  async function runFromCandidate(c: BookAuthorCandidate) {
    setBookTitle(c.title); setBookAuthor(c.author);
    setAuthorCandidates(null);
    setBusy(true); setError(""); setBookSongs(null); setSongToBooks(null); setDigestSummary(null);
    try {
      const data = await callApi({ mode: "book_to_songs", bookTitle: c.title.trim(), bookAuthor: c.author.trim(), bookNotes: bookNotes.trim() || undefined });
      if (data.mode === "book_to_songs" && data.result) {
        setLastBookTitle(c.title); setLastBookAuthor(c.author);
        setBookSongs(data.result);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setErrorType("tape_jam");
    } finally { setBusy(false); }
  }

  function reset() {
    setBookSongs(null); setSongToBooks(null); setAuthorCandidates(null); setError(""); setDigestSummary(null); setErrorType(null);
  }

  const isMobile = useIsMobile();

  // ── Error screens ────────────────────────────────────────────────────────
  if (errorType === "spotify_album") {
    return <ErrorScreenSpotify url={spotifyUrl} onBack={() => { reset(); setMusicInputMode("spotify"); }} />;
  }
  if (errorType === "tape_jam") {
    return <ErrorScreenTapeJam errorMsg={error} onBack={reset} onRetry={() => { setErrorType(null); setError(""); run(); }} />;
  }

  // ── Result screens ──────────────────────────────────────────────────────
  if (busy) {
    const loadingLabel = mode === "book_to_songs" ? bookTitle : (musicInputMode === "text" ? musicTitle : "your song");
    return <LoadingScreen book={loadingLabel} onBack={() => { setBusy(false); reset(); }} />;
  }

  if (bookSongs) {
    return <SongResultScreen result={bookSongs} bookTitle={lastBookTitle} bookAuthor={lastBookAuthor} onBack={reset}
      onReroll={notes => { setBookSongs(null); run(notes); }} />;
  }

  if (songToBooks) {
    return <BookResultScreen result={songToBooks} songTitle={lastSongTitle} songArtist={lastSongArtist} digestSummary={digestSummary} onBack={reset} />;
  }

  if (authorCandidates) {
    return <DisambigScreen query={bookTitle} candidates={authorCandidates} busy={busy} onPick={runFromCandidate} onBack={reset} />;
  }

  // ── Landing ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Masthead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: isMobile ? "16px 22px 0" : "24px 56px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <ZineLogo size={26} />
          <span style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.16em", textTransform: "uppercase" }}>· issue 037 · weekly</span>
        </div>
        <div style={{ display: "flex", gap: 18, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", color: P.ink, textTransform: "uppercase", alignItems: "center" }}>
          <a href="/archive" style={{ cursor: "pointer", opacity: 0.7, textDecoration: "none", color: P.ink, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>archive</a>
          <span style={{ cursor: "pointer", opacity: 0.5 }}>about</span>
          <a href="https://github.com/fredericlabadie/VibeReader" target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: "none", color: P.ink }}>github ↗</a>
          <span style={{ padding: "6px 14px", background: P.ink, color: P.paper, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em" }}>start ↓</span>
        </div>
      </div>

      {/* Tape strip */}
      <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
        <Tape rotate={-2}>★ ideas not reviews · made with claude ★</Tape>
      </div>

      {/* Main two-column */}
      <div style={{ padding: "30px 56px 0", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 56, alignItems: "flex-start" }}>
        {/* Hero */}
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase", marginBottom: 14 }}>two lookups · one vibe</div>
          <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: isMobile ? 64 : "clamp(72px, 10vw, 120px)", lineHeight: 0.88, letterSpacing: "-0.035em", color: P.ink }}>
            what does<br />
            <span style={{ fontStyle: "italic", fontWeight: 400, color: P.red }}>this book</span><br />
            <span style={{ position: "relative", display: "inline-block" }}>
              sound like?
              <span style={{ position: "absolute", left: -4, right: -4, bottom: 12, height: 14, background: P.yellow, zIndex: -1 }} />
            </span>
          </h1>
          <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 20, lineHeight: 1.5, color: P.ink, marginTop: 26, maxWidth: 540, fontWeight: 400 }}>
            tell me what you&apos;re reading; i&apos;ll hand you a list of songs. tell me what you&apos;re playing; i&apos;ll hand you a stack of novels. not a review—a starting place.
          </p>

          {/* Recently mixed — hidden on mobile */}
          {!isMobile && <div style={{ marginTop: 30, paddingTop: 16, borderTop: `1.5px solid ${P.ink}` }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: "0.16em", color: P.fade, textTransform: "uppercase", marginBottom: 12 }}>↓ recently mixed by readers</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {RECENT_MIXES.map(([mix, book], i) => (
                <div key={i} className="vr-mini-hover">
                  <MiniCover title={mix} idx={i} w={80} />
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: P.fade, letterSpacing: "0.06em", marginTop: 5, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>← {book}</div>
                </div>
              ))}
            </div>
          </div>}
        </div>

        {/* Form */}
        <div style={{ paddingTop: 28, position: "relative" }}>
          <div style={{ position: "absolute", top: -10, right: 0, zIndex: 2 }}>
            <Stamp color={P.blue} rotate={6}>start here ↓</Stamp>
          </div>

          {/* Mode toggle */}
          <div style={{ background: P.paperDark, border: `2px solid ${P.ink}`, padding: 6, display: "flex" }}>
            <button onClick={() => { setMode("book_to_songs"); setError(""); }} disabled={busy}
              style={{ flex: 1, padding: "13px 10px", background: mode === "book_to_songs" ? P.ink : "transparent", color: mode === "book_to_songs" ? P.paper : P.ink, fontFamily: F.display, fontSize: 20, fontWeight: 600, fontStyle: "italic", border: "none", cursor: "pointer" }}>
              book → songs
            </button>
            <button onClick={() => { setMode("song_to_books"); setError(""); }} disabled={busy}
              style={{ flex: 1, padding: "13px 10px", background: mode === "song_to_books" ? P.ink : "transparent", color: mode === "song_to_books" ? P.paper : P.ink, fontFamily: F.display, fontSize: 20, fontWeight: 600, fontStyle: "italic", border: "none", cursor: "pointer" }}>
              song → books
            </button>
          </div>

          {/* Form panel */}
          <div style={{ marginTop: 18, padding: "24px 22px", background: P.paperDark, border: `2px solid ${P.ink}` }}>
            {mode === "book_to_songs" ? (
              <>
                <ZineField label="book title" value={bookTitle} onChange={setBookTitle} placeholder="e.g. Mexican Gothic" large disabled={busy} />
                {!isMobile && <ZineField label="author (optional — i'll ask if i'm not sure)" value={bookAuthor} onChange={setBookAuthor} disabled={busy} />}
                <ZineField label="vibe notes" value={bookNotes} onChange={setBookNotes} placeholder="what's the part that's getting under your skin?" textarea disabled={busy} />
              </>
            ) : (
              <>
                {/* Song input mode toggle */}
                <div style={{ display: "flex", gap: 20, marginBottom: 16, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: musicInputMode === "spotify" ? P.red : P.fade }}>
                    <input type="radio" name="music-src" checked={musicInputMode === "spotify"} onChange={() => setMusicInputMode("spotify")} disabled={busy} style={{ accentColor: P.red }} />
                    spotify link
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: musicInputMode === "text" ? P.red : P.fade }}>
                    <input type="radio" name="music-src" checked={musicInputMode === "text"} onChange={() => setMusicInputMode("text")} disabled={busy} style={{ accentColor: P.red }} />
                    song in words
                  </label>
                </div>
                {musicInputMode === "spotify" ? (
                  <ZineField label="spotify track url" value={spotifyUrl} onChange={setSpotifyUrl} placeholder="open.spotify.com/track/…" mono disabled={busy} />
                ) : (
                  <>
                    <ZineField label="song title" value={musicTitle} onChange={setMusicTitle} placeholder="e.g. Bachelorette" large disabled={busy} />
                    <ZineField label="artist" value={musicArtist} onChange={setMusicArtist} placeholder="e.g. Björk" disabled={busy} />
                    <ZineField label="mood or genre hints" value={musicNotes} onChange={setMusicNotes} placeholder="anything else that captures how it feels when you press play" textarea disabled={busy} />
                  </>
                )}
              </>
            )}

            <button className={`vr-cta${busy ? " loading" : ""}`} onClick={() => run()} disabled={busy || !(canRunBook || canRunSong)}
              style={{ marginTop: 16, width: "100%", padding: "15px 0", background: P.red, color: P.paper, fontFamily: F.display, fontSize: 22, fontWeight: 700, fontStyle: "italic", border: `2px solid ${P.ink}`, boxShadow: `4px 4px 0 ${P.ink}`, cursor: busy ? "wait" : !(canRunBook || canRunSong) ? "not-allowed" : "pointer", letterSpacing: "-0.01em", opacity: !(canRunBook || canRunSong) && !busy ? 0.5 : 1 }}>
              {busy ? "mixing…" : "give me the mix →"}
            </button>
            <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 10, color: P.fade, textAlign: "center", letterSpacing: "0.06em" }}>
              {mode === "book_to_songs" ? "10–16 songs · ai-drafted · double-check titles" : "6+ books · ai-drafted · double-check titles"}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: 14, padding: "12px 16px", background: `${P.red}18`, border: `1.5px solid ${P.red}`, fontFamily: F.serif, fontStyle: "italic", fontSize: 14, color: P.red }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Bottom rail — hidden on mobile */}
      {!isMobile && <div style={{ marginTop: 60, padding: "18px 56px", borderTop: `2px solid ${P.ink}`, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, alignItems: "flex-start" }}>
        {[
          { n: "01", h: "14 tracks, named.", s: "every mix gets a side-name and a rationale. the mix has a point of view." },
          { n: "02", h: "two ways in.", s: "book → songs, or song → books. one button rules them both." },
          { n: "03", h: "no signup, no save.", s: "what you make is yours. share the link, screenshot it, paste the text." },
          { n: "04", h: "made with claude.", s: "a starting place, not a recommendation engine. always double-check titles." },
        ].map(b => (
          <div key={b.n} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10 }}>
            <span style={{ fontFamily: F.display, fontStyle: "italic", fontWeight: 700, fontSize: 34, color: P.red, lineHeight: 0.9 }}>{b.n}</span>
            <div>
              <div style={{ fontFamily: F.display, fontStyle: "italic", fontWeight: 600, fontSize: 17, color: P.ink, lineHeight: 1.1, letterSpacing: "-0.01em" }}>{b.h}</div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.fade, marginTop: 3, lineHeight: 1.45 }}>{b.s}</div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
