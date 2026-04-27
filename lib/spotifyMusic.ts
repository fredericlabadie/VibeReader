let cachedToken: { value: string; expiresAt: number } | null = null;

function env(name: string) {
  return process.env[name]?.trim() ?? "";
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

export type ParsedSpotifyMusic =
  | { kind: "track"; id: string }
  | { kind: "album"; id: string };

export function parseSpotifyMusicUrl(input: string): ParsedSpotifyMusic | null {
  const raw = input.trim();
  if (!raw) return null;

  const trackUri = raw.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  if (trackUri) return { kind: "track", id: trackUri[1] };
  const albumUri = raw.match(/^spotify:album:([a-zA-Z0-9]+)$/);
  if (albumUri) return { kind: "album", id: albumUri[1] };

  try {
    const url = new URL(raw);
    if (!url.hostname.includes("spotify.com")) return null;
    const trackPath = url.pathname.match(/\/track\/([a-zA-Z0-9]+)/);
    if (trackPath) return { kind: "track", id: trackPath[1] };
    const albumPath = url.pathname.match(/\/album\/([a-zA-Z0-9]+)/);
    if (albumPath) return { kind: "album", id: albumPath[1] };
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

export type MusicListeningDigest = {
  kind: "track" | "album";
  label: string;
  artistLine: string;
  trackCount: number;
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
    {
      valence: 0,
      energy: 0,
      danceability: 0,
      acousticness: 0,
      instrumentalness: 0,
      tempo: 0,
    },
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

export async function fetchMusicListeningDigest(spotifyUrl: string): Promise<MusicListeningDigest> {
  const parsed = parseSpotifyMusicUrl(spotifyUrl);
  if (!parsed) {
    throw new Error("Paste a Spotify track or album link (open.spotify.com or spotify: URI).");
  }

  if (!hasSpotifyCreds()) {
    throw new Error("Spotify credentials missing. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
  }

  const token = await getSpotifyAppToken();
  const headers = { Authorization: `Bearer ${token}` };

  if (parsed.kind === "track") {
    const tr = await fetch(`https://api.spotify.com/v1/tracks/${parsed.id}`, { headers });
    if (!tr.ok) {
      throw new Error("Could not load that track. Check the link is valid and the release is on Spotify.");
    }
    const tj = await tr.json() as {
      name?: string;
      artists?: Array<{ name?: string }>;
    };
    const name = tj.name ?? "Track";
    const artistLine = Array.isArray(tj.artists) ? tj.artists.map((a) => a.name).filter(Boolean).join(", ") : "";
    const label = artistLine ? `${artistLine} — ${name}` : name;

    const features = await fetchAudioFeaturesForIds(token, [parsed.id]);
    const avgFeatures = averageFeatures(features);
    const mood = deriveMoodFromFeatures(avgFeatures);

    return {
      kind: "track",
      label,
      artistLine,
      trackCount: 1,
      avgFeatures,
      mood,
      sampleTrackLines: [label],
    };
  }

  const al = await fetch(`https://api.spotify.com/v1/albums/${parsed.id}`, { headers });
  if (!al.ok) {
    throw new Error("Could not load that album. Check the link is valid and the release is on Spotify.");
  }
  const aj = await al.json() as {
    name?: string;
    artists?: Array<{ name?: string }>;
    tracks?: { items?: Array<{ id?: string; name?: string; artists?: Array<{ name?: string }> }> };
  };
  const albumName = aj.name ?? "Album";
  const albumArtists = Array.isArray(aj.artists) ? aj.artists.map((a) => a.name).filter(Boolean).join(", ") : "";
  const items = aj.tracks?.items ?? [];
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
    avgFeatures,
    mood,
    sampleTrackLines,
  };
}
