"use client";
import { useState } from "react";

const P = {
  paper: "#efe7d6", paperDark: "#e6dcc7", ink: "#161410", ink2: "#2a2622",
  red: "#d3411e", blue: "#1f3aa6", yellow: "#f5c842", green: "#7aa86b", fade: "#7d7464",
};
const F = {
  display: "'Fraunces', serif",
  serif:   "'Newsreader', Georgia, serif",
  mono:    "'DM Mono', 'Courier New', monospace",
};

// Static sample archive — swap for a real KV store to persist mixes
const ARCHIVE_MIXES = [
  { id: "damp-walls-bright-teeth",       name: "Damp Walls, Bright Teeth",       for: "Mexican Gothic",          author: "Moreno-Garcia",  when: "2 min ago",  kind: "book→songs", issue: "037" },
  { id: "quiet-on-the-marsh",             name: "The Quiet on the Marsh",          for: "Piranesi",                author: "Clarke",         when: "today",      kind: "book→songs", issue: "037" },
  { id: "sun-through-cellophane",         name: "Sun Through Cellophane",          for: "Sing, Unburied, Sing",    author: "Ward",           when: "yesterday",  kind: "book→songs", issue: "036" },
  { id: "if-you-like-bachelorette",       name: "If you like Bachelorette",        for: "Bachelorette",            author: "Björk",          when: "2 days ago", kind: "song→books", issue: "036" },
  { id: "iron-birds",                     name: "Iron Birds",                      for: "The Goldfinch",           author: "Tartt",          when: "3 days",     kind: "book→songs", issue: "036" },
  { id: "velvet-drowned",                 name: "Velvet Drowned",                  for: "Beloved",                 author: "Morrison",       when: "4 days",     kind: "book→songs", issue: "035" },
  { id: "cigarette-in-the-rain",          name: "Cigarette in the Rain",           for: "Trust Exercise",          author: "Choi",           when: "5 days",     kind: "book→songs", issue: "035" },
  { id: "a-year-on-saturn",               name: "A Year on Saturn",                for: "Pluto Will Sing",         author: "Smith",          when: "1 wk",       kind: "song→books", issue: "035" },
  { id: "salt-then-honey",                name: "Salt, then Honey",                for: "Circe",                   author: "Miller",         when: "1 wk",       kind: "book→songs", issue: "034" },
  { id: "pale-lights-long-halls",         name: "Pale Lights, Long Halls",         for: "Annihilation",            author: "VanderMeer",     when: "2 wk",       kind: "book→songs", issue: "034" },
  { id: "if-you-like-hyperballad",        name: "If you like Hyperballad",         for: "Hyperballad",             author: "Björk",          when: "2 wk",       kind: "song→books", issue: "034" },
  { id: "a-map-for-leaving",              name: "A Map for Leaving",               for: "The Goldfinch",           author: "Tartt",          when: "3 wk",       kind: "book→songs", issue: "033" },
];

const COVER_PALETTES = [
  { bg: P.red,    fg: P.paper },
  { bg: P.blue,   fg: P.paper },
  { bg: P.ink,    fg: P.yellow },
  { bg: P.yellow, fg: P.ink },
  { bg: P.paper,  fg: P.ink, stroke: P.ink },
  { bg: P.green,  fg: P.ink },
];

function MiniCoverFull({ title, idx }: { title: string; idx: number }) {
  const c = COVER_PALETTES[idx % COVER_PALETTES.length];
  return (
    <div style={{ width: "100%", aspectRatio: "1/1", background: c.bg, color: c.fg, fontFamily: F.display, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "stroke" in c ? `inset 0 0 0 1.5px ${(c as any).stroke}` : "none" }}>
      <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}>vr · {idx + 1}</div>
      <div style={{ fontStyle: "italic", fontWeight: 600, fontSize: 14, lineHeight: 1.0, letterSpacing: "-0.02em", wordBreak: "break-word" }}>
        {title.length > 18 ? title.slice(0, 16) + "…" : title}
      </div>
    </div>
  );
}

type FilterKey = "all" | "book→songs" | "song→books" | "this week";

export default function ArchivePage() {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = ARCHIVE_MIXES.filter(m => {
    if (filter === "all") return true;
    if (filter === "book→songs") return m.kind === "book→songs";
    if (filter === "song→books") return m.kind === "song→books";
    if (filter === "this week") return ["2 min ago","today","yesterday","2 days ago","3 days","4 days","5 days"].includes(m.when);
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: P.paper, backgroundImage: `radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`, color: P.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&family=DM+Mono:wght@400;500&display=swap');
        @keyframes vrSpin { to { transform: rotate(360deg); } }
        .vr-mix-card { transition: transform .15s; text-decoration: none; color: inherit; display: block; }
        .vr-mix-card:hover { transform: translate(-2px,-2px) rotate(-0.6deg); }
        .vr-filter-chip { cursor: pointer; transition: background .12s, color .12s; }
      `}</style>

      {/* Masthead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: `1.5px solid ${P.ink}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "baseline", textDecoration: "none" }}>
            <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: P.ink }}>vibe</span>
            <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 400, fontStyle: "italic", color: P.red }}>reader</span>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: P.red, marginLeft: 3, transform: "translateY(-9px)", display: "inline-block" }} />
          </a>
          <span style={{ fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.16em", textTransform: "uppercase" }}>· issue 037 · the back catalog</span>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <a href="/" style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: P.ink, textDecoration: "none" }}>← back</a>
          <a href="/" style={{ padding: "5px 12px", background: P.ink, color: P.paper, fontFamily: F.mono, fontSize: 10, letterSpacing: "0.12em", textDecoration: "none" }}>start over ↓</a>
        </div>
      </div>

      <div style={{ padding: "36px 56px 0" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.18em", color: P.red, textTransform: "uppercase", marginBottom: 12 }}>
          archive · {ARCHIVE_MIXES.length}+ mixes · refreshed weekly
        </div>
        <h1 style={{ fontFamily: F.display, fontSize: "clamp(60px, 9vw, 104px)", fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.04em", color: P.ink }}>
          the back<br />
          <span style={{ fontStyle: "italic", fontWeight: 400, color: P.red }}>catalog.</span>
        </h1>
        <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 18, lineHeight: 1.5, color: P.ink2, marginTop: 20, maxWidth: 640 }}>
          every mix anyone's made, in chronological order. names are real, links are permanent, anyone can listen. nothing is private here — that's the deal.
        </p>

        {/* Filter bar */}
        <div style={{ marginTop: 28, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {(["all", "book→songs", "song→books", "this week"] as FilterKey[]).map(f => (
            <button key={f} className="vr-filter-chip" onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", border: `1.5px solid ${P.ink}`, fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", background: filter === f ? P.ink : "transparent", color: filter === f ? P.paper : P.ink, cursor: "pointer" }}>
              {f}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 10, color: P.fade, letterSpacing: "0.08em" }}>sort · newest first ↓</span>
        </div>
      </div>

      {/* Grid */}
      <div className="vr-archive-grid" style={{ padding: "32px 56px 80px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        {filtered.map((m, i) => (
          <a key={m.id} href="/" className="vr-mix-card">
            <div style={{ background: P.paperDark, border: `2px solid ${P.ink}`, padding: 18, boxShadow: `4px 4px 0 ${P.ink}`, minHeight: 300, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.16em", color: P.fade, textTransform: "uppercase" }}>· issue {m.issue}</span>
                <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", color: m.kind === "song→books" ? P.blue : P.red, textTransform: "uppercase", padding: "2px 8px", border: `1.5px solid ${m.kind === "song→books" ? P.blue : P.red}` }}>
                  {m.kind}
                </span>
              </div>
              <MiniCoverFull title={m.name} idx={i} />
              <div style={{ marginTop: 12, fontFamily: F.display, fontSize: 20, fontWeight: 600, fontStyle: "italic", lineHeight: 1.05, letterSpacing: "-0.015em" }}>{m.name}</div>
              <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: P.ink2, marginTop: 6, lineHeight: 1.4 }}>
                {m.kind === "song→books" ? "if you like " : "for "}<em style={{ color: P.ink, fontStyle: "normal", fontWeight: 600 }}>{m.for}</em> · {m.author}
              </div>
              <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", color: P.fade, textTransform: "uppercase" }}>
                <span>{m.when}</span>
                <span style={{ color: P.ink }}>open →</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "60px 56px", fontFamily: F.serif, fontStyle: "italic", fontSize: 18, color: P.fade, textAlign: "center" }}>
          nothing here yet — be the first to mix one.
        </div>
      )}
    </div>
  );
}
