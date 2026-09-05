import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Local dev: @neondatabase/serverless speaks Neon's SQL-over-HTTP protocol,
// which a bare Postgres container doesn't understand. `docker-compose.yml`
// runs a small proxy (ghcr.io/timowilhelm/local-neon-http-proxy) in front of
// plain Postgres that translates it, reachable at db.localtest.me:4444. This
// override is a no-op against real Neon hosts in production.
neonConfig.fetchEndpoint = (host) => {
  const [protocol, port] = host === "db.localtest.me" ? ["http", 4444] : ["https", 443];
  return `${protocol}://${host}:${port}/sql`;
};

// Falls back to a syntactically valid placeholder so importing this module
// (e.g. Next's build-time page-data collection) never throws. Every route
// that queries `db` is force-dynamic, so the real env var is only needed at
// request time, when Vercel (or docker-compose locally) has provided it.
const sql = neon(process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/placeholder");

export const db = drizzle(sql, { schema });
