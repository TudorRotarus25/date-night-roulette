import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { isValidIntakeToken } from "@/lib/auth";
import { extractUrl, resolveMapsLink, stripTracking } from "@/lib/resolve-maps-link";
import { revalidateAll } from "@/lib/revalidate";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-intake-token");
  if (!isValidIntakeToken(token)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const url = fields.url;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });
  }

  // The Shortcut can send the share sheet's title alongside the link. A name
  // the phone already knows beats anything we can parse out of Google's URLs.
  const sharedName = typeof fields.name === "string" ? fields.name.trim() : "";

  const result = await resolveMapsLink(url);

  // A supplied name rescues a link that resolved fine but carried no name (a
  // dropped pin). A link we couldn't resolve at all is still an error.
  if (!result.ok && !(result.reason === "no_name" && sharedName)) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  const name = sharedName || (result.ok ? result.name.trim() : "");
  if (!name) {
    return NextResponse.json({ ok: false, error: "no_name" }, { status: 400 });
  }

  await db.insert(restaurants).values({
    name,
    cuisine: "unknown",
    sourceUrl: (result.ok ? result.resolvedUrl : stripTracking(extractUrl(url) ?? "")) || null,
  });

  revalidateAll();

  return NextResponse.json({ ok: true, name });
}
