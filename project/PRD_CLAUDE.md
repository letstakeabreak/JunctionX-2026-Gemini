# STANDBY — PRD (Claude 개정판)

| 항목 | 내용 |
|---|---|
| 문서 상태 | v1.0 — 2026-08-22 팀 설계 검토 반영 |
| 관계 | [PRD.md](PRD.md)의 verifier-first 원칙을 계승하되, **UI 모델과 무대 입력 범위를 대체**한다 |
| 트랙 | Upstage — Automate Paperwork |
| 1차 사용자 | 테크 리허설 전 실행 계획을 취합·검증하는 무대감독 |
| MVP 범위 | 한 장면과 전후 전환 · 화면 2개 |
| 제품 원칙 | Verifier first · Evidence always · Human decides |

---

## 0. 이 문서가 PRD.md에서 바꾸는 것

| 영역 | PRD.md | **이 문서** |
|---|---|---|
| 무대 입력 | stage-spec 도면 fixture | **네모 + 좌우 + 통로 유무 + 초기 세팅** |
| 초기 상태 | 없음 | **`initial_state` 필수 입력 신설** |
| 화면 | `입력·검토` + `Finding·2D` | **`입력` + `워크스페이스`** |
| Finding 표시 | 좌측 목록 | **타임라인 카드 색 + 팝업** |
| 큐시트 | source drawer 인용 | **메인 패널 · 편집 가능** |
| 수정 반영 | 외부 수정 후 재업로드만 | **앱 내 편집 → 저장 → 재검증** |
| 제안 | P0 제외 (Stretch) | **팝업 안 문구 수준으로 P0 복귀** |

계승하는 것: verdict 3종 체계, 근거 강제, reviewed fact만 판정에 사용, `INSUFFICIENT_EVIDENCE` 기권, 결정론적 verifier, AI가 verdict를 바꾸지 못한다는 원칙.

---

## 1. 제품 요약

> **STANDBY는 대본·큐시트·무대 사양을 한 공연 순서로 대조해 시간·동선·상태·큐가 서로 모순되는 지점을 리허설 전에 찾고, 원문 근거와 2D 무대 위에서 재현하는 공연 프리플라이트 검증기다.**

### 결론의 범위

사고를 예측하지 않는다. 확인된 입력을 기준으로 세 가지만 말한다.

| verdict | 의미 |
|---|---|
| `VIOLATION` | 명시된 시간·경로·상태가 수학적으로 양립하지 않음 |
| `REVIEW` | 범위가 겹치거나 문서가 서로 다르게 말함 |
| `INSUFFICIENT_EVIDENCE` | 판정에 필요한 값이 문서에 없음 |

**세 번째가 제품의 정체성이다.** 모르면 모른다고 말하고, 무엇이 없어서 모르는지 밝힌다.

---

## 2. 세 입력

### 2-1. 대본 (SCRIPT)

- 대사, 지시문, 등·퇴장, 씬 구분
- 씬별 길이와 누적 타임코드 (레퍼런스 대본에 이미 존재)
- 화자는 **배역명**으로 기재됨 → 큐시트의 배우명과 매핑 필요

### 2-2. 큐시트 (CUESHEET)

- 부서별 큐가 한 표에 모인 마스터
- 대사 트리거, 환복시간, 소품 반출입, 상하수 이동
- 화자는 **배우명**으로 기재됨

### 2-3. 무대 사양 (STAGE_SPEC) — MVP 최소 요구 ★

**도면을 받지 않는다.** MVP의 목적은 정밀 계측이 아니라 **육안 확인**이다.
받아야 하는 것은 네 가지뿐이다.

| 필드 | 내용 | 예 |
|---|---|---|
| `wings` | 상수 / 하수 존재 | `[상수, 하수]` |
| `crossover` | 백스테이지 통로 유무 | `true` / `false` / `UNKNOWN` |
| `route_times` | 존 간 이동 시간 범위 | `하수윙→환복소 3–4초` |
| **`initial_state`** | **시작 시점 배치** | 아래 |

#### `initial_state` — 신설 필수 입력

현업 용어로 **프리셋 리스트(preset list)**다. 이것이 없으면 소품 연속성을 판정할 수 없다.

```json
{
  "actors":   [{ "id": "혜원", "start_zone": "하수윙" }],
  "props":    [{ "id": "마루가방", "start_zone": "하수윙" }],
  "costumes": [{ "actor": "혜원", "item": "25살 잠옷", "stored_zone": "하수환복소" }]
}
```

**좌우 구분만 하면 된다.** 백스테이지 내부 구조, 정확한 좌표, 면적은 받지 않는다.

#### 왜 도면을 뺐는가

- PRD의 `SCHEMATIC / NOT TO SCALE` 원칙과 네모가 정확히 일치한다
- hero finding의 `route 3–4초` · `minimum change 60초` · `window 58–62초`는 전부 **숫자 입력값**이지 도면 측정값이 아니다. **도면 없이도 판정이 그대로 성립한다**
- 도면을 쓰면 AI가 CAD geometry를 확정한다는 오해를 산다

#### 언제 도면이 필요해지는가 — 향후 제품

**소품, 특히 대도구의 무대 위 위치는 인력 산정과 직결된다.** 큰 세트를 빼내려면 몇 명이 붙어야 하는지가 위치에서 나온다. 배우 동선보다 소품 위치가 실무 영향이 크다.
그 단계에서 실제 도면과 좌표값 입력이 정당해진다. **MVP 범위는 아니다.**

---

## 3. 검증 규칙

P0는 세 규칙 + 기권 규칙이다.

### VR-01. Quick-change feasibility

필요 fact: 이전 퇴장 시각·위치 / 다음 입장 시각·위치 / 환복 위치 / 최소 환복시간 / route time

```
required  = route(퇴장위치→환복소) + minimum_change + route(환복소→입장위치)
available = 다음 입장 시각 − 이전 퇴장 시각
```

| 조건 | verdict |
|---|---|
| 두 범위가 겹치지 않고 required > available | `VIOLATION` |
| 범위가 겹침 | `REVIEW / QUICK_CHANGE_TIGHT` |
| 필요 fact 하나라도 없음 | `INSUFFICIENT_EVIDENCE` |

### VR-02. Blocking / route conflict

- 같은 route를 capacity를 넘겨 동시 점유하면 `VIOLATION`
- **`crossover=false`인데 반대편 재등장이 필요하면 `VIOLATION`**
- `crossover=UNKNOWN`이면 `INSUFFICIENT_EVIDENCE`. 통로가 있다고 가정하지 않는다

### VR-03. Prop continuity

- `initial_state`에서 시작해 반입·반출·이동·인계를 상태 전이로 추적
- 다음 사용 위치까지 이어지는 경로가 없으면 `POSSIBLE_PROP_GAP` → `REVIEW`
- **이동 담당자가 명시되지 않은 좌우 교차는 `REVIEW`.** `VIOLATION`이 아니다 — 암묵적 인계가 있을 수 있다

> 레퍼런스 큐시트의 `상하수 이동` 열은 46행 중 1행만 채워져 있고, 그 1행이
> `마루 가방만 / 하수→상수 / (N7 전까지) / 남다현 담당`이다.
> 무대감독이 사람 머리로 찾아낸 결과다. 우리가 자동화하는 것이 정확히 그 사고 과정이다.

### VR-00. Abstention (기권)

필요 fact가 하나라도 없으면 물리 판정을 시도하지 않는다.
**어떤 fact가 없어서 판정하지 못했는지를 반드시 명시한다.**

---

## 4. Finding 계약

```json
{
  "finding_id": "...",
  "rule_id": "VR-01",
  "verdict": "VIOLATION | REVIEW | INSUFFICIENT_EVIDENCE",
  "event_id": "E3",
  "calculation": { "available": "58-62s", "required": "66-68s" },
  "missing_facts": [],
  "evidence": [
    { "role": "SCRIPT",     "locator": "...", "quote": "...", "origin": "...", "review_state": "..." },
    { "role": "CUESHEET",   "locator": "...", "quote": "...", "origin": "...", "review_state": "..." },
    { "role": "STAGE_SPEC", "locator": "...", "quote": "...", "origin": "...", "review_state": "..." }
  ],
  "target_locator": { "sheet": "...", "row": 43, "field": "환복시간" },
  "suggestion_text": "확인이 필요합니다 …"
}
```

- **evidence는 항상 세 role 모두**를 담는다. 비면 `INSUFFICIENT_EVIDENCE`다
- `suggestion_text`는 확인 요청 문구다. **단일 정답값을 확정하지 않는다**
- `target_locator`는 `이 위치로 이동`의 목적지다
- AI는 `suggestion_text`만 생성한다. `verdict` · `calculation` · `evidence`는 코드가 만든다

---

## 5. 화면 — 두 개

### 화면 1 — 입력

세 문서를 받고 역할을 확정한다. `STAGE_SPEC`은 파일 대신 **폼 입력**을 허용한다.

### 화면 2 — 워크스페이스 (메인)

```
헤더 56px
──────────────────────────
패널 A   무대 또는 큐시트     ← 높이 동일
──────────────────────────
패널 B   큐시트 또는 무대     ← 스왑 가능
──────────────────────────
이벤트 타임라인 E1…E8  132px
```

**세 패널은 하나의 상태를 세 방식으로 보여준다.**

```
타임라인 E3 선택 → 큐시트 해당 행 하이라이트 → 무대에 그 시점 배치
큐시트 셀 편집   → 영향 이벤트 표시 변경     → 무대 상태 갱신
```

한 값을 건드리면 세 곳이 동시에 반응한다. 이것이 컴파일러 서사의 시각적 실체다.

상세 UI 계약은 [`Lo-Fi/standby/DESIGN.md`](../Lo-Fi/standby/DESIGN.md)를 따른다.

---

## 6. 큐시트 편집 모델 ★

PRD.md는 외부 수정 후 재업로드만 허용했다. **이 문서는 앱 내 편집을 P0로 승격한다.**

### 불변식

> **업로드된 원본 파일은 절대 변하지 않는다.**
> 편집은 원본 위에 쌓이는 revision layer다.

Git 비유가 정확하다.

| Git | STANDBY |
|---|---|
| 초기 커밋 | 업로드된 원본 (hash 고정) |
| 워킹 디렉토리 변경 | 편집한 셀 (`EDITED` 색) |
| `git add` 취소 | 셀 되돌리기 / 모든 변경 취소 |
| 커밋 | `저장` → 새 local revision |
| `git log` | 히스토리 |

### 규칙

1. 편집은 즉시 셀에 표시된다. 저장 전까지 **verdict를 바꾸지 않는다**
2. `저장`이 새 revision을 만들고, 그때 **재검증이 돌아 verdict가 갱신**된다
3. 원본 파일 hash는 어떤 경우에도 변하지 않는다. revision은 `parent_revision_id`로 연결된다
4. `CONSISTENT`는 현재 revision에서 blocker가 0일 때만 켜진다
5. 히스토리 항목은 저장 시각·변경 셀 수·저장자를 갖고, 호버 시 **변경 셀만** 미리 보여준다

### 왜 바꿨는가

편집→저장→재검증이 앱 안에서 닫혀야 **"고치면 판정이 뒤집힌다"**를 보여줄 수 있다.
이것이 팀 문제정의 3번(*수정 시 연쇄 꼬임과 암산의 한계*)에 답하는 유일한 경로다.

---

## 7. MVP Acceptance

| # | 항목 | 합격 기준 |
|---|---|---|
| A1 | 세 입력 수용 | script / cuesheet PDF·XLSX + stage spec 폼 |
| A2 | Upstage 추출 | Parse → Classify → 유형별 Extract가 hero fact와 source quote 반환 |
| A3 | 사람 검토 | 핵심 fact와 event link를 사람이 승인. 미승인 값은 판정에 쓰이지 않음 |
| A4 | hero 판정 | `VR-01`이 `AVAILABLE 58–62s` vs `REQUIRED 66–68s`로 `VIOLATION` |
| A5 | 기권 | route 또는 minimum change를 제거하면 `INSUFFICIENT_EVIDENCE`로 내려감 |
| A6 | clean control | 정상 fixture에서 finding 0건 |
| A7 | 근거 | 모든 finding이 세 role의 quote + locator를 보유 |
| A8 | 3패널 동기화 | 타임라인 선택이 큐시트·무대에 동시 반영 |
| A9 | 팝업 → 이동 | `이 위치로 이동`이 큐시트 해당 셀로 이동하고 마커가 유지됨 |
| A10 | 편집 왕복 | 셀 편집 → 저장 → 재검증으로 verdict 변화 |
| A11 | 히스토리 | 저장 이력 조회 + 변경 셀 미리보기 |
| A12 | 결정론 | 같은 입력 3회에서 verdict와 calculation 동일 |
| A13 | fallback | API 장애 시 캐시된 성공 응답으로 데모 지속 |

**A4·A5·A6·A7이 최우선이다.** 나머지가 반쯤 되어도 이 넷이 되면 발표가 성립한다.

---

## 8. 명시적 비목표

- 실제 도면 · CAD geometry · 좌표 계산
- 사고 확률 예측
- 배우 무대 위 미세 blocking
- 전체 85분 공연 타임라인
- 부서별 큐시트 자동 생성 (숙련 무대감독은 엑셀 링크로 이미 자동화)
- 마스터 vs 여러 부서 사본 동시 비교
- 손글씨 의미 추출
- 연속 scrub 애니메이션 · Ctrl+F 검색 · JSON raw 뷰

---

## 9. 리스크

| 리스크 | 대응 |
|---|---|
| 큐시트 17열 파싱 실패 | hero 구간 XLSX/PDF로 축소. 사진 입력 포기 |
| 셀 내부 줄바꿈 손실 | 셀 단위 재파싱 또는 Extract에 줄 분리 위임 |
| 3패널 밀도 초과 | 큐시트 기본 표시 열을 7개로 제한, 나머지는 토글 |
| 편집→재검증 미완성 | A10을 내리고 A4~A7로 데모 구성 |
| API 장애 | 성공 응답 캐시 (A13) |
| 회색이 비활성으로 보임 | `INSUFFICIENT_EVIDENCE` 팝업에 결측 fact 명시 (A5) |

---

## 10. 관련 문서

- [`Lo-Fi/standby/DESIGN.md`](../Lo-Fi/standby/DESIGN.md) — UI 계약 (이 문서와 함께 개정)
- [PRD.md](PRD.md) — 이전 판. verifier 원칙·Finding 계약의 상세 서술은 여전히 유효
- [UPSTAGE_PLAYBOOK.md](UPSTAGE_PLAYBOOK.md) — Studio 적용법·smoke test
- [SCRIPT_INTEGRATION.md](SCRIPT_INTEGRATION.md) — 대본↔큐시트 연결 검증 결과
- [DOMAIN.md](DOMAIN.md) — 현업 워크플로우 근거
