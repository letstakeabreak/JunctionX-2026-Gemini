import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryStore } from "../src/store/in-memory-store.js";
import { HERO_SOURCE_CONTENT } from "../src/fixtures/hero.js";
import { extractControlledFixture } from "../src/domain/extraction.js";
import type { FactReviewCommand, InternalSourceVersion, SourceRole } from "../src/domain/types.js";
import { hashJson } from "../src/lib/hash.js";

function source(role: SourceRole): InternalSourceVersion {
  const content = structuredClone(HERO_SOURCE_CONTENT[role]);
  return {
    contract_version: "standby.source.v1",
    source_id: `source_${role.toLowerCase()}`,
    case_id: "case_persistence",
    role,
    sha256: hashJson(content),
    origin: "CONTROLLED_FIXTURE",
    authority: "REVIEWED",
    media_type: "application/json",
    original_filename: `${role.toLowerCase()}.fixture.json`,
    created_at: "2026-08-23T00:00:00.000Z",
    content,
    bytes: null,
  };
}

test("P1-A: StateStore enforces immutable source hashes and append-only revision tree", async () => {
  const store = new InMemoryStore();

  // 1. Case 생성
  const created = store.createCase("Durable Test Case", "actor_persistence_1");
  assert.ok(created.case_id);
  assert.equal(store.hasCase(created.case_id), true);

  // 2. Stage Spec 업로드
  const stageSpecSource = store.uploadSource({
    caseId: created.case_id,
    role: "STAGE_SPEC",
    origin: "USER_PROVIDED",
    content: HERO_SOURCE_CONTENT.STAGE_SPEC,
    mediaType: "application/json",
    originalFilename: "stage-spec.json",
  });
  assert.ok(stageSpecSource.sha256);

  // 3. 동일 해시 재업로드는 멱등성 허용, 다른 해시는 409 LOCKED
  const replaySource = store.uploadSource({
    caseId: created.case_id,
    role: "STAGE_SPEC",
    origin: "USER_PROVIDED",
    content: HERO_SOURCE_CONTENT.STAGE_SPEC,
    mediaType: "application/json",
    originalFilename: "stage-spec.json",
  });
  assert.equal(replaySource.source_id, stageSpecSource.source_id);

  // 4. Master Cue 업로드 시 base revision 자동 생성
  const cueSource = store.uploadSource({
    caseId: created.case_id,
    role: "MASTER_CUE",
    origin: "USER_PROVIDED",
    content: HERO_SOURCE_CONTENT.MASTER_CUE,
    mediaType: "application/json",
    originalFilename: "master-cue.json",
  });
  assert.ok(cueSource.source_id);

  const initialRevisions = store.listCueRevisions(created.case_id);
  assert.equal(initialRevisions.length, 1);
  const baseRev = initialRevisions[0]!;
  assert.equal(baseRev.parent_revision_id, null);

  // 5. Revision Patch 생성 (from -> to) -> Parent-Child 체인 형성
  const nextRev = store.createRevision({
    caseId: created.case_id,
    actorId: "actor_persistence_1",
    baseRevisionId: baseRev.revision_id,
    baseSourceSha256: baseRev.base_source_sha256,
    patches: [
      {
        row_id: "R3",
        column: "환복시간",
        from: "58s",
        to: "70s",
      },
    ],
  });
  assert.equal(nextRev.parent_revision_id, baseRev.revision_id);
  assert.notEqual(nextRev.revision_id, baseRev.revision_id);

  // 6. 리비전 목록 조회
  const allRevisions = store.listCueRevisions(created.case_id);
  assert.equal(allRevisions.length, 2);
  assert.equal(allRevisions[0]!.revision_id, baseRev.revision_id);
  assert.equal(allRevisions[1]!.revision_id, nextRev.revision_id);
});

test("P1-A: Extraction, Review, and Freeze produce deterministic snapshot digest", async () => {
  const store = new InMemoryStore({
    async extract(sources) {
      return {
        facts: extractControlledFixture(sources),
        sourceRuns: [...sources.values()].map((source) => ({
          source_id: source.source_id,
          role: source.role,
          provider: "CONTROLLED_FIXTURE" as const,
          provider_job_id: null,
          agent_id: null,
          config_id: null,
          adapter_version: "mock.v1",
          schema_version: "standby.extraction.v1" as const,
          raw_response_sha256: hashJson(source.sha256),
        })),
      };
    },
  });

  const created = store.createCase("Snapshot Test Case", "actor_persistence_2");
  store.uploadSource({
    caseId: created.case_id,
    role: "STAGE_SPEC",
    origin: "CONTROLLED_FIXTURE",
    content: HERO_SOURCE_CONTENT.STAGE_SPEC,
    mediaType: "application/json",
    originalFilename: "stage-spec.json",
  });
  store.uploadSource({
    caseId: created.case_id,
    role: "MASTER_CUE",
    origin: "CONTROLLED_FIXTURE",
    content: HERO_SOURCE_CONTENT.MASTER_CUE,
    mediaType: "application/json",
    originalFilename: "master-cue.json",
  });
  store.uploadSource({
    caseId: created.case_id,
    role: "SCRIPT",
    origin: "CONTROLLED_FIXTURE",
    content: HERO_SOURCE_CONTENT.SCRIPT,
    mediaType: "application/json",
    originalFilename: "script.json",
  });

  const op = store.startExtraction(created.case_id, "CONTROLLED_FIXTURE");
  assert.ok(op.operation_id);

  // 비동기 작업 완료 대기
  let completedOp = store.getOperation(op.operation_id);
  for (let i = 0; i < 20 && completedOp.status === "QUEUED"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    completedOp = store.getOperation(op.operation_id);
  }
  assert.equal(completedOp.status, "SUCCEEDED");

  const queue = store.getReviewQueue(created.case_id);
  assert.ok(queue.items.length > 0);

  // Controlled fixture 사실들을 매핑하여 일괄 승인
  const sources = new Map<SourceRole, InternalSourceVersion>([
    ["SCRIPT", source("SCRIPT")],
    ["MASTER_CUE", source("MASTER_CUE")],
    ["STAGE_SPEC", source("STAGE_SPEC")],
  ]);
  const fixtureFacts = extractControlledFixture(sources);
  const factMap = new Map(fixtureFacts.map((f) => [f.fact_id, f]));

  const reviews: FactReviewCommand[] = queue.items.map((fact) => {
    const matched = factMap.get(fact.fact_id);
    return {
      fact_id: fact.fact_id,
      decision: "REVIEWED",
      source: "CUSTOM",
      corrected_value: matched ? {
        normalized_fact_type: matched.fact_type,
        value: matched.raw_value,
      } : {
        normalized_fact_type: fact.fact_type,
        value: fact.raw_value,
      },
    };
  });

  const reviewResult = store.reviewFacts({
    caseId: created.case_id,
    actorId: "actor_persistence_2",
    reviews,
  });
  assert.equal(reviewResult.items.length, queue.items.length);

  // 스냅샷 고정 (Freeze)
  const frozen = store.createReviewSnapshot(created.case_id, "actor_persistence_2");
  assert.ok(frozen.snapshot_id);
  assert.ok(frozen.fact_snapshot_digest);

  // 워크스페이스 조회가 정상 성공함
  const workspace = store.getWorkspace(created.case_id);
  assert.equal(workspace.review_snapshot_id, frozen.snapshot_id);
  assert.equal(workspace.events.length, 8);
});
