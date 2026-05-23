import * as amplitude from "@amplitude/unified";

// ── Helpers ────────────────────────────────────────────────────────────────────

const DOMAIN =
  typeof window !== "undefined" ? window.location.hostname : "vibereader";

function track(event: string, props: Record<string, string | undefined>) {
  amplitude.track(event, { domain: DOMAIN, ...props });
}

function setOnce(key: string, value: string) {
  const identify = new amplitude.Identify();
  identify.setOnce(key, value);
  amplitude.identify(identify);
}

function setProp(key: string, value: string) {
  const identify = new amplitude.Identify();
  identify.set(key, value);
  amplitude.identify(identify);
}

// ── User properties ────────────────────────────────────────────────────────────

export function initUserProperties() {
  const identify = new amplitude.Identify();
  identify.setOnce("Activation Status", "Not Activated");
  amplitude.identify(identify);
}

function markActivated(direction: string, sourceType: string) {
  const already = sessionStorage.getItem("vr_activated");
  if (already) return;
  sessionStorage.setItem("vr_activated", "1");

  const identify = new amplitude.Identify();
  identify.set("Activation Status", "Activated");
  identify.setOnce("Activated At", new Date().toISOString());
  identify.setOnce("First Mix Direction", direction);
  identify.setOnce("First Mix Source Type", sourceType);
  amplitude.identify(identify);
}

// ── Mix Request Submitted ──────────────────────────────────────────────────────

export function trackMixRequestSubmitted(props: {
  mix_direction: string;
  source_type: string;
  source_input_length: number;
  request_id: string;
  prompt_language?: string;
  is_first_mix: boolean;
}) {
  track("Mix Request Submitted", {
    mix_direction: props.mix_direction,
    source_type: props.source_type,
    source_input_length: String(props.source_input_length),
    request_id: props.request_id,
    client_surface: "web",
    prompt_language: props.prompt_language ?? "en",
    is_first_mix: String(props.is_first_mix),
  });
}

// ── Mix Generated ─────────────────────────────────────────────────────────────

export function trackMixGenerated(props: {
  request_id: string;
  mix_slug: string | null;
  mix_direction: string;
  mix_title: string;
  mix_track_count: number;
  generation_latency_ms: number;
}) {
  track("Mix Generated", {
    request_id: props.request_id,
    mix_id: props.mix_slug ?? "",
    mix_slug: props.mix_slug ?? "",
    mix_direction: props.mix_direction,
    mix_title: props.mix_title,
    mix_track_count: String(props.mix_track_count),
    generation_latency_ms: String(props.generation_latency_ms),
  });
  markActivated(
    props.mix_direction,
    props.mix_direction === "book→songs" ? "book" : "spotify",
  );
}

// ── Mix Generation Abandoned ──────────────────────────────────────────────────

export function trackMixGenerationAbandoned(props: {
  request_id: string;
  mix_direction: string;
  source_type: string;
  time_since_submit_ms: number;
  abandon_reason: string;
}) {
  track("Mix Generation Abandoned", {
    request_id: props.request_id,
    mix_direction: props.mix_direction,
    source_type: props.source_type,
    time_since_submit_ms: String(props.time_since_submit_ms),
    abandon_reason: props.abandon_reason,
    client_surface: "web",
  });
}

// ── Mix Viewed ────────────────────────────────────────────────────────────────

export function trackMixViewed(props: {
  mix_id: string;
  mix_slug: string;
  mix_direction: string;
  mix_title: string;
  mix_track_count: number;
  view_source: string;
  is_first_view: boolean;
}) {
  track("Mix Viewed", {
    mix_id: props.mix_id,
    mix_slug: props.mix_slug,
    mix_direction: props.mix_direction,
    mix_title: props.mix_title,
    mix_track_count: String(props.mix_track_count),
    view_source: props.view_source,
    is_first_view: String(props.is_first_view),
  });
}

// ── Archive Viewed ────────────────────────────────────────────────────────────

export function trackArchiveViewed(props: {
  archive_item_count: number;
  archive_sort: string;
  archive_filter_direction: string;
}) {
  const identify = new amplitude.Identify();
  identify.setOnce("Has Viewed Archive", "true");
  amplitude.identify(identify);

  track("Archive Viewed", {
    archive_item_count: String(props.archive_item_count),
    archive_sort: props.archive_sort,
    archive_filter_direction: props.archive_filter_direction,
    client_surface: "web",
    is_first_archive_view: String(!localStorage.getItem("vr_archive_seen")),
  });

  try {
    localStorage.setItem("vr_archive_seen", "1");
  } catch {}
}

// ── Mix Selected ──────────────────────────────────────────────────────────────

export function trackMixSelected(props: {
  mix_id: string;
  mix_slug: string;
  mix_direction: string;
  mix_title: string;
  list_position: number;
  archive_sort: string;
  archive_item_count: number;
}) {
  track("Mix Selected", {
    mix_id: props.mix_id,
    mix_slug: props.mix_slug,
    mix_direction: props.mix_direction,
    mix_title: props.mix_title,
    list_position: String(props.list_position),
    archive_sort: props.archive_sort,
    archive_item_count: String(props.archive_item_count),
  });
}

// ── External Link Opened ──────────────────────────────────────────────────────

export function trackExternalLinkOpened(props: {
  external_destination: string;
  external_link_type: string;
  external_url_domain: string;
  mix_id: string;
  mix_title: string;
  track_number?: number;
  external_query?: string;
}) {
  const identify = new amplitude.Identify();
  identify.setOnce("Has Opened External Link", "true");
  amplitude.identify(identify);

  track("External Link Opened", {
    external_destination: props.external_destination,
    external_link_type: props.external_link_type,
    external_url_domain: props.external_url_domain,
    mix_id: props.mix_id,
    mix_title: props.mix_title,
    track_number:
      props.track_number != null ? String(props.track_number) : undefined,
    external_query: props.external_query,
  });
}

// ── Track Link Opened ─────────────────────────────────────────────────────────

export function trackTrackLinkOpened(props: {
  mix_id: string;
  mix_title: string;
  track_number: number;
  track_title: string;
  track_artist: string;
  external_destination: string;
  external_query: string;
}) {
  track("Track Link Opened", {
    mix_id: props.mix_id,
    mix_title: props.mix_title,
    track_number: String(props.track_number),
    track_title: props.track_title,
    track_artist: props.track_artist,
    external_destination: props.external_destination,
    external_query: props.external_query,
  });
}

// ── Mix Opened In Spotify ─────────────────────────────────────────────────────

export function trackMixOpenedInSpotify(props: {
  mix_id: string;
  mix_title: string;
  mix_direction: string;
  external_query: string;
  view_source: string;
}) {
  track("Mix Opened In Spotify", {
    mix_id: props.mix_id,
    mix_title: props.mix_title,
    mix_direction: props.mix_direction,
    external_destination: "spotify",
    external_query: props.external_query,
    view_source: props.view_source,
  });
}

// ── Bookshop Opened ───────────────────────────────────────────────────────────

export function trackBookshopOpened(props: {
  mix_id: string;
  mix_title: string;
  book_title: string;
  book_author: string;
  external_query: string;
}) {
  track("Bookshop Opened", {
    mix_id: props.mix_id,
    mix_title: props.mix_title,
    book_title: props.book_title,
    book_author: props.book_author,
    external_destination: "bookshop",
    external_query: props.external_query,
  });
}

// ── About Opened ──────────────────────────────────────────────────────────────

export function trackAboutOpened(props: {
  external_destination: string;
  external_url_domain: string;
  client_surface: string;
}) {
  track("About Opened", {
    external_destination: props.external_destination,
    external_url_domain: props.external_url_domain,
    client_surface: props.client_surface,
  });
}

// ── Error Encountered ─────────────────────────────────────────────────────────

export function trackErrorEncountered(props: {
  error_category: string;
  error_message: string;
  error_context: string;
  request_id?: string;
  mix_direction?: string;
  http_status_code?: string;
}) {
  track("Error Encountered", {
    error_category: props.error_category,
    error_message: props.error_message,
    error_context: props.error_context,
    request_id: props.request_id,
    mix_direction: props.mix_direction,
    http_status_code: props.http_status_code,
  });
}
