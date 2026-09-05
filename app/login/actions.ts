"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE, expectedToken, isValidPassphrase } from "@/lib/auth";

export async function login(formData: FormData) {
  const passphrase = formData.get("passphrase");
  const next = formData.get("next");
  const safeNext = typeof next === "string" && next.startsWith("/") ? next : "/";

  if (typeof passphrase !== "string" || !isValidPassphrase(passphrase)) {
    redirect(`/login?next=${encodeURIComponent(safeNext)}&error=1`);
  }

  const store = await cookies();
  store.set(AUTH_COOKIE, expectedToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  });

  redirect(safeNext);
}
