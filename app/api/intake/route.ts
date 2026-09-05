import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { isValidIntakeToken } from "@/lib/auth";
import { resolveMapsLink } from "@/lib/resolve-maps-link";

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

  const url = typeof body === "object" && body !== null ? (body as Record<string, unknown>).url : undefined;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ ok: false, error: "missing_url" }, { status: 400 });
  }

  const result = await resolveMapsLink(url);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  await db.insert(restaurants).values({
    name: result.name,
    cuisine: "unknown",
    sourceUrl: result.resolvedUrl,
  });

  revalidatePath("/");

  return NextResponse.json({ ok: true, name: result.name });
}
