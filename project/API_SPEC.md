# STANDBY API Specification

| 항목 | 내용 |
|---|---|
| 문서 상태 | Draft v0.2 — PRD v0.5 및 two-screen Stitch Lo-Fi 계약 반영 |
| 기준일 | 2026-08-22 |
| 기준 PRD | [PRD.md](PRD.md) |
| 기계 판독 계약 | [openapi.yaml](openapi.yaml) |
| Upstage 추출·교환 JSON 계약 | [JSON_CONTRACT.md](JSON_CONTRACT.md) |
| API 기준 경로 | `/v1` |
| 핵심 원칙 | Evidence first, immutable sources, human authority, deterministic verification, Final naming is gated |

> **구현 상태 주의:** 이 문서는 장기 목표 API 계약이며 현재 서버의 endpoint 정본이 아니다.
> 현재 실제 구현 범위는 [FEATURE_SPEC_CURRENT.md](FEATURE_SPEC_CURRENT.md)와
> [`../server/README.md`](../server/README.md)를 따른다.

이 문서는 STANDBY의 두 Lo-Fi 화면을 실제 구현 가능한 API 계약으로 변환한다. 문서와 OpenAPI가 충돌하면 이 문서의 상태 전이·불변조건을 우선하며, 스키마와 경로의 문법은 `openapi.yaml`을 따른다.

---

## 1. API가 보장해야 하는 제품 계약

STANDBY의 서버는 다음 흐름을 강제한다.

```text
P0 two-screen path

사람이 만든 Master Cue v1
  → SCRIPT / MASTER_CUE / STAGE_SPEC 슬롯 업로드
  → source revision·hash 확인
  → Upstage 역할별 Fact 추출
  → 사람의 Fact·Link·Stage·Authority 검토
  → deterministic compile + verification
  → Finding + Evidence Trace + reviewed compiled events
  → 2D EVIDENCE PREVIEW + source drawer
  → 사람의 DECISION_RECORDED
  → source hash 불변 + CONSISTENT 잠김

Stretch correction/final path

DECISION_RECORDED finding
  → 사람이 외부에서 Master Cue v2 수정
  → 새 hash의 child revision 재업로드
  → 전체 current-scope 재추출·재검증
  → aggregate blocker 0 + evidence complete + authority reviewed
  → FINAL_SIM_READY
  → Final 2D discrete-event playback
```

다음은 API 수준의 불변조건이다. 1–6은 P0에 직접 적용하고, 7–12는 Stretch correction/final endpoint까지 포함한 장기 신뢰 계약이다.

1. 입력 역할은 `SCRIPT`, `MASTER_CUE`, `STAGE_SPEC` 정확히 세 개다.
2. 각 역할에는 한 revision 안에서 source document 하나만 선택할 수 있다.
3. Source document는 업로드 후 불변이다. Fact correction과 Proposal decision은 원본 파일을 바꾸지 않는다.
4. Upstage 결과는 Fact와 Link 후보만 만든다. verdict, severity, calculation과 Final gate는 STANDBY 코드가 결정한다.
5. `UNREVIEWED` Fact, 미승인 Link, 미검토 Stage topology, unresolved authority는 hard verdict에 사용할 수 없다.
6. Proposal의 `ACCEPTED`는 source 변경이나 Finding 해결이 아니다.
7. Master Cue v2는 새 SHA-256과 `parent_revision_id`를 가진 child revision이어야 한다.
8. 새 source hash가 등록되면 이전 revision과 Final 2D는 즉시 `STALE`, 이전 base hash의 Proposal은 `SUPERSEDED`가 된다.
9. Finding은 동일 `finding_lineage_key`가 새 verifier run에서 사라졌을 때만 `CLOSED_BY_REVERIFICATION`이 된다.
10. 개별 Finding 하나가 사라져도 aggregate blocker가 남으면 Final 2D는 열리지 않는다.
11. `INSUFFICIENT`, missing input, authority conflict, role mismatch는 exception approval로 우회할 수 없다.
12. Final 2D는 현재 revision, master hash, stage graph version, compile run이 모두 같은 final manifest를 가리킬 때만 제공한다.

---

## 2. 시스템 경계

```text
Browser
  │ HTTPS JSON / multipart
  ▼
STANDBY API
  ├─ Production / Case / Revision service
  ├─ Review and authority service
  ├─ Operation orchestrator
  ├─ Upstage adapter ──► Upstage Files + Agents/Responses polling
  ├─ Event compiler
  ├─ Deterministic verifier
  ├─ Proposal guard + optional Solar explanation
  └─ Final simulation read model
```

### 공개 API

- Browser와 향후 외부 client가 호출하는 REST API다.
- OpenAPI 계약에 포함한다.
- 모든 상태 변경은 actor, timestamp, request ID와 함께 audit event를 남긴다.

### 내부 계약

- Upstage adapter, compiler, verifier, proposal guard의 함수·job payload다.
- 외부 client에 노출하지 않는다.
- 이 문서의 12~14절에서 별도로 정의한다.

### 명시적으로 두지 않는 API

- Master Cue writeback, Google Sheets edit, XLSX overwrite API
- 공연 show-control 또는 실시간 센서 API
- Final 2D `play/pause` 서버 명령: 재생은 내려받은 final event graph를 client가 수행한다.
- Upstage Webhook 의존: 공식 계약이 확인되기 전에는 서버 polling만 사용한다.
- AI가 `CONSISTENT`, `FINAL_SIM_READY`, 안전 여부를 직접 설정하는 API

---

## 3. 공통 프로토콜

### 3.1 형식

- JSON field: `snake_case`
- 시간: RFC 3339 UTC (`2026-08-22T08:30:00Z`)
- 시간 범위와 duration 계산: integer milliseconds
- SHA-256: lowercase 64자리 hex
- ID: opaque string. 예: `prod_`, `case_`, `rev_`, `doc_`, `fact_`, `link_`, `run_`, `finding_`, `proposal_`, `op_`
- 빈 값: 필드 의미에 따라 `null`; 빈 문자열로 의미를 꾸미지 않는다.
- Enum 외 값은 저장하지 않고 `422 ENUM_VALUE_INVALID`를 반환한다.

단, 이 절은 공개 API의 canonical projection 규칙이다. Upstage-facing `script_facts[]`·`cue_facts[]`는 source fidelity를 위해 없는 raw string을 `""`로 받을 수 있고, decoder는 원문 응답을 보존한 뒤 공개 `Fact` projection에서만 `null`로 정규화한다. 역할별 raw schema, locator와 strict exchange envelope의 canonical 계약은 [JSON_CONTRACT.md](JSON_CONTRACT.md)를 따른다.

`source_snapshot_digest`는 업로드 순서와 무관하게 role 고정 순서 `SCRIPT → MASTER_CUE → STAGE_SPEC`의 `{slot_role, sha256}` 배열을 RFC 8785 방식의 canonical JSON으로 직렬화한 뒤 SHA-256한 값이다. `input_fingerprint`도 11.3절의 전체 tuple을 같은 canonical serialization으로 hash한다.

### 3.2 인증과 tenant

- `/healthz`, `/readyz`를 제외한 모든 endpoint는 `Authorization: Bearer <token>`을 요구한다.
- tenant/workspace ID는 token에서 결정한다. client가 다른 workspace ID를 body로 지정할 수 없다.
- P0 로컬 데모는 auth middleware를 비활성화할 수 있지만 동일 API shape를 유지한다.
- Upstage API key는 server environment에만 존재하며 browser 응답·로그에 포함하지 않는다.

### 3.3 Idempotency와 동시성

- 상태를 만드는 모든 `POST`와 multipart upload는 `Idempotency-Key`를 요구한다.
- 같은 key와 같은 body는 최초 응답을 재사용한다.
- 같은 key에 다른 body는 `409 IDEMPOTENCY_KEY_REUSED`다.
- review/decision endpoint는 `If-Match: "<resource_version>"`을 요구한다.
- version이 다르면 `412 VERSION_PRECONDITION_FAILED`이며 서버 값을 덮어쓰지 않는다.
- byte가 같은 source를 같은 slot에 다시 올리면 새 document를 만들지 않고 기존 SHA document를 반환할 수 있다.

### 3.4 응답 envelope

단일 resource는 resource 자체를 반환한다. 목록은 다음 형식이다.

```json
{
  "items": [],
  "next_cursor": null
}
```

비동기 command는 `202 Accepted`, `Operation-Location`, `Retry-After`와 다음 body를 반환한다.

```json
{
  "operation_id": "op_01J...",
  "status": "QUEUED",
  "poll_after_ms": 1000,
  "resource_ref": {
    "type": "verification_run",
    "id": "run_01J..."
  }
}
```

### 3.5 오류 envelope

```json
{
  "error": {
    "code": "GATE_UNREVIEWED_AUTHORITY",
    "message": "Required authority decisions are not reviewed.",
    "request_id": "req_01J...",
    "retryable": false,
    "details": {
      "scope_ids": ["auth_01", "auth_02"]
    }
  }
}
```

오류 응답에도 대본 원문, Upstage raw body, API key를 포함하지 않는다.

---

## 4. Resource 모델

### 4.1 계층

```text
Production
└─ VerificationCase
   ├─ CaseRevision v1 (SCRIPT + MASTER_CUE v1 + STAGE_SPEC)
   │  ├─ ExtractionRun / Facts / EventLinks / StageGraph / AuthorityDecisions
   │  ├─ VerificationRun / Findings / Proposals
   │  └─ locked SimulationManifest
   └─ CaseRevision v2 (child, SCRIPT + MASTER_CUE v2 + STAGE_SPEC)
      ├─ Re-extraction / review / full re-verification
      └─ FINAL_SIM_READY SimulationManifest
```

`CaseRevision`은 PRD의 `ProductionRevision`을 API에서 명확히 부르는 이름이다. 세 source의 불변 snapshot이며, 한 revision의 source를 교체하지 않는다.

### 4.2 핵심 resource

| Resource | 책임 |
|---|---|
| `Production` | 공연의 안정적인 상위 container |
| `VerificationCase` | 검증할 hero scope와 revision lineage의 container |
| `CaseRevision` | 정확히 세 selected source를 묶는 불변 snapshot. workflow/verification/simulation 상태는 분리 |
| `SourceDocument` | 불변 파일 bytes, role, hash, origin. Upstage 실행 metadata는 ExtractionRun 소유 |
| `ExtractionRun` | 세 role별 Upstage job과 decoder 결과 |
| `Fact` | strict exchange record에서 만든 공개 API projection. raw provider 값과 reviewed/normalized 값은 덮어쓰지 않고 분리 |
| `ReviewRecord` | Fact·Link·Stage item에 대한 append-only 사람 검토 |
| `EventLink` | 서로 다른 source fact가 같은 사건이라는 후보/승인 |
| `AuthorityDecision` | 특정 field/rule/geometry의 authority 결정 |
| `StageGraph` | reviewed named zone와 route graph |
| `VerificationRun` | compile + deterministic rules의 한 실행 |
| `Finding` | 재현 가능한 rule result와 source trace |
| `ChangeProposal` | 원본을 수정하지 않는 source-backed 제안 |
| `ReviewDecision` | Finding 또는 Proposal에 대한 사람 판단 |
| `ExceptionDecision` | 실제 충돌을 감수하고 진행한다는 별도 책임 승인 |
| `FinalGateEvaluation` | blocker 범주·근거·input fingerprint를 포함한 Final 2D 해금 판정 |
| `SimulationManifest` | final revision에서 파생된 immutable 2D read model |
| `Operation` | 비동기 작업의 polling 상태 |
| `AuditEvent` | actor와 before/after를 보존한 append-only 기록 |

---

## 5. Lo-Fi 화면별 API 매핑

| Lo-Fi | 필요한 API |
|---|---|
| 1. 입력·검토 | production/case 생성, 고정 slot upload, source manifest, source confirmation, extraction run, facts/reviews, event links, stage graph, authority decisions, review gate, source refs |
| 2. Finding·2D | verification run, findings/evidence, finding decisions, compiled events, stage graph, source refs |

화면 2의 open-finding 2D는 `/compiled-events`와 reviewed `stage-graph`로 그리는 `EVIDENCE PREVIEW`다. `/simulation`은 aggregate gate를 통과한 final manifest 전용이며 P0 preview 구현에 사용하지 않는다. Proposal, master re-upload, revision lineage, aggregate final gate와 final simulation은 아래에 **Stretch contract**로 보존한다.

---

## 6. Endpoint 전체 목록

`P0`는 two-screen hero vertical slice에 반드시 필요하고, `P1`은 파일럿 운영, `Stretch`는 patch proposal·source 재업로드·final correction loop 계약이다.

### 6.1 System

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| GET | `/healthz` | P0 | process liveness |
| GET | `/readyz` | P0 | DB/object store/worker 준비 상태. Upstage 일시 장애는 degraded로 표현 |
| GET | `/v1/me` | P1 | 현재 actor와 workspace |
| GET | `/v1/capabilities` | P0 | location provenance, Solar, cache fallback 등 runtime gate |

### 6.2 Production, Case, Revision

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| POST | `/v1/productions` | P0 | Production 생성 |
| GET | `/v1/productions` | P1 | Production cursor 목록 |
| GET | `/v1/productions/{production_id}` | P0 | Production 조회 |
| PATCH | `/v1/productions/{production_id}` | P1 | 이름·설명만 수정; source에는 영향 없음 |
| POST | `/v1/productions/{production_id}/cases` | P0 | Case와 initial empty revision 생성 |
| GET | `/v1/productions/{production_id}/cases` | P1 | Case 목록 |
| GET | `/v1/cases/{case_id}` | P0 | 현재 revision과 aggregate 상태 조회 |
| GET | `/v1/cases/{case_id}/revisions` | Stretch | parent/child revision lineage |
| GET | `/v1/cases/{case_id}/audit-events` | P0 | source·review·proposal·state audit |
| DELETE | `/v1/cases/{case_id}` | P1 | retention policy에 따른 비동기 purge |
| GET | `/v1/revisions/{revision_id}` | P0 | revision snapshot과 gate summary |

### 6.3 Source upload와 confirmation

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| PUT | `/v1/revisions/{revision_id}/sources/{slot_role}` | P0 | `SCRIPT`, `MASTER_CUE`, `STAGE_SPEC` multipart upload |
| GET | `/v1/revisions/{revision_id}/source-manifest` | P0 | 세 role·hash·origin·authority 상태 |
| POST | `/v1/revisions/{revision_id}/source-confirmation` | P0 | client가 본 document ID/hash를 pin |
| GET | `/v1/documents/{document_id}` | P0 | immutable document metadata |
| GET | `/v1/source-refs/{source_ref_id}` | P0 | page/cell/quote provenance |
| GET | `/v1/documents/{document_id}/pages/{page_number}` | P0 | 권한과 만료시간이 있는 page render URL |
| POST | `/v1/revisions/{revision_id}/master-reuploads` | Stretch | Master Cue v2 upload + child revision 생성 |

### 6.4 Extraction과 review

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| POST | `/v1/revisions/{revision_id}/extraction-runs` | P0 | 세 role별 Upstage job 시작 |
| GET | `/v1/revisions/{revision_id}/extraction-runs` | P0 | revision의 추출 run 이력 |
| GET | `/v1/extraction-runs/{run_id}` | P0 | role별 upstream/decoder 상태 |
| GET | `/v1/revisions/{revision_id}/facts` | P0 | role·status·type filter가 있는 cursor 목록 |
| GET | `/v1/facts/{fact_id}` | P0 | raw/normalized value와 source refs |
| GET | `/v1/facts/{fact_id}/reviews` | P0 | Fact 검토 이력 |
| POST | `/v1/facts/{fact_id}/reviews` | P0 | approve/correct/reject append-only review |
| POST | `/v1/revisions/{revision_id}/fact-reviews:batch` | P0 | hero 15 fact 일괄 검토 |
| GET | `/v1/revisions/{revision_id}/event-links` | P0 | proposed/approved/rejected link 목록 |
| POST | `/v1/revisions/{revision_id}/event-links` | P0 | AI가 놓친 link를 사람이 후보로 추가 |
| GET | `/v1/event-links/{link_id}/decisions` | P0 | Link 판단 이력 |
| POST | `/v1/event-links/{link_id}/decisions` | P0 | link approve/reject |
| GET | `/v1/revisions/{revision_id}/stage-graph` | P0 | named zones, routes, review state |
| GET | `/v1/stage-graph-items/{item_id}/reviews` | P0 | Stage item 검토 이력 |
| POST | `/v1/stage-graph-items/{item_id}/reviews` | P0 | zone/route/geometry review |
| GET | `/v1/revisions/{revision_id}/authority-decisions` | P0 | authority 결정 목록 |
| POST | `/v1/revisions/{revision_id}/authority-decisions` | P0 | scoped authority decision 추가 |
| GET | `/v1/revisions/{revision_id}/review-state` | P0 | freeze에 쓸 canonical version tuple과 남은 review |
| POST | `/v1/revisions/{revision_id}/review-gates/complete` | P0 | verifier에 사용할 reviewed snapshot 동결 |

### 6.5 Compile, verification, Finding

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| GET | `/v1/revisions/{revision_id}/verification-readiness` | P0 | start blocker와 canonical input fingerprint 계산 |
| POST | `/v1/revisions/{revision_id}/verification-runs` | P0 | compile + deterministic verification 시작 |
| GET | `/v1/revisions/{revision_id}/verification-runs` | P0 | revision의 검증 run 이력 |
| GET | `/v1/verification-runs/{run_id}` | P0 | rule별 상태·aggregate summary |
| GET | `/v1/revisions/{revision_id}/compiled-events` | P0 | required `compile_run_id`의 reviewed 8-event graph |
| GET | `/v1/revisions/{revision_id}/findings` | P0 | required `verification_run_id` + verdict/severity/lifecycle filter 목록 |
| GET | `/v1/findings/{finding_id}` | P0 | 계산·lineage·상태 상세 |
| GET | `/v1/findings/{finding_id}/evidence` | P0 | 계산에 실제 사용한 source refs |
| GET | `/v1/findings/{finding_id}/decisions` | P0 | Finding 분류 이력 |
| POST | `/v1/findings/{finding_id}/decisions` | P0 | 실제 충돌/오탐/확인 필요 분류 기록 |
| GET | `/v1/findings/{finding_id}/exception-decisions` | P0 | 별도 책임 승인 이력 |
| POST | `/v1/findings/{finding_id}/exception-decisions` | P0 | reviewed 실제 충돌에 대한 별도 책임 승인 |

### 6.6 Proposal

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| GET | `/v1/revisions/{revision_id}/proposals` | Stretch | required `verification_run_id`의 proposal 목록 |
| GET | `/v1/proposals/{proposal_id}` | Stretch | type별 discriminated detail |
| GET | `/v1/proposals/{proposal_id}/decisions` | Stretch | Proposal 결정 이력 |
| POST | `/v1/proposals/{proposal_id}/decisions` | Stretch | accept/reject. source·finding을 변경하지 않음 |

Proposal 생성은 verification workflow의 server-side 단계다. client가 임의 payload로 Proposal을 만드는 공개 endpoint는 두지 않는다.

### 6.7 Final simulation

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| GET | `/v1/revisions/{revision_id}/final-gate` | Stretch | blocker 범주·refs·input fingerprint를 포함한 해금 판정 |
| GET | `/v1/revisions/{revision_id}/simulation` | Stretch | final manifest, 8 events, frames, provenance links |

`play`, `pause`, `next`는 client-local UI state다. 서버 simulation API는 final compiled result를 읽기 전용으로 반환한다.

### 6.8 Async operation

| Method | Path | 단계 | 설명 |
|---|---|---:|---|
| GET | `/v1/operations/{operation_id}` | P0 | polling |
| POST | `/v1/operations/{operation_id}/cancel` | P1 | 로컬 orchestration/polling 중단 요청; Upstage job 취소를 보장하지 않음 |
| GET | `/v1/operations/{operation_id}/events` | P1 | optional SSE; P0는 polling만 필요 |

---

## 7. 핵심 command 상세 계약

### 7.1 Case 생성

`POST /v1/productions/{production_id}/cases`

```json
{
  "label": "긴 암전 S#16 → S#17",
  "scope": {
    "kind": "HERO_SEGMENT",
    "description": "우주비행사가 된 마루 전환"
  }
}
```

응답은 `VerificationCase`와 `initial_revision_id`를 반환한다. initial revision의 `workflow_status=DRAFT`이며 source가 세 개 채워지고 확인되기 전까지 extraction을 시작할 수 없다.

### 7.2 고정 slot upload

`PUT /v1/revisions/{revision_id}/sources/{slot_role}`

- Content-Type: `multipart/form-data`
- parts: `file`, `origin`, `revision_label`
- `slot_role`: `SCRIPT | MASTER_CUE | STAGE_SPEC`
- 허용 형식 P0:
  - SCRIPT: PDF
  - MASTER_CUE: XLSX
  - STAGE_SPEC: PDF
- 서버가 bytes의 SHA-256을 계산한다. client가 보낸 hash를 신뢰하지 않는다.
- 업로드 시 slot role을 확정한다. Upstage가 role을 덮어쓸 수 없다.
- content sanity check가 명백히 실패하면 document는 보존하되 `workflow_status=BLOCKED_ROLE_MISMATCH`로 전이하고 extraction을 막는다.

### 7.3 Source confirmation

`POST /v1/revisions/{revision_id}/source-confirmation`

```json
{
  "sources": [
    {"slot_role":"SCRIPT","document_id":"doc_script","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
    {"slot_role":"MASTER_CUE","document_id":"doc_master_v1","sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
    {"slot_role":"STAGE_SPEC","document_id":"doc_stage","sha256":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}
  ]
}
```

Guard:

- role 3/3, 중복 0, 누락 0
- 현재 slot document ID와 hash exact match
- role mismatch issue 0
- origin 존재

성공 시 source manifest를 immutable snapshot으로 pin한다. 이후 같은 revision의 slot upload는 `409 REVISION_SOURCE_LOCKED`다.

### 7.4 Extraction 시작

`POST /v1/revisions/{revision_id}/extraction-runs`

```json
{
  "mode": "LIVE_WITH_CACHE_FALLBACK",
  "pipeline_version": "standby-p0-v1"
}
```

Guard:

- source selection confirmed
- role sanity 통과
- 세 document hash 고정
- 서버의 immutable pipeline registry에서 각 role의 `agent_id`와 `config_id`가 모두 pin됨
- 같은 hash + agent/config의 성공 cache는 재사용 가능

client가 Agent/Config ID를 임의로 넘기지 않는다. 서버가 `pipeline_version`을 정확히 세 role의 배포 설정으로 해석한다. 동일 run은 role별 Upstage job을 별도로 보존한다. 한 role 결과가 다른 role로 fallback되거나 자동 재분류되지 않는다.

### 7.5 Fact review

`POST /v1/facts/{fact_id}/reviews`

```json
{
  "decision": "CORRECT",
  "corrected_value": {
    "costume_state": "WEARING: 우주비행사 유니폼"
  },
  "note": "대본 원문과 대조",
  "source_refs": ["src_ref_script_01"]
}
```

- `APPROVE`: extracted value를 분석 fact로 승인
- `CORRECT`: corrected value를 별도 reviewed projection으로 저장. 원본 Fact raw value와 문서를 덮어쓰지 않음
- `REJECT`: verifier에서 제외
- review record는 append-only다.
- `CORRECT`에는 non-empty `corrected_value`가 필수이고, `APPROVE | REJECT`에는 corrected value를 보낼 수 없다. Stage item review에도 같은 조건을 적용한다.

### 7.6 Link·Stage·Authority review

- Link decision은 `APPROVE | REJECT`만 허용한다.
- Stage item review는 `APPROVE | CORRECT | REJECT`다. `CORRECT` geometry는 source origin을 유지하고 actor를 기록한다.
- AuthorityDecision은 `scope_type`, `scope_id`, typed `authority_basis`, `rationale`, `source_refs`를 요구한다. `authority_basis`는 `SOURCE_DOCUMENT(document_id, slot_role)` 또는 `RESPONSIBLE_ROLE(role_label)` 중 하나다. 결정 actor는 request body가 아니라 인증 token에서 기록한다.
- timestamp·업로드 순서·모델 confidence만을 authority basis로 사용할 수 없다.

### 7.7 Review gate 동결

먼저 `GET /v1/revisions/{revision_id}/review-state`에서 `source_snapshot_digest`, fact/link/stage/authority version과 남은 review count를 읽는다.

`POST /v1/revisions/{revision_id}/review-gates/complete`

```json
{
  "scope": "CURRENT_CASE_SCOPE",
  "expected_fact_set_version": "facts_v7",
  "expected_link_set_version": "links_v4",
  "expected_stage_graph_version": "stage_v3",
  "expected_authority_version": "authority_v2"
}
```

성공 응답의 `review_snapshot_id`가 verification input이 된다. 이후 review가 바뀌면 기존 snapshot과 그 verification result는 `STALE`다.

### 7.8 Verification 시작

먼저 `GET /v1/revisions/{revision_id}/verification-readiness?review_snapshot_id=...&rule_set_version=...`로 `can_start`, blocker 목록과 서버 계산 `input_fingerprint`를 받는다.

`POST /v1/revisions/{revision_id}/verification-runs`

```json
{
  "review_snapshot_id": "review_snapshot_01",
  "run_type": "INITIAL",
  "rule_set_version": "hero-rules-v1",
  "expected_input_fingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

`run_type`: `INITIAL | REVERIFY`

Guard:

- selected sources, review snapshot, rule set이 고정됨
- 필요한 Fact·Link·Stage·Authority가 모두 reviewed됨
- 필수 값이 없으면 job을 실패시키지 않고 해당 rule result를 `INSUFFICIENT`로 생성
- role mismatch는 verification 자체를 시작하지 않음

같은 input tuple은 같은 compile graph와 Finding payload를 반환해야 한다.

### 7.9 Finding decision

`POST /v1/findings/{finding_id}/decisions`

```json
{
  "decision": "ACTUAL_CONFLICT",
  "note": "의상팀과 확인 필요",
  "source_refs": ["src_ref_master_01"]
}
```

허용값:

- `ACTUAL_CONFLICT`
- `FALSE_POSITIVE`
- `NEEDS_CLARIFICATION`
- `EVIDENCE_INSUFFICIENT`

Finding 분류와 위험 수용은 같은 command가 아니다. 예외는 `POST /v1/findings/{finding_id}/exception-decisions`에 다음처럼 별도로 기록한다.

```json
{
  "decision": "ACCEPT_EXCEPTION",
  "rationale": "공연 책임자가 이 제약을 인지하고 진행 승인",
  "source_refs": ["src_ref_master_01"],
  "expected_verification_run_id": "vrun_01",
  "expected_input_fingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

`EVIDENCE_INSUFFICIENT`는 사람이 근거 부족을 기록하는 분류이며 deterministic verdict `INSUFFICIENT`와 별개로 보존한다. 예외 승인은 reviewed `VIOLATION | REVIEW` 중 `ACTUAL_CONFLICT`로 분류된 Finding에만 가능하다. approver는 인증 actor에서 서버가 기록한다. `INSUFFICIENT`, `EVIDENCE_INSUFFICIENT`, missing input, authority conflict, role mismatch에는 `422 EXCEPTION_NOT_ALLOWED`다. 승인해도 Finding의 deterministic verdict와 lifecycle은 바뀌지 않는다.

성공 응답 뒤 UI는 최신 append-only decision 존재를 `DECISION_RECORDED` token으로 표시한다. 이 token은 Finding lifecycle이 아니며 source hash, verdict, severity, calculation, consistency를 변경하지 않는다.

### 7.10 Proposal decision — Stretch

`POST /v1/proposals/{proposal_id}/decisions`

```json
{
  "decision": "ACCEPT",
  "note": "외부 Master Cue에서 수정 검토",
  "expected_verification_run_id": "vrun_01",
  "expected_input_fingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "expected_base_document_hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "expected_source_snapshot_digest": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
}
```

효과:

- Proposal status만 `ACCEPTED` 또는 `REJECTED`로 변경한다.
- Source hash 변화 0
- Finding lifecycle 변화 0
- Case의 `active_workflow_status=AWAITING_MASTER_REUPLOAD`
- 서버는 Master Cue edit connector를 호출하지 않는다.

### 7.11 Master Cue v2 재업로드 — Stretch

`POST /v1/revisions/{revision_id}/master-reuploads`

- multipart: `file`, `revision_label`, `change_note`, `expected_parent_master_hash`, `expected_source_snapshot_digest`
- base revision은 현재 case의 active revision이어야 한다.
- 두 expected digest가 현재 active revision과 exact match하지 않으면 child를 만들지 않는다.
- 새 bytes의 SHA-256이 base master와 같으면 `409 SOURCE_HASH_UNCHANGED`다.
- 새 master는 `parent_document_id`로 v1을 가리킨다.
- 새 CaseRevision은 base revision의 SCRIPT와 STAGE_SPEC document를 그대로 참조하고 MASTER_CUE만 v2로 교체한다.

원자적 side effect:

1. base revision의 세 상태축과 base simulation을 current-use 기준 `STALE`
2. base master hash를 참조하는 Proposal을 `SUPERSEDED`
3. child revision 생성
4. child source manifest hash 고정
5. child extraction operation 생성: MASTER_CUE는 새 job, unchanged SCRIPT/STAGE_SPEC는 exact cache hit일 때만 재사용

`202` 응답은 child revision과 operation 외에 resource type별 `carried_forward[]`·`invalidated[]` count와 reason을 반환한다.

Child revision carry-forward 규칙:

| 대상 | child 처리 |
|---|---|
| SCRIPT/STAGE_SPEC binding | 동일 immutable document/hash를 명시적으로 재참조 |
| SCRIPT/STAGE_SPEC raw extraction | exact agent/config/decoder cache key가 같을 때 재사용 가능; child-scoped projection에 `derived_from` 기록 |
| MASTER_CUE facts | 전부 새 hash에서 재추출, review 초기화 |
| EventLink | MASTER_CUE fact를 하나라도 참조하면 parent link를 `STALE`로 제외하고 child에 새 `PROPOSED` link를 생성·재검토 |
| StageGraph | 동일 stage hash에서 검토된 graph를 parent ref와 함께 carry 가능; stage 관련 correction/authority가 바뀌면 새 version 필요 |
| AuthorityDecision | 변경 없는 단일 SCRIPT/STAGE document에만 귀속된 결정은 복제 가능; MASTER_CUE, EventLink, Finding, cross-source rule 관련 결정은 재검토 |
| ReviewSnapshot/Compile/Verification/Finding/Proposal/Exception/FinalGate/Simulation | child 승계 금지; child 전체 scope에서 새로 생성·평가 |

어떤 Fact·Link·Stage·Authority review든 freeze 이후 변경되면 review-set version을 증가시키고, 해당 snapshot에서 파생된 ReviewSnapshot, CompileRun, VerificationRun, FinalGateEvaluation을 current-use 기준 `STALE`, SimulationManifest를 즉시 `STALE/LOCKED`, Proposal을 `SUPERSEDED` 처리한다. stale run의 ExceptionDecision도 현재 gate에서 제외한다. audit 데이터는 삭제하지 않는다.

변경된 Fact review가 끝난 뒤 `run_type=REVERIFY` verification을 시작한다.

### 7.12 Final gate 조회 — Stretch

`GET /v1/revisions/{revision_id}/final-gate`

응답은 `gate_status`, `verification_run_id`, `input_fingerprint`, 범주별 blocker count와 해당 resource refs를 포함한다. 이 응답은 UI 편의를 위한 집계가 아니라 Final 2D 접근을 결정한 동일한 server-side 판정 결과다.

### 7.13 Final simulation 조회 — Stretch

`GET /v1/revisions/{revision_id}/simulation`

Guard:

- `workflow_status=COMPLETE`
- `verification_status=CONSISTENT | CONSISTENT_WITH_EXCEPTIONS`
- `simulation_status=READY | READY_WITH_EXCEPTIONS`
- aggregate open blocker 0
- required evidence complete
- authority reviewed
- manifest의 revision ID, 세-source snapshot digest, master hash, stage graph version, compile/verification run ID가 현재 final snapshot과 일치

실패 시 `423 SIMULATION_LOCKED`와 gate summary를 반환한다. 과거 revision의 simulation을 정상 응답으로 제공하지 않는다.

---

## 8. 상태 모델

단일 `status`로 처리 단계, 검증 결과, 2D 권한을 섞지 않는다. API는 세 축을 독립적으로 반환한다.

### 8.1 Workflow status

`DRAFT | SOURCE_CONFIRMATION | EXTRACTING | EXTRACTION_REVIEW | READY_TO_VERIFY | FINDINGS_REVIEW | AWAITING_MASTER_REUPLOAD | REVERIFYING | COMPLETE | BLOCKED_ROLE_MISMATCH | BLOCKED_MISSING_INPUT | FAILED | STALE`

### 8.2 Verification status

`NOT_RUN | RUNNING | FINDINGS_PRESENT | CONSISTENT | CONSISTENT_WITH_EXCEPTIONS | INSUFFICIENT | FAILED | STALE`

### 8.3 Simulation status

`LOCKED | READY | READY_WITH_EXCEPTIONS | FAILED | STALE`

예를 들어 `workflow_status=COMPLETE`, `verification_status=CONSISTENT`, `simulation_status=READY`가 Final 2D 정상 상태다. 문서 근거 부족은 workflow 시스템 실패가 아니라 `verification_status=INSUFFICIENT` 또는 입력 blocker로 표현한다. UI가 보여주는 한 줄 상태는 이 세 축에서 파생하며 저장된 진실이 아니다.

### 8.4 Operation status

`QUEUED | RUNNING | WAITING_FOR_REVIEW | SUCCEEDED | FAILED | CANCELLED`

Operation 완료가 domain 상태 전이를 자동으로 정당화하지 않는다. 예를 들어 extraction이 `SUCCEEDED`여도 Fact가 검토되기 전 `workflow_status=EXTRACTION_REVIEW`다.

### 8.5 Finding lifecycle

`OPEN | CLOSED_BY_REVERIFICATION`

- Proposal decision으로 바뀌지 않는다.
- Exception decision으로 바뀌지 않는다.
- row 이동만으로 닫히지 않는다.
- lineage 대응이 불확실하면 `OPEN` 유지 + `LINEAGE_REVIEW_REQUIRED` issue를 생성한다.

### 8.6 Proposal status

`PROPOSED | ACCEPTED | REJECTED | SUPERSEDED`

`SUPERSEDED`는 새 source hash에 적용할 수 없음을 뜻하며 삭제가 아니다.

---

## 9. 데이터 계약과 검증 규칙

### 9.1 Provenance

모든 document, fact, proposal, simulation state에 다음 origin 중 하나를 보존한다.

`REAL_REFERENCE | USER_PROVIDED | CONTROLLED_FIXTURE | MUTATED_FIXTURE | DERIVED | AI_PROPOSED`

origin과 review status는 별개다.

`UNREVIEWED | REVIEWED | REJECTED`

Finding 자체의 origin은 항상 `DERIVED`다. 대신 `evidence_origins[]`에 계산에 실제 사용한 SCRIPT, MASTER_CUE, STAGE_SPEC 증거의 origin을 중복 없이 보존한다. 합성 stage fixture 하나가 있다고 전체 Finding을 `CONTROLLED_FIXTURE`로 덮어쓰지 않는다.

### 9.2 SourceRef locator

locator는 discriminated union이다.

- `PAGE_QUOTE`: document ID, page, source quote
- `SHEET_CELL`: document ID, sheet, row, field/column, source quote
- `TABLE_ELEMENT`: page, element ID, optional verified coordinates
- `TEXT_LINE`: source-map이 있는 경우 original line range

좌표는 upstream에서 확인된 경우에만 포함한다. 좌표가 없으면 page + quote로 축소하며 가짜 bbox를 만들지 않는다.

### 9.3 Fact

- `raw_value`는 Upstage decoder 출력이며 불변이다.
- `reviewed_value`는 사람 review projection이며 nullable이다.
- verifier는 `review_status=REVIEWED`일 때 `reviewed_value ?? raw_value`만 사용한다.
- `confidence`는 review priority일 뿐 authority나 correctness가 아니다.

### 9.4 TimeRange

```json
{
  "min_ms": 58000,
  "max_ms": 62000,
  "semantics": "AVAILABLE_WINDOW",
  "origin": "CONTROLLED_FIXTURE",
  "review_status": "REVIEWED"
}
```

`min_ms <= max_ms`를 강제한다. hard verdict input은 명시·reviewed 값만 허용한다.

### 9.5 Finding

축을 섞지 않는다.

- `verdict`: `VIOLATION | REVIEW | INSUFFICIENT | NO_CONFLICT_WITHIN_DECLARED_CONSTRAINTS`
- `severity`: `ERROR | WARNING | INFO`
- `lifecycle`: `OPEN | CLOSED_BY_REVERIFICATION`
- `evidence_state`: `UNREVIEWED | REVIEWED | INCOMPLETE`

모든 Finding은 `rule_id`, stable `segment_lineage`, 정렬된 `entity_ids`, canonical `finding_lineage_key`, calculation trace, 실제 사용 source refs를 가진다. lineage key는 row 번호가 아니라 `rule_id + segment_lineage_id + sorted(entity_ids)`에서 만든다.

### 9.6 Proposal union

공통 필드:

- proposal ID/type/status
- finding ID, `verification_run_id`, `input_fingerprint`
- `base_document_hash`
- `base_source_snapshot_digest`
- rationale, impact refs, source refs
- generation provenance

타입별 필수조건:

| Type | 필수 | null/금지 |
|---|---|---|
| `MASTER_CUE_EDIT_SUGGESTION` | exact XLSX locator, non-null current/suggested value, reviewed `authority_decision_id`와 basis | current/suggested null 금지 |
| `RESOLUTION_OPTIONS` | option별 source refs, assumptions, `non_authoritative=true` | suggested value는 null |
| `CLARIFICATION_REQUEST` | question, conflicting source refs | suggested value는 null; target optional |
| `MISSING_INPUT_REQUEST` | missing fact type, requested evidence | suggested value는 null; target optional |

서버 proposal guard가 이 union을 검증한 뒤에만 저장한다. Solar/Instruct raw output을 그대로 client에 canonical Proposal로 반환하지 않는다.

---

## 10. 오류 코드

### 10.1 일반

| HTTP | Code | 의미 |
|---:|---|---|
| 400 | `INVALID_ARGUMENT` | 문법 또는 기본 validation 실패 |
| 401 | `UNAUTHENTICATED` | token 없음/만료 |
| 403 | `FORBIDDEN` | tenant 또는 역할 권한 부족 |
| 404 | `RESOURCE_NOT_FOUND` | resource 없음 |
| 409 | `RESOURCE_STATE_CONFLICT` | 현재 상태에서 command 불가 |
| 412 | `VERSION_PRECONDITION_FAILED` | ETag/resource version 충돌 |
| 413 | `FILE_TOO_LARGE` | 서버 또는 upstream 한도 초과 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | role별 허용 형식 아님 |
| 422 | `CONTRACT_VIOLATION` | domain 계약 위반 |
| 423 | `RESOURCE_LOCKED` | Final simulation 또는 immutable revision 잠김 |
| 428 | `PRECONDITION_REQUIRED` | 필요한 `If-Match` 누락 |
| 429 | `RATE_LIMITED` | retry-after 필요 |
| 502 | `UPSTREAM_BAD_RESPONSE` | Upstage 응답 decode 불가 |
| 503 | `UPSTREAM_UNAVAILABLE` | live upstream 실패; cache 여부 details에 포함 |

### 10.2 Domain gate

| Code | 조건 |
|---|---|
| `SOURCE_SLOT_MISSING` | 세 role 중 하나 없음 |
| `SOURCE_HASH_MISMATCH` | confirmation hash와 서버 hash 불일치 |
| `SOURCE_HASH_UNCHANGED` | v2가 v1과 같은 bytes |
| `SOURCE_SNAPSHOT_STALE` | expected 세-source digest가 current와 다름 |
| `REVISION_SOURCE_LOCKED` | confirmed revision source 교체 시도 |
| `ROLE_MISMATCH_REVIEW` | slot과 content sanity 불일치 |
| `GATE_SOURCE_UNCONFIRMED` | source confirmation 전 extraction |
| `GATE_UNREVIEWED_FACTS` | required Fact review 미완료 |
| `GATE_UNAPPROVED_LINKS` | required EventLink 미승인 |
| `GATE_UNREVIEWED_STAGE_GRAPH` | topology/route review 미완료 |
| `GATE_UNREVIEWED_AUTHORITY` | hard verdict authority 미확정 |
| `GATE_MISSING_INPUT` | 필수 입력 없음 |
| `GATE_OPEN_BLOCKERS` | aggregate blocker 남음 |
| `GATE_STALE_REVISION` | 과거 revision에서 실행 시도 |
| `LINEAGE_REVIEW_REQUIRED` | v1/v2 Finding 대응 불확실 |
| `PROPOSAL_CONTRACT_VIOLATION` | type별 필드 계약 위반 |
| `INPUT_FINGERPRINT_MISMATCH` | current verification input과 expected fingerprint 불일치 |
| `EXCEPTION_NOT_ALLOWED` | 예외 처리 불가 Finding |
| `SIMULATION_LOCKED` | Final gate 미충족 |
| `UPSTAGE_RESULT_ROLE_LOST` | upstream result의 file/role identity 보존 실패 |
| `UPSTAGE_LOCATION_UNVERIFIED` | word coordinate 기능 사용 불가; page+quote fallback 가능 |
| `UPSTAGE_SUBMISSION_UNKNOWN` | provider create request 처리 여부를 안전하게 판별할 수 없음 |
| `PAGE_LIMIT_EXCEEDED` | pipeline의 page 한도 초과 |

---

## 11. 비동기 처리와 retry

### 11.1 비동기 대상

- file malware scan/hash
- Upstage upload + Agent response polling
- extraction decoding
- compile + verification
- master v2 re-extraction/reverification
- case purge

### 11.2 retry 정책

- client는 `poll_after_ms` 또는 `Retry-After`를 따른다.
- `GET /responses/{job_id}` polling의 네트워크 오류·429·5xx는 backoff + jitter로 재시도한다.
- 공개 idempotency 계약이 없는 `POST /responses`가 처리됐는지 모호한 timeout/5xx에서는 자동으로 job을 다시 만들지 않는다. operation을 `SUBMISSION_UNKNOWN` 오류로 멈추고 reconciliation 또는 사람 재시작을 요구한다.
- `POST /files`의 모호한 실패도 provider file ID를 확인할 수 없으므로 무제한 자동 재시도하지 않는다.
- validation/decoder 오류는 retry하지 않는다.
- 동일 operation에서 upstream job을 중복 생성하지 않는다.
- cache fallback을 사용하면 `result_source=CACHE`, 원래 live operation ID, cached run ID를 응답과 audit에 남긴다.

### 11.3 cache key

Extraction:

```text
sha256(document bytes) + slot_role + agent_id + config_id + decoder_version
```

Verification:

```text
source snapshot digest + verification scope + reviewed fact set version
+ approved link set version + stage graph version + authority version
+ rule set version + compiler version + verifier version
```

config만 바뀐 rerun은 source revision이나 Finding 해결로 취급하지 않는다.

---

## 12. 내부 Upstage Adapter 계약

공식 Agents API base URL은 `https://api.upstage.ai/v2`다. external sequence는 다음 경계 안에 숨긴다.

```text
upload file → POST /v2/files
submit Agent job → POST /v2/responses with model=Agent ID and required config_id
poll → GET /v2/responses/{job_id}?include[]=all
preserve output[] step boundary → decode output[].content[].text + stringified additional_values
```

현재 공식 Create Job 명세는 `config_id`를 지원하며 생략하면 최신 config를 사용한다. STANDBY는 재현성을 위해 생략을 금지한다. 서버 registry의 role별 `agent_id + config_id`를 request에 명시하고, upstream 응답이 이를 echo하지 않아도 요청값을 operation/audit에 보존한다. P0는 다중 파일 한 job 기능이 있어도 provenance를 단순하게 유지하려고 role별 한 파일·한 job으로 호출한다.

공식 근거: [Agents API](https://console.upstage.ai/docs/agents), [Create Job](https://console.upstage.ai/api/agents/jobs/create-job), [Retrieve Job](https://console.upstage.ai/api/agents/jobs/retrieve-job).

role별 실제 create body:

```json
{
  "model": "agt_role_specific_id",
  "config_id": "config_pinned_id",
  "include": ["all"],
  "input": [
    {
      "role": "user",
      "content": [
        {"type": "input_file", "file_id": "file_provider_id"}
      ]
    }
  ]
}
```

### 12.1 SubmitExtractionJob

```ts
type SubmitExtractionJob = {
  operationId: string;
  sourceDocumentId: string;
  slotRole: "SCRIPT" | "MASTER_CUE" | "STAGE_SPEC";
  sha256: string;
  agentId: string;
  configId: string;
};
```

응답:

```ts
type UpstageJobHandle = {
  upstreamFileId: string;
  upstreamJobId: string;
  agentId: string;
  configId: string;
  returnedAgentId: string | null;
};
```

### 12.2 PollExtractionJob

```ts
type PollExtractionJobResult = {
  status: "queued" | "in_progress" | "completed" | "failed";
  rawResponseObjectKey: string;
  steps: Array<{
    order: number;
    id: string;
    type: string;
    status: string;
    role: string;
    stepModel: string;
    content: Array<{
      type: string;
      text: string | null;
      rawAdditionalValues: string | null;
      parsedAdditionalValues: unknown | null;
    }>;
  }>;
  usage: Record<string, unknown>;
  providerErrorRaw: unknown | null;
  incompleteDetailsRaw: unknown | null;
};
```

Upstage에는 공개된 cancel·webhook 계약이 없으므로 P0는 polling한다. 권장 backoff는 `2s → 3s → 5s → 8s → 15s`에 jitter를 더하고, STANDBY operation의 로컬 timeout은 55분이다. timeout은 upstream job을 취소했다는 뜻이 아니다.

`DELETE /v2/files/{file_id}`는 내부 cleanup 함수로 제공한다. 관련 job이 terminal이고 raw response·decoded artifact가 우리 storage에 영속화된 뒤에만 삭제한다. 실패·중단 fixture도 provider file ID를 ledger에 남겨 cleanup하며, case purge 시 잔존 provider file을 제거한다.

서버 upload guard는 `/v1/capabilities`가 반환한 더 작은 한도를 우선 적용한다. 공식 Studio 상한은 파일당 500MB·1,000페이지이고 Enhanced Extract는 50페이지이므로, 초과는 업로드 전/후 검사에서 각각 `413 FILE_TOO_LARGE` 또는 `422 PAGE_LIMIT_EXCEEDED`로 중단한다. 공식 근거: [Studio 지원 형식과 한도](https://console.upstage.ai/docs/studio#supported-file-formats-and-limits).

### 12.3 Decode 결과

- Script Extract는 top-level `script_facts[]`만 반환한다.
- Master Cue Extract는 top-level `cue_facts[]`만 반환한다.
- Stage Extract의 목표 top-level은 `stage_fact_rows[]`지만 실행용 Upstage schema artifact는 아직 없으므로 구현 완료로 표시하지 않는다.
- decoder는 결과를 [exchange-envelope.schema.json](upstage/exchange-envelope.schema.json)에 materialize한 뒤에만 공개 `Fact` projection을 만든다.
- `SCRIPT` record는 선언된 source-segment ID와 `LINE_RANGE`, `MASTER_CUE` record는 `SHEET_CELL` locator가 없으면 fail closed한다. 사람의 `REVIEWED` 승격은 decoder 뒤 별도 gate다.
- decoder가 sequence ID, origin, review status, geometry를 모델 output에서 신뢰하지 않는다.
- provider status와 decoder status를 분리하고, raw request/schema/input artifact/raw response의 hash와 JSON pointer를 보존한다.
- `additional_values` 원문 string과 JSON parse 결과를 모두 보존하며 location과 confidence의 관찰 상태를 별도로 기록한다.
- provider item-level location이 없더라도 adapter locator가 검증되면 strict record는 `location_quality=NATIVE_ONLY`다. native locator까지 검증되지 않으면 record로 승격하지 않고 pre-exchange/UI fallback의 `PAGE_QUOTE_ONLY`에 둔다.
- file/role identity를 잃으면 결과를 병합하지 않고 `UPSTAGE_RESULT_ROLE_LOST`로 fail closed한다.

현재 source-backed 기대값은 [cue-exchange.expected.json](upstage/fixtures/cue-exchange.expected.json)과 [script-exchange.expected.json](upstage/fixtures/script-exchange.expected.json)이며 둘 다 `EXPECTED_GOLD`다. 실제 Upstage 응답 `LIVE_CAPTURE`가 아니다.

---

## 13. 내부 Compiler·Verifier 계약

### 13.1 Compiler input

```ts
type CompileInput = {
  revisionId: string;
  sourceManifestHash: string;
  reviewSnapshotId: string;
  reviewedFacts: Fact[];
  approvedLinks: EventLink[];
  reviewedStageGraph: StageGraph;
  authorityDecisions: AuthorityDecision[];
  compilerVersion: string;
};
```

Output은 stable event ID와 before/current/after state를 가진 `CompiledEventGraph`다. 입력의 원문 순서와 reviewed mapping으로만 sequence를 부여한다.

### 13.2 Verifier input/output

```ts
type VerifyInput = {
  compileRunId: string;
  graphHash: string;
  ruleSetVersion: string;
  selectedRuleIds: string[];
};

type RuleResult = {
  ruleId: string;
  findingLineageKey: string;
  verdict: "VIOLATION" | "REVIEW" | "INSUFFICIENT" | "NO_CONFLICT_WITHIN_DECLARED_CONSTRAINTS";
  severity: "ERROR" | "WARNING" | "INFO";
  calculation: string | null;
  calculationTrace: unknown[];
  sourceRefs: string[];
  origin: "DERIVED";
  evidenceOrigins: string[];
};
```

같은 `graph_hash + rule_set_version`은 canonical JSON 기준 동일 result hash를 내야 한다. AI explanation은 result hash 계산 뒤 별도 field에 붙인다.

### 13.3 Aggregate gate

```text
blocking = OPEN VIOLATION/REVIEW without one of:
          (a) latest reviewed classification FALSE_POSITIVE
          (b) latest reviewed classification ACTUAL_CONFLICT + valid current-run exception
        OR latest classification NEEDS_CLARIFICATION/EVIDENCE_INSUFFICIENT
        OR any INSUFFICIENT on a required rule
        OR missing/role/authority gate issue

simulation_status=READY
  iff blocking_count == 0
  and evidence_completeness == COMPLETE
  and required_authority == REVIEWED
  and revision is active and not STALE
  and valid_exception_count == 0

simulation_status=READY_WITH_EXCEPTIONS
  iff the same gates pass
  and valid_exception_count > 0
```

`simulation_status=READY_WITH_EXCEPTIONS`는 허용된 exception마다 approver, rationale, source refs를 manifest에 포함한다.
`FALSE_POSITIVE`도 Finding을 삭제하거나 lifecycle을 닫지 않는다. Final gate가 현재 verification run에 연결된 reviewed 분류를 명시적으로 비차단으로 집계할 뿐이며, 다음 child revision에는 자동 상속하지 않는다.

---

## 14. Proposal Guard와 Solar 경계 — Stretch

1. deterministic Finding이 먼저 존재해야 한다.
2. 서버가 Finding type과 authority/evidence 상태로 허용 Proposal type을 선택한다.
3. Solar/Instruct는 rationale·question·option text 초안만 생성할 수 있다.
4. 서버가 allowlist, nullable, exact locator, source refs, target base hash, 세 source snapshot digest를 다시 검증한다.
5. 실패하면 deterministic template을 사용한다.
6. 모델이 만든 verdict, severity, calculation, locator, suggested value는 폐기한다.

모델 call metadata는 `provider`, `model`, `prompt_version`, `input_hash`, `raw_output_object_key`, `postprocessed`를 audit에 남긴다.

---

## 15. Final 2D 응답 계약 — Stretch

Simulation 응답은 다음을 한 번에 포함한다.

- `simulation_status`: `READY | READY_WITH_EXCEPTIONS`
- `final_revision_id`
- `source_snapshot_digest`
- `input_fingerprint`
- `master_document_hash`
- `stage_graph_version`
- `compile_run_id`, `verification_run_id`
- `layout_scale=NOT_TO_SCALE`
- `demo_disclaimer`와 origin badges
- reviewed zones/routes
- ordered event 8개
- event별 actor/crew/prop/cue states
- event별 reviewed `time_range`
- event별 source refs
- accepted exceptions가 있으면 전체 목록

P0 client는 응답을 받은 뒤 local `current_event_index`만 바꾼다. 서버는 interpolation, 속도, 충돌 애니메이션을 생성하지 않는다.

---

## 16. 보안·개인정보·보관

- 업로드 전 extension만 보지 않고 MIME과 magic bytes를 검증한다.
- document viewer URL은 짧은 만료시간의 signed URL이다.
- source quote가 로그·metric label로 유출되지 않게 한다.
- object store는 workspace별 prefix와 server-side encryption을 사용한다.
- raw Upstage response는 access-controlled object store에 저장하고 일반 API에는 필요한 projection만 반환한다.
- case purge는 source bytes, page render, raw upstream response, cache와 derived data를 retention policy에 따라 삭제한다.
- audit에는 삭제 event와 대상 hash를 남기되 원문을 남기지 않는다.
- 실제 개인정보가 있는 공연 문서는 데모 fixture에서 비식별화한다.

---

## 17. Observability와 audit

모든 요청:

- `request_id`, actor, workspace, route, status, latency
- source text와 API key는 기록하지 않음

비동기 작업:

- operation ID, upstream job ID, attempt, poll count, cache hit, returned model
- role별 extraction latency와 decoder version

검증:

- review snapshot ID, compile graph hash, rule set version, result hash
- Finding count by verdict/type/origin
- aggregate blocker count와 gate reason

필수 audit event:

- source uploaded/confirmed
- role mismatch raised/resolved
- Fact/Link/Stage/Authority review recorded
- verification started/completed
- Proposal generated/accepted/rejected/superseded
- Finding decision/exception recorded
- child revision created
- parent revision stale
- Finding closed by reverification
- Final simulation unlocked/locked

---

## 18. P0 구현 순서

1. Production/Case/Revision + exact 3-slot upload
2. source confirmation과 immutable hash
3. generic Operation polling
4. Upstage adapter 세 role job
5. Facts + review records + EventLinks + StageGraph + AuthorityDecision
6. review snapshot freeze
7. compile + verification + Finding/evidence
8. compiled events + reviewed stage graph 기반 2D `EVIDENCE PREVIEW`
9. Finding decision + `DECISION_RECORDED` projection
10. two-screen read models + source drawer
11. audit events + cache fallback

Stretch 구현 순서는 Proposal union → Master v2 child revision → full reverification → aggregate final gate → final simulation read model이다. SSE, production list, rename, purge는 P1이다.

---

## 19. API acceptance checklist

### Source safety

- [ ] Fact review, Finding decision 전후 source hash 변화 0
- [ ] Master Cue write API와 connector 0
- [ ] confirmed revision source 교체 시도 409

### Review gates

- [ ] source 3/3 확인 전 extraction 0
- [ ] unreviewed required Fact/Link/Stage/Authority로 hard verdict 0
- [ ] missing value를 AI가 채운 API response 0
- [ ] role identity가 request부터 Finding source drawer까지 3/3 유지

### Verification

- [ ] 동일 snapshot 3회 result hash 동일
- [ ] quick-change calculation `58–62s / 66–68s` 재현
- [ ] missing route/minimum change는 `INSUFFICIENT`
- [ ] config-only rerun은 source 해결 처리 0

### Two-screen preview와 decision

- [ ] `GET /compiled-events`가 hero event 8개와 before/after state, active route, origin을 반환
- [ ] open finding이 있어도 compiled events를 `EVIDENCE PREVIEW`로 조회 가능
- [ ] open blocker가 있는 응답에 `FINAL`, `CONSISTENT`, `READY` projection 0
- [ ] `POST /findings/{id}/decisions` 성공 뒤 `DECISION_RECORDED`가 보이지만 Finding은 `OPEN`
- [ ] `VIOLATION`, `REVIEW`, `INSUFFICIENT` fixture와 clean `finding_count=0` summary를 구분
- [ ] result, stage graph, source drawer에 origin badge가 보존됨

### Revision loop — Stretch

- [ ] Proposal ACCEPT 후 Finding `OPEN`
- [ ] Proposal decision의 target base hash와 세-source snapshot digest가 다르면 409/412
- [ ] v2 upload 후 parent `STALE`, old Proposal `SUPERSEDED`
- [ ] lineage Finding이 새 run에 남으면 `OPEN`
- [ ] blocker 하나라도 남은 child에서 Final unlock 0
- [ ] required insufficient/authority/role issue의 exception 처리 0
- [ ] v2 같은 hash 업로드 시 child revision 생성 0

### Final 2D — Stretch

- [ ] final manifest의 revision/master hash/stage graph/compile run 일치
- [ ] Final status가 아니면 423
- [ ] 8 events와 event source refs 반환
- [ ] controlled fixture disclaimer와 badges 유지
- [ ] 좌표·속도·안전 인증을 API가 생성하지 않음

---

## 20. 구현 전 남은 외부 확인

다음은 API 이름을 추측해 구현하지 않고 실제 계정 smoke test로 닫는다.

1. 행사 tenant에서 role별 Agent ID와 Config ID를 실제 request로 고정했을 때 같은 config가 실행되는지
2. Studio Jobs `include[]=all`에서 배열 item location과 file identity 보존 여부
3. Table View reviewed result를 별도 API로 동기화할 수 있는지
4. 행사 tenant에 문서화되지 않은 Webhook 기능이 별도로 열려 있는지 — P0 계약은 polling만 사용

확인 실패 시에도 공개 API는 바뀌지 않는다. Upstage adapter가 page+quote fallback과 role별 separate job을 사용한다.
