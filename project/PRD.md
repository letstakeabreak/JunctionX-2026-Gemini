# STANDBY — Product Requirements Document

| 항목 | 내용 |
|---|---|
| 문서 상태 | Draft v0.5 — two-screen P0 Lo-Fi와 evidence-first review 반영 |
| 기준일 | 2026-08-22 |
| 트랙 | Upstage — Automate Paperwork |
| 1차 사용자 | 부서별 내용을 취합한 마스터 큐시트를 검증·수정하는 무대감독 |
| MVP 범위 | 한 장면과 전후 전환, 대본·마스터 큐시트·무대 사양 각 1개 |
| 제품 원칙 | Evidence first, human authority, deterministic verification, abstain when unknown |

---

## 0. 이 PRD가 고정하는 결정

### 디지털 트윈은 출발점이 아니라 결과 형태다

STANDBY의 목적은 **대본, 사람이 취합한 마스터 큐시트, 무대 사양을 분석해 blocking conflict, 촉박한 quick-change, 누락된 소품을 리허설 전에 찾아내고 그 근거를 2D 무대 위에서 확인하게 하는 것**이다. 부서별 큐시트를 하나의 마스터 큐시트로 합치는 일은 제품 입력 전에 사람이 수행하며, STANDBY는 그 통합 결과를 검증한다.

세 입력을 시간·공간·상태가 연결된 실행 모델로 정렬하고 2D 무대에서 재생하면 결과물은 디지털 트윈처럼 보인다. 그러나 출발 질문은 “무대를 복제하자”가 아니라 **“사람이 만든 실행 계획이 실제로 서로 양립하는가”**다. 같은 2D workspace는 열린 finding의 계산 근거를 재생하는 `EVIDENCE PREVIEW`와, 모든 gate를 통과한 실행 상태를 보여주는 `FINAL` 모드를 함께 가진다. 정밀 3D 물리 복제 자체가 목적은 아니다.

따라서 제품의 우선순위는 다음과 같다.

1. 사람이 선택한 대본·마스터 큐시트·무대 사양 revision에서 근거가 있는 사실을 꺼낸다.
2. 같은 사건끼리 연결한다.
3. 시간·순서·상태·경로 제약을 검증하고 finding과 근거를 만든다.
4. `VIOLATION`, `REVIEW`, `INSUFFICIENT_EVIDENCE`, clean control을 한 finding 목록에서 구분한다.
5. finding은 계산과 세 원문 근거, 같은 사건을 재생하는 2D view로 설명한다.
6. 사람의 판단은 `DECISION_RECORDED`로만 기록하며, 수정 source 재업로드와 전체 재검증 전에는 `CONSISTENT`를 표시하지 않는다.

### 기존 문서와의 관계

- 부서별 큐시트를 취합하고 마스터 큐시트를 만드는 과정은 사람의 선행 업무이며 이 제품의 입력 범위 밖이다.
- 제품에서 말하는 `cuesheet`는 언제나 **사람이 작성·확정한 master cue sheet revision**을 뜻한다. 부서명은 마스터 큐시트 내부의 열 또는 cue 속성이다.
- 기존 R1~R6은 탐색용 규칙이다. 사람의 ground truth가 없는 결과를 실제 공연 오류로 주장하지 않는다.
- [SCRIPT_INTEGRATION.md](SCRIPT_INTEGRATION.md)는 대본과 마스터 큐시트를 연결할 수 있다는 핵심 근거다.
- [UPSTAGE_PLAYBOOK.md](UPSTAGE_PLAYBOOK.md)의 provenance, human review, API hard gate는 그대로 따른다.
- 제품 정의가 충돌할 때는 아래 English punchline과 이 PRD의 3입력 simulation-verification 정의를 우선한다.

---

## 1. 제품 요약

### 한 문장

> **STANDBY는 대본, 사람이 작성한 마스터 큐시트, 무대 사양을 분석해 blocking conflict, 촉박한 quick-change, 누락된 소품을 찾고, 그 근거를 2D 무대에서 시각화해 공연 오류를 예방하는 AI 도구다.**

### English punchline

> **An AI tool analyzing scripts and cue sheets to detect blocking conflicts, tight quick-changes, and missing props, visualizing the production on a 2D stage simulator to prevent stage errors.**

이 문장의 `cue sheets`는 MVP에서 **사람이 부서별 내용을 미리 취합한 하나의 Master Cue Sheet**를 뜻한다.

### 핵심 가치

공연팀이 극장에 들어가서 문제를 발견하는 대신, 극장 밖에서 다음 질문에 먼저 답하게 한다.

- 문서에 적힌 퇴장·재입장 시간과 사용자가 확인한 무대 경로가 서로 양립하는가?
- 이 환복에는 이동시간까지 포함해 충분한 시간이 있는가?
- 다음 장면에 필요한 소품이 그 위치에 도착하도록 적혀 있는가?
- 대본이 바뀌었는데 마스터 큐시트의 조명·음향·세션 trigger는 과거 문구로 남아 있지 않은가?
- 서로 다른 문서가 같은 씬과 인물을 가리키는 것이 맞는가?
- 무엇을 확정할 수 없으며, 그 판정을 위해 어떤 근거가 더 필요한가?

### 제품이 내놓는 결론의 범위

STANDBY는 “공연 사고가 난다”거나 “이 동선은 절대 불가능하다”고 예측하지 않는다. 확인된 입력을 기준으로 다음 세 종류만 말한다.

- **명시적 제약 위반** — 제공된 시간·경로·상태가 수학적으로 양립하지 않는다.
- **검토 필요** — 값의 범위가 겹치거나 문서가 서로 다르게 말한다.
- **근거 부족** — 판정에 필요한 시간·경로·사건 연결이 없다.

사람의 분류는 `DECISION_RECORDED`일 뿐 source나 finding을 바꾸지 않는다. STANDBY는 원본 마스터 큐시트를 자동으로 덮어쓰거나, 서로 충돌하는 입력 중 어느 것이 최종 정답인지 임의로 선택하지 않는다. source-backed patch proposal과 전체 revision lineage UI는 Stretch다.

---

## 2. 문제 정의

같은 공연의 실행 계획은 서로 다른 사람이 관리하는 세 언어로 나뉜다.

| 입력 | 답하는 질문 | 대표 내용 |
|---|---|---|
| **대본** | 무엇이 일어나야 하는가? | 대사, 가사, 지시문, 등장·퇴장, 소품 사용, 장면 순서 |
| **마스터 큐시트** | 누가 언제 무엇을 실행하는가? | 사람이 취합한 조명, 음향, 세션, 소품, 무대기계, 마이크, 의상·환복 cue |
| **무대 사양** | 어떤 물리 제약이 명시·확인됐는가? | 출입구, 무대 zone, backstage crossover, 환복실, 통행 제한, 이동시간 |

문제는 마스터 큐시트가 없다는 것이 아니다. 사람이 여러 부서 정보를 한 표로 취합해도, 그 결과가 대본의 의도와 무대의 물리 제약에 맞는지는 별도로 증명되지 않는다. 세 입력이 공통 실행 모델 없이 수정되기 때문에 다음과 같은 괴리가 생긴다.

- 대본상 재등장 시점과 마스터 큐시트의 환복 계획이 맞지 않는다.
- 배우는 Stage Right로 퇴장했지만 다음 입장은 Stage Left이고, 무대에는 crossover가 없다.
- 소품은 한쪽으로 퇴장한 뒤 반대편에서 등장하지만 이동·handoff 담당이 없다.
- 대본의 trigger 대사가 바뀌었지만 마스터 큐시트에는 이전 문구가 남아 있다.
- 대본과 마스터 큐시트의 scene 번호 또는 인물명이 다른 revision 기준으로 적혀 있다.
- 문서에 필요한 시간이 없는데 팀은 암묵적인 경험으로 가능하다고 가정한다.

현재는 페이퍼 테크와 리허설에서 사람이 문서를 한 줄씩 대조하고, 실제로 돌려본 뒤 문제를 찾는다. 특히 대학 공연팀과 소극장은 한 사람이 여러 문서를 맡고 테크 기간이 짧아, 반복 대조에 쓸 시간이 부족하다.

> **핵심 문제는 사람이 만든 마스터 큐시트가 대본과 무대 사양에 맞는지 실행 전에 기계적으로 검증하고, 수정할 위치와 이유를 근거와 함께 제안할 공통 기준이 없다는 것이다.**

---

## 3. 사용자와 JTBD

### 1차 사용자

**테크 리허설 전에 부서별 정보를 마스터 큐시트로 취합하고 최종 실행 계획을 검증하는 무대감독·DSM**

- 부서별 cue를 하나의 마스터 큐시트로 취합하고 사용할 revision을 정한다.
- 장면 전환, 배우 동선, 환복, 소품, 기술 cue를 동시에 본다.
- 문제가 보이면 연출 또는 담당 부서에 확인하고 수정본을 배포한다.
- 공연의 실제 가능 여부에 대한 최종 책임과 맥락을 가진다.

초기 적용처는 대학 공연팀과 소극장으로 둔다. 다만 사용자를 “초보자”로 한정하지 않고, **세 입력의 정합성에 책임지는 사람**으로 정의한다.

### 협업 사용자

- 연출: 의도한 장면과 실행 계획이 일치하는지 확인
- 의상팀: 환복 항목과 최소 필요시간 확인
- 무대·소품팀: 이동, preset, handoff 경로 확인
- 조명·음향·세션 담당: 최신 trigger와 동작 확인
- 제작자: 테크 리허설 전에 해결된 위험과 미결정 사항 파악

### Primary JTBD

> 테크 리허설을 앞두고 마스터 큐시트를 완성했을 때, 대본·마스터 큐시트·무대 사양을 하나의 공연 순서로 대조해 충돌과 미확정 지점, 수정할 위치를 확인하고 싶다. 수정본을 다시 검증해 극장에서는 문제를 찾는 대신 실제 움직임을 맞추고 싶다.

### 보조 JTBD

- 새 대본 revision이 들어왔을 때 마스터 큐시트에서 영향을 받는 cue와 장면을 알고 싶다.
- AI의 요약이 아니라 세 입력의 실제 원문을 보고 담당자와 결정하고 싶다.
- 한 장면의 배우·소품·cue 상태를 시간순으로 재생하며 문제의 원인을 이해하고 싶다.
- 수정본을 다시 올렸을 때 문제가 실제 source에서 해소됐는지 확인하고 싶다.

---

## 4. 제품 목표와 비목표

### 제품 목표

1. 사람이 선택한 대본·마스터 큐시트·무대 사양 revision을 원본 그대로 입력받는다.
2. 형식이 다른 세 입력을 근거가 연결된 공통 실행 사건으로 변환한다.
3. 최소 blocking·quick-change·prop continuity를 시간·순서·상태·경로 규칙으로 검증한다.
4. 확정 위반, 검토 필요, 근거 부족, clean control을 구분하고 계산에 실제 사용한 source를 연결한다.
5. 사람의 분류는 `DECISION_RECORDED`로 기록하되 source·finding·검증 상태를 변경하지 않는다.
6. 같은 2D stage workspace에서 finding 근거를 재생하고, gate를 통과한 run만 `FINAL`로 명명한다.

### 기대효과 — 검증할 가설

- 페이퍼 테크 전에 반복적인 문서 대조를 끝내고 회의에서는 결정이 필요한 항목만 다룬다.
- 테크 리허설 중 문서 누락·버전 차이·물리 제약을 처음 발견해 중단하는 횟수를 줄인다.
- 무대감독이 전막의 시간·위치·상태를 머릿속으로 동시에 추적해야 하는 부담을 낮춘다.
- 극장 대관, 세션, 기술 스태프가 함께 대기하는 시간 대신 극장 밖의 수정 시간으로 문제 해결을 앞당긴다.

현재 문서에는 실제 도입 전후 실측이 없으므로 시간·비용 절감 수치를 제품 성과로 주장하지 않는다. 파일럿에서 baseline과 사용 후 시간을 측정한다.

### 비목표

- 정밀한 실측 디지털 트윈 또는 3D 물리 엔진
- 배우의 실제 움직임·체력·군중 행동 예측
- 공연 안전 인증 또는 사고 확률 산출
- 실시간 센서 기반 공연 tracking과 show control
- 전체 공연, 모든 부서, 모든 문서 형식의 48시간 내 지원
- AI가 최신 문서·정답·안전 여부를 자동 결정
- 부서별 큐시트를 자동 취합해 마스터 큐시트를 생성
- 원본 대본·마스터 큐시트·무대 사양의 무승인 자동 덮어쓰기
- 한글 손글씨 수정 의미의 자동 확정
- 근거 없는 이동속도, 환복시간, 무대 경로 생성

---

## 5. 세 입력의 검증 관계

| 대조 | 검증 질문 | 대표 finding |
|---|---|---|
| **대본 ↔ 마스터 큐시트** | 의도된 사건과 운영 cue가 같은 시점·대상·동작을 가리키는가? | stale trigger, missing cue candidate, scene/character mismatch |
| **마스터 큐시트 ↔ 무대** | 적힌 cue를 해당 위치와 시간 안에서 실행할 수 있는가? | no confirmed route, path-time conflict, quick-change tight margin |
| **대본 ↔ 무대** | 지시된 등장·퇴장·소품 사용이 확인된 무대 구조와 양립하는가? | location conflict, unavailable entrance, prop location unknown |
| **세 입력 전체** | 이전 사건의 결과 상태가 다음 사건의 전제와 이어지는가? | prop handoff gap, costume state conflict, sequence conflict |

입력 전제는 다음과 같다.

- 대본은 의도된 대사·장면·등장·퇴장·소품·의상 요구를 말한다.
- 마스터 큐시트는 사람이 취합한 운영 계획이며 수정 제안의 기본 대상이다.
- 무대 사양은 사람이 확인한 물리 제약을 말한다.
- 어떤 입력이 특정 field의 authority인지 불명확하면 AI가 승자를 고르지 않고 `CLARIFICATION_REQUEST`를 만든다.

---

## 6. 핵심 사용자 흐름

### Flow A — 공연 프리플라이트 검증

1. 무대감독이 부서별 cue를 취합해 `Master Cue v1`을 만든다. 이 선행 취합은 STANDBY 밖에서 수행한다.
2. 사용자가 하나의 `Production Revision`을 만들고 대본, `Master Cue v1`, 무대 사양을 고정 슬롯에 업로드한다.
3. 화면 1에서 각 파일의 revision·hash·origin을 확인한다. authority는 fact·rule별 `REVIEWED | UNREVIEWED`로 표시한다.
4. 사용자가 `Upstage Fact 추출 시작`을 눌러 세 문서의 scene, trigger, cue, 등장·퇴장, 위치, 소품, 환복, named zone을 추출한다.
5. 같은 화면에서 핵심 fact·event link·stage topology를 원문과 대조하고 review gate를 통과시킨다.
6. STANDBY가 reviewed fact만 하나의 실행 순서로 compile하고 verifier가 시간·순서·상태·경로 제약을 검사한다.
7. 화면 2의 finding 목록에서 `VIOLATION`, `REVIEW`, `INSUFFICIENT_EVIDENCE`, clean control을 전환한다.
8. 선택한 finding은 계산, `SCRIPT / MASTER_CUE / STAGE_SPEC` Evidence Trace 3개, named zone 3개의 2D 상태, 8-event stepper를 같은 화면에서 동기화한다.
9. 사용자가 판단을 남기면 `DECISION_RECORDED`만 표시한다. source hash와 finding은 바뀌지 않으며, 수정 source가 재업로드되지 않은 case에는 `CONSISTENT 잠김` 배지를 표시한다.

### Flow B — 수정 source 재업로드와 전체 재검증 (Stretch)

1. 사람이 외부 도구에서 source를 수정한다.
2. 수정 파일을 새 hash와 `parent_revision_id`를 가진 child revision으로 재업로드한다.
3. 시스템이 현재 선택 구간 전체를 재추출·재검증한다.
4. 동일 `finding_lineage_key`가 새 run에서 사라진 경우에만 finding을 닫는다.
5. aggregate blocker·필수 근거 부족·authority conflict가 모두 0일 때만 `CONSISTENT → FINAL_SIM_READY`로 전이한다.

P0 Lo-Fi는 이 전체 파이프라인을 별도 화면으로 만들지 않는다. 필요한 합격선은 **`DECISION_RECORDED` 또는 수정 의사가 있더라도 새 source hash의 재업로드 전에는 `CONSISTENT`가 될 수 없음**을 화면 2의 잠금 배지로 보여주는 것이다.

---

## 7. 48시간 MVP

### 범위 원칙

전체 85분 공연을 얕게 보여주지 않는다. **한 장면과 전후 전환 5~10분**을 완결된 검증 흐름으로 만든다.

### 입력

최초 run의 제품 입력은 정확히 세 개다.

- `script-hero.pdf` — 사람이 authoritative block으로 확정한 실제 대본 발췌
- `master-cuesheet-hero-v1.xlsx` — 사람이 취합한 실제 마스터 큐시트의 `긴 암전 S#16 → S#17` 구간. P0는 정확한 sheet·row·field locator를 위해 XLSX로 고정한다.
- `stage-spec-demo.pdf` — 통제된 무대 제약 문서 `DEMO_VENUE_V1`

재검증과 provenance를 위한 테스트 artifact는 제품의 동시 입력 수에 포함하지 않는다.

- `master-cuesheet-hero-v2.xlsx` — hero case의 모든 blocker에 대한 사람의 결정과 필요한 master 변경을 반영한 child revision. 두 번째 run에서 master 슬롯의 v1을 교체하며 원본 v1을 덮어쓰지 않는다.
- `source-map.json` — 원본 TXT 행과 변환 PDF page, 원본 CSV 행·열과 변환 XLSX sheet·cell의 대응표

현재 원본 `script-final.txt`와 `reference-cuesheet.csv`는 Studio의 공개 지원 형식이 아니므로, 최초 run의 세 artifact와 source mapping을 확인하기 전에는 Studio config 작업을 시작하지 않는다.

`DEMO_VENUE_V1`은 일반 도면에서 AI가 추측한 geometry가 아니라, 다음 값을 명시한 **검증용 stage constraint sheet**다.

| 필드 | 통제 값 |
|---|---|
| layout | `SCHEMATIC / NOT TO SCALE` |
| topology | `topology_complete=true` |
| named zones | `HASU_WING`, `HASU_CHANGE`, `CENTER_ENTRANCE` |
| schematic geometry | 각각 `(0.90,0.55)`, `(0.92,0.20)`, `(0.50,0.85)`; normalized, reviewed |
| `HASU_WING → HASU_CHANGE` | `3–4초` |
| minimum costume change | `60초`, `duration_semantics=MINIMUM_REQUIRED` |
| `HASU_CHANGE → CENTER_ENTRANCE` | `3–4초`, `NARROW_PORTAL`, `capacity=1` |

Hero event binding도 fixture manifest에 명시한다: 마스터 큐시트의 이전 퇴장→`HASU_WING`, 환복→`HASU_CHANGE`, 대본·마스터 큐시트의 재입장→`CENTER_ENTRANCE`, 다음 장면 prop requirement→`CENTER_ENTRANCE`. 이 binding은 AI가 geometry에서 유추하지 않고 사람이 source와 함께 review한다.

마스터 큐시트 원문에는 `약 1분`이 있고, P0 fixture는 이를 검증 가능한 범위로 명시한 `duration_range=[58,62]`를 **CueEvent의 `CONTROLLED_FIXTURE · REVIEWED` 값**으로 저장한다. available window는 stage spec에 중복 저장하지 않는다. 따라서 quick-change conflict variant의 필요시간은 `66–68초`, available window는 `58–62초`다. 무대 사양이 실제 도면으로 들어오더라도 AI가 CAD geometry를 확정하지 않으며, 라벨·치수·연결은 사용자가 검토해야 verifier 입력으로 승격된다.

P0 gold set은 배우 1명, crew 1명, 소품 1개, 전환 1개, reviewed fact 15개로 제한한다.

- ScriptEvent 3개: 다음 입장 anchor, 입장 시 costume state, 다음 장면 prop requirement
- CueEvent 5개: 이전 퇴장 anchor, blackout window, 환복 target·operation, 배우 route occupancy, prop carry·handoff·move
- StageFact 7개: named zone 3개, route time 2개, minimum change time 1개, `NARROW_PORTAL capacity=1` 1개

hero 대본 발췌에는 이전 퇴장 지시가 없으므로 이를 ScriptEvent로 만들지 않는다. exit는 마스터 큐시트 원문, re-entry는 대본 원문에서 가져와 세 입력을 연결한다.

### Must ship

| 우선순위 | 기능 | 완료 기준 |
|---|---|---|
| P0 | 고정 3-slot artifact | `script / master_cue / stage_spec` 슬롯에 v1 파일이 하나씩 있고 source map이 준비됨 |
| P0 | 역할별 Studio 문서 처리 | 세 역할별 Agent/config의 Parse → Extract가 15개 hero fact와 source quote를 반환하고 세 Extract-fields export를 보관 |
| P0 | role sanity gate | 슬롯과 내용이 명백히 다르면 자동 재분류하지 않고 `ROLE_MISMATCH_REVIEW`로 중단 |
| P0 | review gate | fact·event link·stage topology를 사람이 확인하며, 제안값은 승인 전 verifier에서 제외 |
| P0 | 한 전환 compile | `exit → change → prop move/handoff → re-entry → prop use` 8개 사건과 명시적 시간 범위를 생성 |
| P0 | 실제 문서 괴리 표시 | costume-state와 section-number 차이를 양쪽 원문과 함께 `REVIEW`로 제시하되 자동 확정하지 않음 |
| P0 | 세 핵심 검출 | controlled/mutated variant에서 `BLOCKING_CONFLICT`, `QUICK_CHANGE_ROUTE_CONFLICT`, `POSSIBLE_PROP_GAP`을 각각 계산 |
| P0 | abstention | minimum change 또는 route가 빠진 대조 fixture를 verdict `INSUFFICIENT`로 종료 |
| P0 | finding 상태 집합 | 한 목록에서 `VIOLATION`, `REVIEW / QUICK_CHANGE_TIGHT`, `INSUFFICIENT_EVIDENCE`, clean control `finding 0`을 모두 재현 |
| P0 | 단일 decision 기록 | 제안 Option A/B/C 없이 사람의 판단을 `DECISION_RECORDED`로만 남기며 source·finding·verdict는 불변 |
| P0 | 2D evidence workspace | 선택 finding의 계산·Evidence Trace 3개·named zone 3개·hero 8개 사건을 한 화면에서 동기화 |
| P0 | final naming guard | 수정 source 재업로드 전 `CONSISTENT` 금지 배지; open finding의 2D는 `EVIDENCE PREVIEW`, gate 통과 run만 `FINAL` |
| P0 | two-screen shell | `입력·검토`와 `Finding·2D` 두 navigation item만 제공 |
| P0 | API fallback | 한 번은 live run, 발표에는 검증된 cache fallback 보유 |

### Stretch

- 여러 장면에 걸친 cue trigger revision 영향 추적
- 전체 공연 timeline과 보간 애니메이션
- 전체 원본 29/30 marker와 77:17/85:16 회귀검사
- 다수 배우의 세밀한 geometry collision과 군중 흐름
- microphone on/off와 lighting zone 전체 재생
- band session cue dependency 검증
- 여러 장면과 전체 공연 타임라인
- source-backed patch proposal과 Option A/B/C 비교 UI
- 수정 source 재업로드, revision lineage, 전체 재검증 상태 흐름
- proposal 체크리스트·XLSX patch 파일의 읽기 전용 export
- word-level source highlight
- 빨간펜 수정 셀 검출
- Solar 기반 semantic link 설명
- Quick Tune before/after 실험

---

## 8. 기능 요구사항

### FR-01. Production Revision 생성

- 사용자는 공연명과 세 source의 revision label을 입력하거나 문서에서 추출된 값을 확인한다.
- 각 입력의 파일 hash와 원본 응답을 보존한다.
- `script`, `master_cue`, `stage_spec` 각각에 selected revision과 `source_selection_confirmed=true`가 있어야 extraction review를 시작한다.
- field authority는 fact 또는 rule scope별 `AuthorityDecision`으로 별도 기록한다. 미확정 authority가 관련된 rule은 hard verdict·exact edit suggestion·Final 2D에 사용할 수 없고 `CLARIFICATION_REQUEST`를 만든다.
- AI는 timestamp, 파일명, 업로드 순서, 다수결로 최신본이나 field authority를 선택하지 않는다.
- 서로 다른 revision이 섞였을 가능성이 있으면 분석 전에 표시한다.
- 동일 파일과 고정 config의 성공 결과는 재사용할 수 있다.

### FR-02. 고정 입력 슬롯과 역할 binding

- 입력은 `script`, `master_cue`, `stage_spec` 고정 슬롯 각각 하나다.
- `SourceDocument.role`은 사용자가 선택한 업로드 슬롯에서 확정하며 AI 출력이 이를 덮어쓸 수 없다.
- P0 정상 경로에서는 Classify를 호출하지 않고 역할별 Agent/config를 실행한다.
- 문서 내용과 슬롯 역할이 명백히 어긋나면 자동 재분류하지 않고 issue `ROLE_MISMATCH_REVIEW`, case `BLOCKED_ROLE_MISMATCH`로 중단한다.
- 고정 3-slot은 제품 계약이므로 Classify는 현재 제품 범위에 넣지 않는다. 입력 계약을 바꾸려면 별도 PRD 결정을 거친다.
- 문서 역할, source revision, Studio config version을 서로 다른 상태로 관리한다.

### FR-03. 근거가 있는 fact 추출

- 대본에서는 scene, dialogue anchor, stage direction, character, entrance/exit, prop·costume requirement를 추출한다.
- 마스터 큐시트에서는 cue ID, department, trigger, target, operation, location, duration, unresolved marker를 추출한다.
- 무대 사양에서는 named zone, entrance/exit, route, restriction, dressing location, preset location, 명시된 치수를 추출한다.
- 모든 fact에 document, page/line, source quote를 연결한다.
- 원문에 없는 cue ID, 이름, 치수, 통로를 생성하지 않는다.
- Script Agent는 `ScriptEvent[]`, Master Cue Agent는 `CueEvent[]`, Stage Agent는 `StageFact[]`만 반환한다.
- 각 결과는 source document ID, slot role, file hash, Upstage job·agent·config ID를 유지한다.
- 역할별 결과의 병합, 순서 부여, normalized ID 생성은 STANDBY 코드가 수행한다.

### FR-04. Fact review gate

- 사용자는 추출된 핵심 fact를 원문 옆에서 확인·수정·보류한다.
- 이 수정은 분석용 fact correction이며 대본·마스터 큐시트·무대 사양 원본을 바꾸지 않는다.
- `UNREVIEWED`, `REVIEWED`, `REJECTED` 상태를 둔다.
- 필수 fact가 검토되지 않은 규칙은 확정 finding을 만들지 않는다.
- 모델 confidence는 검토 우선순위에만 사용하고 정확도로 취급하지 않는다.

### FR-05. 사건 연결

- 연결 우선순위는 명시적 cue ID, scene marker, dialogue anchor, 검토된 순서 정보다.
- 배우명과 배역명 mapping은 별도 fact로 추출하고 사람이 확인한다.
- AI 의미 유사도는 `PROPOSED` link만 만들 수 있다.
- 사람이 승인하지 않은 `PROPOSED` link는 결정론적 검증에 사용하지 않는다.
- scene marker가 같더라도 revision별 numbering drift가 의심되면 자동 연결하지 않는다.

### FR-06. 시간 모델

- 문서에 선언된 scene duration과 cumulative time을 우선 사용한다.
- P0 hard verdict에는 `REAL_REFERENCE`, `USER_PROVIDED`, `CONTROLLED_FIXTURE` origin이고 `REVIEWED`인 명시적 시간만 사용한다.
- 대사량과 anchor 순서를 이용한 scene 내부 시간 추정은 Stretch다. 결과를 `[earliest, latest]`와 `AI_PROPOSED`로 저장하되 hard verdict에는 사용하지 않는다.
- 계산에 휴리스틱·AI 추정 시간이 하나라도 포함되면 최대 `NEEDS_TIMING_CONFIRMATION`까지만 허용한다.
- 선언 duration과 cumulative time이 모순되면 임의 보정하지 않고 `TIMELINE_INCONSISTENT`를 만든다.
- 최종 대본 block이 확정되지 않으면 전체 타임라인 compile을 중단한다.

### FR-07. 무대 topology

- MVP의 무대는 정밀 좌표가 아니라 `StageZone`과 `Route` graph로 표현한다.
- 사용자는 zone, 출입구, crossover, 환복 위치, 통행 가능 방향을 확인한다.
- 도면에서 추출된 geometry는 `UNREVIEWED` 상태로 시작한다.
- 확인되지 않은 route는 존재하지 않는 경로가 아니라 `UNKNOWN`으로 취급한다.
- `topology_complete=true`이거나 `crossover=false`, `route=PROHIBITED`가 명시된 경우에만 route 부재를 제약으로 사용한다.
- 배우 실제 이동속도 대신 사용자가 확인한 route time 또는 보수적 범위를 사용한다.
- `상수/하수`, `Stage Left/Right`, 문서 고유 명칭의 대응을 추측하지 않고 raw label을 보존한 뒤 사용자가 zone mapping을 확인한다.

### FR-08. 검증 엔진

- 승인된 fact만 사용해 시간·순서·상태·경로 규칙을 결정론적으로 실행한다.
- 같은 입력과 설정은 반복 실행해도 같은 finding을 반환한다.
- AI 설명은 finding의 판정과 severity를 바꿀 수 없다.
- 판정에 필요한 값이 없으면 verdict `INSUFFICIENT`로 종료한다.

### FR-09. 2D stage simulator

- 무대 zone, 출입구, 확인된 route, 배우, 소품, cue chip을 표시한다.
- P0는 selected verification run의 hero 8개 사건을 discrete timeline으로 step/play하고 `previous / current / next` 상태를 제공한다.
- open finding을 선택한 상태는 `EVIDENCE PREVIEW`다. 계산 시점·zone·entity state를 보여줄 수 있지만 `FINAL`, `CONSISTENT`, 실행 가능 판정으로 표시하지 않는다.
- aggregate gate를 통과한 run만 같은 canvas의 `FINAL` 모드로 전환한다.
- 배우·crew·prop의 zone과 상태가 사건마다 바뀌며, route occupancy와 cue firing을 함께 표시한다.
- open `VIOLATION`, unresolved `REVIEW`, unresolved authority, role mismatch 또는 필수 근거 부족이 하나라도 있으면 `FINAL` 명칭과 `CONSISTENT` badge를 잠근다. evidence preview 자체는 잠그지 않는다.
- `ACCEPTED_EXCEPTION`은 authority와 필수 fact가 모두 reviewed된 `VIOLATION` 또는 `REVIEW`에만 허용한다. 승인자·사유·source refs를 강제하고 case를 `CONSISTENT`라고 부르지 않으며 `FINAL_SIM_READY_WITH_EXCEPTIONS`로 표시한다.
- simulator는 `final_revision_id`, master document hash, stage graph version, compile run ID를 표시한다.
- 자유로운 연속 scrub, 보간 애니메이션, 전체 공연 재생은 Stretch다.
- 실선은 reviewed 경로, 점선은 가정 또는 제안 경로로 표시한다.
- 알 수 없는 위치를 그럴듯한 좌표로 보간하지 않는다.

### FR-10. Source trace

- 각 finding에서 대본·마스터 큐시트·무대 사양의 관련 근거를 나란히 연다.
- 최소 page/line과 source quote를 제공한다.
- Studio Jobs의 field location이 실제로 검증된 경우에만 word highlight를 사용한다.
- 좌표가 없으면 box를 생성하지 않고 page + quote로 축소한다.

### FR-11. Decision 기록과 revision safety

P0는 제안 패널을 만들지 않는다.

- 사용자는 선택한 finding에 대한 판단을 하나의 `DECISION_RECORDED` event로 남길 수 있다.
- 이 event는 actor, timestamp, finding ID, verification run ID, 선택한 분류와 note만 기록한다.
- decision 전후 source hash, finding verdict·severity·calculation, case consistency는 변하지 않는다.
- decision 뒤에는 `수정 source 재업로드 전 CONSISTENT 금지` badge를 보여준다.
- proposal Option A/B/C, `제안 기록 / 거절 / 확인 요청`의 병렬 버튼, source 교체, revision lineage, 4단계 재검증 파이프라인은 P0 화면에 두지 않는다.

다음 full correction loop는 Stretch다.

- 시스템은 finding마다 다음 중 하나의 source-backed proposal을 만든다.
  - `MASTER_CUE_EDIT_SUGGESTION` — selected master cue의 정확한 sheet·row·field와 current/suggested value를 제시할 수 있을 때만 사용
  - `RESOLUTION_OPTIONS` — 동선·시간·연출처럼 가능한 해결책이 여러 개일 때 선택지를 제시하고 단일 수정값을 확정하지 않음
  - `CLARIFICATION_REQUEST` — event link 또는 source authority 확인이 필요할 때 질문만 생성
  - `MISSING_INPUT_REQUEST` — 필수 시간·경로·담당자·상태가 없을 때 추가 근거만 요청
- 모든 proposal의 공통 필드는 finding ID, proposal type, `base_document_hash`, rationale, 영향받는 event·cue, source refs, 생성 provenance다.
- 타입별 추가 계약은 다음과 같다.

| Proposal type | 필수 필드 | nullable 또는 금지 필드 |
|---|---|---|
| `MASTER_CUE_EDIT_SUGGESTION` | XLSX master의 sheet·row·field locator, current value, suggested value, reviewed authority basis | 없음 |
| `RESOLUTION_OPTIONS` | 비권위적 확인 선택지, 각 option의 source refs·assumptions·`non_authoritative=true` | target locator 선택, suggested value는 null |
| `CLARIFICATION_REQUEST` | question, conflicting source refs | target locator·current value·authority basis nullable, suggested value는 null |
| `MISSING_INPUT_REQUEST` | missing fact type, 요청할 근거 설명 | target locator·current value·authority basis nullable, suggested value는 null |

- master가 XLSX이면 exact edit locator는 sheet·row·field다. 향후 PDF master에서 page+quote만 얻은 경우 `MASTER_CUE_EDIT_SUGGESTION`을 만들지 않고 검토 요청으로 낮춘다.
- Instruct 또는 Solar는 설명과 제안 초안을 만들 수 있지만 finding의 verdict·severity·calculation·source locator를 변경할 수 없다.
- proposal의 `ACCEPTED`는 해결이 아니라 별도 `ReviewDecision` 기록이다. finding은 `OPEN`으로 유지되며 시스템은 원본 문서를 수정하지 않는다.
- 사용자가 외부에서 수정한 master cue를 새 hash와 `parent_revision_id`를 가진 child revision으로 재업로드한 뒤에만 case가 `REVERIFYING`으로 전이한다.
- 새 source hash가 올라오면 이전 Production Revision과 그 Final 2D는 `STALE`로 잠그고, 이전 `base_document_hash`를 가리키는 proposal은 audit 기록을 남긴 채 `SUPERSEDED`로 만든다. 새 child revision만 `REVERIFYING`으로 전이한다.
- 새 verifier run은 `rule_id + segment_lineage + entity_ids`로 만든 안정적인 `finding_lineage_key`로 v1·v2 finding을 대응한다. row 위치만 바뀐 것은 해결로 보지 않으며 대응이 불확실하면 자동 close하지 않는다.
- 동일 lineage finding이 사라진 경우에만 해당 finding을 `CLOSED_BY_REVERIFICATION`로 전이한다. case는 선택 구간의 전체 blocker를 다시 계산해 open finding·필수 근거 부족·authority conflict가 0건일 때만 `CONSISTENT`가 된다.
- Studio config만 바뀌어 결과가 달라진 경우 source 수정이나 finding 해결로 기록하지 않는다.

---

## 9. 핵심 검증 규칙

### VR-01. Quick-change feasibility

필요 fact:

- 배우의 이전 퇴장 시간 범위와 위치
- 다음 입장 시간 범위와 위치
- 확인된 환복 위치
- 의상팀이 제공한 최소 환복시간 범위
- 퇴장→환복실→입장 위치의 route time 범위
- 필요하면 safety buffer

계산:

```text
available = next_entry_time - previous_exit_time
required  = route_to_change + minimum_change + route_to_entry + buffer
```

판정:

- `VIOLATION`: 가능한 available 최대값도 required 최소값보다 작고, 모든 입력 시간이 명시·검토됨
- `REVIEW / TIGHT_MARGIN`: available과 required 범위가 겹침
- `NO_CONFLICT_WITHIN_DECLARED_CONSTRAINTS`: available 최소값이 required 최대값 이상
- `REVIEW / NEEDS_TIMING_CONFIRMATION`: 하나 이상의 시간이 휴리스틱 또는 AI 제안값
- `INSUFFICIENT`: 하나 이상의 필수 fact가 없음

P0 safety buffer 기본값은 `0초`다. 문서 또는 사용자가 명시한 값만 더한다. `35초 환복` 같은 마스터 큐시트 표기만으로 불가능하다고 단정하지 않으며, 그 값이 available window인지 minimum required인지 의미부터 확인한다.

### VR-02. Costume state continuity

- 배우·배역 mapping이 reviewed된 뒤, 대본의 의상 상태와 마스터 큐시트의 환복·착용 상태를 같은 사건에서 비교한다.
- `WEARING(costume)`, `CARRYING(costume)`, `CHANGING_TO(costume)`, `UNKNOWN` 상태를 구분한다.
- “우주복을 입고 등장”과 “우주복을 손에 들고 입장한 뒤 무대 위에서 착용”처럼 동시에 참일 수 없는 명시를 `COSTUME_STATE_CONFLICT` 후보로 만든다.
- authoritative script block, scene mapping, 배우↔배역 mapping 중 하나라도 검토되지 않았으면 확정하지 않고 verdict `REVIEW`로 남긴다.

### VR-03. Path and location consistency

- 확인된 stage graph에서 출발 zone과 도착 zone을 연결하는 route가 있는지 검사한다.
- 같은 인물·소품이 겹치는 시간에 서로 다른 zone에 있으면 `LOCATION_CONFLICT` 후보를 만든다.
- `capacity` 또는 `exclusive=true`가 명시·검토된 zone·portal·route에서 동시 occupancy가 허용치를 넘으면 `BLOCKING_CONFLICT`를 만든다.
- P0 blocking fixture는 `NARROW_PORTAL capacity=1`에서 배우와 prop crew의 reviewed occupancy가 겹치는 경우로 제한한다.
- graph에 route가 없을 때의 문구는 “이동 불가능”이 아니라 **“현재 확인된 무대 계획에 경로가 없습니다”**다.
- 좌표 기반 신체 충돌, 속도 예측, 군중 동선은 MVP 범위 밖이다.

### VR-04. Prop continuity

소품 상태:

```text
UNKNOWN → PRESET(zone) → WITH(actor) → IN_TRANSIT → PRESET(zone) → OFF_STAGE(zone)
```

- 소품의 등장, pickup, 이동, handoff, 사용, 퇴장 사건을 순서대로 추적한다.
- 검토가 완료된 구간에서 다음 사용 시점에 필요한 zone 또는 actor에게 도착하는 carry·handoff·move가 없으면 `POSSIBLE_PROP_GAP`을 만든다.
- 한쪽 퇴장 후 반대편 등장 자체를 오류로 보지 않는다. 이동 열, 배우 carry, crew handoff를 먼저 확인한다.
- 사건 추출 completeness, required zone, 해당 구간 경계 중 하나라도 검토되지 않았으면 finding 대신 `INSUFFICIENT`로 보류한다.

### VR-05. Master cue synchronization

- 대본 dialogue/stage-direction anchor와 마스터 큐시트 trigger를 같은 scene 안에서 연결한다.
- 정규화는 공백·문장부호·Unicode 차이까지만 자동 허용한다.
- 부분문자열과 fuzzy match는 후보 생성에 사용하고 자동 정답으로 승격하지 않는다.
- 명시적 공통 cue ID가 있으면 trigger, target, operation, 존재 여부를 비교한다.
- cue ID가 없고 trigger 자체가 바뀌면 `AMBIGUOUS_LINK`로 사람에게 보낸다.
- 자동으로 마스터 큐시트를 수정하지 않는다. selected master의 exact target과 authority basis가 있으면 `MASTER_CUE_EDIT_SUGGESTION`, 없으면 `CLARIFICATION_REQUEST`를 만든다.

### VR-06. Timeline and sequence consistency

- scene duration 합과 cumulative time이 일치하는지 검사한다.
- scene 번호가 문서마다 다른 사건을 가리키면 `SECTION_MAPPING_CONFLICT`를 만든다.
- 같은 department의 mutually exclusive operation 순서가 모순되면 검토 후보를 만든다.
- 세션 cue도 일반 CueEvent로 다루며, trigger와 실행 순서가 검증된 이후 별도 규칙을 추가한다.

### VR-07. Unresolved evidence

- `??`, `TBD`, `미정`, 비어 있는 이름·시간·경로를 보존한다.
- AI가 값을 채우지 않는다.
- 선택한 검증 범위에 필수이면 finding `BLOCKED_BY_MISSING_INPUT`, case `BLOCKED_MISSING_INPUT`으로 표시하고, 그 외에는 `UNRESOLVED_TOKEN`으로 남긴다.

---

## 10. Finding 계약

각 finding은 최소 다음을 가진다.

```json
{
  "finding_id": "finding-001",
  "type": "QUICK_CHANGE_ROUTE_CONFLICT",
  "verdict": "VIOLATION",
  "severity": "ERROR",
  "origin": "CONTROLLED_FIXTURE",
  "evidence_state": "REVIEWED",
  "time_range": { "start": 3120000, "end": 3180000 },
  "entities": ["actor-hyewon", "costume-adult-maru"],
  "message": "통제 fixture의 환복·이동 필요시간이 문서상 암전시간을 초과합니다.",
  "calculation": "available 58–62s / required 66–68s",
  "source_refs": [
    { "document_id": "script-hero", "role": "script", "locator": "page 1: re-entry anchor" },
    { "document_id": "master-cuesheet-hero-v1", "role": "master_cue", "locator": "sheet Cue / row 44: blackout/change cue" },
    { "document_id": "stage-spec-demo", "role": "stage_spec", "locator": "page 1: route/change constraints" }
  ],
  "assumptions": [],
  "finding_lifecycle": "OPEN"
}
```

구현 축을 섞지 않는다.

- `verdict`: `VIOLATION | REVIEW | INSUFFICIENT | NO_CONFLICT_WITHIN_DECLARED_CONSTRAINTS`
- `severity`: `ERROR | WARNING | INFO`
- `finding_lifecycle`: `OPEN | CLOSED_BY_REVERIFICATION | ACCEPTED_EXCEPTION`
- `decision_state`: `NONE | DECISION_RECORDED`; 사람의 판단이 기록됐다는 UI projection이며 lifecycle·verdict를 바꾸지 않음
- `origin`: 아래 데이터 provenance enum

Finding, proposal, case 상태를 섞지 않는다.

- `CaseStatus`: `UPLOADED | EXTRACTION_REVIEW | FINDINGS_READY | AWAITING_MASTER_REUPLOAD | REVERIFYING | CONSISTENT | FINAL_SIM_READY | FINAL_SIM_READY_WITH_EXCEPTIONS | BLOCKED_ROLE_MISMATCH | BLOCKED_MISSING_INPUT | FAILED | STALE`
- `ProposalStatus`: `PROPOSED | ACCEPTED | REJECTED | SUPERSEDED`
- `FindingLifecycle`: `OPEN | CLOSED_BY_REVERIFICATION | ACCEPTED_EXCEPTION`
- `DecisionState`: `NONE | DECISION_RECORDED`

### Change proposal 계약 — Stretch

```json
{
  "proposal_id": "proposal-001",
  "proposal_type": "RESOLUTION_OPTIONS",
  "finding_id": "finding-001",
  "target_document_id": "master-cuesheet-hero-v1",
  "target_locator": "sheet Cue / row 44 / field timing",
  "base_document_hash": "...",
  "current_value": "약 1분",
  "suggested_value": null,
  "options": [
    {
      "question": "입장 cue를 늦출 수 있는지 해당 authority에게 확인",
      "evidence_refs": ["master_cue:change-window", "script:re-entry"],
      "assumptions": [],
      "non_authoritative": true
    },
    {
      "question": "환복 경로 또는 계획을 변경할 수 있는지 해당 authority에게 확인",
      "evidence_refs": ["stage_spec:route-and-minimum-change"],
      "assumptions": [],
      "non_authoritative": true
    }
  ],
  "rationale": "available 58–62s / required 66–68s",
  "authority_basis": null,
  "source_refs": ["script:re-entry", "master_cue:change-window", "stage_spec:route-and-minimum-change"],
  "status": "PROPOSED",
  "generated_by": {
    "method": "standby-rule+solar-explanation",
    "model_config_id": "...",
    "prompt_version": "...",
    "finding_revision_id": "revision-v1",
    "postprocessed": true
  }
}
```

`CLARIFICATION_REQUEST`, `MISSING_INPUT_REQUEST`, `RESOLUTION_OPTIONS`에는 AI가 임의의 `suggested_value`를 넣지 않는다. `MASTER_CUE_EDIT_SUGGESTION`은 사람이 확인한 authority와 exact target locator가 모두 있을 때만 허용한다.

### 색상 의미

- **Red** — reviewed fact로 계산한 명시적 제약 위반
- **Amber** — tight margin, 문서 불일치, 사람 확인 필요
- **Gray** — 근거 부족으로 판정 보류
- **Green** — 현재 입력한 제약 범위에서 모순을 발견하지 못함

색은 위험 감정 표현이 아니라 판정 근거의 상태를 나타낸다.

내부 verdict enum `INSUFFICIENT`는 UI에서 `INSUFFICIENT_EVIDENCE`로 표시한다. clean control은 Finding 객체가 아니라 `finding_count=0`인 fixture summary다.

---

## 11. 최소 데이터 모델

| Entity | 핵심 필드 |
|---|---|
| `ProductionRevision` | production_id, revision_id, parent_revision_id, label, documents, case_status, compile_run_id |
| `SourceDocument` | document_id, slot_role, filename, hash, selected_revision, source_selection_confirmed, agent/config/job, origin, review_status |
| `Segment` | segment_id, marker_raw, title_raw, order, time_range, source_refs |
| `ScriptEvent` | type, character, trigger, location, prop/costume, time_range, source_refs |
| `CueEvent` | cue_id, department, trigger, target, operation, location, duration, source_refs |
| `StageZone` | zone_id, label, capacity, exclusive, source_bbox, layout_geometry, geometry_source, layout_scale, review_status, source_refs |
| `Route` | route_id, from_zone, to_zone, direction, time_range, capacity, exclusive, topology_complete, origin, review_status, source_refs |
| `EntityState` | entity_id, state, zone, holder, valid_time_range, derived_from |
| `SimulationFrame` | final_revision_id, master_document_hash, stage_graph_version, compile_run_id, event_id, time_range, actor_states, crew_states, prop_states, cue_states, active_routes |
| `EventLink` | left_event, right_event, method, status, approved_by |
| `Finding` | finding_id, finding_lineage_key, rule_id, segment_lineage, entity_ids, verdict, severity, origin, evidence_state, calculation, source_refs, assumptions, finding_lifecycle, detected_revision_id, resolved_revision_id |
| `ChangeProposal` | proposal_id, proposal_type, finding_id, target_document_id(nullable), target_locator(nullable), base_document_hash, current_value(nullable), suggested_value(nullable), options, rationale, authority_basis(nullable), source_refs, impact_refs, status, generated_by, model_config_id, prompt_version, finding_revision_id, postprocessed |
| `ReviewDecision` | finding_id, proposal_id(nullable), decision, note, actor, timestamp, target_source_revision |
| `AuthorityDecision` | authority_decision_id, scope_type, scope_id, authoritative_source_or_actor, status, decided_by, rationale, source_refs, timestamp |

모든 source, fact, finding은 origin을 끝까지 보존한다.

- `REAL_REFERENCE` — 현재 프로젝트의 실제 대본·마스터 큐시트에서 옴
- `USER_PROVIDED` — 향후 사용자가 제공한 실제 문서·제약에서 옴
- `CONTROLLED_FIXTURE` — 검증 목적으로 명시적으로 만든 문서·값
- `MUTATED_FIXTURE` — 실제 또는 통제 문서에 의도적으로 변화를 주입함
- `DERIVED` — reviewed fact에서 코드가 계산함
- `AI_PROPOSED` — 모델이 제안했으나 아직 승인되지 않음

review 상태는 origin과 별도로 `UNREVIEWED | REVIEWED | REJECTED`를 사용한다. `AI_PROPOSED`는 승인 전 verifier의 확정 판정에 사용할 수 없고, fixture-derived finding은 JSON·UI·source drawer·발표 화면 모두에 badge가 유지되어야 한다.

문서 좌표와 무대 배치는 다르다. `source_bbox`는 PDF/이미지 안의 근거 좌표이고, `layout_geometry`는 사람이 확인한 schematic 배치다. `geometry_source`는 source document의 origin을 상속하며, `DEMO_VENUE_V1`에서는 `CONTROLLED_FIXTURE`다. 별도 review 상태는 `REVIEWED`, `layout_scale`은 `NOT_TO_SCALE`로 고정한다.

---

## 12. Upstage와 STANDBY의 책임 분리

```text
script slot          → Script Agent: Parse → Extract
master_cue slot      → Master Cue Agent: Parse → Extract
stage_spec slot      → Stage Agent: Parse → Extract
                              │
                              ▼
                 STANDBY fact join + review gate
                              │
                              ▼
                 compiler + deterministic verifier
                              │
                              ▼
               Finding + source trace + 2D evidence preview
                              │
                              ▼
                    사람의 DECISION_RECORDED
                              │
                              ▼
        source hash 불변 + CONSISTENT 잠금 배지

Stretch: 외부 source 수정 → child revision 재업로드 → 전체 재검증 → FINAL
```

| 담당 | 해야 하는 일 | 맡기지 않는 일 |
|---|---|---|
| **Parse** | 역할별 문서의 표·대사·도면 라벨·읽기 순서와 원문 복원 | CAD geometry 확정, 손글씨 의도 판정 |
| **Classify** | 현재 제품 pipeline에서는 사용하지 않음 | 고정 슬롯의 사용자 지정 역할 덮어쓰기 |
| **Extract** | ScriptEvent·CueEvent·StageFact 역할별 flat fact와 source quote 추출 | cross-document join, sequence ID, 없는 ID·시간·위치·경로 생성 |
| **Instruct** | 문서 내부 missing·ambiguous 검토 문구와 event-link 후보 설명 | canonical JSON, exact diff, 물리 가능성 최종 판정 |
| **Solar Pro 4** | verifier finding을 source-backed 설명·확인 질문으로 변환 | verdict·severity·calculation·locator 변경, 근거 없는 수정값 생성 |
| **STANDBY 코드** | slot binding, fact join, 시간·순서·상태·경로 검증, decision 기록, 2D evidence simulation | 불충분한 사실을 추론으로 메우기 |
| **사람** | 입력 전 마스터 큐시트 취합, revision·authority·fact·link·geometry 확인, finding 판단 | AI 판단을 검토 없이 적용 |

공개 Studio의 실행 노드는 Parse·Classify·Extract·Instruct 네 개지만 모든 node가 필수는 아니다. P0는 업로드 슬롯이 역할을 확정하므로 `Script / Master Cue / Stage` 역할별 Agent/config의 `Parse → Extract` 세 job을 사용하고, 앱이 source identity를 보존해 join한다. 별도 Validate 실행 노드를 가정하지 않으며 Table View의 extraction review, STANDBY verifier, 제품 사용자의 finding decision은 서로 다른 단계다. Solar 설명이 실패해도 deterministic finding·evidence·2D 흐름은 완료되어야 하며, Solar는 must-ship의 단일 장애점이 아니다.

### 기술 hard gate

- Parse가 hero scene의 핵심 scene/cue/zone label과 줄바꿈을 보존해야 한다.
- Extract가 존재하지 않는 인물·cue·통로·치수를 생성한 사례가 없어야 한다.
- 고정 3-slot 정상 경로의 Classify 호출 수는 0이다.
- 각 slot role은 request부터 fact, finding, 2D canvas, source drawer까지 보존된다.
- 세 역할별 Agent/config ID와 Studio-generated API snippet을 별도로 보관한다.
- 잘못된 역할의 파일은 다른 schema로 자동 처리하지 않고 `ROLE_MISMATCH_REVIEW`로 중단한다.
- 세 source의 selected revision·hash·source selection 확인 전에는 extraction review를 시작하지 않는다. 관련 field의 `AuthorityDecision`이 없으면 hard verdict나 `FINAL` 상태를 만들지 않는다.
- 입력 파일의 순서가 바뀌어도 authority 상태와 finding 결과가 달라지지 않아야 한다.
- stage geometry와 route는 사람의 review 전 path verdict에 사용하지 않는다.
- 각 finding은 계산에 실제 사용한 모든 source를 가진다. 교차문서 규칙은 최소 2개, 3입력 physical rule은 3개, 단일문서 unresolved rule은 1개를 허용한다.
- Studio Jobs의 item-level location이 검증되지 않으면 word box를 사용하지 않는다.
- 공개 지원이 확인되지 않은 Webhook과 Studio-native MCP에 의존하지 않는다.
- API 실패에 대비해 동일 run의 raw response와 검증된 cache를 보존한다.
- Agents API는 `/v2/files → /v2/responses → polling → include=all` 순서를 사용하고 stringified `additional_values` 원문과 파싱값을 모두 보존한다.
- Studio `Use via API`의 Copy code를 구현 기준으로 삼는다. 실제 request에서 확인하지 못한 Config ID pinning을 완료됐다고 주장하지 않는다.
- Table View reviewed 결과의 앱 자동 동기화와 Quick Tune은 공개 계약을 확인하기 전 P0에서 제외한다.
- Instruct·Solar가 verifier의 verdict·severity·calculation을 변경한 사례는 0건이어야 한다.
- `DECISION_RECORDED` 전후 원본 세 파일 hash 변화는 0건이어야 하며, 시스템에는 master cue writeback connector를 두지 않는다.
- 새 master file hash와 child revision 없이 `REVERIFYING`, `CLOSED_BY_REVERIFICATION`, `CONSISTENT`로 전이할 수 없다.
- proposal이 `ACCEPTED`여도 새 verifier run에 동일 finding이 남아 있으면 finding은 `OPEN`이다.
- source hash가 하나라도 바뀌면 이전 revision의 Final 2D를 즉시 `STALE`로 잠그고, 이전 `base_document_hash`의 proposal을 새 source에 적용하지 않는다.
- 개별 finding 하나의 소멸만으로 case를 `CONSISTENT`로 만들지 않는다. 현재 revision의 선택 구간 전체 blocker 집합을 다시 계산한다.
- `INSUFFICIENT`, missing input, unresolved authority, role mismatch는 `ACCEPTED_EXCEPTION`으로 우회할 수 없다.
- `FINAL` 2D는 현재 case가 `FINAL_SIM_READY` 또는 `FINAL_SIM_READY_WITH_EXCEPTIONS`이고 화면·finding·source drawer가 같은 compile run과 세 source revision을 가리킬 때만 열린다. 후자는 승인자·사유·근거를 항상 표시한다.
- `CONTROLLED_FIXTURE`와 `MUTATED_FIXTURE` origin은 finding JSON, badge, source drawer까지 100% 전파한다.

---

## 13. 화면 요구사항

P0 navigation은 정확히 `1 입력·검토`, `2 Finding·2D` 두 항목만 가진다. 기존 5-step progress, 프로젝트·입력문서·검증결과·Revision·Final 2D의 6개 좌측 nav는 사용하지 않는다.

### 화면 1 — Upload & Review Gate

- 대본, 마스터 큐시트, 무대 사양의 **3 source 카드**. 각 카드에는 role, filename, selected revision, hash, upload status, origin badge를 표시한다.
- hero fixture에서 origin은 최소 `REAL_REFERENCE`, `CONTROLLED_FIXTURE`, `MUTATED_FIXTURE`를 화면에 실제로 노출한다.
- fact·event link·stage topology별 Authority를 `REVIEWED | UNREVIEWED`와 count로 표시한다.
- fact/link review table은 raw value, normalized value, source locator, review state, `근거 보기`를 제공한다.
- 유일한 주 CTA는 `Upstage Fact 추출 시작`이다. 추출 뒤 같은 shell에서 review gate를 완료한다.
- 검증을 막는 missing fact 또는 role mismatch는 row-level 상태로 보여준다.
- `입력 계약` checklist, `Source 교체`, `EXPORT LOG`, revision lineage는 표시하지 않는다.

### 화면 2 — Finding + 2D Evidence Workspace

- **좌측 finding 목록**은 한눈에 다음 네 상태를 재현한다.
  - 🔴 `VIOLATION` — 명시적 제약 위반
  - 🟡 `REVIEW / QUICK_CHANGE_TIGHT` — 범위가 겹쳐 사람 확인 필요
  - ⬜ `INSUFFICIENT_EVIDENCE` — 판정에 필요한 근거 부족
  - ✓ `CLEAN CONTROL · finding 0` — 같은 rule set에서 false positive 0
- **중앙 상단**은 선택 finding의 계산을 표시한다. hero quick-change의 정점은 `available 58–62s vs required 66–68s`를 그대로 사용한다.
- 계산 바로 아래에 `SCRIPT`, `MASTER_CUE`, `STAGE_SPEC` **Evidence Trace 3개**를 나란히 둔다.
- **중앙 2D 무대**는 `HASU_WING`, `HASU_CHANGE`, `CENTER_ENTRANCE` named zone 3개와 actor·crew·prop·route·cue state를 표시한다.
- **하단**은 E1–E8 discrete-event stepper와 previous/play/next, 현재 event time range를 제공한다.
- **우측 source drawer**는 선택 trace의 page 또는 sheet·row·field, source quote, origin badge를 보여준다.
- 사람의 입력은 하나의 `DECISION_RECORDED` action으로만 남긴다. Option A/B/C와 `제안 기록 / 거절 / 확인 요청` 3버튼을 만들지 않는다.
- open finding에서 2D는 `EVIDENCE PREVIEW`로 표시한다. 수정 source 재업로드 전에는 `CONSISTENT 잠김` badge를 보여주며, clean/gated run만 `FINAL`로 표시한다.
- `EXPORT LOG`, Zoom slider, 별도 v2 재검증 화면은 표시하지 않는다.

P0 simulator는 연속 물리 엔진이 아니라 **reviewed event 사이를 실행하는 discrete-event simulator**다. 화면은 finding·계산·근거·2D 상태를 한 선택 상태로 묶고, 알 수 없는 좌표를 보간하지 않는다. source 재업로드 전체 상태 흐름과 revision lineage는 Stretch로 남긴다.

---

## 14. 실제 데이터와 데모 fixture

### 현재 확인된 데이터

- `reference-cuesheet.csv`: 사람이 취합한 마스터 큐시트 원본. 49행 × 17열이며 scene/number와 여러 부서 cue가 한 표에 결합
- `script-final.txt`: 2,172행, scene 설명·대본 본문·시간표가 있으나 여러 block이 반복되어 authoritative block 확인 필요
- 현재 타임코드 구간인 대본 1~688행에는 `N1~N13 + S1~S16`의 고유 section ID 29개가 있고, 마스터 큐시트에는 `N#1~N#13 + S#1~S#17`의 marker 30개가 있음
- 마스터 큐시트는 `긴 암전 S#16` 다음 장면을 `S#17 우주비행사가 된 마루`로 부름. 같은 사건이 대본 안에서는 `S20으로 넘어가는 게`, heading `S16`, 괄호 속 `S19 최소 1분`, 반복 block의 `S19`로 섞여 있음. raw scene 번호를 그대로 공통키로 쓰면 안 되는 실제 revision contamination·`SECTION_MAPPING_CONFLICT` 후보임
- 대본의 선언 duration 합은 77분 17초, 마지막 누적값은 85분 16초로 7분 59초가 맞지 않음. S2 `+2:00`, N6 `+2:00`, S12 `+4:00`, S13 `-0:01`이며, 오류로 단정하지 않고 `UNALLOCATED_TIMELINE_INTERVAL / REVIEW`로 둠
- 대본 649행의 `분50초 (누적 분 초)`는 채워지지 않은 실제 시간 입력임
- 씬 duration과 누적 타임코드는 장면 단위 시간축의 출발점이지만, 위 불일치를 사람이 해결하기 전에는 전체 타임라인을 확정할 수 없음
- 대본 654행은 성인 마루가 `우주비행사 유니폼을 갖춰 입은 채` 입장한다고 쓰지만, 마스터 큐시트 논리 43행은 혜원이 `25살 잠옷의상`으로 환복하고 44행은 `우주복 입지 않고 손에 들고 입장`한 뒤 `무대위에서 우주복 입기`라고 지시함. authoritative block·scene·혜원↔마루 mapping review 후 확정할 수 있는 실제 `COSTUME_STATE_CONFLICT` 후보임
- whole-file discovery audit에서 cue trigger 43건 중 38건이 부분문자열을 포함해 일치함. 반복 block 전체를 검색한 값이므로 authoritative-block precision/recall은 block 선택 후 재측정 전까지 미확정
- 현재 데이터에서는 확정된 stale trigger가 발견되지 않았으므로 revision 변경 fixture가 필요
- `N#12` 음향 셀의 `??`는 실제 unresolved evidence로 사용할 수 있음
- 기존 마루가방 상태 finding은 이동 열을 무시한 오탐 가능성이 있어 실제 결함으로 사용하지 않음
- 실제 무대 평면도·출입구·crossover·분장실·route time은 현재 프로젝트에 없으므로 물리 판정에는 명시적으로 표시된 무대 fixture가 필요

### controlled fixture 원칙

MVP physical hero는 실제 대본·마스터 큐시트 v1과 명시된 `DEMO_VENUE_V1`을 결합한다.

1. **Quick-change conflict** — route time과 minimum change time을 명시해 required `66–68초`가 available `58–62초`를 초과하게 한다.
2. **Blocking conflict** — `NARROW_PORTAL capacity=1`에서 배우의 재입장 이동과 prop crew의 이동 occupancy를 겹치게 한다.
3. **Prop gap** — 다음 장면에서 가방이 `CENTER_ENTRANCE`에 필요하지만 reviewed carry·handoff·move event를 제거한다. 실제 원본의 `하수→상수` 이동은 보존하고, 이 변이는 `MUTATED_FIXTURE`로 표시한다.
4. **Tight quick-change** — available `62–70초`, required `66–68초`로 범위를 겹치게 해 `REVIEW / QUICK_CHANGE_TIGHT`를 기대한다.
5. **Clean control** — minimum change `45초`, crew의 prop 이동은 배우보다 먼저 끝나며, 필요한 zone까지 reviewed handoff가 이어진다. 세 핵심 conflict는 모두 0건이어야 한다.
6. **Abstention** — minimum change 또는 route fact를 삭제한다. 기대 결과는 conflict가 아니라 `INSUFFICIENT`다.
7. route absence는 open-world에서 conflict가 아니다. 별도 path fixture는 `topology_complete=true`와 `crossover=false` 또는 `route=PROHIBITED`를 명시할 때만 `VIOLATION`을 기대한다.
8. Stretch cue fixture는 사람이 같은 사건으로 승인한 link를 먼저 만들고 대본 trigger만 변경한다. 승인 전 기대값은 mismatch가 아니라 `AMBIGUOUS_LINK`다.
9. **Correction cycle — Stretch** — 사람이 세 blocker의 해결과 실제 REVIEW의 authority 결정을 반영한 `master-cuesheet-hero-v2`를 별도 `CONTROLLED_FIXTURE` child revision으로 재업로드한다. 재검증에서 현재 hero scope의 blocker 전체가 0건일 때만 `CONSISTENT → FINAL_SIM_READY`를 허용한다.
10. v1과 v2는 별도 hash를 가지며, 분석·decision 전후 v1 byte content는 바뀌지 않는다. v2가 다른 부서 원본에서 자동 생성됐다고 주장하지 않는다.

발표에서는 각 항목을 **실제 발견**, **문서상 미해결**, **통제된 검증 fixture**로 구분한다. 주입한 문제를 실제 공연에서 발견한 결함으로 말하지 않는다.

### Hero 구간 결정

P0는 **`긴 암전 S#16 → S#17 우주비행사가 된 마루`** 전환으로 고정한다. 실제 costume-state와 scene-number 괴리, 60초 환복, 여러 부서 cue가 마스터 큐시트의 한 구간에 모여 있다. 뒤이은 `N#12 Fantasy`의 mic 대상 `??`는 single-source unresolved 보조 finding으로만 사용한다.

다만 대본 내부의 최종 block과 scene numbering을 먼저 확정해야 한다. 매핑을 합의하기 전에는 raw scene marker만으로 자동 join하지 않는다.

실제 무대 사양을 구하지 못해 합성 도식을 쓰는 경우 화면에 항상 `SCHEMATIC / NOT TO SCALE`과 `DEMO_VENUE_V1`을 표시한다.

---

## 15. MVP Acceptance Criteria

### Hour-0 artifacts

- [ ] `script-hero.pdf`, `master-cuesheet-hero-v1.xlsx`, `stage-spec-demo.pdf`, `source-map.json`이 모두 존재.
- [ ] 최초 run의 제품 입력은 script·master v1·stage 정확히 세 개임.
- [ ] 각 artifact에 `REAL_REFERENCE` 또는 `CONTROLLED_FIXTURE` origin이 명시됨.
- [ ] 원본 TXT 행↔PDF page와 CSV 행·열↔XLSX sheet·cell 대응을 표본 8건에서 확인함.
- [ ] 사람이 부서별 큐시트를 이미 취합했다는 master v1의 provenance가 명시되고, 시스템이 이를 자동 생성했다고 표현한 곳이 없음.

### Raw extraction — 사람 수정 전

- [ ] Script/MasterCue/Stage 역할별 Agent와 Extract field config가 별도 생성되고 Studio export artifact와 config version이 보관됨.
- [ ] 고정 3-slot 정상 경로에서 Classify 호출 0건이며 slot role이 세 job과 모든 fact에 3/3 보존됨.
- [ ] 잘못된 문서를 각 슬롯에 넣은 대조 fixture가 자동 재분류되지 않고 `ROLE_MISMATCH_REVIEW`로 중단됨.
- [ ] 세 source의 selected revision·hash·source selection 확인 전 extraction review 시작 0건. 관련 field의 AuthorityDecision 전 hard verdict 또는 `FINAL` 표시 0건.
- [ ] 세 파일의 업로드 순서를 바꿔도 authority 상태와 deterministic finding이 동일함.
- [ ] hero 필수 fact 15/15에 정확한 raw value와 source quote가 있음.
  - Script: 재입장 anchor 1/1, 입장 costume state 1/1, prop requirement 1/1
  - Cue: 이전 퇴장 anchor 1/1, blackout window 1/1, 환복 target·operation 1/1, actor route occupancy 1/1, prop move/handoff 1/1
  - Stage: named zone 3/3, route time 2/2, minimum change time 1/1, route capacity 1/1
- [ ] 존재하지 않는 이름, cue ID, 치수, 통로 생성 0건.
- [ ] unresolved token을 임의 값으로 채운 사례 0건.
- [ ] script/master cue의 필수 fact를 사람이 새로 입력한 사례 0건. extraction correction 횟수와 review 시간을 별도로 기록함.

### Reviewed verification

- [ ] authoritative script block, 혜원↔마루 mapping, hero event link, stage topology가 review됨.
- [ ] exit=`HASU_WING`, change=`HASU_CHANGE`, re-entry·prop requirement=`CENTER_ENTRANCE` binding과 세 zone의 schematic geometry가 review됨.
- [ ] `PROPOSED` link를 승인 없이 verifier가 사용한 사례 0건.
- [ ] 실제 대본↔마스터 큐시트 costume-state 차이를 `REVIEW` 1건, section-number 차이를 `REVIEW` 1건으로 제시하고 각각 실제 source 2개를 가짐. authority 승인 전 hard verdict는 0건.
- [ ] quick-change variant가 `available 58–62초 / required 66–68초`를 계산하고 `QUICK_CHANGE_ROUTE_CONFLICT` 1건을 반환함.
- [ ] blocking variant가 reviewed route occupancy와 `capacity=1`을 사용해 `BLOCKING_CONFLICT` 1건을 반환함.
- [ ] prop variant가 reviewed 구간에서 이동·handoff 부재를 사용해 `POSSIBLE_PROP_GAP` 1건을 반환함.
- [ ] tight variant가 `available 62–70초 / required 66–68초`를 계산하고 `REVIEW / QUICK_CHANGE_TIGHT` 1건을 반환함.
- [ ] minimum change fact를 제거한 대조 fixture가 `INSUFFICIENT` 1건을 반환함.
- [ ] clean control에서 세 핵심 conflict false positive 0건.
- [ ] script 재입장 anchor, cue 퇴장/window, stage route/minimum-change 중 어느 한 입력을 제거해도 quick-change verdict가 `INSUFFICIENT`로 내려감.
- [ ] 같은 reviewed input을 3회 실행했을 때 verdict와 calculation trace가 동일함.

### Decision과 consistency guard

- [ ] P0 화면에서 선택 가능한 finding action은 `DECISION_RECORDED` 하나이며 Option A/B/C·proposal 3버튼이 없음.
- [ ] decision 전후 원본 script·master v1·stage hash 변화 0건, finding verdict·severity·calculation 변화 0건, master writeback 호출 0건.
- [ ] `DECISION_RECORDED`만 있고 새 source hash가 없는 case에서 `CONSISTENT`, `FINAL_SIM_READY`, `CLOSED_BY_REVERIFICATION` 전이 0건.
- [ ] 화면 2에 `CONSISTENT 잠김 · 수정 source 재업로드 전 금지` badge가 항상 보임.

다음은 P0 UI가 아니라 Stretch correction loop의 acceptance다.

- [ ] master v2 재업로드가 새 hash와 `parent_revision_id`를 가진 child revision을 생성함.
- [ ] master v2 재업로드 즉시 v1 revision·Final 2D가 `STALE`이고 v2는 `REVERIFYING`으로 시작함.
- [ ] config만 변경한 rerun은 source update 또는 finding 해결로 기록되지 않음.
- [ ] 동일 `finding_lineage_key`가 v2 verifier run에서 사라진 경우에만 `CLOSED_BY_REVERIFICATION`임.
- [ ] blocker 하나라도 남은 v2에서 `CONSISTENT` 또는 `FINAL_SIM_READY` 전이 0건.

### 시각화와 provenance

- [ ] P0 navigation이 `1 입력·검토`, `2 Finding·2D` 정확히 2개이며 별도 v2 재검증 화면이 없음.
- [ ] 화면 1에 source 카드 3개, origin badge, `REVIEWED/UNREVIEWED`, fact/link 검토, 근거 보기, `Upstage Fact 추출 시작`이 한 화면에 있음.
- [ ] 화면 1에 입력 계약 checklist, Source 교체, EXPORT LOG가 없음.
- [ ] 화면 2의 finding 목록에 `VIOLATION`, `REVIEW / QUICK_CHANGE_TIGHT`, `INSUFFICIENT_EVIDENCE`, `CLEAN CONTROL · finding 0`이 동시에 보임.
- [ ] 화면 2에 `available 58–62s vs required 66–68s`, Evidence Trace 3개, named zone 3개, E1–E8 stepper, source drawer가 동시에 보임.
- [ ] 화면 2에 PROPOSAL panel, Option A/B/C, proposal 3버튼, Zoom slider가 없음.
- [ ] blocking·quick-change·prop 세 core finding은 각각 대본·마스터 큐시트·무대 사양의 fact를 모두 계산에 사용함.
- [ ] cross-document finding은 사용한 source 2개 이상, single-source unresolved finding은 source 1개를 가짐.
- [ ] open blocker 또는 unresolved authority가 있는 run의 2D는 `EVIDENCE PREVIEW`이며 `FINAL` 또는 `CONSISTENT` 표시는 0건.
- [ ] clean control은 finding 0건을 반환하고 같은 8개 event를 step/play함.
- [ ] simulator의 zone·route·entity·시간 범위와 source drawer가 같은 selected revision·master hash·stage graph·compile run을 가리킴.
- [ ] 확인되지 않은 geometry와 route를 실선으로 그린 사례 0건.
- [ ] word coordinate 미검증 시 page + source quote fallback이 작동함.
- [ ] `CONTROLLED_FIXTURE`와 `MUTATED_FIXTURE` badge가 result JSON·finding card·2D canvas·source drawer에 모두 전파됨.
- [ ] controlled stage 또는 master fixture가 포함된 Final 2D는 `DEMO FINAL / NOT VALIDATED FOR A REAL VENUE`로 표시됨.

### End-to-end

- [ ] cache 없이 v1 세 파일 업로드 → 역할별 Extract → review → deterministic finding → 2D evidence seek → source drawer까지 1회 성공.
- [ ] live API 실패 시 같은 run의 검증된 cache로 데모를 계속할 수 있음.
- [ ] `VIOLATION`, `REVIEW`, `INSUFFICIENT_EVIDENCE`, clean control 상태가 사용자에게 보임.

### Research regression — P0 아님

- [ ] 대본 1~688행의 고유 section ID 29개와 마스터 큐시트 marker 30개를 보존함.
- [ ] `S16 / S17 / S19 / S20` raw marker와 source를 보존하고 자동 join 0건.
- [ ] S2 `+2:00`, N6 `+2:00`, S12 `+4:00`, S13 `-0:01`, 합계 `+7:59`를 `REVIEW`로 보고하고 임의 보정 0건.
- [ ] 대본 649행의 미완성 시간과 N#12 `??`를 각각 single-source unresolved로 보존함.
- [ ] 원본 마루가방 continuity conflict 0건; 이동 mutation에서만 `POSSIBLE_PROP_GAP` 1건.
- [ ] 배우↔배역·script block 승인 후 costume-state difference 1건, 승인 전에는 확정 verdict 0건.

---

## 16. 성공지표

### 해커톤 성공지표

- raw hero fact 15/15, hallucinated value 0, script/master cue 수동 신규 fact 0
- blocking·quick-change·prop controlled finding `3/3`, 각 clean control false positive 0
- tight quick-change review `1/1`
- missing-evidence 대조 fixture abstention `1/1`
- hero finding source coverage 100%
- 각 finding에서 계산·세 source trace·source drawer·같은 2D event까지 한 번의 클릭으로 도달
- 화면 수 2개, named zone 3/3, Evidence Trace 3/3, event step E1–E8 8/8
- `REAL_REFERENCE`, `CONTROLLED_FIXTURE`, `MUTATED_FIXTURE` origin badge 누락 0건
- 자동 원본 수정 0건, 새 source hash 없이 잘못된 `CONSISTENT` 표시 0건
- 같은 fixture에서 deterministic result 3/3
- 실제 Upstage Studio run과 API 연동 1회 이상

이 수치는 작은 reviewed fixture의 합격선이며 제품 전체 정확도 주장으로 사용하지 않는다.

### 파일럿 제품지표

- revision 한 건을 검토 완료하는 데 걸리는 시간
- 무대감독이 “실제 확인 필요”로 판정한 finding 비율
- 테크 리허설 전에 해결된 문서 괴리 비율
- 잘못된 `CONSISTENT` 판정 수
- source evidence가 연결된 finding 비율
- 한 프로덕션에서 수정본 재검증을 반복 사용한 비율
- `DECISION_RECORDED` 이후 실제 source 수정·재검증으로 닫힌 finding 비율
- finding 발생부터 master child revision 재업로드까지 걸린 시간
- finding을 이해하고 담당자에게 설명하는 데 걸린 시간

### 사용자 검증 질문

- 이 finding을 보고 담당자에게 무엇을 물어야 하는지 바로 알 수 있는가?
- `INSUFFICIENT_EVIDENCE`를 보고 어떤 근거를 더 확인해야 하는지 알 수 있는가?
- Final 2D가 수정 완료된 마스터 큐시트의 실행 상태를 확인하는 데 도움이 되는가?
- 이 결과를 리허설 전에 신뢰하려면 어떤 근거가 더 필요한가?
- 현재 문서 흐름을 바꾸지 않고도 사용할 수 있는가?

---

## 17. 3분 데모 시나리오

### 1막 — 화면 1에서 세 source를 검토한다 (45초)

- 무대감독이 이미 부서별 cue를 취합했다는 `master-cuesheet-hero-v1`, 실제 대본 발췌, `CONTROLLED_FIXTURE` badge가 붙은 `DEMO_VENUE_V1`을 고정 슬롯에 업로드한다.
- 세 source 카드의 origin과 `REVIEWED / UNREVIEWED`를 보여주고 `Upstage Fact 추출 시작`을 누른다.
- 같은 화면의 fact·link review table에서 원문 근거를 열어 review gate를 완료한다.
- “대본은 의도를, 사람이 만든 마스터 큐시트는 실행을, 무대 사양은 확인된 제약을 말합니다.”

### 2막 — 화면 2에서 오류·계산·근거·무대를 함께 본다 (105초)

- finding 목록에서 `VIOLATION`, `REVIEW / QUICK_CHANGE_TIGHT`, `INSUFFICIENT_EVIDENCE`, `CLEAN CONTROL · finding 0`을 먼저 보여준다.
- quick-change finding을 선택해 **`available 58–62s vs required 66–68s`** 계산을 정점으로 보여준다.
- 바로 아래 `SCRIPT / MASTER_CUE / STAGE_SPEC` Evidence Trace 3개와 우측 source drawer의 정확한 row를 연다.
- 2D 무대에서 `HASU_WING → HASU_CHANGE → CENTER_ENTRANCE`와 actor·crew·prop state를 E1–E8로 step한다.
- “AI가 가능성을 감으로 말한 것이 아니라, 사람이 검토한 세 문서의 시간·경로·상태를 같은 사건으로 계산했습니다.”

### 3막 — 모르면 멈추고, 결정해도 source는 그대로다 (30초)

- route 또는 minimum-change fact를 제거한 fixture를 눌러 `INSUFFICIENT_EVIDENCE`로 내려가는 모습을 보여준다.
- clean control을 눌러 같은 rule set의 `finding 0`을 보여준다.
- 사람의 판단을 `DECISION_RECORDED`로 남기되 source hash와 finding이 그대로임을 보여준다.
- 상단의 `CONSISTENT 잠김 · 수정 source 재업로드 전 금지` badge로 신뢰 규칙을 마무리한다.

마무리 문장:

> **STANDBY는 공연을 대신 연출하지 않습니다. 세 문서가 같은 공연을 말하고 있는지, 무대에 올리기 전에 확인합니다.**

---

## 18. 48시간 실행 순서

| 시간 | 결과물 | 종료 조건 |
|---|---|---|
| 0–3h | hour-0 artifacts | v1 세 입력과 source-map 생성·검수 |
| 3–8h | 역할별 Studio Agents | Script/MasterCue/Stage Parse → Extract config 동결, Classify 미사용, 세 export·API artifact 보관 |
| 8–14h | gold fact와 link | hero fact 15개 raw/reviewed 결과 기록 |
| 14–24h | compiler + frames | 8개 event와 actor·crew·prop 상태 frame 생성 |
| 24–32h | verifier + controls | 세 rule, tight·clean·insufficient fixture, source trace 통과 |
| 32–40h | two-screen UI | 화면 1 upload/review gate, 화면 2 finding+2D+evidence workspace |
| 40–44h | E2E + live/cache | finding seek, E1–E8 stepper, source drawer, live API·cache |
| 44–48h | 동결·리허설 | fixture·config 고정, 3분 데모 반복 |

시간이 부족할 때 삭제 순서:

1. word-level highlight
2. Solar semantic linking
3. 빨간펜 처리
4. light·mic 전체 상태 재생
5. 다중 장면

삭제하면 안 되는 것:

- 세 입력의 역할과 source provenance
- 사람의 fact/link/geometry review
- 세 핵심 검출을 수행하는 결정론적 verifier
- `VIOLATION / REVIEW / INSUFFICIENT_EVIDENCE / clean` 네 상태
- finding·계산·세 원문·2D event의 연결
- `DECISION_RECORDED`가 source나 finding을 바꾸지 않는 계약
- 수정 source 재업로드 전 `CONSISTENT` 잠금
- 근거 부족 시 abstention

---

## 19. 주요 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 사람이 만든 마스터 큐시트에 부서 cue가 이미 누락됨 | 입력 전 취합 누락을 시스템이 전체성으로 오인 | 제품은 부서 원본 완전성을 보증하지 않는다고 명시하고 master의 unresolved·빈칸만 보고 |
| 잘못된 파일을 고정 슬롯에 업로드 | 잘못된 schema로 무의미한 fact 생성 | role sanity gate, 자동 재분류 금지, `ROLE_MISMATCH_REVIEW` |
| 17열·병합셀 Parse 실패 | cue facts가 왜곡됨 | master 입력은 XLSX로 고정하고 hero sheet/range를 제한해 fail-closed |
| 대본 내부에 여러 revision block | 시간축과 scene mapping 오류 | authoritative block을 사용자가 먼저 선택 |
| scene 번호 drift | 잘못된 자동 join | 제목·anchor·순서 기반 후보 + human approval |
| 무대도면 geometry 불확실 | 가짜 동선·거리 생성 | zone/route graph를 사람이 확인, 미검토 시 path rule 비활성화 |
| line timing의 거짓 정밀도 | 잘못된 quick-change 판정 | P0 hard verdict에는 명시·reviewed 시간만 사용; 휴리스틱은 `REVIEW` 이하 |
| prop 상태 오탐 | 제품 신뢰 상실 | 이동열·carry·handoff를 함께 추적, 미검토 시 candidate만 표시 |
| cue ID 부재 | revision 비교 불안정 | exact anchor 우선, 그 외 `AMBIGUOUS_LINK` |
| AI 판단의 과잉 권위 | 존재하지 않는 정답·안전성을 암시 | P0는 source-backed finding·근거와 `DECISION_RECORDED`만 표시 |
| 사람의 decision과 실제 source 수정을 혼동 | 원본과 화면 상태가 달라짐 | 새 hash·child revision·재검증 전 `CONSISTENT` 금지 badge |
| Studio config revision과 공연 source revision 혼동 | 수정하지 않은 오류를 해결로 오인 | 별도 ID·hash·lifecycle, config-only rerun은 source 해결 금지 |
| Final 2D가 장식 또는 구 revision으로 보임 | 핵심 가치와 신뢰성 희석 | 재검증된 동일 compiled event만 사용하고 final revision·master hash·compile run을 화면에 표시 |
| Upstage 좌표 미노출 | 원문 highlight 실패 | page + source quote + table element fallback |
| API/데모 장애 | 핵심 흐름 중단 | raw response 보존, 고정 config, 검증된 cache |
| 민감한 대본 업로드 | 도입 저항 | fixture 비식별화, 보관·삭제 안내, API key 서버 보관 |

---

## 20. 남은 결정

P0 구현 전에 하나만 결정해야 한다.

1. `script-final.txt`의 반복 block 중 `script-hero.pdf`에 사용할 authoritative revision은 어느 구간인가?

다음은 MVP를 막지 않는 파일럿 질문이다.

2. 실제 공연장의 도면·출입구·route time을 어떤 authority가 제공·확인하는가?
3. 실제 minimum costume-change time은 의상팀 입력과 costume plot 중 무엇을 우선하는가?
4. 사용자가 2D simulator에서 가장 먼저 추적하고 싶은 것은 배우, 소품, cue 중 무엇인가?
5. Stretch correction loop를 구현할 때 source-backed patch proposal을 읽기 전용 XLSX patch와 부서별 change request 중 어떤 형태로 제공할 것인가?

---

## 21. 관련 문서

- [API_SPEC.md](API_SPEC.md) — Lo-Fi 2개 화면의 REST·상태 전이·Upstage adapter·검증기 API 계약
- [openapi.yaml](openapi.yaml) — STANDBY 공개 API의 OpenAPI 3.1 기계 판독 명세
- [README.md](README.md) — 기존 제품 정의와 데모 자산
- [SCRIPT_INTEGRATION.md](SCRIPT_INTEGRATION.md) — 대본·마스터 큐시트 연결 실측
- [DOMAIN.md](DOMAIN.md) — 현업 문서와 리허설 workflow
- [FINDINGS.md](FINDINGS.md) — 초기 규칙 결과와 감사 주의
- [UPSTAGE_PLAYBOOK.md](UPSTAGE_PLAYBOOK.md) — Upstage 공식 사양, API와 hard gate
- [JSON_CONTRACT.md](JSON_CONTRACT.md) — reference source 계측과 Upstage↔STANDBY JSON 경계
- [upstage/cue-facts.schema.json](upstage/cue-facts.schema.json) — Upstage-facing CueFact schema
- [upstage/script-facts.schema.json](upstage/script-facts.schema.json) — Upstage-facing ScriptFact schema
- [upstage/exchange-envelope.schema.json](upstage/exchange-envelope.schema.json) — 앱 소유 strict exchange schema
