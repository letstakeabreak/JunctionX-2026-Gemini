import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "../src/app.js";
import { createTestJwt } from "../src/auth/jwt.js";
import { HERO_SOURCE_CONTENT } from "../src/fixtures/hero.js";

const JWT_SECRET = "test-secret-supabase-jwt-2026";

test("anonymous demo sessions require a valid UUID and remain isolated", async () => {
  const app = await buildApp({
    allowedOrigins: ["http://localhost:5173"],
    allowAnonymous: true,
    jwtSecret: JWT_SECRET,
  });
  const sessionA = "5d1d3514-6277-4a32-8109-ce01035830b4";
  const sessionB = "0c61dd96-9f37-4584-8d53-6c4bc7ca9741";
  try {
    const invalid = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { "x-standby-session": "not-a-session", "idempotency-key": "invalid" },
      payload: { title: "invalid" },
    });
    assert.equal(invalid.statusCode, 401);

    const created = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { "x-standby-session": sessionA, "idempotency-key": "anonymous-a" },
      payload: { title: "public demo" },
    });
    assert.equal(created.statusCode, 201, created.body);
    const caseId = (created.json() as { case_id: string }).case_id;

    const denied = await app.inject({
      method: "GET",
      url: `/v1/cases/${caseId}/review-queue`,
      headers: { "x-standby-session": sessionB },
    });
    assert.equal(denied.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("P1-B: JWT authentication rejects forged, expired, or malformed tokens", async () => {
  const app = await buildApp({
    allowedOrigins: ["http://localhost:5173"],
    allowAnonymous: false,
    jwtSecret: JWT_SECRET,
  });

  try {
    // 1. Missing Token -> 401
    const noToken = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { "idempotency-key": "no-token" },
      payload: { title: "no token case" },
    });
    assert.equal(noToken.statusCode, 401);

    // 2. Malformed Token -> 401
    const malformed = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { authorization: "Bearer not-a-valid-jwt", "idempotency-key": "malformed" },
      payload: { title: "malformed token case" },
    });
    assert.equal(malformed.statusCode, 401);

    // 3. Forged Token (wrong secret) -> 401
    const forgedToken = createTestJwt({ sub: "user_attacker" }, "wrong-secret-key");
    const forged = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { authorization: `Bearer ${forgedToken}`, "idempotency-key": "forged" },
      payload: { title: "forged token case" },
    });
    assert.equal(forged.statusCode, 401);

    // 4. Expired Token -> 401
    const expiredToken = createTestJwt({ sub: "user_expired" }, JWT_SECRET, -300); // 5 minutes ago
    const expired = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { authorization: `Bearer ${expiredToken}`, "idempotency-key": "expired" },
      payload: { title: "expired token case" },
    });
    assert.equal(expired.statusCode, 401);

    // 5. Valid Token -> 201 Success
    const validToken = createTestJwt({ sub: "user_valid", role: "OWNER" }, JWT_SECRET, 3600);
    const valid = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { authorization: `Bearer ${validToken}`, "idempotency-key": "valid" },
      payload: { title: "valid token case" },
    });
    assert.equal(valid.statusCode, 201);
  } finally {
    await app.close();
  }
});

test("P1-B: Multi-Tenancy isolates cases across workspaces with opaque 404", async () => {
  const app = await buildApp({
    allowedOrigins: ["http://localhost:5173"],
    allowAnonymous: false,
    jwtSecret: JWT_SECRET,
  });

  const workspaceA = "ws_team_alpha";
  const workspaceB = "ws_team_bravo";

  const tokenUserA = createTestJwt(
    { sub: "user_alice", workspace_id: workspaceA, role: "OWNER" },
    JWT_SECRET,
  );
  const tokenUserB = createTestJwt(
    { sub: "user_bob", workspace_id: workspaceB, role: "OWNER" },
    JWT_SECRET,
  );

  try {
    // 1. User A creates a case in Workspace A
    const resA = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { authorization: `Bearer ${tokenUserA}`, "idempotency-key": "ws-case-a" },
      payload: { title: "Alpha Team Production", workspace_id: workspaceA },
    });
    assert.equal(resA.statusCode, 201);
    const caseIdA = (resA.json() as { case_id: string }).case_id;

    // 2. User A can view review queue
    const reviewA = await app.inject({
      method: "GET",
      url: `/v1/cases/${caseIdA}/review-queue`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    assert.equal(reviewA.statusCode, 200);

    // 3. User B from Workspace B attempts to access Case A -> 404 (Resource Enumeration defense)
    const crossAccess = await app.inject({
      method: "GET",
      url: `/v1/cases/${caseIdA}/review-queue`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    assert.equal(crossAccess.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("P1-B: 4-Tier RBAC enforces OWNER, EDITOR, REVIEWER, and VIEWER access boundaries", async () => {
  const app = await buildApp({
    allowedOrigins: ["http://localhost:5173"],
    allowAnonymous: false,
    jwtSecret: JWT_SECRET,
  });

  const workspace = "ws_broadway_prod";
  const tokenOwner = createTestJwt({ sub: "u_owner", workspace_id: workspace, role: "OWNER" }, JWT_SECRET);
  const tokenEditor = createTestJwt({ sub: "u_editor", workspace_id: workspace, role: "EDITOR" }, JWT_SECRET);
  const tokenReviewer = createTestJwt({ sub: "u_reviewer", workspace_id: workspace, role: "REVIEWER" }, JWT_SECRET);
  const tokenViewer = createTestJwt({ sub: "u_viewer", workspace_id: workspace, role: "VIEWER" }, JWT_SECRET);

  try {
    // 1. OWNER creates case and adds members
    const createCaseRes = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { authorization: `Bearer ${tokenOwner}`, "idempotency-key": "rbac-case-1" },
      payload: { title: "RBAC Case", workspace_id: workspace },
    });
    assert.equal(createCaseRes.statusCode, 201);
    const caseId = (createCaseRes.json() as { case_id: string }).case_id;

    // OWNER adds members
    await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace}/members`,
      headers: { authorization: `Bearer ${tokenOwner}`, "idempotency-key": "add-editor" },
      payload: { user_id: "u_editor", role: "EDITOR" },
    });
    await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace}/members`,
      headers: { authorization: `Bearer ${tokenOwner}`, "idempotency-key": "add-reviewer" },
      payload: { user_id: "u_reviewer", role: "REVIEWER" },
    });
    await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace}/members`,
      headers: { authorization: `Bearer ${tokenOwner}`, "idempotency-key": "add-viewer" },
      payload: { user_id: "u_viewer", role: "VIEWER" },
    });

    // 2. Non-OWNER (EDITOR) attempts to add a member -> 403 Forbidden
    const editorAddMember = await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace}/members`,
      headers: { authorization: `Bearer ${tokenEditor}`, "idempotency-key": "illegal-add" },
      payload: { user_id: "u_other", role: "VIEWER" },
    });
    assert.equal(editorAddMember.statusCode, 403);

    // 3. VIEWER can read review queue (200)
    const viewerRead = await app.inject({
      method: "GET",
      url: `/v1/cases/${caseId}/review-queue`,
      headers: { authorization: `Bearer ${tokenViewer}` },
    });
    assert.equal(viewerRead.statusCode, 200);

    // 4. VIEWER attempts source upload -> 403 Forbidden
    const viewerUpload = await app.inject({
      method: "POST",
      url: `/v1/cases/${caseId}/sources/STAGE_SPEC`,
      headers: { authorization: `Bearer ${tokenViewer}`, "idempotency-key": "viewer-upload", "content-type": "application/json" },
      payload: { origin: "CONTROLLED_FIXTURE", content: HERO_SOURCE_CONTENT.STAGE_SPEC },
    });
    assert.equal(viewerUpload.statusCode, 403);

    // 5. EDITOR uploads sources -> 201 Success
    const editorUpload = await app.inject({
      method: "POST",
      url: `/v1/cases/${caseId}/sources/STAGE_SPEC`,
      headers: { authorization: `Bearer ${tokenEditor}`, "idempotency-key": "editor-upload", "content-type": "application/json" },
      payload: { origin: "CONTROLLED_FIXTURE", content: HERO_SOURCE_CONTENT.STAGE_SPEC },
    });
    assert.equal(editorUpload.statusCode, 201);
  } finally {
    await app.close();
  }
});
