let cachedToken: { value: string; expiresAt: number } | null = null;

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function spotifyMarket() {
  return env("SPOTIFY_MARKET") || "US";
}

function hasSpotifyCreds() {
  return !!env("SPOTIFY_CLIENT_ID") && !!env("SPOTIFY_CLIENT_SECRET");
}

async function getSpotifyAppToken() {
  if (!hasSpotifyCreds()) throw new Error("Spotify credentials not configured");
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 60_000) return cachedToken.value;

  const clientId = env("SPOTIFY_CLIENT_ID");
  const clientSecret = env("SPOTIFY_CLIENT_SECRET");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Spotify token request failed");
  }
  const payload = await response.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  };
  return payload.access_token;
}

export type MusicMoodSummary = {
  moodLabel: string;
  descriptors: string[];
  guidance: string;
};

function deriveMoodFromFeatures(input: {
  valence?: number;
  energy?: number;
  danceability?: number;
  acousticness?: number;
  instrumentalness?: number;
  tempo?: number;
}): MusicMoodSummary {
  const valence = input.valence ?? 0.5;
  const energy = input.energy ?? 0.5;
  const danceability = input.danceability ?? 0.5;
  const acousticness = input.acousticness ?? 0.5;
  const instrumentalness = input.instrumentalness ?? 0.2;
  const tempo = input.tempo ?? 110;

  const descriptors: string[] = [];
  if (energy >= 0.7) descriptors.push("driving");
  if (energy <= 0.35) descriptors.push("subtle");
  if (valence >= 0.65) descriptors.push("uplifting");
  if (valence <= 0.35) descriptors.push("melancholic");
  if (danceability >= 0.7) descriptors.push("rhythmic");
  if (acousticness >= 0.6) descriptors.push("organic");
  if (instrumentalness >= 0.5) descriptors.push("cinematic");
  if (tempo >= 130) descriptors.push("urgent");
  if (tempo <= 85) descriptors.push("slow-burn");
  if (!descriptors.length) descriptors.push("balanced");

  let moodLabel = "balanced cinematic";
  if (energy >= 0.7 && valence >= 0.6) moodLabel = "bold and optimistic";
  else if (energy >= 0.7 && valence <= 0.4) moodLabel = "intense and ominous";
  else if (energy <= 0.4 && valence <= 0.4) moodLabel = "introspective and somber";
  else if (energy <= 0.4 && valence >= 0.6) moodLabel = "warm and reflective";

  const guidance = `Listening profile: ${moodLabel}. Lean into ${descriptors.slice(0, 3).join(", ")}.`;
  return { moodLabel, descriptors, guidance };
}

export type ParsedSpotifyResource =
  | { type: "track"; id: string }
  | { type: "album"; id: string }
  | { type: "playlist"; id: string }
  | { type: "artist"; id: string };

/** Spotify resource id in URLs / URIs (base62-ish; allow common punctuation from copy/paste). */
const SPOTIFY_ID = "([A-Za-z0-9._-]+)";

/**
 * Share links append ?si=, &pi=, etc. They are not part of the catalogue resource id; strip so parsing stays stable.
 */
function stripSpotifyWebUrlQueryAndHash(urlString: string): string {
  if (!/^https?:\/\//i.test(urlString)) return urlString;
  try {
    const u = new URL(urlString);
    const h = u.hostname.toLowerCase();
    if (!h.endsWith("spotify.com") && h !== "spotify.link" && h !== "www.spotify.link") {
      return urlString;
    }
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return urlString;
  }
}

/**
 * Clean pasted Spotify links so `new URL()` works: many apps omit `https://`,
 * or add invisible Unicode / smart quotes around the string.
 */
export function normalizeSpotifyPaste(input: string): string {
  let s = input
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D]/g, "")
    .trim();
  s = s
    .replace(/^[\s<([{“”‘’'"`]+/, "")
    .replace(/[\s>)}\]'“”‘’'"`;]+$/, "")
    .trim();
  if (!s) return s;
  if (/^spotify:(track|album|playlist|artist):/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return stripSpotifyWebUrlQueryAndHash(s);
  if (/^(open\.|play\.)?spotify\.com\//i.test(s)) {
    return stripSpotifyWebUrlQueryAndHash(`https://${s.replace(/^\/+/, "")}`);
  }
  if (/^(www\.)?spotify\.link\//i.test(s)) {
    return stripSpotifyWebUrlQueryAndHash(`https://${s.replace(/^\/+/, "")}`);
  }
  return s;
}

/**
 * Mobile “Copy link” often returns `https://spotify.link/...`, which redirects to `open.spotify.com/...`.
 * The Web API parser only understands open/play.spotify.com (or spotify: URIs), so resolve short links first.
 */
export async function resolveSpotifyShareUrl(input: string): Promise<string> {
  const s = normalizeSpotifyPaste(input);
  if (!s) return s;
  let host: string;
  try {
    host = new URL(s).hostname.toLowerCase();
  } catch {
    return s;
  }
  if (host !== "spotify.link" && host !== "www.spotify.link") {
    return s;
  }
  try {
    const res = await fetch(s, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,*/*",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.url && res.url !== s) {
      return normalizeSpotifyPaste(res.url);
    }
  } catch {
    /* timeout or blocked; fall through */
  }
  return s;
}

export function parseSpotifyResourceUrl(input: string): ParsedSpotifyResource | null {
  const raw = normalizeSpotifyPaste(input);
  if (!raw) return null;

  const uris: Array<[RegExp, ParsedSpotifyResource["type"]]> = [
    [new RegExp(`^spotify:track:${SPOTIFY_ID}$`, "i"), "track"],
    [new RegExp(`^spotify:album:${SPOTIFY_ID}$`, "i"), "album"],
    [new RegExp(`^spotify:playlist:${SPOTIFY_ID}$`, "i"), "playlist"],
    [new RegExp(`^spotify:artist:${SPOTIFY_ID}$`, "i"), "artist"],
  ];
  for (const [re, type] of uris) {
    const m = raw.match(re);
    if (m) return { type, id: m[1] } as ParsedSpotifyResource;
  }

  try {
    const url = new URL(raw);
    if (!url.hostname.toLowerCase().endsWith("spotify.com")) return null;
    url.search = "";
    url.hash = "";
    let path = url.pathname;
    try {
      path = decodeURIComponent(path);
    } catch {
      /* keep encoded pathname */
    }
    const track = path.match(new RegExp(`\\/track\\/${SPOTIFY_ID}(?:\\/|$)`));
    if (track) return { type: "track", id: track[1] };
    const album = path.match(new RegExp(`\\/album\\/${SPOTIFY_ID}(?:\\/|$)`));
    if (album) return { type: "album", id: album[1] };
    const playlist = path.match(new RegExp(`\\/playlist\\/${SPOTIFY_ID}(?:\\/|$)`));
    if (playlist) return { type: "playlist", id: playlist[1] };
    const artist = path.match(new RegExp(`\\/artist\\/${SPOTIFY_ID}(?:\\/|$)`));
    if (artist) return { type: "artist", id: artist[1] };
    return null;
  } catch {
    return null;
  }
}

export type AudioFeatureSnapshot = {
  valence: number;
  energy: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
};

export type MusicListeningKind = "track" | "album" | "playlist" | "artist";

export type MusicListeningDigest = {
  kind: MusicListeningKind;
  label: string;
  artistLine: string;
  /** Total tracks when known (e.g. playlist size); otherwise same as analyzedTrackCount. */
  trackCount: number;
  /** Tracks used to compute averaged audio features. */
  analyzedTrackCount: number;
  avgFeatures: AudioFeatureSnapshot;
  mood: MusicMoodSummary;
  sampleTrackLines: string[];
};

async function fetchAudioFeaturesForIds(
  token: string,
  ids: string[],
): Promise<Array<Record<string, unknown> | null>> {
  if (!ids.length) return [];
  const out: Array<Record<string, unknown> | null> = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const fr = await fetch(`https://api.spotify.com/v1/audio-features?ids=${chunk.join(",")}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fr.ok) continue;
    const fj = await fr.json() as { audio_features?: Array<Record<string, unknown> | null> };
    out.push(...(fj.audio_features ?? []));
  }
  return out;
}

function averageFeatures(rows: Array<Record<string, unknown> | null | undefined>): AudioFeatureSnapshot {
  const nums = (f: Record<string, unknown>, k: string) => {
    const v = Number(f[k]);
    return Number.isFinite(v) ? v : undefined;
  };
  const collected: AudioFeatureSnapshot[] = [];
  for (const f of rows) {
    if (!f || typeof f !== "object") continue;
    collected.push({
      valence: nums(f, "valence") ?? 0.5,
      energy: nums(f, "energy") ?? 0.5,
      danceability: nums(f, "danceability") ?? 0.5,
      acousticness: nums(f, "acousticness") ?? 0.5,
      instrumentalness: nums(f, "instrumentalness") ?? 0.2,
      tempo: nums(f, "tempo") ?? 110,
    });
  }
  if (!collected.length) {
    return {
      valence: 0.5,
      energy: 0.5,
      danceability: 0.5,
      acousticness: 0.5,
      instrumentalness: 0.2,
      tempo: 110,
    };
  }
  const n = collected.length;
  const sum = collected.reduce(
    (acc, x) => ({
      valence: acc.valence + x.valence,
      energy: acc.energy + x.energy,
      danceability: acc.danceability + x.danceability,
      acousticness: acc.acousticness + x.acousticness,
      instrumentalness: acc.instrumentalness + x.instrumentalness,
      tempo: acc.tempo + x.tempo,
    }),
    { valence: 0, energy: 0, danceability: 0, acousticness: 0, instrumentalness: 0, tempo: 0 },
  );
  return {
    valence: sum.valence / n,
    energy: sum.energy / n,
    danceability: sum.danceability / n,
    acousticness: sum.acousticness / n,
    instrumentalness: sum.instrumentalness / n,
    tempo: sum.tempo / n,
  };
}

async function fetchPlaylistDigest(id: string, token: string): Promise<MusicListeningDigest> {
  const headers = { Authorization: `Bearer ${token}` };

  const plRes = await fetch(`https://api.spotify.com/v1/playlists/${id}`, { headers });
  if (!plRes.ok) {
    let spotDetail = "";
    try {
      const j = (await plRes.json()) as { error?: { message?: string } };
      if (j?.error?.message) spotDetail = ` ${j.error.message}`;
    } catch {
      /* ignore */
    }
    throw new Error(
      `Could not open this playlist (HTTP ${plRes.status}).${spotDetail} ` +
        "This tool only reads public playlists (Spotify’s API cannot see secret or friends-only lists). " +
        "In the app: open the playlist → ⋯ → add it to your profile or set it to public, then try again. " +
        "Links from Share are fine: open.spotify.com, play.spotify.com, spotify.link (short), or spotify:playlist:…",
    );
  }
  const plJson = await plRes.json() as { name?: string; tracks?: { total?: number } };
  const playlistName = plJson?.name ?? "Playlist";
  const total = plJson?.tracks?.total ?? 0;

  const tracksRes = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=80`, { headers });
  if (!tracksRes.ok) {
    throw new Error("Could not read playlist tracks.");
  }
  const tracksPayload = await tracksRes.json() as {
    items?: Array<{ track: { id?: string; name?: string; artists?: Array<{ name?: string }> } | null }>;
  };
  const items = tracksPayload.items ?? [];

  const trackIds: string[] = [];
  const sampleTrackLines: string[] = [];
  for (const row of items) {
    const t = row?.track;
    if (!t?.id) continue;
    trackIds.push(t.id);
    const artists = Array.isArray(t.artists) ? t.artists.map((a) => a.name).filter(Boolean).join(", ") : "";
    if (sampleTrackLines.length < 18) {
      sampleTrackLines.push(artists ? `${artists} — ${t.name ?? "Unknown"}` : (t.name ?? "Unknown"));
    }
  }

  if (!trackIds.length) {
    throw new Error("No playable tracks found in this playlist.");
  }

  const features = await fetchAudioFeaturesForIds(token, trackIds);
  const avgFeatures = averageFeatures(features);
  const mood = deriveMoodFromFeatures(avgFeatures);

  return {
    kind: "playlist",
    label: playlistName,
    artistLine: "",
    trackCount: total || trackIds.length,
    analyzedTrackCount: trackIds.length,
    avgFeatures,
    mood,
    sampleTrackLines,
  };
}

async function fetchArtistDigestById(artistId: string, token: string): Promise<MusicListeningDigest> {
  const headers = { Authorization: `Bearer ${token}` };
  const ar = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, { headers });
  if (!ar.ok) {
    throw new Error("Could not load that artist.");
  }
  const aj = await ar.json() as { name?: string };
  const artistName = aj.name ?? "Artist";

  const market = spotifyMarket();
  const top = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${encodeURIComponent(market)}`,
    { headers },
  );
  if (!top.ok) {
    throw new Error("Could not load artist top tracks. Try another market via SPOTIFY_MARKET in .env.");
  }
  const tj = await top.json() as {
    tracks?: Array<{ id?: string; name?: string; artists?: Array<{ name?: string }> }>;
  };
  const tracks = tj.tracks ?? [];
  const ids = tracks.map((t) => t.id).filter((id): id is string => !!id).slice(0, 15);
  const sampleTrackLines: string[] = [];
  for (const t of tracks.slice(0, 12)) {
    const an = Array.isArray(t.artists) ? t.artists.map((a) => a.name).filter(Boolean).join(", ") : "";
    sampleTrackLines.push(an ? `${an} — ${t.name ?? "Track"}` : (t.name ?? "Track"));
  }

  if (!ids.length) {
    throw new Error("No top tracks found for this artist in this market.");
  }

  const features = await fetchAudioFeaturesForIds(token, ids);
  const avgFeatures = averageFeatures(features);
  const mood = deriveMoodFromFeatures(avgFeatures);

  return {
    kind: "artist",
    label: `${artistName} (Spotify top tracks)`,
    artistLine: artistName,
    trackCount: ids.length,
    analyzedTrackCount: ids.length,
    avgFeatures,
    mood,
    sampleTrackLines,
  };
}

/** Resolve typed artist name to first Spotify search hit, then top-tracks digest. */
export async function fetchArtistDigestBySearchQuery(query: string): Promise<MusicListeningDigest> {
  if (!hasSpotifyCreds()) {
    throw new Error("Spotify credentials missing. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
  }
  const token = await getSpotifyAppToken();
  const headers = { Authorization: `Bearer ${token}` };
  const q = encodeURIComponent(query.trim());
  const sr = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=artist&limit=5`, { headers });
  if (!sr.ok) throw new Error("Spotify artist search failed.");
  const sj = await sr.json() as { artists?: { items?: Array<{ id?: string }> } };
  const first = sj.artists?.items?.[0]?.id;
  if (!first) throw new Error(`No Spotify artist found for “${query.trim()}”.`);
  return fetchArtistDigestById(first, token);
}

export async function fetchListeningDigestFromSpotifyUrl(url: string): Promise<MusicListeningDigest> {
  const resolved = await resolveSpotifyShareUrl(url);
  const parsed = parseSpotifyResourceUrl(resolved);
  if (!parsed) {
    throw new Error(
      "Could not read that Spotify link. Use the full browser URL (include https://) or a spotify:track:/album:/playlist:/artist: URI.",
    );
  }

  if (!hasSpotifyCreds()) {
    throw new Error("Spotify credentials missing. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
  }

  const token = await getSpotifyAppToken();
  const headers = { Authorization: `Bearer ${token}` };

  if (parsed.type === "playlist") {
    return fetchPlaylistDigest(parsed.id, token);
  }

  if (parsed.type === "artist") {
    return fetchArtistDigestById(parsed.id, token);
  }

  if (parsed.type === "track") {
    const tr = await fetch(`https://api.spotify.com/v1/tracks/${parsed.id}`, { headers });
    if (!tr.ok) {
      throw new Error("Could not load that track. Check the link is valid and the release is on Spotify.");
    }
    const trackJson = await tr.json() as {
      name?: string;
      artists?: Array<{ name?: string }>;
    };
    const name = trackJson.name ?? "Track";
    const artistLine = Array.isArray(trackJson.artists)
      ? trackJson.artists.map((a) => a.name).filter(Boolean).join(", ")
      : "";
    const label = artistLine ? `${artistLine} — ${name}` : name;

    const features = await fetchAudioFeaturesForIds(token, [parsed.id]);
    const avgFeatures = averageFeatures(features);
    const mood = deriveMoodFromFeatures(avgFeatures);

    return {
      kind: "track",
      label,
      artistLine,
      trackCount: 1,
      analyzedTrackCount: 1,
      avgFeatures,
      mood,
      sampleTrackLines: [label],
    };
  }

  const al = await fetch(`https://api.spotify.com/v1/albums/${parsed.id}`, { headers });
  if (!al.ok) {
    throw new Error("Could not load that album. Check the link is valid and the release is on Spotify.");
  }
  const albumJson = await al.json() as {
    name?: string;
    artists?: Array<{ name?: string }>;
    tracks?: { items?: Array<{ id?: string; name?: string; artists?: Array<{ name?: string }> }> };
  };
  const albumName = albumJson.name ?? "Album";
  const albumArtists = Array.isArray(albumJson.artists)
    ? albumJson.artists.map((a) => a.name).filter(Boolean).join(", ")
    : "";
  const items = albumJson.tracks?.items ?? [];
  const ids = items.map((x) => x.id).filter((id): id is string => !!id).slice(0, 30);
  const sampleTrackLines: string[] = [];
  for (const row of items.slice(0, 12)) {
    const an = Array.isArray(row.artists) ? row.artists.map((a) => a.name).filter(Boolean).join(", ") : "";
    sampleTrackLines.push(an ? `${an} — ${row.name ?? "Track"}` : (row.name ?? "Track"));
  }

  const features = await fetchAudioFeaturesForIds(token, ids);
  const avgFeatures = averageFeatures(features);
  const mood = deriveMoodFromFeatures(avgFeatures);
  const label = albumArtists ? `${albumArtists} — ${albumName}` : albumName;

  return {
    kind: "album",
    label,
    artistLine: albumArtists,
    trackCount: ids.length || items.length,
    analyzedTrackCount: ids.length || items.length,
    avgFeatures,
    mood,
    sampleTrackLines,
  };
}
