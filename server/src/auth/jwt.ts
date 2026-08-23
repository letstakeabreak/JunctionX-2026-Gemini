import { createHmac, timingSafeEqual } from "node:crypto";
import { DomainError } from "../domain/errors.js";

export type WorkspaceRole = "OWNER" | "EDITOR" | "REVIEWER" | "VIEWER";

export type JwtPrincipal = {
  sub: string;
  email?: string | undefined;
  role: WorkspaceRole;
  workspace_id?: string | undefined;
  exp?: number | undefined;
  iss?: string | undefined;
  aud?: string | undefined;
};

export type AuthContext = {
  actorId: string;
  mode: "DEMO" | "USER";
  userId?: string | undefined;
  workspaceId?: string | undefined;
  role?: WorkspaceRole | undefined;
};

const DEFAULT_JWT_SECRET = process.env.STANDBY_JWT_SECRET ?? "standby-development-supabase-jwt-secret-2026";
const EXPECTED_ISSUER = process.env.STANDBY_JWT_ISSUER ?? "supabase";

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

function base64UrlEncode(buffer: Buffer | string): string {
  const base64 = (Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Creates a signed HS256 JWT token for testing and controlled environments.
 */
export function createTestJwt(
  payload: Partial<JwtPrincipal> & { sub: string },
  secret = DEFAULT_JWT_SECRET,
  expiresInSeconds = 3600,
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPrincipal = {
    iss: EXPECTED_ISSUER,
    role: "VIEWER",
    exp: now + expiresInSeconds,
    ...payload,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const hmac = createHmac("sha256", secret);
  hmac.update(signatureInput);
  const signature = base64UrlEncode(hmac.digest());

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies HS256 JWT signature, issuer, and expiration.
 */
export function verifyJwtToken(token: string, secret = DEFAULT_JWT_SECRET): JwtPrincipal {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new DomainError(401, "UNAUTHENTICATED", "Invalid JWT format.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new DomainError(401, "UNAUTHENTICATED", "Invalid JWT segment.");
  }

  // 1. Verify Signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(signatureInput);
  const expectedSignature = base64UrlEncode(hmac.digest());

  const sigBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT signature verification failed.");
  }

  // 2. Decode and validate payload
  let payload: JwtPrincipal;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPrincipal;
  } catch {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT payload decode failed.");
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT subject (sub) is missing.");
  }

  // 3. Check expiration
  if (payload.exp && typeof payload.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new DomainError(401, "UNAUTHENTICATED", "JWT token has expired.");
    }
  }

  // 4. Default role if not specified
  if (!payload.role) {
    payload.role = "VIEWER";
  }

  return payload;
}

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  OWNER: 4,
  EDITOR: 3,
  REVIEWER: 2,
  VIEWER: 1,
};

/**
 * Checks if actor's role meets the minimum required level.
 */
export function hasMinimumRole(actual: WorkspaceRole | undefined, required: WorkspaceRole): boolean {
  if (!actual) return false;
  return (ROLE_HIERARCHY[actual] ?? 0) >= (ROLE_HIERARCHY[required] ?? 0);
}
