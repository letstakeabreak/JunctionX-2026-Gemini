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
  nbf?: number | undefined;
};

export type AuthContext = {
  actorId: string;
  mode: "DEMO" | "USER";
  userId?: string | undefined;
  workspaceId?: string | undefined;
  role?: WorkspaceRole | undefined;
};

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
  secret: string,
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
export function verifyJwtToken(
  token: string,
  secret = process.env.STANDBY_JWT_SECRET,
  options: { issuer?: string; audience?: string } = {},
): JwtPrincipal {
  if (!secret) throw new DomainError(503, "AUTH_NOT_CONFIGURED", "JWT authentication is not configured.");
  if (token.length > 16_384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw new DomainError(401, "UNAUTHENTICATED", "Invalid JWT format.");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new DomainError(401, "UNAUTHENTICATED", "Invalid JWT format.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new DomainError(401, "UNAUTHENTICATED", "Invalid JWT segment.");
  }

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader));
    if (!header || typeof header !== "object" || Array.isArray(header) || header.alg !== "HS256" ||
      (header.typ !== undefined && header.typ !== "JWT")) throw new Error("Unsupported JWT header.");
  } catch {
    throw new DomainError(401, "UNAUTHENTICATED", "Invalid JWT header.");
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
    const decoded: unknown = JSON.parse(base64UrlDecode(encodedPayload));
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("JWT payload must be an object.");
    payload = decoded as JwtPrincipal;
  } catch {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT payload decode failed.");
  }

  if (!payload.sub || typeof payload.sub !== "string" || payload.sub.length > 256 || payload.sub.trim() !== payload.sub) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT subject (sub) is missing.");
  }

  // 3. Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || !Number.isSafeInteger(payload.exp) || payload.exp <= now) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT token has expired or has no valid expiry.");
  }
  if (payload.nbf !== undefined && (typeof payload.nbf !== "number" || !Number.isSafeInteger(payload.nbf) || payload.nbf > now)) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT token is not active.");
  }
  if (payload.iss !== (options.issuer ?? EXPECTED_ISSUER)) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT issuer is invalid.");
  }
  const audience = options.audience ?? process.env.STANDBY_JWT_AUDIENCE;
  if (audience && payload.aud !== audience && !(Array.isArray(payload.aud) && payload.aud.includes(audience))) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT audience is invalid.");
  }
  if (payload.workspace_id !== undefined && (typeof payload.workspace_id !== "string" || !payload.workspace_id || payload.workspace_id.length > 256)) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT workspace is invalid.");
  }

  // 4. Default role if not specified
  if (!payload.role) {
    payload.role = "VIEWER";
  }
  if (!["OWNER", "EDITOR", "REVIEWER", "VIEWER"].includes(payload.role)) {
    throw new DomainError(401, "UNAUTHENTICATED", "JWT role is invalid.");
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
