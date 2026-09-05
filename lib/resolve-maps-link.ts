export type ResolveResult =
  | { ok: true; name: string; resolvedUrl: string }
  | { ok: false; reason: "no_url" | "not_maps_link" | "no_name" | "network_error" };

const URL_RE = /https?:\/\/\S+/i;

function extractUrl(text: string): string | null {
  const match = text.match(URL_RE);
  return match ? match[0].replace(/[.,)\]]+$/, "") : null;
}

function extractName(url: string): string | null {
  const placeMatch = url.match(/\/maps\/place\/([^/@]+)/);
  if (!placeMatch) return null;
  const raw = placeMatch[1].replace(/\+/g, " ");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isMapsUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith("google.com") || host.endsWith("goo.gl") || host.endsWith("app.goo.gl");
  } catch {
    return false;
  }
}

export async function resolveMapsLink(text: string): Promise<ResolveResult> {
  const startUrl = extractUrl(text);
  if (!startUrl) return { ok: false, reason: "no_url" };
  if (!isMapsUrl(startUrl)) return { ok: false, reason: "not_maps_link" };

  let currentUrl = startUrl;
  try {
    for (let hop = 0; hop < 3; hop++) {
      const name = extractName(currentUrl);
      if (name) {
        return { ok: true, name, resolvedUrl: currentUrl };
      }

      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
      });
      const location = response.headers.get("location");
      if (!location) break;
      currentUrl = location;
    }
  } catch {
    return { ok: false, reason: "network_error" };
  }

  const finalName = extractName(currentUrl);
  if (finalName) {
    return { ok: true, name: finalName, resolvedUrl: currentUrl };
  }
  return { ok: false, reason: "no_name" };
}
