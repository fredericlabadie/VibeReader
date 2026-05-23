import * as amplitude from "@amplitude/unified";

// ── Helpers ────────────────────────────────────────────────────────────────────

const DOMAIN =
  typeof window !== "undefined" ? window.location.hostname : "vibereader";

function track(event: string, props: Record<string, string | undefined>) {
  amplitude.track(event, { Domain: DOMAIN, ...props });
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

// ── mixRequestSubmitted ────────────────────────────────────────────────────────

export function trackMixRequestSubmitted(props: {
  mix_direction: string;
  source_type: string;
  source_input_length: number;
  request_id: string;
  prompt_language?: string;
  is_first_mix: boolean;
}) {
  track("mixRequestSubmitted", {
    MixDirection: props.mix_direction,
    SourceType: props.source_type,
    SourceInputLength: String(props.source_input_length),
    RequestId: props.request_id,
    ClientSurface: "web",
    PromptLanguage: props.prompt_language ?? "en",
    IsFirstMix: String(props.is_first_mix),
  });
}

// ── mixGenerated ──────────────────────────────────────────────────────────────

export function trackMixGenerated(props: {
  request_id: string;
  mix_slug: string | null;
  mix_direction: string;
  mix_title: string;
  mix_track_count: number;
  generation_latency_ms: number;
}) {
  track("mixGenerated", {
    RequestId: props.request_id,
    MixId: props.mix_slug ?? "",
    MixSlug: props.mix_slug ?? "",
    MixDirection: props.mix_direction,
    MixTitle: props.mix_title,
    MixTrackCount: String(props.mix_track_count),
    GenerationLatencyMs: String(props.generation_latency_ms),
  });
  markActivated(
    props.mix_direction,
    props.mix_direction === "book→songs" ? "book" : "spotify",
  );
}

// ── mixGenerationAbandoned ────────────────────────────────────────────────────

export function trackMixGenerationAbandoned(props: {
  request_id: string;
  mix_direction: string;
  source_type: string;
  time_since_submit_ms: number;
  abandon_reason: string;
}) {
  track("mixGenerationAbandoned", {
    RequestId: props.request_id,
    MixDirection: props.mix_direction,
    SourceType: props.source_type,
    TimeSinceSubmitMs: String(props.time_since_submit_ms),
    AbandonReason: props.abandon_reason,
    ClientSurface: "web",
  });
}

// ── mixViewed ─────────────────────────────────────────────────────────────────

export function trackMixViewed(props: {
  mix_id: string;
  mix_slug: string;
  mix_direction: string;
  mix_title: string;
  mix_track_count: number;
  view_source: string;
  is_first_view: boolean;
}) {
  track("mixViewed", {
    MixId: props.mix_id,
    MixSlug: props.mix_slug,
    MixDirection: props.mix_direction,
    MixTitle: props.mix_title,
    MixTrackCount: String(props.mix_track_count),
    ViewSource: props.view_source,
    IsFirstView: String(props.is_first_view),
  });
}

// ── archiveViewed ─────────────────────────────────────────────────────────────

export function trackArchiveViewed(props: {
  archive_item_count: number;
  archive_sort: string;
  archive_filter_direction: string;
}) {
  const identify = new amplitude.Identify();
  identify.setOnce("Has Viewed Archive", "true");
  amplitude.identify(identify);

  track("archiveViewed", {
    ArchiveItemCount: String(props.archive_item_count),
    ArchiveSort: props.archive_sort,
    ArchiveFilterDirection: props.archive_filter_direction,
    ClientSurface: "web",
    IsFirstArchiveView: String(!localStorage.getItem("vr_archive_seen")),
  });

  try {
    localStorage.setItem("vr_archive_seen", "1");
  } catch {}
}

// ── mixSelected ───────────────────────────────────────────────────────────────

export function trackMixSelected(props: {
  mix_id: string;
  mix_slug: string;
  mix_direction: string;
  mix_title: string;
  list_position: number;
  archive_sort: string;
  archive_item_count: number;
}) {
  track("mixSelected", {
    MixId: props.mix_id,
    MixSlug: props.mix_slug,
    MixDirection: props.mix_direction,
    MixTitle: props.mix_title,
    ListPosition: String(props.list_position),
    ArchiveSort: props.archive_sort,
    ArchiveItemCount: String(props.archive_item_count),
  });
}

// ── externalLinkOpened ────────────────────────────────────────────────────────

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

  track("externalLinkOpened", {
    ExternalDestination: props.external_destination,
    ExternalLinkType: props.external_link_type,
    ExternalUrlDomain: props.external_url_domain,
    MixId: props.mix_id,
    MixTitle: props.mix_title,
    TrackNumber:
      props.track_number != null ? String(props.track_number) : undefined,
    ExternalQuery: props.external_query,
  });
}

// ── trackLinkOpened ───────────────────────────────────────────────────────────

export function trackTrackLinkOpened(props: {
  mix_id: string;
  mix_title: string;
  track_number: number;
  track_title: string;
  track_artist: string;
  external_destination: string;
  external_query: string;
}) {
  track("trackLinkOpened", {
    MixId: props.mix_id,
    MixTitle: props.mix_title,
    TrackNumber: String(props.track_number),
    TrackTitle: props.track_title,
    TrackArtist: props.track_artist,
    ExternalDestination: props.external_destination,
    ExternalQuery: props.external_query,
  });
}

// ── mixOpenedInSpotify ────────────────────────────────────────────────────────

export function trackMixOpenedInSpotify(props: {
  mix_id: string;
  mix_title: string;
  mix_direction: string;
  external_query: string;
  view_source: string;
}) {
  track("mixOpenedInSpotify", {
    MixId: props.mix_id,
    MixTitle: props.mix_title,
    MixDirection: props.mix_direction,
    ExternalDestination: "spotify",
    ExternalQuery: props.external_query,
    ViewSource: props.view_source,
  });
}

// ── bookshopOpened ────────────────────────────────────────────────────────────

export function trackBookshopOpened(props: {
  mix_id: string;
  mix_title: string;
  book_title: string;
  book_author: string;
  external_query: string;
}) {
  track("bookshopOpened", {
    MixId: props.mix_id,
    MixTitle: props.mix_title,
    BookTitle: props.book_title,
    BookAuthor: props.book_author,
    ExternalDestination: "bookshop",
    ExternalQuery: props.external_query,
  });
}

// ── aboutOpened ───────────────────────────────────────────────────────────────

export function trackAboutOpened(props: {
  external_destination: string;
  external_url_domain: string;
  client_surface: string;
}) {
  track("aboutOpened", {
    ExternalDestination: props.external_destination,
    ExternalUrlDomain: props.external_url_domain,
    ClientSurface: props.client_surface,
  });
}

// ── errorEncountered ──────────────────────────────────────────────────────────

export function trackErrorEncountered(props: {
  error_category: string;
  error_message: string;
  error_context: string;
  request_id?: string;
  mix_direction?: string;
  http_status_code?: string;
}) {
  track("errorEncountered", {
    ErrorCategory: props.error_category,
    ErrorMessage: props.error_message,
    ErrorContext: props.error_context,
    RequestId: props.request_id,
    MixDirection: props.mix_direction,
    HttpStatusCode: props.http_status_code,
  });
}
