import { cookies } from "next/headers";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";

export async function requireAuth(): Promise<void> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!isValidToken(token)) {
    throw new Error("Not authenticated");
  }
}
