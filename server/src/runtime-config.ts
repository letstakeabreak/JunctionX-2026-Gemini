export type RuntimeEnvironment = Record<string, string | undefined>;

export type RuntimeConfig = {
  production: boolean;
  port: number;
  allowedOrigins: string[];
  allowAnonymous: boolean;
  apiToken?: string;
  jwtSecret?: string;
  jwtIssuer: string;
  jwtAudience?: string;
  trustProxy: number | false;
  trustFlyClientIp: boolean;
  pollIntervalMs: number;
  providerTimeoutMs: number;
  shutdownGraceMs: number;
};

const PUBLISHED_SECRETS = new Set([
  "local-dev-token",
  "standby-development-supabase-jwt-secret-2026",
  "standby-vercel-serverless-secret-2026",
]);

function integer(env: RuntimeEnvironment, name: string, fallback: number, min: number, max: number): number {
  const value = env[name];
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return Number(value);
}

export function configuredOrigins(values: string[], production = false): string[] {
  return [...new Set(values.map((value) => {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("Allowed origins must be exact HTTP(S) origins."); }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.origin !== value || url.username || url.password || url.hostname.includes("*") ||
        (url.protocol !== "https:" && !(url.protocol === "http:" && local && !production))) {
      throw new Error("Allowed origins must be exact HTTPS origins (local HTTP is development-only).");
    }
    return url.origin;
  }))];
}

export function readRuntimeConfig(env: RuntimeEnvironment = process.env): RuntimeConfig {
  const production = env.NODE_ENV === "production";
  const rawOrigins = env.STANDBY_ALLOWED_ORIGINS ?? (production ? "" : "http://localhost:5173");
  const allowedOrigins = configuredOrigins(rawOrigins.split(",").map((x) => x.trim()).filter(Boolean), production);
  if (production && allowedOrigins.length === 0) throw new Error("STANDBY_ALLOWED_ORIGINS is required in production.");
  if (env.STANDBY_ALLOW_ANONYMOUS !== undefined && !["true", "false"].includes(env.STANDBY_ALLOW_ANONYMOUS)) {
    throw new Error("STANDBY_ALLOW_ANONYMOUS must be true or false.");
  }
  const allowAnonymous = env.STANDBY_ALLOW_ANONYMOUS !== "false";
  const apiToken = env.STANDBY_API_TOKEN ?? (production ? undefined : "local-dev-token");
  const jwtSecret = env.STANDBY_JWT_SECRET;
  for (const [name, value] of [["STANDBY_API_TOKEN", apiToken], ["STANDBY_JWT_SECRET", jwtSecret]] as const) {
    if (value !== undefined && (value.trim() !== value || value.length === 0 ||
      (production && (value.length < 32 || PUBLISHED_SECRETS.has(value))))) {
      throw new Error(`${name} must be a private secret of at least 32 characters in production.`);
    }
  }
  if (production && !allowAnonymous && !apiToken && !jwtSecret) {
    throw new Error("Production requires configured authentication when anonymous demo sessions are disabled.");
  }
  if (production && !env.UPSTAGE_API_KEY?.trim()) throw new Error("UPSTAGE_API_KEY is required for the production backend.");
  const trustProxyHops = integer(env, "STANDBY_TRUST_PROXY_HOPS", 0, 0, 10);
  if (env.STANDBY_TRUST_FLY_CLIENT_IP !== undefined && !["true", "false"].includes(env.STANDBY_TRUST_FLY_CLIENT_IP)) {
    throw new Error("STANDBY_TRUST_FLY_CLIENT_IP must be true or false.");
  }
  const trustFlyClientIp = env.STANDBY_TRUST_FLY_CLIENT_IP === "true";
  if (trustFlyClientIp && production && !env.FLY_APP_NAME?.trim()) {
    throw new Error("STANDBY_TRUST_FLY_CLIENT_IP requires the Fly-managed production runtime.");
  }
  if (trustFlyClientIp && trustProxyHops !== 0) {
    throw new Error("Fly client-IP mode requires STANDBY_TRUST_PROXY_HOPS=0.");
  }
  return {
    production,
    port: integer(env, "PORT", 8787, 1, 65_535),
    allowedOrigins,
    allowAnonymous,
    ...(apiToken ? { apiToken } : {}),
    ...(jwtSecret ? { jwtSecret } : {}),
    jwtIssuer: env.STANDBY_JWT_ISSUER?.trim() || "supabase",
    ...(env.STANDBY_JWT_AUDIENCE?.trim() ? { jwtAudience: env.STANDBY_JWT_AUDIENCE.trim() } : {}),
    trustProxy: trustProxyHops || false,
    trustFlyClientIp,
    pollIntervalMs: integer(env, "UPSTAGE_POLL_INTERVAL_MS", 2_000, 250, 30_000),
    providerTimeoutMs: integer(env, "UPSTAGE_TIMEOUT_MS", 600_000, 1_000, 900_000),
    shutdownGraceMs: integer(env, "STANDBY_SHUTDOWN_GRACE_MS", 30_000, 1_000, 600_000),
  };
}
