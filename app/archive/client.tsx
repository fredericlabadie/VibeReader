"use client";

import { useState } from "react";
import type { StoredMix } from "@/lib/store";

const P = { paper:"#efe7d6",paperDark:"#e6dcc7",ink:"#161410",ink2:"#2a2622",red:"#d3411e",blue:"#1f3aa6",yellow:"#f5c842",green:"#7aa86b",fade:"#7d7464" };
const F = { display:"'Fraunces', serif", serif:"'Newsreader', Georgia, serif", mono:"'DM Mono', 'Courier New', monospace" };

const CP=[{bg:P.red,fg:P.paper},{bg:P.blue,fg:P.paper},{bg:P.ink,fg:P.yellow},{bg:P.yellow,fg:P.ink},{bg:P.paper,fg:P.ink,stroke:P.ink},{bg:P.green,fg:P.ink}];

function MixCover({ name, idx }: { name: string; idx: number }) {
  const c = CP[idx % CP.length];
  return (
    <div style={{ width: "100%", aspectRatio: "1/1", background: c.bg, color: c.fg, fontFamily: F.display, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "stroke" in c ? `inset 0 0 0 1.5px ${(c as any).stroke}` : "none" }}>
      <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}>vr · {String(idx + 1).padStart(2, "0")}</div>
      <div style={{ fontStyle: "italic", fontWeight: 600, fontSize: 14, lineHeight: 1.0, letterSpacing: "-0.02em", wordBreak: "break-word" }}>{name.length > 18 ? name.slice(0, 16) + "…" : name}</div>
    </div>
  );
}

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
}

type Filter = "all" | "book→songs" | "song→books" | "this week";

export default function ArchiveClient({ mixes }: { mixes: StoredMix[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const now = Date.now();
  const filtered = mixes.filter(m => {
    if (filter === "all") return true;
    if (filter === "book→songs" || filter === "song→books") return m.kind === filter;
    if (filter === "this week") return now - m.createdAt < 7 * 24 * 60 * 60 * 1000;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, color: P.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&family=DM+Mono:wght@400&display=swap'); .vr-card{transition:transform .15s;display:block;text-decoration:none;color:inherit} .vr-card:hover{transform:translate(-2px,-2px) rotate(-0.6deg)} @media(max-width:720px){.vr-grid{grid-template-columns:repeat(2,1fr)!important}.vr-archive-pad{padding:24px 22px 0!important}}`}</style>

      {/* Masthead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: `1.5px solid ${P.ink}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "baseline", textDecoration: "none" }}>
            <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: P.ink }}>vibe</span>
            <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 400, fontStyle: "italic", color: P.red }}>reader</span>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: P.red, marginLeft: 3, transform: "translateY(-9px)", display: "inline-block" }} />
          </a>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.16em", textTransform: "uppercase" }}>· the back catalog</span>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <a href="/" style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: P.ink, textDecoration: "none" }}>← back</a>
          <a href="/" style={{ padding: "5px 12px", background: P.ink, color: P.paper, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textDecoration: "none" }}>start over ↓</a>
        </div>
      </div>

      <div className="vr-archive-pad" style={{ padding: "36px 56px 0" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase", marginBottom: 12 }}>
          archive · {mixes.length} mix{mixes.length !== 1 ? "es" : ""} · live
        </div>
        <h1 style={{ fontFamily: F.display, fontSize: "clamp(60px, 9vw, 104px)", fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.04em", color: P.ink }}>
          the back<br />
          <span style={{ fontStyle: "italic", fontWeight: 400, color: P.red }}>catalog.</span>
        </h1>
        <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, lineHeight: 1.5, color: P.ink2, marginTop: 20, maxWidth: 640 }}>
          every mix anyone&apos;s made, in chronological order. links are permanent, anyone can listen. nothing is private here — that&apos;s the deal.
        </p>

        <div style={{ marginTop: 28, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {(["all", "book→songs", "song→books", "this week"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", border: `1.5px solid ${P.ink}`, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", background: filter === f ? P.ink : "transparent", color: filter === f ? P.paper : P.ink, cursor: "pointer" }}>
              {f}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.08em" }}>newest first ↓</span>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: "60px 56px", textAlign: "center" }}>
          {mixes.length === 0 ? (
            <>
              <div style={{ fontFamily: F.display, fontSize: 48, fontStyle: "italic", color: `${P.ink}22`, marginBottom: 12 }}>empty.</div>
              <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 16, color: P.fade }}>
                no mixes yet — <a href="/" style={{ color: P.red }}>make the first one</a>.
              </p>
            </>
          ) : (
            <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 16, color: P.fade }}>nothing matching that filter.</p>
          )}
        </div>
      ) : (
        <div className="vr-grid" style={{ padding: "32px 56px 80px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {filtered.map((m, i) => {
            const name = m.kind === "book→songs"
              ? (m.result as any).songListName ?? "Untitled Mix"
              : `If you like ${m.songTitle ?? "this song"}`;
            const forLabel = m.kind === "book→songs" ? m.bookTitle : m.songTitle;
            const byLabel  = m.kind === "book→songs" ? m.bookAuthor : m.songArtist;
            return (
              <a key={m.slug} href={`/r/${m.slug}`} className="vr-card">
                <div style={{ background: P.paperDark, border: `2px solid ${P.ink}`, padding: 18, boxShadow: `4px 4px 0 ${P.ink}`, minHeight: 280, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.16em", color: P.fade, textTransform: "uppercase" }}>{timeAgo(m.createdAt)}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", color: m.kind === "song→books" ? P.blue : P.red, textTransform: "uppercase", padding: "2px 8px", border: `1.5px solid ${m.kind === "song→books" ? P.blue : P.red}` }}>
                      {m.kind}
                    </span>
                  </div>
                  <MixCover name={name} idx={i} />
                  <div style={{ marginTop: 12, fontFamily: F.display, fontSize: 20, fontWeight: 600, fontStyle: "italic", lineHeight: 1.05, letterSpacing: "-0.015em" }}>{name}</div>
                  <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.ink2, marginTop: 6, lineHeight: 1.4 }}>
                    {m.kind === "song→books" ? "if you like " : "for "}<em style={{ color: P.ink, fontStyle: "normal", fontWeight: 600 }}>{forLabel}</em>{byLabel && ` · ${byLabel}`}
                  </div>
                  <div style={{ marginTop: "auto", paddingTop: 12, fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", color: P.ink, textTransform: "uppercase", textAlign: "right" }}>open →</div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
