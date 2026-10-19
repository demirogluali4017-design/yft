import type { PoolConfig } from "pg";

/** Serverless-safe Postgres pool. Supabase session mode (port 5432) caps clients at 15. */
export function postgresPoolConfig(connectionString: string): PoolConfig {
  let url = connectionString;
  try {
    const parsed = new URL(connectionString);
    if (parsed.hostname.includes("pooler.supabase.com") && parsed.port !== "6543") {
      parsed.port = "6543";
      url = parsed.toString();
    }
  } catch {
    /* keep the original string */
  }
  return {
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 1_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  };
}
