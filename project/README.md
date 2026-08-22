# STANDBY

**대본·큐시트·무대 사양의 괴리를 리허설 전에 검증하는 공연 프리플라이트 도구**
JunctionX Korea 2026 · Upstage 트랙 "Automate Paperwork"

> **An AI tool analyzing scripts and cue sheets to detect blocking conflicts, tight quick-changes, and missing props, visualizing the production on a 2D stage simulator to prevent stage errors.**

> 무대 위는 초 단위로 설계돼 있는데, 그걸 관리하는 건 **병합된 셀**이다.
>
> 현재 제품 정의와 48시간 MVP의 source of truth는 [PRD_CLAUDE.md](PRD_CLAUDE.md)다. 마스터–부서 사본 비교는 전체 제품 안의 revision-consistency 모듈일 뿐, 제품 본체가 아니다.

---

## 문서 안내

| 파일 | 내용 |
|---|---|
| [PRD_CLAUDE.md](PRD_CLAUDE.md) | **현재 제품 정의 · 3입력 검증 모델 · 요구사항 · MVP acceptance** |
| **README.md** (이 파일) | 제품 정의 · **기대효과** · 규칙 · 노드 매핑 · 데모 · 분담 |
| [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) | **배포 토폴로지 · 서비스 연결 · Mermaid · 보안 경계 · 구현 순서** |
| [`../server/README.md`](../server/README.md) | **실행 가능한 backend MVP · API 흐름 · 현재 구현 한계** |
| [`../contracts/README.md`](../contracts/README.md) | **서비스 간 strict JSON Schema 계약** |
| [UPSTAGE_PLAYBOOK.md](UPSTAGE_PLAYBOOK.md) | **공식 사양 기반 Upstage 적용법 · 데이터 계약 · smoke test · 48시간 순서** |
| [JSON_CONTRACT.md](JSON_CONTRACT.md) | **reference source 계측 · locator packet · Upstage flat JSON · strict exchange envelope** |
| [FINDINGS.md](FINDINGS.md) | 초기 린터 탐색 결과 — **감사 주의 포함, ground truth 아님** |
| [DOMAIN.md](DOMAIN.md) | 현업 워크플로우 리서치 — 왜 이게 안 잡히는가 |
| [validate.py](validate.py) | 동작하는 검증기 프로토타입 (stdlib만 사용) |
| [handwriting.py](handwriting.py) | 빨간펜 레이어 분리기 (PIL만 사용) |
| `data/reference-cuesheet.csv` | 실제 뮤지컬 큐시트 49행 × 17열 |
| [`upstage/cue-facts.schema.json`](upstage/cue-facts.schema.json) | Upstage-facing flat `cue_facts[]` response schema |
| [`upstage/script-facts.schema.json`](upstage/script-facts.schema.json) | Upstage-facing flat `script_facts[]` response schema |
| [`upstage/exchange-envelope.schema.json`](upstage/exchange-envelope.schema.json) | 앱 소유 strict exchange JSON Schema |
| [`validate_json_contract.py`](validate_json_contract.py) | reference hash·locator·gold fact·exchange 왕복 검증 |

```bash
python3 validate.py data/reference-cuesheet.csv
python3 -m pip install -r requirements-dev.txt
python3 validate_json_contract.py
```

두 번째 검증기는 Draft 2020-12 strict validation 의존성이 없으면 성공으로 건너뛰지 않고 실패한다. `*.expected.json`은 사람 작성 기대값이며 실제 Upstage 호출 결과는 아직 없다.

---

## 1. 문제

공연 큐시트는 조명·음향·소품·의상·무대·반주·영상이 **한 표에서 초 단위로 맞물리는** 문서다.
레퍼런스 큐시트는 49행 × 17열, 2단 헤더, 병합셀 다수. 한 행이 최대 **11개 부서**를 동시에 지시한다.

우리가 조사한 범위에서는 기존 대본·큐시트·무대 사양을 함께 읽고, **공연 실행 전 물리적 충돌을 source evidence와 2D simulation으로 검토하는 소극장용 도구**를 찾지 못했다.

- 사전 검토는 **페이퍼 테크**(연출·디자이너가 모여 큐 위치를 합의하는 회의)뿐이고, 이건 사람이 눈으로 읽는다
- 사람은 49행 × 17열의 상태머신을 머리로 돌릴 수 없다 — 마이크를 켜고 안 껐는지, 소품이 나갔는데 또 나가는지
- 나머지 검증은 전부 **돌려보고 터지면 고치는 방식**이다 (드라이 테크 → 큐투큐 → 테크 → 드레스)

> **공연계에는 리허설이라는 런타임 테스트만 있고, 컴파일러가 없다.**

그리고 리허설 시간은 비싸다. 대학 동아리·소극장은 **극장 대관이 2~3일**이다.
런타임 테스트 예산 자체가 부족한데, 정적 검사가 없으니 결함이 무대 위에서 발견된다.

## 2. 해법

STANDBY는 **새 저작 도구가 아니라 AI 공연 프리플라이트 도구**다.

```
대본 + 큐시트 + 무대 사양 → Parse · Classify · 유형별 Extract → 공연 사건 compile
        (한 case)                  Upstage Studio                우리 코드
                                                                  ↓
                blocking · quick-change · missing prop 검증 → 2D stage simulator
```

- **잡는 것**: blocking conflict, tight quick-change, missing prop/handoff, cue·costume·scene 불일치
- **보여주는 것**: 배우·crew·소품·cue의 시간순 상태와 충돌 시점을 2D stage simulator에서 재생
- **판정하지 않는 것**: 문서에 없는 시간·경로·이동, 실제 사고 확률, 검토되지 않은 geometry의 안전성
- **리허설을 대체하지 않는다. 리허설이 진짜 문제에 시간을 쓰게 해준다.**

## 3. 기대효과

### 3-1. 리허설 1시간이 얼마인가

공공극장 실제 요금 (민간은 더 비싸다):

| 항목 | 아르코예술극장 대극장 | 민간 소극장 |
|---|---|---|
| 리허설·준비 대관 1시간 | **72,000원** | 시간당 6~11만원 |
| **초과 사용 10분** | **20,000원** | — |
| 하루 대관 | — | 50~90만원 (300석 미만) |

그리고 리허설 1시간은 극장만 멈추는 게 아니다.
무대감독·음향·조명 스태프가 기본 배치되고, 뮤지컬이면 배우 전원이 대기한다.

> **큐 하나를 고치려고 20명이 동시에 멈춘다.**

### 3-2. 핵심 메커니즘 — 비싼 시간에서 싼 시간으로

**현재**, 결함 1건을 처리하는 흐름:

```
리허설 중 발견 → 중단 → 원인 파악 → 담당 부서 확인 → 수정 결정
              → 전 부서 전달 → 문서 수정 → 재실행
```

8단계 전부가 **극장 안에서**, 전 인원이 멈춘 채로 일어난다.

**STANDBY 적용 후**:

```
리포트 확인 → 수정 → 재검증
```

3단계 전부가 **극장 밖에서**, 무대감독 혼자서 끝난다.

> 리허설 시간을 줄이는 게 아니다.
> **같은 수정 작업을 시간당 7만원짜리 시간대에서 0원짜리 시간대로 옮긴다.**

### 3-3. 실측 기반 추산

> 아래 50분은 **검증된 절감 실적이 아니라 초기 가설**이다. R2·R4를 실제 결함으로 확정할 수 없으므로
> 사용자 인터뷰와 교차문서 fixture 검증 전에는 발표 수치로 사용하지 않는다.

초기 프로토타입은 R1 후보 1건, R2 상태전이 후보 2건, 60초 이하 환복 표기 6건을 출력했다.
“5건이 각각 리허설 10분을 멈춘다”는 가정을 적용하면 **50분**이라는 탐색적 추산이 나온다.

| 절감 항목 | 추산 |
|---|---|
| 극장 초과 대관료 | **10만원** (초과 10분당 2만원 × 5회) |
| 인시 | 50분 × 20인 = **16.7인시** |
| 리허설 밀도 | 50분을 '찾기'가 아니라 '맞추기'에 사용 |

**대학 동아리 기준으로는 비중이 더 크다.** 대관이 2~3일뿐이라 50분은 전체 극장 예산의 3~4%이고,
이런 사이클이 반복되면 **반나절이 사라진다** — 테크 하루를 통째로 잃는 것과 같다.

### 3-4. 되돌릴 수 없는 비용 ★

소프트웨어는 핫픽스가 있다. **공연은 없다.**

| 미확인 문서 상태 | 일어날 수 있는 결과의 예시 |
|---|---|
| `N#12`의 물음표 두 개 | 음향팀이 최신 실행 대상을 다시 확인해야 함 |
| capacity 1 통로의 동시 진입 | 배우와 전환 crew의 blocking이 겹칠 수 있음 |
| 환복 가능시간보다 이동+최소 환복시간이 김 | 재입장 전에 의상을 마치지 못할 수 있음 |
| 다음 사용 위치까지 가방 이동·handoff가 없음 | 소품이 필요한 장면에 도착하지 않을 수 있음 |

이 실수는 **재공연으로 복구되지 않는다.** 그날 온 관객에게는 그게 그 작품의 전부다.

> 우리가 파는 것은 AI의 사고 예언이 아니라,
> **대본·큐시트·무대 제약을 실제 공연 순서로 실행해 보고, 꼬이는 시점과 근거를 공연 전에 확인할 시간**이다.

### 3-5. 왜 사람이 반복하기 어려운가

`validate.py`는 이 큐시트를 **92밀리초**에 검사한다. 그 안에서:

- 소품 **11종** × 46행 반출입 상태 추적
- 마이크 큐 **74건** on/off 상태 추적
- 인물 표기 **209회** 대조
- 부서 밀도 46행 × 13열 집계

사람이 전 행의 상태를 반복 추적하면 시간이 많이 들고, 페이퍼 테크는 본래 합의를 위한 눈검토 회의다.

> **정답은 사람에게 있지만, 반복 대조는 도구가 맡아야 한다.**

### 3-6. 발표용 한 문장

> **대본과 큐시트를 무대에 올리기 전에 2D로 먼저 돌려보고, 동선·환복·소품이 꼬이는 순간을 잡는다.**


## 4. 초기 규칙 실험과 제품 규칙

> **감사 상태(2026-08-22):** 아래 R1~R6은 프로토타입 규칙이지 실제 결함 ground truth가 아니다.
> 특히 R2·R4·R6에는 문맥 누락·임의 임계값·부분문자열 집계 문제가 있다. 아래 결과를 제품 성능으로 주장하지 않는다.
> 현재 MVP의 주인공은 reviewed fact와 명시된 fixture로 검증하는 **blocking·quick-change·prop continuity 세 규칙**이다.

| # | 규칙 | 근거 열 | 등급 | 상태 |
|---|---|---|---|---|
| R1 | **미해결 마커** — `??`, `TBD`, `미정` | 전체 | 🔴 오류 | ✅ 구현 |
| R2 | **소품 반출입 상태머신** — in 없이 out, out 없이 in | 소품 상수·하수 | 🟡 확인 | ✅ 구현 |
| R3 | **마이크 on/off 상태머신** — 켜고 안 끈 마이크 | 음향 | 🟡 확인 | ✅ 구현 |
| R4 | **퀵체인지 물리 가능성** — 환복시간 임계값 | 환복시간 | 🔴 오류 | ✅ 구현 |
| R5 | **부서 동시 관여 밀도** — 위험 구간 산출 | 전 부서 열 | ⚑ 우선순위 | ✅ 구현 |
| R6 | **배우명/배역명 혼용** — 부서 간 오독 위험 | 전 부서 열 | 🟡 확인 | ✅ 구현 |

여유 있으면: R7 조명 상태 일관성, R8 빔프로젝터 배경 on/off, R9 배우 위치(상수·하수) 충돌.

> **규칙 20개를 반쯤 돌리지 말 것.** 6개가 정확히 도는 게 훨씬 강하다.

R1은 보조 unresolved finding으로 쓸 수 있다. R2~R6은 문맥을 포함한 ground truth를 만들기 전까지 연구 backlog로 둔다. 현재 제품 규칙과 exact fixture 계약은 [PRD.md](PRD.md)의 VR-01~VR-07과 Acceptance Criteria를 따른다.

## 5. Upstage 노드 매핑 (30점 항목)

> ⚠️ **공식 사양 기준 정정.** 현재 공개 Studio의 실행 노드는
> **Parse · Classify · Extract · Instruct 네 개**다. 별도 Validate 실행 노드는 없다.
> Table View의 사람 검토와 Instruct의 business-rule validation을 구분한다.

```
대본 + 큐시트 + 무대 사양 (한 case)
  ├─ [Studio] Parse       대사·표·무대 label 구조와 원문 위치 복원
  ├─ [Studio] Classify    Split by file → script / cuesheet / stage_spec / other
  ├─ [Studio] Extract     ScriptFact / CueFact / StageFact 유형별 구조화
  ├─ [Studio] Instruct    event-link 후보 + 중립적인 확인 질문
  ├─ [사람 검토]          fact · event link · stage topology 승인
  └─ [우리 코드]          사건 compile → 세 규칙 검증 → 2D stage simulation
```

| 단계 | 담당 | 근거 |
|---|---|---|
| **Parse** | Studio | 대본 reading order, 큐시트 병합셀·다단 헤더, 무대 label과 원문 위치 복원 |
| **Classify** | Studio | Combined case를 script/cuesheet/stage_spec/other로 라우팅 |
| **Extract** | Studio | 문서 역할별 flat fact contract로 구조화. standalone schema와 Studio import JSON은 별도 |
| **Instruct** | Studio | `LINK_CANDIDATE / NEEDS_REVIEW / INSUFFICIENT_EVIDENCE`와 확인 질문 생성 |
| **사람 검토** | Table View + 앱 | Extract 값, 사건 연결, 무대 geometry·topology를 원문과 대조 |
| **Verifier + simulator** | **우리 코드** | reviewed fact만으로 blocking·quick-change·prop rule을 실행하고 같은 event를 2D로 재생 |

### 왜 검증을 Studio 밖에서 하는가 — 이건 방어가 아니라 설계다

심사위원이 *"왜 최종 비교를 LLM에 전부 맡기지 않았죠?"*라고 물으면:

> **시간 차이, route capacity, 소품 상태 전이는 같은 입력에 같은 답을 내야 하기 때문입니다.**
> AI는 서로 다른 공연 문서를 검증 가능한 fact로 바꾸고 연결 후보를 설명하는 데 씁니다.
> 물리 판정은 reviewed fact를 받은 코드가 계산하고, 최종 실행 가능 여부는 무대감독이 확정합니다.

**노드 수가 아니라 각 단계의 책임과 ground truth loop가 Upstage 활용 깊이의 증거다.**

**바운딩 박스**: Parse는 table element 좌표를 주지만 cell 좌표를 보장하지 않는다.
🧪 Studio Jobs에서 배열 item의 Extract `location=all`이 보존되는지 smoke test한다.
통과 전에는 `page + source_quote_raw + table element`만 표시한다.
세부 recipe와 미확정 사항은 [UPSTAGE_PLAYBOOK.md](UPSTAGE_PLAYBOOK.md)를 따른다.

## 6. 화면 (2개만)

1. **입력·검토** — source 카드 3개, origin·authority, fact·event link·topology 확인
2. **Finding·2D** — 네 결과 상태, 계산식, Evidence Trace 3개, named zone 3개, 8-event stepper, source drawer

open finding의 무대는 `EVIDENCE PREVIEW`다. 사람의 판단을 `DECISION_RECORDED`로 남겨도 source hash는 변하지 않으며, 수정 source 재업로드 전에는 `CONSISTENT 잠김`을 표시한다. full re-upload·revision-lineage 화면은 Stretch다.

## 7. 데모 3막 (3분)

**1막 (30초) — 종이가 공연 사건이 된다**
대본·큐시트·`DEMO_VENUE_V1` 업로드 → Parse → role별 Extract → reviewed event 8개 compile.

**2막 (100초) — 공연을 2D로 돌리자 세 오류가 멈춰 선다** ← 정점
- capacity 1 통로의 배우·crew 동시 진입 → `BLOCKING_CONFLICT`
- available `58–62초`, required `66–68초` → `QUICK_CHANGE_ROUTE_CONFLICT`
- 이동·handoff를 제거한 `MUTATED_FIXTURE` variant에서 가방이 다음 사용 zone에 없음 → `POSSIBLE_PROP_GAP`

각 finding을 누르면 simulator가 그 시점으로 이동하고 대본·큐시트·무대 사양의 source quote가 열린다.

**3막 (50초) — 모르면 멈춘다**
minimum change fact를 제거하면 Red가 Gray `INSUFFICIENT_EVIDENCE`로 내려간다. clean control은 `finding 0`을 보이고, decision 뒤에도 `CONSISTENT 잠김`을 유지한다.

마무리: *"대본과 큐시트를 실제 무대에 올리기 전에, 2D 무대에서 먼저 돌려봅니다."*

## 8. 제품 기획 (평가 항목 명시)

**1차 타깃 — 대학 공연 동아리·소극장 무대감독**

| | 프로 프로덕션 | **대학 동아리 · 소극장** |
|---|---|---|
| 인력 | PSM/SM/DSM/ASM 3~4인 | **1인이 전부** |
| 경험 | 작품 수십 편 | **첫 작품인 경우 다수** |
| 테크 기간 | 수일 | **대관 2~3일** |
| 예산 | 전용 툴 구매 가능 | **0원, 엑셀뿐** |

우리의 초기 타깃 가설은 경험과 시간이 부족한 대학 동아리·소극장이다. 사용자 인터뷰로 검증해야 한다.

**확장**: 소극장 뮤지컬 → 행사·컨퍼런스 진행표 → 방송 FD 큐시트 → 웨딩 순서지. *"진행표가 있는 모든 것"*

**차별점 가설**: 조사한 도구들은 저작·운영 기능을 중심으로 설명한다. 우리는 기존 PDF·사진을 버리지 않고 대본·큐시트·무대 사양을 **검증 가능한 공연 실행 모델과 source-linked 2D simulator**로 연결한다. 경쟁 제품의 동일 기능 유무는 발표 전 다시 확인한다.

## 9. 리스크

**① "원본이 구글 시트면 Parse가 왜 필요하죠?"** ← 가장 위험한 질문. 30점이 흔들린다.

- 현장 유통 형태는 **PDF 출력본 · 인쇄해서 빨간펜으로 고친 종이 · 카톡으로 받은 사진**이다
- 팀마다 포맷이 달라 스키마 고정이 불가능하다 → Classify가 필요한 이유
- 대본·음향큐시트·무대도면이 **별개 문서**로 돌아다닌다

> **대응: 데모는 대본 PDF, 17열 큐시트 XLSX/PDF, 무대 사양 PDF라는 서로 다른 구조로 시작한다.**
> 빨간펜은 L1 수정 셀 탐지까지만 가산점이며, 필기 의미를 읽었다고 주장하지 않는다.

**② "부서별 큐시트 생성"은 핵심 가치가 아니다.** 숙련된 무대감독은 엑셀 시트 링크로 이미 자동화한다.
방어선은 **검증 하나**다. 발표 비중을 여기 맞출 것.

**③ 크레딧 소진** — 초반에 Parse 호출당 크레딧 소모율을 측정하고, 파싱 결과를 캐시해 재호출을 막을 것.

**④ 데모 실패** — 파싱 결과 JSON을 미리 저장해 두고, 라이브 실패 시 캐시본으로 이어서 진행.

## 10. 구현 가능성 — 확인된 것과 안 된 것

공식 문서·기술 블로그 확인 결과 (2026-08 기준).

| 항목 | 상태 | 근거 |
|---|---|---|
| 병합셀 표 → HTML | 🧪 제품 지원·실물 미검증 | Enhanced가 복잡한 표·header cell·셀 줄바꿈을 지원하지만 이 17열 시트는 smoke test 필요 |
| 다단 헤더 | ⚠️ 부분 | *"경쟁사보다 잘 보존"*하지만 Upstage 스스로 **한계를 인정** (아래) |
| 바운딩 박스 | ⚠️ element 단위 | `coordinates`는 table element까지 보장. Studio의 cell/word 강조는 🧪 Jobs 실응답 gate |
| 스캔 PDF·사진 입력 | ✅ 확인 | *"스캔 PDF와 다중 섹션 레이아웃에서 정확히 표 추출"* |
| Extract 필드명 통일 | ✅ 확인 | Auto-Generate Schema + *"서로 다른 필드명을 단일 키로 통일"* |
| Validate = 별도 자동 규칙 노드 | ❌ 공개판에는 없음 | Table View 사람 검토 또는 Instruct validation과 구분 → §5 |
| Instruct 노드 | ✅ 확인 | 요약·변환·baseline 비교·business-rule validation·고정 선택지 판정 |
| 웹훅 | ⏳ 공개판 미지원 | 제품 페이지 `coming soon`; MVP는 Agents API polling |

### ⚠️ 가장 큰 기술 리스크

Upstage 자사 블로그가 복잡한 표의 한계를 **직접 인정**한다:

> *"계층적 헤더 관계 유지에 제한", "행 정렬 및 헤더 그룹화에서 서식 불일치", "복잡한 표에서 일부 구조 손실 가능"*

**우리 큐시트는 2단 헤더 × 17열 × 병합셀 × 셀 내부 줄바꿈** — 정확히 그 한계 구간이다.
특히 **셀 내부 줄바꿈**이 관건이다. `"혜원, 정원 on \n 은비 입장과 동시에 은비 on \n 은비, 마루 퇴장하면 off"`가
한 셀 안에 3개의 큐로 들어 있는데, 이게 뭉개지면 R2·R3 상태머신이 통째로 무너진다.

### ⚡ 스모크 테스트 — 다른 걸 하기 전에 이것부터 (30분)

1. `script-hero.pdf`, `cuesheet-hero.pdf|xlsx`, `stage-spec-demo.pdf`, `source-map.json`을 준비한다.
2. 세 파일을 Studio case로 실행한다.
3. **합격 기준 4개**:
   - [ ] 대본의 scene·재입장·costume phrase가 보존되는가
   - [ ] 17개 열이 살아 있는가 (2단 헤더가 `colspan`으로 표현되는가)
   - [ ] **셀 내부 줄바꿈이 보존되는가** ← 가장 중요
   - [ ] 무대 사양의 zone·route·capacity·minimum-change label이 보존되는가

**4개 다 통과** → 유형별 Extract와 event compiler로 진행한다.
큐시트 구조·줄바꿈이 실패하면 XLSX/PDF hero crop으로 축소하고, 역할별 핵심 label이 실패하면 해당 입력을 더 깨끗한 fixture로 교체한 뒤 source map을 다시 검수한다.

> 이 테스트와 authoritative 대본 block 확정이 hour-0 gate다. 다른 어떤 작업보다 먼저 할 것.

## 11. 손글씨 — 문서가 아니라 '수정 이력'으로 다룬다

### 11-1. 한글 손글씨 OCR의 실제 정확도

| 조건 | 문자 정확도 |
|---|---|
| 단정한 필체 | ~97% |
| 흘림체 | ~84% (최상급) / ~67% (범용 엔진) |
| 그림자·용지 휨 | **10~15%p 추가 하락** |

Information Extract Enhanced는 handwritten text 개선을 명시하지만,
Document Parse가 **한글 빨간펜의 취소·교체 의미를 구조화한다고 보장하지는 않는다.** 실물 검증이 필요하다.

그리고 큐시트에서는 **한 글자가 틀리면 큐가 틀린다.**
`은비 35초`가 `은비 55초`로 읽히면 R4 검증이 **거짓 통과**한다 — 없느니만 못하다.

> **범용 손글씨 OCR에 의존하는 설계는 실패한다.**

### 11-2. 재정의 — 손글씨는 delta다

현장 흐름을 보면 답이 나온다.

```
v3 인쇄 → 리허설에서 빨간펜 수정 → 집에서 엑셀에 다시 입력 → v4 배포
                                     ↑ 이 재입력이 챌린지가 말하는 "반복 작업"
```

우리가 풀 문제는 *"손글씨 문서를 읽어라"*가 아니라 **"v3 + 빨간펜 → v4를 제안하라"**다.
**인쇄된 원본은 이미 갖고 있다.** 손글씨는 그 위의 차이분일 뿐이다.

### 11-3. 빨간펜은 색으로 갈린다 ★

[handwriting.py](handwriting.py) 구현·검증 완료. 원리는 픽셀별 `r - max(g, b) > 45`.

합성 테스트에서 **완전 분리** 확인:

| 레이어 | 빨강 픽셀 | 검정 픽셀 |
|---|---|---|
| `layer-printed.png` | **0** | 61,875 |
| `layer-handwriting.png` | 1,841 | **3** |

이 분리가 두 가지를 동시에 해결한다.

1. **인쇄 레이어를 Parse에 넘긴다** → 손글씨가 표 인식을 방해하지 않으므로 **구조 복원 정확도가 오른다**
   (§10의 최대 리스크를 정면으로 완화한다)
2. **손글씨 레이어를 셀 좌표와 교차한다** → **OCR 없이도 어느 셀이 수정됐는지** 안다

> Parse의 공식 좌표 계약은 table element까지이고 cell bbox를 보장하지 않는다.
> 손글씨를 셀에 매핑하려면 logical grid에서 계산한 cell geometry 또는
> Extract의 `location=all`을 실제 응답 fixture로 먼저 확인해야 한다.

```bash
python3 handwriting.py photo.jpg                     # 레이어 분리
python3 handwriting.py photo.jpg --cells cells.json  # 셀별 수정 감지
```

### 11-4. 단계별 구현 — 난이도 순서

| 단계 | 내용 | OCR | 48h 난이도 |
|---|---|---|---|
| **L0** | 인쇄 종이 사진 → Parse | ❌ | 필수 |
| **L1** | **빨간펜 셀 검출** — *"이 3개 셀이 수정됐습니다"* | ❌ | **낮음 ← 가성비 최고** |
| L2 | 표식 분류 — 취소선 / 화살표 / 삽입 | ❌ | 중간 |
| L3 | 크롭 OCR — **숫자·기호 우선** | ⭕ | 중간 |
| L4 | 한글 문장 인식 → 자동 반영 | ⭕⭕ | 높음 · 위험 |

**L1에서 멈춰도 데모가 성립한다.** OCR 정확도 리스크가 0인데 시각적으로는 가장 강하다.

L3은 반드시 **숫자부터**. `35초 → 55초` 류 수정이 큐시트에 흔하고,
숫자는 한글보다 인식률이 훨씬 높으며, R4(퀵체인지)에 바로 연결된다.

### 11-5. 정확도 문제를 UX로 해소한다

인식 결과를 **확정하지 않는다.** 원본 손글씨 크롭을 나란히 놓고 '제안'으로만 표시한다.

```
45행 음향   [손글씨 크롭]  →  제안: "혜원, 민서, 유림 on"   [적용] [수정] [무시]
```

> **손글씨를 100% 읽을 필요는 없다. 읽었다고 우기지 않으면 된다.**

그리고 이 확인 단계는 **Studio Table View의 human review와 정확히 맞는다**(§5) —
사람이 결과를 확인·수정하고, reviewed 값은 ground truth가 되어 이후 config를 채점한다.
**지금은 그 확인조차 없이 종이가 돌아다닌다**는 점을 발표에서 짚을 것.

### 11-6. 촬영 조건 — 여기서 정확도가 갈린다

- 300 DPI 상당 이상 해상도
- **균일한 조명** (그림자 금지 — 10~15%p가 날아간다)
- 카메라와 종이를 **수직**으로
- **진한 빨간 볼펜·유성펜.** 주황빛 형광펜이나 연한 사인펜은 분리 임계값에 안 걸린다

> 1막이 극적으로 강해진다. 사진 한 장이 **두 레이어로 갈라지는 화면**은 그 자체로 설득이고,
> *"인쇄는 AI가 읽고, 손글씨는 사람에게 되묻는다"*는 역할 분담이 한눈에 보인다.

## 12. 48시간 우선순위

0. **⚡ Hour-0 gate** — 세 ingestible artifact, source-map, authoritative 대본 block
1. **Gold manifest** — actor 1, crew 1, prop 1, zone 3, reviewed fact 15개
2. **Studio 4-node Agent** — Split by file, ScriptFact/CueFact/StageFact, Instruct 3-state link decision
3. **Agents API polling** — `include=all`, `additional_values` decoder
4. **review gate + event compiler + 세 deterministic rule** — blocking, quick-change, prop
5. **Finding·2D evidence workspace** — 네 상태, hero event 8개 step/play, finding seek, 세 source trace/drawer
6. clean·tight·insufficient 대조군, config 고정, 성공 응답 cache

**6번까지 되면 canonical product가 검증까지 성립한다.** word highlight·다형식 5종·손글씨 L1·전체 공연 timeline·Webhook은 MVP 밖이다.

## 13. 분담 제안

| 역할 | 범위 |
|---|---|
| **Upstage 파이프라인** | Studio 워크플로우 구성, Parse/Classify/Extract field config, API 연동 |
| **검증 로직** | event compiler, blocking·quick-change·prop rule, finding·검토 상태 스키마 |
| **프론트 · 시각화** | 세 파일 review → 2D event simulator, finding seek, page/quote fallback |
| **발표 · 데모** | 세 fixture와 clean/insufficient 대조군, 3막 스크립트, 리허설 (최소 2회) |

## 14. 이름

**STANDBY** — 무대감독이 큐 직전에 거는 실제 콜. `"Standby LX 45 … GO"`

> ⚠️ `GO`는 피할 것 — 2025 정션 아시아 종합 우승팀 이름이 'GO'였다.
