# Lovable 빌드 프롬프트 — STANDBY

Lovable은 우리 저장소를 읽지 못하므로 아래 프롬프트는 **자체 완결**로 작성했다.
그대로 복사해 Lovable에 붙여넣으면 된다. 이후 수정은 `lovable:iterate`로 이어간다.

---

## 붙여넣을 프롬프트

```
Build a desktop-first web app called STANDBY — a pre-flight verification workspace
for theatre productions. Aesthetic: "Technical Blueprint / Compiler IDE".
Dense, source-backed, deliberately low-fidelity. It must feel like a professional
engineering console, NOT an analytics dashboard. Korean UI labels.

DESIGN TOKENS
- Background #fbf9f8, surfaces #ffffff, borders #c4c7c7, text #1b1c1c, muted #444748
- Fonts: Inter for UI/Korean; JetBrains Mono for tokens, hashes, time ranges, verdicts
- Square corners (0px radius) everywhere. No shadows. Depth via 1px borders only.
- Verdict colors ONLY (everything else grayscale):
  VIOLATION red #ba1a1a on #ffdad6 | REVIEW amber #8a5a00 on #ffe08a
  CONSISTENT green #1f6b3a on #cfe9d8 | INSUFFICIENT_EVIDENCE gray #747878 on #eceded
  EDITED blue #3b4cca on #dfe3ff
- 8px grid, 4px inside dense tables. Header 56px. Timeline 132px.

EXACTLY TWO SCREENS, switched by two tabs in the header: 입력 / 워크스페이스

=== SCREEN 1: 입력 ===
Three horizontal cards side by side: SCRIPT, CUESHEET, STAGE_SPEC.
Each card: filename, mono hash line, an origin badge (REAL_REFERENCE /
CONTROLLED_FIXTURE / MUTATED_FIXTURE) and a REVIEWED|UNREVIEWED toggle.
SCRIPT and CUESHEET are file dropzones.
STAGE_SPEC is a FORM instead of a file, with these fields:
  - wings: checkboxes 상수 / 하수
  - crossover (백스테이지 통로): radio true / false / UNKNOWN
  - route times: repeatable rows "from zone → to zone : min–max seconds"
  - initial_state: three small tables — actors(id, start zone),
    props(id, start zone), costumes(actor, item, stored zone)
Primary black button bottom right: "Upstage 추출 시작" → navigates to 워크스페이스.
Do NOT add: checklists, "Source 교체", export buttons, revision history, a stepper.

=== SCREEN 2: 워크스페이스 (main) ===
Vertical 3-panel layout filling the viewport:
  Panel A (top)    — height H
  Panel B (middle) — height H  (SAME height as A)
  Timeline (bottom) — 132px
A and B hold the Stage Simulator and the Cue Sheet. A header button "패널 전환"
SWAPS which one is on top. Both panels keep identical height so swapping is seamless.
No left sidebar. No findings list panel.

--- STAGE SIMULATOR panel ---
A plain rectangle stage (NOT a floor plan). A labeled wing box on the left (상수)
and on the right (하수). Between the two wings draw a backstage corridor line:
solid if crossover=true, dashed if UNKNOWN, red crossed-out if false.
People = circles with name labels. Props = squares with name labels.
They are positioned only by zone (상수윙 / 무대 / 하수윙 / 환복소) — never
interpolate exact coordinates. Solid connector = reviewed route, dashed = assumed.
Top-right badge in mono: "SCHEMATIC · 좌우 구분만 · 실측 아님"

--- CUE SHEET panel ---
An editable spreadsheet-style table. Default visible columns:
마커 / 무대_상수 / 무대_하수 / 환복시간 / 의상 / 조명 / 음향
A "열 표시" dropdown toggles extra columns. Horizontal scroll inside the panel only.
Left gutter per row shows a finding marker dot (red / amber / gray) when that row
has a finding. The row for the currently selected timeline event is highlighted.
Cells are click-to-edit. An edited cell gets the EDITED blue background plus a small
triangle in its top-left corner, and does NOT change any verdict until saved.
Panel header right side: badge "미반영 변경 N건", button "모든 변경 취소",
black button "저장", and button "히스토리".
"히스토리" opens a compact scrollable dropdown list (like a desktop context menu):
each row = save time, changed-cell count, author. HOVER a row → a side preview
panel lists only the cells changed in that save. CLICK a row → loads that revision.
Never use right-click.

--- EVENT TIMELINE panel ---
Horizontal row of 8 cards E1…E8 like clips on a video-editor track, scrollable.
Event names: 퇴장 / 암전 시작 / 환복소 이동 / 의상 환복 / 소품 인계 / 크루 동선 해제
/ 재입장 / 소품 복귀. Each card carries a verdict color. Current event is filled
black with a vertical playhead line. Controls: previous / play / next. NO zoom.

--- FINDING POPUP ---
Clicking a timeline card opens a popup that slides UP and covers ONLY Panel B
(the bottom panel). Panel A stays visible. Dim the covered area.
Popup contents, in order:
  1. verdict badge + mono rule id (e.g. VR-01)
  2. calculation, large mono: "AVAILABLE 58–62s"  vs  "REQUIRED 66–68s"
  3. exactly three Evidence Trace blocks labeled SCRIPT, CUESHEET, STAGE_SPEC —
     each with a quote, a mono locator, an origin badge, a review-state badge
  4. a short suggestion sentence asking the user to confirm — never asserting one
     correct value
  5. a single button "DECISION_RECORDED"
  6. pinned at the bottom: a full-width button "이 위치로 이동"
"이 위치로 이동" closes the popup and scrolls/selects the matching cue sheet cell.
The finding marker MUST remain visible on that cell after the popup closes.
For an INSUFFICIENT_EVIDENCE finding the popup must state which fact is missing,
e.g. "이 판정에는 최소 환복시간이 필요한데 문서에 없습니다."

SEED DATA (hard-code as mock state)
Production "우주비행사가 된 마루", hero segment 긴 암전 S#16 → S#17.
Actors 혜원, 은비. Prop 마루가방. Zones 상수윙 / 무대 / 하수윙 / 하수환복소.
crossover = true. route 하수윙→하수환복소 3–4s, 하수환복소→무대 3–4s,
minimum costume change 60s, available window 58–62s.
Findings:
  E3 VIOLATION  VR-01 quick change: available 58–62s vs required 66–68s
  E5 REVIEW     VR-03 prop: 마루가방 좌우 교차에 이동 담당자 표기 없음
  E6 INSUFFICIENT_EVIDENCE VR-02 blocking: 크루 route capacity 정보 없음
  others CONSISTENT
Editing the 환복시간 cell and pressing 저장 should re-run a mock verification so
E3 flips from VIOLATION to CONSISTENT when the value is raised — this flip is the
single most important interaction in the demo.

STRICTLY EXCLUDE
Five-step header, six-item sidebar, left findings list, PROPOSAL Option A/B/C,
three parallel proposal buttons, a separate Final 2D screen, a Master v2
re-verification screen, revision lineage panel, EXPORT LOG, "Source 교체",
input contract checklist, zoom slider, Ctrl+F search, raw JSON view,
real architectural floor plans, continuous scrub animation.
```

---

## 붙여넣은 뒤 확인할 것

| # | 확인 | 왜 |
|---|---|---|
| 1 | 패널 A/B 높이가 정확히 같은가 | 스왑이 어긋나면 레이아웃이 흔들린다 |
| 2 | 팝업이 **패널 B만** 덮는가 | 위 패널이 가려지면 비교가 불가능하다 |
| 3 | `이 위치로 이동` 후 셀 마커가 남는가 | 사라지면 수정 중 근거를 잃는다 |
| 4 | 회색이 비활성처럼 보이지 않는가 | `INSUFFICIENT_EVIDENCE`가 우리 차별점이다 |
| 5 | 저장 → E3 verdict 전환이 도는가 | 데모의 핵심 상호작용 |
| 6 | 페이지 전체 가로 스크롤이 없는가 | 큐시트 내부만 가로 스크롤 |

## 이후 iterate 후보

1. 큐시트 셀 편집 시 **영향받는 이벤트 카드에 표시** (파급효과)
2. 히스토리 미리보기 diff 정밀화
3. `열 표시` 토글로 17열 전체 확장
4. 무대 패널에 route 점유 표시
