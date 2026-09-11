export type ResolveResult =
  | { ok: true; name: string; resolvedUrl: string }
  | { ok: false; reason: "no_url" | "not_maps_link" | "no_name" | "network_error" };

const URL_RE = /https?:\/\/\S+/i;
const URL_RE_ALL = /https?:\/\/\S+/gi;

const MAX_HOPS = 6;
const FETCH_TIMEOUT_MS = 5000;

/** Params that identify the place. Everything else Google adds is tracking. */
const KEEP_PARAMS = new Set(["q", "ftid", "cid", "place_id"]);

const PLACE_RE = /\/maps\/(?:place|search)\/([^/@?#]+)/;
const NAME_PARAM_KEYS = ["q", "query", "destination", "daddr"] as const;

// A decimal, or two or more numbers: "41.3798", "41.3798,2.1723", "41.3 2.1".
// A bare integer is deliberately not coordinates, so a place named "1900" survives.
const COORDS_RE =
  /^[-+]?\d+\.\d+([\s,]+[-+]?\d+(\.\d+)?)*$|^[-+]?\d+([\s,]+[-+]?\d+(\.\d+)?)+$/;
const DMS_RE = /^\d+°[\d'".\s]*[NS][,\s]+\d+°[\d'".\s]*[EW]$/i;
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;
const OPAQUE_ID_RE = /^(place_id|loc|cid|ftid|id)\s*:/i;

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

const count = (haystack: string, char: string) => haystack.split(char).length - 1;

export function extractUrl(text: string): string | null {
  const match = text.match(URL_RE);
  if (!match) return null;

  // Strip prose punctuation, but only strip a closing bracket when it's
  // unbalanced — the iOS Shortcut sends URLs ending in a literal "(null)".
  let url = match[0];
  for (;;) {
    const last = url[url.length - 1];
    if (!last) return null;
    if (".,;:!?".includes(last)) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === ")" && count(url, ")") > count(url, "(")) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === "]" && count(url, "]") > count(url, "[")) {
      url = url.slice(0, -1);
      continue;
    }
    return url;
  }
}

function decodePathSegment(segment: string): string {
  const raw = segment.replace(/\+/g, " "); // before decoding, so %2B stays a literal "+"
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** A location rather than a name: coordinates, plus code, DMS, opaque id, or a URL. */
function isNotAName(value: string): boolean {
  return (
    COORDS_RE.test(value) ||
    DMS_RE.test(value) ||
    PLUS_CODE_RE.test(value) ||
    OPAQUE_ID_RE.test(value) ||
    /^https?:\/\//i.test(value)
  );
}

/**
 * `q` is "<Name>, <address>" for a place, or just "<address>" for an address
 * pin. In the address-only form the second segment is a street number, which
 * is how we tell the two apart without knowing anything about local addresses.
 */
function nameFromQuery(value: string): string | null {
  const parts = value.split(",").map(normalize);
  const first = parts[0];
  if (!first || isNotAName(first)) return null;
  if (parts[1] && /^\d+[a-z]?$/i.test(parts[1])) return null;
  return first;
}

export function extractName(url: string): string | null {
  const placeMatch = url.match(PLACE_RE);
  if (placeMatch) {
    // A path segment is the whole name — never comma-split it, or
    // "/maps/place/Dishoom,+Shoreditch" loses half its name.
    const candidate = normalize(decodePathSegment(placeMatch[1]));
    if (candidate && !isNotAName(candidate)) return candidate;
    // A coords-only path falls through to the query params below.
  }

  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return null;
  }
  for (const key of NAME_PARAM_KEYS) {
    const raw = params.get(key);
    if (!raw) continue;
    const name = nameFromQuery(raw);
    if (name) return name;
  }
  return null;
}

/**
 * Maps shares often arrive as a "<title>\n<url>" blob. A title the phone
 * already gave us beats anything we can parse back out of Google's URLs.
 */
export function nameFromSharedText(text: string): string | null {
  const remainder = text.replace(URL_RE_ALL, " ");
  const line = remainder
    .split(/[\r\n]+/)
    .map(normalize)
    .find(Boolean);
  if (!line) return null;
  if (!/[\p{L}\p{N}]/u.test(line)) return null; // punctuation left over from the URL
  if (isNotAName(line)) return null;
  return line;
}

function isMapsUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return (
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "goo.gl" ||
    host.endsWith(".goo.gl")
  );
}

export function stripTracking(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (!KEEP_PARAMS.has(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Google's consent wall carries the URL we actually wanted in `continue`. */
function consentContinuation(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "consent.google.com") return null;
    const next = parsed.searchParams.get("continue");
    return next && isMapsUrl(next) ? next : null;
  } catch {
    return null;
  }
}

/** The next URL in the redirect chain, or null when the chain ends. */
async function nextHop(currentUrl: string): Promise<string | null> {
  const consent = consentContinuation(currentUrl);
  if (consent) return consent;

  const response = await fetch(currentUrl, {
    method: "HEAD",
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const location = response.headers.get("location");
  if (!location) return null;

  // `Location` may be relative (RFC 7231), and a goo.gl shortlink can point
  // anywhere at all — so re-check the host on every hop, not just the first.
  const resolved = new URL(location, currentUrl).toString();
  return isMapsUrl(resolved) ? resolved : null;
}

export async function resolveMapsLink(text: string): Promise<ResolveResult> {
  const startUrl = extractUrl(text);
  if (!startUrl) return { ok: false, reason: "no_url" };
  if (!isMapsUrl(startUrl)) return { ok: false, reason: "not_maps_link" };

  const sharedName = nameFromSharedText(text);
  if (sharedName) {
    return { ok: true, name: sharedName, resolvedUrl: stripTracking(startUrl) };
  }

  let currentUrl = startUrl;
  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const name = extractName(currentUrl);
      if (name) {
        return { ok: true, name, resolvedUrl: stripTracking(currentUrl) };
      }

      const next = await nextHop(currentUrl);
      if (!next) break;
      currentUrl = next;
    }
  } catch {
    return { ok: false, reason: "network_error" };
  }

  const finalName = extractName(currentUrl);
  if (finalName) {
    return { ok: true, name: finalName, resolvedUrl: stripTracking(currentUrl) };
  }
  return { ok: false, reason: "no_name" };
}
