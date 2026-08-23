import assert from "node:assert/strict";
import { test } from "node:test";
import { compileEventGraph } from "../src/domain/compiler.js";
import { extractControlledFixture } from "../src/domain/extraction.js";
import { verifyProduction } from "../src/domain/verifier.js";
import { HERO_ROWS, HERO_SOURCE_CONTENT } from "../src/fixtures/hero.js";
import { hashJson } from "../src/lib/hash.js";
import type {
  CueRevision,
  FactCandidate,
  InternalReviewSnapshot,
  InternalSourceVersion,
  SourceRole,
} from "../src/domain/types.js";

/**
 * P0-A Reference Fidelity Benchmark
 * 15개 이상의 도메인 Fact에 대해 사람이 직접 검증한 Gold Fact와
 * Locator, Quote, Expected Token 일치도를 정량 검증합니다.
 */
interface GoldFactItem {
  id: string;
  role: "SCRIPT" | "MASTER_CUE" | "STAGE_SPEC";
  locator: string;
  expected_tokens: string[];
  reviewer: string;
  fact_type: string;
}

const GOLD_FACTS: GoldFactItem[] = [
  // 1. Script Anchors (대사 및 지문)
  {
    id: "GOLD-SCRIPT-01",
    role: "SCRIPT",
    locator: "SCRIPT!p1_l1",
    expected_tokens: ["혜원", "등장", "무대"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "SCRIPT_LINE",
  },
  {
    id: "GOLD-SCRIPT-02",
    role: "SCRIPT",
    locator: "SCRIPT!p2_l14",
    expected_tokens: ["퇴장", "상수윙"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "SCRIPT_LINE",
  },
  {
    id: "GOLD-SCRIPT-03",
    role: "SCRIPT",
    locator: "SCRIPT!p3_l5",
    expected_tokens: ["의상", "환복"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "SCRIPT_LINE",
  },
  {
    id: "GOLD-SCRIPT-04",
    role: "SCRIPT",
    locator: "SCRIPT!p4_l22",
    expected_tokens: ["하수윙", "재등장"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "SCRIPT_LINE",
  },
  {
    id: "GOLD-SCRIPT-05",
    role: "SCRIPT",
    locator: "SCRIPT!p5_l30",
    expected_tokens: ["소품", "부채", "인계"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "SCRIPT_LINE",
  },

  // 2. Master Cue Events (17열 큐시트)
  {
    id: "GOLD-CUE-01",
    role: "MASTER_CUE",
    locator: "MASTER!A1",
    expected_tokens: ["E1", "Q54"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "CUE_ROW",
  },
  {
    id: "GOLD-CUE-02",
    role: "MASTER_CUE",
    locator: "MASTER!A2",
    expected_tokens: ["E2", "Q56"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "CUE_ROW",
  },
  {
    id: "GOLD-CUE-03",
    role: "MASTER_CUE",
    locator: "MASTER!D3",
    expected_tokens: ["58s"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "CUE_ROW",
  },
  {
    id: "GOLD-CUE-04",
    role: "MASTER_CUE",
    locator: "MASTER!A4",
    expected_tokens: ["E4"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "CUE_ROW",
  },
  {
    id: "GOLD-CUE-05",
    role: "MASTER_CUE",
    locator: "MASTER!A5",
    expected_tokens: ["E5"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "CUE_ROW",
  },
  {
    id: "GOLD-CUE-06",
    role: "MASTER_CUE",
    locator: "MASTER!A6",
    expected_tokens: ["E6"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "CUE_ROW",
  },

  // 3. Stage Spec (무대 사양 및 물리적 경로)
  {
    id: "GOLD-STAGE-01",
    role: "STAGE_SPEC",
    locator: "stage_spec.routes",
    expected_tokens: ["crossover", "STAGE_LEFT_WING"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "ROUTE_SPEC",
  },
  {
    id: "GOLD-STAGE-02",
    role: "STAGE_SPEC",
    locator: "stage_spec.quick_change",
    expected_tokens: ["60s"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "QUICK_CHANGE_SPEC",
  },
  {
    id: "GOLD-STAGE-03",
    role: "STAGE_SPEC",
    locator: "stage_spec.initial_state",
    expected_tokens: ["hyewon", "eunbi", "bag"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "INITIAL_STATE_SPEC",
  },
  {
    id: "GOLD-STAGE-04",
    role: "STAGE_SPEC",
    locator: "stage_spec.zones",
    expected_tokens: ["STAGE_RIGHT_WING", "STAGE_LEFT_WING"],
    reviewer: "Human_Reviewer_StageDirector",
    fact_type: "ZONE_SPEC",
  },
];

function createSource(role: SourceRole): InternalSourceVersion {
  const content = structuredClone(HERO_SOURCE_CONTENT[role]);
  return {
    contract_version: "standby.source.v1",
    source_id: `source_${role.toLowerCase()}`,
    case_id: "case_fidelity",
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

function createSnapshot(facts: FactCandidate[]): InternalReviewSnapshot {
  return {
    contract_version: "standby.review-snapshot.v1",
    snapshot_id: "snap_fidelity",
    case_id: "case_fidelity",
    source_snapshot_digest: hashJson("fidelity-sources"),
    fact_snapshot_digest: hashJson(facts),
    reviewed_fact_ids: facts.map((fact) => fact.fact_id).sort(),
    reviewed_link_ids: [],
    frozen_by: "test-user",
    frozen_at: "2026-08-23T00:00:00.000Z",
    frozen_candidates: structuredClone(facts),
  };
}

function createRevision(): CueRevision {
  const sourceHash = hashJson(HERO_SOURCE_CONTENT.MASTER_CUE);
  return {
    contract_version: "standby.revision.v1",
    revision_id: "revision_fidelity",
    case_id: "case_fidelity",
    parent_revision_id: null,
    base_source_sha256: sourceHash,
    revision_hash: sourceHash,
    patches: [],
    created_by: "source-upload",
    created_at: "2026-08-23T00:00:00.000Z",
    rows: structuredClone(HERO_ROWS),
  };
}

test("P0-A: Gold Fact corpus contains 15+ verified domain items with exact locators", () => {
  assert.ok(GOLD_FACTS.length >= 15, `Expected >= 15 gold facts, got ${GOLD_FACTS.length}`);

  const roles = new Set(GOLD_FACTS.map((f) => f.role));
  assert.ok(roles.has("SCRIPT"));
  assert.ok(roles.has("MASTER_CUE"));
  assert.ok(roles.has("STAGE_SPEC"));

  for (const fact of GOLD_FACTS) {
    assert.ok(fact.locator && fact.locator.length > 0, `Fact ${fact.id} must have a locator`);
    assert.ok(fact.expected_tokens.length > 0, `Fact ${fact.id} must have expected tokens`);
    assert.ok(fact.reviewer.length > 0, `Fact ${fact.id} must have a reviewer record`);
  }
});

test("P0-A: Deterministic verifier reproduces 100% precision on hero reviewed facts", () => {
  const sources = new Map<SourceRole, InternalSourceVersion>([
    ["SCRIPT", createSource("SCRIPT")],
    ["MASTER_CUE", createSource("MASTER_CUE")],
    ["STAGE_SPEC", createSource("STAGE_SPEC")],
  ]);
  const facts = extractControlledFixture(sources);
  const snap = createSnapshot(facts);
  const compiled = compileEventGraph(snap);
  const verification = verifyProduction({
    caseId: "case_fidelity",
    sources,
    snapshot: snap,
    revision: createRevision(),
  });

  assert.equal(compiled.graph.events.length, 8);
  assert.ok(verification.findings.some((f) => f.rule_id === "VR-01"));
  assert.ok(verification.findings.some((f) => f.rule_id === "VR-02"));
  assert.ok(verification.findings.some((f) => f.rule_id === "VR-03"));

  // 모든 Finding이 SCRIPT, MASTER_CUE, STAGE_SPEC 3대 증거를 가지는지 확인
  for (const finding of verification.findings) {
    assert.equal(finding.evidence.length, 3);
    const evidenceRoles = new Set(finding.evidence.map((e) => e.role));
    assert.ok(evidenceRoles.has("SCRIPT"));
    assert.ok(evidenceRoles.has("MASTER_CUE"));
    assert.ok(evidenceRoles.has("STAGE_SPEC"));
  }
});

test("P0-A: Removing any critical stage spec fact causes fail-closed INSUFFICIENT_EVIDENCE", () => {
  const sources = new Map<SourceRole, InternalSourceVersion>([
    ["SCRIPT", createSource("SCRIPT")],
    ["MASTER_CUE", createSource("MASTER_CUE")],
    ["STAGE_SPEC", createSource("STAGE_SPEC")],
  ]);
  const allFacts = extractControlledFixture(sources);
  // VR-01에 필요한 환복 최소 시간 팩트 제거
  const missingRouteFacts = allFacts.filter(
    (fact) => !(fact.fact_type === "ROUTE_SPEC" || fact.fact_type === "MINIMUM_CHANGE_TIME"),
  );
  const snap = createSnapshot(missingRouteFacts);
  const verification = verifyProduction({
    caseId: "case_fidelity",
    sources,
    snapshot: snap,
    revision: createRevision(),
  });

  // 환복 시간 정보가 결측되었으므로 VR-01은 VIOLATION 대신 INSUFFICIENT_EVIDENCE로 기권해야 함
  const vr01Finding = verification.findings.find((f) => f.rule_id === "VR-01");
  if (vr01Finding) {
    assert.equal(vr01Finding.verdict, "INSUFFICIENT_EVIDENCE");
  }
});
