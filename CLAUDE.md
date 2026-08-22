# STANDBY — 에이전트 작업 규약

JunctionX Korea 2026 · Upstage 트랙. **Claude Code와 Codex가 같은 저장소에서 병행 작업**한다.
이 파일은 Claude Code의 기준 문서다. Codex는 `AGENTS.md`를 읽으며, 두 파일의 내용은 동일하게 유지한다.
**한쪽을 고치면 반드시 다른 쪽도 같이 고친다.**

---

## 1. 무엇을 만들고 있나

**STANDBY** — 대본·큐시트·무대 사양 세 문서를 한 공연 순서로 대조해, 시간·동선·상태·큐가
서로 모순되는 지점을 **리허설 전에** 찾아내고 근거와 2D 무대 위에서 재현하는 공연 프리플라이트 검증기.

제품 원칙 세 가지는 어떤 구현에서도 깨면 안 된다.

| 원칙 | 의미 |
|---|---|
| **Verifier first** | 판정은 결정론적 코드가 한다. LLM은 verdict를 바꾸지 못한다 |
| **Evidence always** | 모든 finding은 SCRIPT·CUESHEET·STAGE_SPEC 세 근거를 갖는다 |
| **Human decides** | 최종 판단은 사람. 도구는 근거와 계산만 제시한다 |

**사고를 예측하지 않는다.** verdict는 셋뿐이다 — `VIOLATION` / `REVIEW` / `INSUFFICIENT_EVIDENCE`.
세 번째가 제품의 차별점이다. "모르면 모른다고 말하고, 무엇이 없어서 모르는지 밝힌다."

---

## 2. 저장소 지도

```
app/                    ← 실제 코드. 대부분의 작업이 여기서 일어난다
  src/screens/          InputScreen · WorkspaceScreen
  src/components/standby/  AppHeader Bits StageSimulator CueSheetPanel FindingPopup TimelinePanel
  src/lib/standby-data.ts  시드 데이터 · verdict 토큰 (단일 진실 공급원)
  src/styles.css        디자인 토큰 (다크 전용)

project/PRD_CLAUDE.md   ← 현재 제품 정의. 스펙 충돌 시 이 문서가 우선
project/UPSTAGE_PLAYBOOK.md  Upstage Studio 적용법 · smoke test
project/SCRIPT_INTEGRATION.md 대본↔큐시트 연결 검증 결과
project/DOMAIN.md       공연 현업 워크플로우 근거
Lo-Fi/standby/DESIGN.md ← UI 계약. 화면 구성은 이 문서를 따른다
```

**스펙을 고치기 전에 반드시 `project/PRD_CLAUDE.md`와 `Lo-Fi/standby/DESIGN.md`를 읽어라.**

---

## 3. 스택과 명령

Vite + React 19 + TypeScript + Tailwind v4 + TanStack Router (code-based routes).
서버 없음. 전부 클라이언트 목 상태다.

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # tsc -b && vite build
```

배포: `npx vercel deploy --prod --yes` (프로젝트 루트가 아니라 `app/`에서)

> Lovable에서 이식했지만 `@lovable.dev/vite-tanstack-config`·Nitro·shadcn/ui 의존은 **전부 제거**했다.
> 되돌리지 마라. 이 앱에 SSR·서버 라우트·Radix가 필요한 이유는 없다.

---

## 4. 절대 깨면 안 되는 UI 불변식

`Lo-Fi/standby/DESIGN.md`의 계약이다. 리팩터링 중 실수로 무너지기 쉬우니 특히 주의한다.

1. **화면은 두 개뿐이다** — `입력`, `워크스페이스`. 세 번째 화면을 만들지 마라
2. **패널 A/B 높이는 동일하다** (`flex-1 basis-0`). 스왑해도 레이아웃이 흔들리면 안 된다
3. **팝업은 아래 패널만 덮는다.** 위 패널은 항상 보인다
4. **`이 위치로 이동` 후에도 해당 셀의 finding 마커가 남아야 한다**
5. **편집은 저장 전까지 verdict를 바꾸지 않는다** (pending edit)
6. **원본 hash는 절대 변하지 않는다.** 편집은 그 위의 revision layer다
7. **가로 스크롤은 큐시트 패널 내부에만.** 페이지 전체는 절대 안 된다
8. **`INSUFFICIENT_EVIDENCE` 회색이 비활성처럼 보이면 안 된다.** 의도된 상태다
9. **모서리 0px, 그림자 없음, 1px 경계.** 색은 verdict와 person/prop 인코딩에만
10. **사람=원+cyan, 소품=사각형+amber.** 도형과 색 **둘 다**로 구분한다 (색각 접근성)

### 명시적 금지 목록

5단계 헤더 · 사이드바 · 좌측 finding 목록 · PROPOSAL Option A/B/C · 병렬 3버튼 ·
별도 Final 2D 화면 · revision lineage 패널 · EXPORT LOG · Zoom 슬라이더 ·
Ctrl+F 검색 · JSON raw 뷰 · 실제 건축 도면 · 라이트모드 토글

---

## 5. 남은 작업 (우선순위)

| # | 작업 | 파일 | 비고 |
|---|---|---|---|
| **P0** | **이벤트별 무대 상태** | `standby-data.ts` `WorkspaceScreen` | 현재 `BASE_ENTITIES` 고정. E1~E8 각각의 zone 배치가 필요 |
| **P0** | **재생 동기화** | `WorkspaceScreen` | 재생 시 타임라인·큐시트 스크롤·무대가 함께 진행 |
| P1 | 이벤트 **더블클릭 = 해당 셀로 이동** | `TimelinePanel` | 단일 클릭은 팝업 유지. `이 위치로 이동` 버튼도 유지 |
| P1 | 큐시트가 **위 패널일 때 팝업 유지** | `WorkspaceScreen` | 아래가 무대면 닫을 이유가 없다. 패널 전환 강제 금지 |
| P1 | 엔티티 **라벨 인라인 편집** | `StageSimulator` | 클릭 → input, Enter 커밋, Esc 취소 |
| P2 | 히스토리 **복원** 명시 | `CueSheetPanel` | 현재 로드는 되나 "복원" 의미가 UI에 드러나지 않음 |
| P2 | 파급효과 표시 | `WorkspaceScreen` | 셀 편집 시 영향받는 이벤트 카드에 표시 |

**P0 두 개가 데모의 핵심**이다. 이벤트를 눌렀을 때 무대가 안 바뀌면 "시뮬레이터"라고 부를 수 없다.

---

## 6. 협업 규약 — Claude Code ↔ Codex

같은 파일을 동시에 고치면 충돌한다. **작업 전 아래를 지킨다.**

1. **파일 단위로 나눠 잡는다.** 한 에이전트가 한 파일을 소유한 채 작업하고, 끝나면 놓는다
2. **`standby-data.ts`는 공유 자원이다.** 여기를 고칠 때는 짧게, 한 번에, 다른 작업과 겹치지 않게
3. **작업 시작 전 `git status`로 다른 에이전트의 미커밋 변경을 확인한다**
4. **커밋은 작게.** 한 커밋 = 위 표의 한 항목
5. **끝날 때마다 `npm run typecheck && npm run build`를 돌린다.** 깨진 채로 넘기지 않는다
6. 스펙에 없는 기능을 임의로 추가하지 않는다. 필요하면 먼저 `project/PRD_CLAUDE.md`를 고친다

### 역할 분담 제안

- **Claude Code** — 상태 모델·상호작용 로직 (P0 두 개, P1 팝업/전환 규칙)
- **Codex** — 표현 계층 (라벨 편집, 히스토리 복원 UI, 타임라인 인터랙션)

겹치는 파일은 `WorkspaceScreen.tsx`뿐이다. **이 파일은 Claude Code가 소유**하고,
Codex는 컴포넌트 내부만 건드리는 것으로 시작한다.

---

## 7. 데모에서 절대 죽으면 안 되는 흐름

```
E3 카드 클릭 → 팝업 (VIOLATION · 58-62s vs 66-68s · 근거 3개)
  → 이 위치로 이동 → 큐시트 R3 환복시간 셀
  → 58s를 70s로 수정 → 저장
  → E3가 VIOLATION → CONSISTENT 로 뒤집힘
```

**이 한 흐름이 데모의 전부다.** 어떤 리팩터링도 이걸 깨면 안 된다.
바꿨다면 반드시 브라우저에서 직접 이 흐름을 끝까지 실행해 확인한다.
