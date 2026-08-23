import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "../src/app.js";
import { createTestJwt } from "../src/auth/jwt.js";
import { sanitizeAuditMetadata, AuditLogger } from "../src/domain/audit.js";
import { assertSourceFile, parseZipMetadata, sanitizeFilename } from "../src/domain/source-file.js";
import { InMemoryStore } from "../src/store/in-memory-store.js";
import { HERO_SOURCE_CONTENT } from "../src/fixtures/hero.js";

const JWT_SECRET = "test-secret-secure-ops-2026";

test("P1-C: Archive & Macro defense rejects dangerous, encrypted, and macro-enabled files", async () => {
  // 1. Sanitize filename rejects macro-enabled extensions
  assert.throws(
    () => sanitizeFilename("malicious_cue.xlsm"),
    (err: any) => err.statusCode === 415 && err.code === "MACRO_ARCHIVE_REJECTED",
  );
  assert.throws(
    () => sanitizeFilename("payload_script.docm"),
    (err: any) => err.statusCode === 415 && err.code === "MACRO_ARCHIVE_REJECTED",
  );

  // 2. Synthetic password-protected ZIP (encrypted flag set in Central Directory)
  // Construct minimal ZIP with general purpose bit flag 0x0001 (encrypted)
  const eocdAndCdWithEncryption = Buffer.from([
    // Central directory header (46 bytes)
    0x50, 0x4b, 0x01, 0x02, // signature 0x02014b50
    0x14, 0x00, // version made by
    0x14, 0x00, // version needed
    0x01, 0x00, // bit flag: 0x0001 (ENCRYPTED!)
    0x00, 0x00, // compression method (stored)
    0x00, 0x00, 0x00, 0x00, // last mod time/date
    0x00, 0x00, 0x00, 0x00, // crc-32
    0x04, 0x00, 0x00, 0x00, // compressed size
    0x04, 0x00, 0x00, 0x00, // uncompressed size
    0x08, 0x00, // filename length (8 bytes: test.txt)
    0x00, 0x00, // extra field length
    0x00, 0x00, // comment length
    0x00, 0x00, // disk number start
    0x00, 0x00, // internal attributes
    0x00, 0x00, 0x00, 0x00, // external attributes
    0x00, 0x00, 0x00, 0x00, // local header offset
    // Filename: "test.txt"
    0x74, 0x65, 0x73, 0x74, 0x2e, 0x74, 0x78, 0x74,
    // End of central directory record (22 bytes)
    0x50, 0x4b, 0x05, 0x06, // signature 0x06054b50
    0x00, 0x00, // disk number
    0x00, 0x00, // start disk
    0x01, 0x00, // total entries on disk (1)
    0x01, 0x00, // total entries (1)
    0x36, 0x00, 0x00, 0x00, // directory size (54 bytes: 46 header + 8 name)
    0x00, 0x00, 0x00, 0x00, // directory offset (starts at 0)
    0x00, 0x00, // comment length
  ]);

  const encryptedZipBytes = new Uint8Array(eocdAndCdWithEncryption);
  assert.throws(
    () => assertSourceFile("MASTER_CUE", "secure.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", encryptedZipBytes),
    (err: any) => err.statusCode === 422 && err.code === "PASSWORD_PROTECTED_ARCHIVE",
  );
});

test("P1-C: Audit Trail redacts sensitive plaintext content and preserves hash provenance", () => {
  const sensitiveMeta = {
    role: "SCRIPT",
    filename: "secret_play.docx",
    quote: "배우 혜원: 비밀 대사를 말한다.",
    dialogue: "절대 외부에 유출되어서는 안 되는 공연 시나리오",
    token: "sbp_live_secret_key_12345",
    signed_url: "https://r2.standby.dev/quarantine/source.docx?token=xyz",
    itemCount: 42,
    isConsistent: true,
  };

  const sanitized = sanitizeAuditMetadata(sensitiveMeta);

  // 1. Plaintext strings are completely redacted with SHA-256 digest prefixes
  assert.ok(typeof sanitized.quote === "string" && sanitized.quote.startsWith("[REDACTED_SHA256:"));
  assert.ok(typeof sanitized.dialogue === "string" && sanitized.dialogue.startsWith("[REDACTED_SHA256:"));
  assert.ok(typeof sanitized.token === "string" && sanitized.token.startsWith("[REDACTED_SHA256:"));
  assert.ok(typeof sanitized.signed_url === "string" && sanitized.signed_url.startsWith("[REDACTED_SHA256:"));

  // 2. Non-sensitive operational metadata remains intact
  assert.equal(sanitized.role, "SCRIPT");
  assert.equal(sanitized.filename, "secret_play.docx");
  assert.equal(sanitized.itemCount, 42);
  assert.equal(sanitized.isConsistent, true);
});

test("P1-C: End-to-End Audit Logs endpoint and source purge lifecycle", async () => {
  const app = await buildApp({
    allowedOrigins: ["http://localhost:5173"],
    allowAnonymous: false,
    jwtSecret: JWT_SECRET,
  });

  const workspace = "ws_audit_test";
  const tokenOwner = createTestJwt({ sub: "u_audit_owner", workspace_id: workspace, role: "OWNER" }, JWT_SECRET);
  const tokenEditor = createTestJwt({ sub: "u_audit_editor", workspace_id: workspace, role: "EDITOR" }, JWT_SECRET);

  try {
    // 1. OWNER creates case
    const caseRes = await app.inject({
      method: "POST",
      url: "/v1/cases",
      headers: { authorization: `Bearer ${tokenOwner}`, "idempotency-key": "audit-case-1" },
      payload: { title: "Secure Operations Case", workspace_id: workspace },
    });
    assert.equal(caseRes.statusCode, 201);
    const caseId = (caseRes.json() as { case_id: string }).case_id;

    // 2. Add Editor member
    await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace}/members`,
      headers: { authorization: `Bearer ${tokenOwner}`, "idempotency-key": "audit-member-add" },
      payload: { user_id: "u_audit_editor", role: "EDITOR" },
    });

    // 3. OWNER can retrieve audit logs (200)
    const auditRes = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace}/audit-logs`,
      headers: { authorization: `Bearer ${tokenOwner}` },
    });
    assert.equal(auditRes.statusCode, 200);

    // 4. EDITOR cannot view workspace audit logs -> 403 Forbidden
    const editorAudit = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace}/audit-logs`,
      headers: { authorization: `Bearer ${tokenEditor}` },
    });
    assert.equal(editorAudit.statusCode, 403);

    // 5. Test Store Purge Lifecycle
    const store = new InMemoryStore();
    const createdCase = store.createCase("Purge Test Case", "u_audit_owner", workspace);
    const src = store.uploadSource({
      caseId: createdCase.case_id,
      role: "STAGE_SPEC",
      origin: "CONTROLLED_FIXTURE",
      content: HERO_SOURCE_CONTENT.STAGE_SPEC,
      mediaType: "application/json",
      originalFilename: "stage-spec.json",
    });
    assert.ok(src.sha256);

    // Purge the source
    store.purgeSource(createdCase.case_id, "STAGE_SPEC", "u_audit_owner");

    // After purge, raw content and bytes are nulled out, but audit logs preserve the hash
    const logs = store.getAuditLogs(workspace, "u_audit_owner");
    const purgeEvent = logs.find((e) => e.event_type === "SOURCE_PURGED");
    assert.ok(purgeEvent);
    assert.equal(purgeEvent.metadata.sha256, src.sha256);
  } finally {
    await app.close();
  }
});
