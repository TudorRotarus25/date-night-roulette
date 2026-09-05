import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE = "dnr_auth";
export const AUTH_COOKIE_MAX_AGE = 34_560_000; // ~400 days

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** The value the auth cookie must carry to be considered valid. */
export function expectedToken(): string {
  const passphrase = process.env.APP_PASSPHRASE;
  const secret = process.env.AUTH_SECRET;
  if (!passphrase || !secret) {
    throw new Error("APP_PASSPHRASE and AUTH_SECRET must be set");
  }
  return hmac(passphrase, secret);
}

/** Constant-time comparison of a candidate token against the expected one. */
export function isValidToken(candidate: string | undefined | null): boolean {
  if (!candidate) return false;
  const expected = expectedToken();
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Constant-time comparison for the passphrase itself, entered at /login. */
export function isValidPassphrase(candidate: string | undefined | null): boolean {
  if (!candidate) return false;
  const passphrase = process.env.APP_PASSPHRASE;
  if (!passphrase) {
    throw new Error("APP_PASSPHRASE must be set");
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(passphrase);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Constant-time comparison of the X-Intake-Token header. */
export function isValidIntakeToken(candidate: string | undefined | null): boolean {
  if (!candidate) return false;
  const expected = process.env.INTAKE_TOKEN;
  if (!expected) {
    throw new Error("INTAKE_TOKEN must be set");
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
