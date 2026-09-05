"use server";

import { resolveMapsLink, type ResolveResult } from "@/lib/resolve-maps-link";
import { requireAuth } from "@/lib/require-auth";

export async function resolveLink(text: string): Promise<ResolveResult> {
  await requireAuth();
  return resolveMapsLink(text);
}
