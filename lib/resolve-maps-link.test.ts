import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractName,
  extractUrl,
  nameFromSharedText,
  resolveMapsLink,
  stripTracking,
} from "./resolve-maps-link";

/**
 * The URL an iPhone share actually produces, captured from a real request.
 * Keep it verbatim — it is the regression this whole file exists for.
 */
const REAL_SHARED_URL =
  "https://maps.app.goo.gl/oMaVWQXq5s5T2BRH6?g_st=com.apple.shortcuts.Run-Workflow.(null)";
const REAL_RESOLVED_URL =
  "https://maps.google.com/maps?q=Sukun+%D8%B3%D9%83%D9%88%D9%86+Specialty+Coffee,+Carrer+de+las+Navas+de+Tolosa,+320,+Sant+Andreu,+08027+Barcelona,+Spain&ftid=0x12a4a344dc8eb54f:0xfd9a066675a17206&entry=gps&shh=CAE";
const REAL_NAME = "Sukun سكون Specialty Coffee";

describe("extractName", () => {
  const cases: [label: string, url: string, expected: string | null][] = [
    ["the real resolved iPhone share", REAL_RESOLVED_URL, REAL_NAME],
    [
      "q= with no path segment (first redirect hop)",
      "https://maps.google.com?q=Sukun+Specialty+Coffee,+Carrer+de+las+Navas&ftid=0x1",
      "Sukun Specialty Coffee",
    ],
    [
      "a place whose name contains a comma",
      "https://www.google.com/maps/place/Dishoom,+Shoreditch/@51.5,0.07,17z",
      "Dishoom, Shoreditch",
    ],
    [
      "a percent-encoded place name",
      "https://www.google.com/maps/place/Bar+Ca%C3%B1ete/@41.3,2.1,17z",
      "Bar Cañete",
    ],
    [
      "an apostrophe and accents",
      "https://www.google.com/maps/place/Caf%C3%A9+de+l%27%C3%89toile/@48.8,2.3,17z",
      "Café de l'Étoile",
    ],
    ["a trailing fragment", "https://www.google.com/maps/place/Bar+Test#anchor", "Bar Test"],
    [
      "a /maps/search/ path",
      "https://www.google.com/maps/search/Tickets+Bar/@41.3,2.1,17z",
      "Tickets Bar",
    ],
    [
      "the api=1 search form",
      "https://www.google.com/maps/search/?api=1&query=Tickets+Bar",
      "Tickets Bar",
    ],
    [
      "the api=1 directions form",
      "https://www.google.com/maps/dir/?api=1&destination=Disfrutar+Barcelona",
      "Disfrutar Barcelona",
    ],
    [
      "a coords-only path falls through to the query",
      "https://www.google.com/maps/place/41.3798,2.1723/data=!4m2?q=Real+Name",
      "Real Name",
    ],
    [
      "a place name that starts with a number",
      "https://maps.google.com/maps?q=1900+Cafe,+Carrer+Gran,+Barcelona",
      "1900 Cafe",
    ],
    [
      "an address pin is not a name",
      "https://maps.google.com/maps?q=Carrer+de+las+Navas+de+Tolosa,+320,+Barcelona",
      null,
    ],
    ["bare coordinates", "https://maps.google.com/maps?q=41.3798,2.1723", null],
    ["a loc: prefix", "https://maps.google.com/maps?q=loc:41.3798,2.1723", null],
    ["a plus code", "https://maps.google.com/maps?q=8FH495MJ%2B4V", null],
    [
      "degrees/minutes/seconds",
      "https://maps.google.com/maps?q=41%C2%B022%2748.0%22N+2%C2%B010%2720.3%22E",
      null,
    ],
    ["an opaque place_id", "https://www.google.com/maps/search/?api=1&query=place_id:ChIJxxxx", null],
    ["a map view with no place", "https://www.google.com/maps/@41.3798,2.1723,17z", null],
    ["not a URL at all", "not a url", null],
  ];

  for (const [label, url, expected] of cases) {
    it(`${expected === null ? "rejects" : "reads"} ${label}`, () => {
      expect(extractName(url)).toBe(expected);
    });
  }
});

describe("extractUrl", () => {
  it("keeps the closing bracket of the Shortcut's literal (null)", () => {
    expect(extractUrl(`\n${REAL_SHARED_URL}`)).toBe(REAL_SHARED_URL);
  });

  it("keeps balanced brackets inside a URL", () => {
    const url = "https://en.wikipedia.org/wiki/Bar_(drink)";
    expect(extractUrl(`see ${url}`)).toBe(url);
  });

  it("drops a sentence's full stop", () => {
    expect(extractUrl("see https://maps.app.goo.gl/x.")).toBe("https://maps.app.goo.gl/x");
  });

  it("drops a wrapping bracket but not an inner one", () => {
    expect(extractUrl("(https://maps.app.goo.gl/x_(y))")).toBe("https://maps.app.goo.gl/x_(y)");
  });

  it("drops several trailing punctuation marks", () => {
    expect(extractUrl("really? https://maps.app.goo.gl/x)).")).toBe("https://maps.app.goo.gl/x");
  });

  it("returns null when there is no URL", () => {
    expect(extractUrl("Sukun Specialty Coffee")).toBeNull();
  });
});

describe("nameFromSharedText", () => {
  it("uses a title the phone sent ahead of the URL", () => {
    expect(nameFromSharedText(`${REAL_NAME}\n${REAL_SHARED_URL}`)).toBe(REAL_NAME);
  });

  it("ignores an empty title line", () => {
    expect(nameFromSharedText(`\n${REAL_SHARED_URL}`)).toBeNull();
  });

  it("ignores a bare URL", () => {
    expect(nameFromSharedText(REAL_SHARED_URL)).toBeNull();
  });

  it("ignores punctuation left behind by the URL", () => {
    expect(nameFromSharedText("(https://maps.app.goo.gl/x)")).toBeNull();
  });

  it("ignores a title that is really coordinates", () => {
    expect(nameFromSharedText(`41.3798,2.1723\n${REAL_SHARED_URL}`)).toBeNull();
  });
});

describe("stripTracking", () => {
  it("keeps only the place-identifying params", () => {
    const stripped = stripTracking(REAL_RESOLVED_URL);
    expect(stripped).toContain("ftid=");
    expect(stripped).not.toContain("entry=");
    expect(stripped).not.toContain("shh=");
    expect(stripped.length).toBeLessThan(REAL_RESOLVED_URL.length);
  });

  it("reduces the shared short link to just the link", () => {
    expect(stripTracking(REAL_SHARED_URL)).toBe("https://maps.app.goo.gl/oMaVWQXq5s5T2BRH6");
  });

  it("leaves an unparseable value alone", () => {
    expect(stripTracking("not a url")).toBe("not a url");
  });
});

describe("resolveMapsLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Stub `fetch` with a map of URL -> Location header. */
  function stubRedirects(chain: Record<string, string | null>) {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (!(url in chain)) throw new Error(`unexpected fetch: ${url}`);
      const location = chain[url];
      return {
        headers: { get: (name: string) => (name === "location" ? location : null) },
      } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("follows the real two-redirect chain to the name", async () => {
    const hop1 =
      "https://maps.google.com/?q=Sukun+%D8%B3%D9%83%D9%88%D9%86+Specialty+Coffee,+Carrer+de+las+Navas+de+Tolosa,+320,+Sant+Andreu,+08027+Barcelona,+Spain&ftid=0x1&entry=gps";
    const fetchMock = stubRedirects({
      [REAL_SHARED_URL]: hop1,
      [hop1]: REAL_RESOLVED_URL,
    });

    const result = await resolveMapsLink(`\n${REAL_SHARED_URL}`);

    expect(result).toMatchObject({ ok: true, name: REAL_NAME });
    // The name is found on hop 1, so the second URL is never fetched.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses a title from the share text without fetching at all", async () => {
    const fetchMock = stubRedirects({});

    const result = await resolveMapsLink(`${REAL_NAME}\n${REAL_SHARED_URL}`);

    expect(result).toEqual({
      ok: true,
      name: REAL_NAME,
      resolvedUrl: "https://maps.app.goo.gl/oMaVWQXq5s5T2BRH6",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("steps through Google's consent wall via continue=", async () => {
    const consent = `https://consent.google.com/m?continue=${encodeURIComponent(
      REAL_RESOLVED_URL,
    )}&gl=ES`;
    stubRedirects({ [REAL_SHARED_URL]: consent });

    const result = await resolveMapsLink(REAL_SHARED_URL);

    expect(result).toMatchObject({ ok: true, name: REAL_NAME });
  });

  it("refuses to follow a redirect off Google's domains", async () => {
    const fetchMock = stubRedirects({
      [REAL_SHARED_URL]: "http://169.254.169.254/latest/meta-data/",
    });

    const result = await resolveMapsLink(REAL_SHARED_URL);

    expect(result).toEqual({ ok: false, reason: "no_name" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "http://169.254.169.254/latest/meta-data/",
      expect.anything(),
    );
  });

  it("resolves a relative Location header against the current URL", async () => {
    stubRedirects({
      [REAL_SHARED_URL]: "/maps/place/Bar+Ca%C3%B1ete/@41.3,2.1,17z",
    });

    const result = await resolveMapsLink(REAL_SHARED_URL);

    expect(result).toMatchObject({ ok: true, name: "Bar Cañete" });
  });

  it("reports no_url when there is no link", async () => {
    expect(await resolveMapsLink("just some words")).toEqual({ ok: false, reason: "no_url" });
  });

  it("reports not_maps_link for a lookalike host", async () => {
    expect(await resolveMapsLink("https://evilgoogle.com/maps/place/Fake")).toEqual({
      ok: false,
      reason: "not_maps_link",
    });
  });

  it("reports network_error when the chain throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      }),
    );

    expect(await resolveMapsLink(REAL_SHARED_URL)).toEqual({
      ok: false,
      reason: "network_error",
    });
  });

  it("gives up after the hop budget without looping forever", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        headers: { get: () => "https://maps.google.com/loop" },
      })) as unknown as typeof fetch,
    );

    expect(await resolveMapsLink(REAL_SHARED_URL)).toEqual({ ok: false, reason: "no_name" });
  });
});
