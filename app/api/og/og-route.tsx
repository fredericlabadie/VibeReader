import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const P = {
  paper: "#efe7d6", paperDark: "#e6dcc7", ink: "#161410", ink2: "#2a2622",
  red: "#d3411e", yellow: "#f5c842", fade: "#7d7464",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mixName   = searchParams.get("mixName")  ?? "Untitled Mix";
  const forBook   = searchParams.get("forBook")  ?? "";
  const author    = searchParams.get("author")   ?? "";
  const tracksRaw = searchParams.get("tracks")   ?? "";
  const isSquare  = searchParams.get("square") !== "0";

  const W = 1080;
  const H = isSquare ? 1080 : 1920;

  const tracks = tracksRaw.split("|").filter(Boolean).slice(0, isSquare ? 8 : 13);
  const [namePart1, namePart2] = mixName.includes(",")
    ? [mixName.split(",")[0] + ",", mixName.split(",").slice(1).join(",").trim()]
    : [mixName, ""];

  let frauncesBold: ArrayBuffer | null = null;
  let dmMono: ArrayBuffer | null = null;
  try {
    [frauncesBold, dmMono] = await Promise.all([
      fetch("https://fonts.gstatic.com/s/fraunces/v31/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Bg.woff2").then(r => r.arrayBuffer()),
      fetch("https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYth-QLaXVBQ.woff2").then(r => r.arrayBuffer()),
    ]);
  } catch { /* use fallback */ }

  const fonts: any[] = [];
  if (frauncesBold) fonts.push({ name: "Fraunces", data: frauncesBold, weight: 700, style: "normal" });
  if (dmMono)       fonts.push({ name: "DM Mono",  data: dmMono,       weight: 400, style: "normal" });

  const nameSize = isSquare ? 120 : 140;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, background: P.paper, display: "flex", flexDirection: "column", padding: "64px 64px", position: "relative", overflow: "hidden" }}>
        {/* Dot grain */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${P.ink}22 1.5px, transparent 1.5px)`, backgroundSize: "4px 4px", display: "flex" }} />
        {/* Tape */}
        <div style={{ position: "absolute", top: 44, left: 64, background: P.yellow, padding: "8px 18px", fontFamily: "DM Mono, monospace", fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: P.ink, transform: "rotate(-4deg)", display: "flex" }}>★ A VIBEREADER MIX · DO NOT ERASE ★</div>
        {/* Stamp */}
        <div style={{ position: "absolute", top: 44, right: 64, padding: "8px 18px", border: `3px solid ${P.red}`, fontFamily: "DM Mono, monospace", fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", color: P.red, transform: "rotate(4deg)", display: "flex" }}>SIDE A</div>
        {/* Logo */}
        <div style={{ marginTop: 110, display: "flex" }}>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em", color: P.ink }}>vibe</span>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 38, fontWeight: 400, fontStyle: "italic", color: P.red }}>reader</span>
        </div>
        <div style={{ marginTop: 6, fontFamily: "DM Mono, monospace", fontSize: 17, color: P.fade, letterSpacing: "0.14em", textTransform: "uppercase", display: "flex" }}>for {forBook}{author ? ` · ${author}` : ""}</div>
        {/* Mix name */}
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: nameSize, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.88, color: P.ink }}>{namePart1}</span>
          {namePart2 && <span style={{ fontFamily: "Fraunces, serif", fontSize: nameSize, fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.04em", lineHeight: 0.88, color: P.red }}>{namePart2}</span>}
        </div>
        {/* Cassette */}
        <div style={{ marginTop: isSquare ? 36 : 52, background: P.ink, padding: "30px 30px", color: P.paper, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "DM Mono, monospace", fontSize: 16, letterSpacing: "0.16em", textTransform: "uppercase", color: P.yellow }}>
            <span>VR-TAPE · CR02</span><span>SIDE A · 90 MIN</span>
          </div>
          <div style={{ marginTop: 20, background: P.paper, border: `3px solid ${P.ink}`, padding: "20px 40px", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            {[0,1].map(i => (
              <div key={i} style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${P.ink}`, background: P.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: P.paper, display: "flex" }} />
              </div>
            ))}
          </div>
        </div>
        {/* Tracklist */}
        <div style={{ marginTop: isSquare ? 28 : 44, display: "flex", flexWrap: "wrap", gap: "2px 56px", fontFamily: "DM Mono, monospace", fontSize: 17, color: P.ink, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.7 }}>
          {tracks.map((t, i) => <div key={i} style={{ display: "flex" }}>· {t}</div>)}
        </div>
        {/* Footer */}
        <div style={{ position: "absolute", bottom: 56, left: 64, right: 64, borderTop: `2px solid ${P.ink}`, paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 20, color: P.ink2, lineHeight: 1.4 }}>
            <span>make your own at</span>
            <span style={{ color: P.red, fontStyle: "normal", fontWeight: 700 }}>vibereader.fredericlabadie.com</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontFamily: "DM Mono, monospace", fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", color: P.fade }}>
            <span>ISSUE 037</span><span>MADE WITH CLAUDE</span>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts }
  );
}
