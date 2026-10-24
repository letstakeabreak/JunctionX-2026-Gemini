import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { buildApp } from "../src/app.js";
import { createTestJwt, verifyJwtToken } from "../src/auth/jwt.js";
import { readRuntimeConfig } from "../src/runtime-config.js";

const KEY = "runtime-test-private-key-at-least-32-characters";
const ORIGIN = "https://standby-junctionx.vercel.app";
const PRODUCTION_ENV = {
  NODE_ENV: "production", STANDBY_ALLOWED_ORIGINS: ORIGIN, UPSTAGE_API_KEY: "test-provider-not-used",
};

function rawJwt(payload: unknown, header: unknown = { alg: "HS256", typ: "JWT" }): string {
  const encoded = [header, payload].map((value) => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".");
  return `${encoded}.${createHmac("sha256", KEY).update(encoded).digest("base64url")}`;
}

test("production runtime requires explicit provider and origin configuration without changing UUID demo identity", () => {
  const config = readRuntimeConfig(PRODUCTION_ENV);
  assert.equal(config.allowAnonymous, true);
  assert.equal(config.jwtSecret, undefined);
  assert.equal(config.apiToken, undefined);
  assert.equal(config.port, 8787);
  assert.equal(config.trustProxy, false);
  assert.equal(config.trustFlyClientIp, false);
  assert.throws(() => readRuntimeConfig({ NODE_ENV: "production" }), /STANDBY_ALLOWED_ORIGINS/);
  assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, UPSTAGE_API_KEY: "" }), /UPSTAGE_API_KEY/);
  assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, STANDBY_ALLOW_ANONYMOUS: "false" }), /authentication/);
  for (const value of ["*", "https://*.vercel.app", "http://localhost:5173", `${ORIGIN}/path`]) {
    assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, STANDBY_ALLOWED_ORIGINS: value }));
  }
  for (const name of ["STANDBY_API_TOKEN", "STANDBY_JWT_SECRET"]) {
    for (const value of ["short", "local-dev-token", "standby-development-supabase-jwt-secret-2026", "standby-vercel-serverless-secret-2026"]) {
      assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, [name]: value }), new RegExp(name));
    }
  }
  for (const [name, value] of [["PORT", "8787junk"], ["STANDBY_TRUST_PROXY_HOPS", "true"], ["UPSTAGE_TIMEOUT_MS", "-1"]]) {
    assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, [name!]: value }), new RegExp(name!));
  }
  assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, STANDBY_TRUST_FLY_CLIENT_IP: "yes" }), /STANDBY_TRUST_FLY_CLIENT_IP/);
  assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, STANDBY_TRUST_FLY_CLIENT_IP: "true" }), /Fly-managed/);
  assert.throws(() => readRuntimeConfig({ ...PRODUCTION_ENV, STANDBY_TRUST_FLY_CLIENT_IP: "true", FLY_APP_NAME: "controlled-test", STANDBY_TRUST_PROXY_HOPS: "1" }), /TRUST_PROXY_HOPS=0/);
  assert.equal(readRuntimeConfig({ ...PRODUCTION_ENV, STANDBY_TRUST_FLY_CLIENT_IP: "true", FLY_APP_NAME: "controlled-test" }).trustFlyClientIp, true);
});

test("JWT verification checks signed structure, algorithm, issuer, expiry, audience and activation", () => {
  const now = Math.floor(Date.now() / 1000);
  const valid = { sub: "actor", iss: "supabase", exp: now + 300, role: "OWNER" };
  assert.equal(verifyJwtToken(rawJwt(valid), KEY).sub, "actor");
  for (const payload of [null, [], { ...valid, sub: "" }, { ...valid, exp: undefined }, { ...valid, exp: "9999999999" },
    { ...valid, exp: 0 }, { ...valid, exp: now }, { ...valid, iss: "untrusted" }, { ...valid, role: "ADMIN" },
    { ...valid, nbf: now + 300 }, { ...valid, workspace_id: {} }]) {
    assert.throws(() => verifyJwtToken(rawJwt(payload), KEY), (error: any) => error.statusCode === 401);
  }
  assert.throws(() => verifyJwtToken(rawJwt(valid, { alg: "none" }), KEY), /header/);
  assert.throws(() => verifyJwtToken(rawJwt({ ...valid, aud: "wrong" }), KEY, { audience: "standby" }), /audience/);
  assert.equal(verifyJwtToken(rawJwt({ ...valid, aud: "standby" }), KEY, { audience: "standby" }).sub, "actor");
});

test("an unconfigured JWT endpoint fails closed while UUID demo sessions still work", async () => {
  const app = await buildApp({ allowedOrigins: [ORIGIN], allowAnonymous: true });
  try {
    const forged = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      authorization: `Bearer ${createTestJwt({ sub: "attacker", role: "OWNER" }, "standby-development-supabase-jwt-secret-2026")}`,
      "idempotency-key": "published-key",
    }, payload: { title: "rejected" } });
    assert.equal(forged.statusCode, 503);
    const demo = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      "x-standby-session": "5d1d3514-6277-4a32-8109-ce01035830b4", "idempotency-key": "demo",
    }, payload: { title: "allowed isolated demo" } });
    assert.equal(demo.statusCode, 201);
  } finally { await app.close(); }
});

test("CORS permits only configured exact origins, including denying unrelated Vercel projects", async () => {
  const app = await buildApp({ allowedOrigins: [ORIGIN], allowAnonymous: true });
  try {
    const valid = await app.inject({ method: "GET", url: "/healthz", headers: { origin: ORIGIN } });
    assert.equal(valid.statusCode, 200);
    assert.equal(valid.headers["access-control-allow-origin"], ORIGIN);
    for (const origin of ["https://attacker.vercel.app", `${ORIGIN}.evil.invalid`, "http://localhost:6666"]) {
      const denied = await app.inject({ method: "GET", url: "/healthz", headers: { origin } });
      assert.equal(denied.statusCode, 403);
      assert.equal(denied.headers["access-control-allow-origin"], undefined);
    }
  } finally { await app.close(); }
});

test("creating a case cannot add an outsider to an existing workspace or promote a viewer", async () => {
  const app = await buildApp({ allowedOrigins: [ORIGIN], allowAnonymous: true, jwtSecret: KEY });
  const workspace = "ws_private";
  const auth = (sub: string, role: "OWNER" | "EDITOR" | "VIEWER" = "OWNER") => ({
    authorization: `Bearer ${createTestJwt({ sub, role, workspace_id: workspace }, KEY)}`,
  });
  try {
    const created = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      ...auth("owner"), "idempotency-key": "workspace-owner",
    }, payload: { title: "private", workspace_id: workspace } });
    assert.equal(created.statusCode, 201);
    const id = created.json().case_id;
    for (const [user, role] of [["editor", "EDITOR"], ["viewer", "VIEWER"]]) {
      const response = await app.inject({ method: "POST", url: `/v1/workspaces/${workspace}/members`, headers: auth("owner"), payload: { user_id: user, role } });
      assert.equal(response.statusCode, 201);
    }
    const outsider = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      ...auth("attacker"), "idempotency-key": "takeover",
    }, payload: { title: "takeover", workspace_id: workspace } });
    assert.equal(outsider.statusCode, 404);
    const read = await app.inject({ method: "GET", url: `/v1/cases/${id}/review-queue`, headers: auth("attacker") });
    assert.equal(read.statusCode, 404);
    const demo = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      "x-standby-session": "5d1d3514-6277-4a32-8109-ce01035830b4", "idempotency-key": "anonymous-takeover",
    }, payload: { title: "takeover", workspace_id: workspace } });
    assert.equal(demo.statusCode, 403);
    const viewer = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      ...auth("viewer", "VIEWER"), "idempotency-key": "viewer-create",
    }, payload: { title: "viewer case", workspace_id: workspace } });
    assert.equal(viewer.statusCode, 403);
    const editor = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      ...auth("editor", "EDITOR"), "idempotency-key": "editor-create",
    }, payload: { title: "editor case", workspace_id: workspace } });
    assert.equal(editor.statusCode, 201);
    const members = await app.inject({ method: "GET", url: `/v1/workspaces/${workspace}/members`, headers: auth("owner") });
    assert.deepEqual(members.json().items.map((x: any) => [x.user_id, x.role]), [["owner", "OWNER"], ["editor", "EDITOR"], ["viewer", "VIEWER"]]);
  } finally { await app.close(); }
});

test("readiness becomes unavailable and writes are rejected during graceful drain", async () => {
  let draining = false;
  const app = await buildApp({ allowedOrigins: [ORIGIN], allowAnonymous: true, isDraining: () => draining });
  try {
    assert.equal((await app.inject({ method: "GET", url: "/readyz" })).statusCode, 200);
    draining = true;
    assert.equal((await app.inject({ method: "GET", url: "/readyz" })).statusCode, 503);
    assert.equal((await app.inject({ method: "GET", url: "/healthz" })).statusCode, 200);
    const response = await app.inject({ method: "POST", url: "/v1/cases", headers: {
      "x-standby-session": "5d1d3514-6277-4a32-8109-ce01035830b4", "idempotency-key": "draining-write",
    }, payload: { title: "retry later" } });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error.code, "SERVER_DRAINING");
  } finally { await app.close(); }
});

test("Fly rate buckets separate valid client IPs only after explicit deployment opt-in", async () => {
  const app = await buildApp({ allowedOrigins: [ORIGIN], trustFlyClientIp: true });
  try {
    const health = (clientIp: string) => app.inject({ method: "GET", url: "/healthz", headers: { "fly-client-ip": clientIp } });
    const first = await health("203.0.113.10");
    const second = await health("2001:db8::20");
    const repeated = await health("203.0.113.10");
    assert.equal(first.statusCode, 200);
    assert.equal(second.headers["x-ratelimit-remaining"], first.headers["x-ratelimit-remaining"]);
    assert.equal(Number(repeated.headers["x-ratelimit-remaining"]), Number(first.headers["x-ratelimit-remaining"]) - 1);
  } finally { await app.close(); }
});

test("invalid or comma-separated Fly headers share the socket fallback bucket", async () => {
  const app = await buildApp({ allowedOrigins: [ORIGIN], trustFlyClientIp: true });
  try {
    const first = await app.inject({ method: "GET", url: "/healthz", headers: { "fly-client-ip": "203.0.113.10, 203.0.113.20" } });
    const second = await app.inject({ method: "GET", url: "/healthz", headers: { "fly-client-ip": "invalid-client" } });
    const missing = await app.inject({ method: "GET", url: "/healthz" });
    assert.equal(Number(second.headers["x-ratelimit-remaining"]), Number(first.headers["x-ratelimit-remaining"]) - 1);
    assert.equal(Number(missing.headers["x-ratelimit-remaining"]), Number(first.headers["x-ratelimit-remaining"]) - 2);
  } finally { await app.close(); }
});

test("default rate limiting ignores supplied Fly headers", async () => {
  const app = await buildApp({ allowedOrigins: [ORIGIN] });
  try {
    const first = await app.inject({ method: "GET", url: "/healthz", headers: { "fly-client-ip": "203.0.113.10" } });
    const second = await app.inject({ method: "GET", url: "/healthz", headers: { "fly-client-ip": "203.0.113.20" } });
    assert.equal(Number(second.headers["x-ratelimit-remaining"]), Number(first.headers["x-ratelimit-remaining"]) - 1);
  } finally { await app.close(); }
});
