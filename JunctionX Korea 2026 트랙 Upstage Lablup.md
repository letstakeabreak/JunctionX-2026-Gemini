# Junction X Korea 2026 — 트랙 챌린지 (주제 2)

## 두 개 트랙: Upstage / Lablup × Furiosa AI

> 영어 발표 두 개를 자동 전사한 원문을 정리했습니다. 챌린지 규칙·평가 기준·상품처럼 정확도가 중요한 부분은 원문 표현을 그대로 살렸고, 확신이 없는 고유명사는 `[?]`로 표시했습니다.
> STT가 "Offstage/Upstate/Opsage → Upstage", "Labrub → Lablup(래블업)", "Furiosa/PIROSA/Quirius/PeggyZen → Furiosa AI(퓨리오사)"로 흩어놓은 점을 감안했습니다.

---

# 트랙 A — Upstage: Automate Paperwork

**발표** 이현(Lee-hyun) `[?]` · Software Engineer, Upstage

## A-1. 회사 소개

- **글로벌 AI 스타트업.** 본사는 한국, 미국, 일본.
- **미션**: making AI beneficial / **비전**: building intelligence for the future of work.
- 현재까지 **2억 7천만 달러** 투자 유치. 올해 잘 알려진 포털 기업을 인수(기업명 `[?]`).
- **한국 최초의 생성형 AI 유니콘.**
- 이번 주 **과학기술정보통신부(Ministry of Science and ICT)가 발표한 소버린 AI 파운데이션 모델**에서 **SKT·LG와 함께 상위 3위**에 선정.
- **2024년 1월 Solar Mini** 출시로 여정 시작 → 파운데이션 모델을 **Document Parse, Solar Pro**로 확장 → 올해는 **에이전트**에 집중해 플랫폼 **Upstage Studio** 구축(이번 해커톤에서 사용). **Solar Pro 4는 에이전트 유스케이스에 특화.**
- 보유: 파운데이션 모델 2종(**LLM = Solar / Document Parse**), 이를 구현하는 플랫폼 **Upstage Studio**, 그리고 **Upstage Education Team.**

**전통적으로는 OCR 회사**

- Solar는 알려졌지만, Upstage는 원래 OCR 회사. **2022년 첫 플랫폼 Document OCR** 출시.
- 발표자가 **Document Intelligence 모델을 AWS Marketplace에 올려 2위** 기록.
- 국내외 파트너·고객 다수. 그중 **하나 라이브(HANA Live)** `[?]` 가 첫 고객으로, **제품이 나오기도 전에 계약**을 맺음. (한국 SI 뒷이야기가 많음)

**왜 고객이 Upstage와 일하는가**

1. **파운데이션 모델(성능·벤치마크)** — "Upstage는 벤치마크만 좋다"는 말이 있었지만, **Solar Pro 4부터는 실제로 좋다**는 것. 과기정통부 상위 3위 선정.
2. **확장성(scalability)** — **매일 300만 페이지 이상** 처리. 예: **국내 의료 영수증의 80%를 매일 Upstage가 처리.** 수백 종의 문서 타입. "이 확장성을 갖춘 회사는 한국에서 Upstage가 유일."

## A-2. Upstage Studio

**문서 처리 워크플로우를 쉽게 만드는 플랫폼.** 4개 에이전트로 구동: **Classify, Parse, Extract, LLM.**

**기능 ① Chat**
문서를 업로드하면 채팅·검색·번역 가능. 예: 영수증 업로드 → "총액이 얼마?", "상점 이름은?" / 메뉴판 업로드 → 영어·중국어·프랑스어·일본어 등으로 번역. (원문에 "Korean"이 중복 표기되어 번역 대상 언어 일부는 `[?]`)

**기능 ② Automation** — 사전 제작된 5개 노드: **Parse, Classify, Extract, Validate, Instruct**

- **Parse** — 다양한 문서 포맷을 **HTML/Markdown으로 변환.** 차트·표·레이아웃·다이어그램·수식을 처리하고 **LLM에서 바로 사용 가능**. **바운딩 박스**를 제공해 출처를 하이라이트. 체크박스·멀티페이지 표·복잡한 표 등 사실상 모든 문서 요소 지원. **요청당 1,000페이지 제한.** 속도·정확도 문제없음.
- **Classify** — **추가 학습 없이** 원하는 문서 클래스를 정의. 문서를 올리면 자동 생성도 가능. 문서 타입별 워크플로우 구성. 예: **항공화물운송장(airway bill)에서 총액이 500달러 초과 시** 특정 처리 / **패킹 리스트에서 품목 누락 시 고객에게 자동으로 회신 메일**을 보내 올바른 양식 요청.
- **Extract** — 키값·리스트·표를 **높은 정확도로 즉시 추출.** 예: 영수증 → 총액, 상점명, 발행일.
- **Instruct** — 자연어 프롬프트로 **맞춤형 인사이트 생성.** 이전 결과를 LLM에 프롬프트로 넘길 수 있고, **근거(grounded source)** 를 함께 제공.
- **Validate** — (5개 노드에 포함, 세부 설명은 전사에 없음)

**데모**
실제 Studio에서 스키마를 설정(자동 생성도 가능)하고, 파싱 → 분류 → 추출로 가격 등 핵심 정보를 뽑는 흐름. **식품의약품안전처(식약처)** 관련 유스케이스로, 의약품 문서를 올려 **적합/부적합(applicable/not applicable)** 을 판정하고 그 사유를 아래에 서술, 출처도 함께 표시. (데모에 등장한 의약품 분류 항목명 — 진통제 등 — 일부는 전사 오인식 `[?]`)

## A-3. 트랙 챌린지

> **"Automate paperwork using Upstage Studio."**

- 주변에서 **문서 때문에 생기는 반복 작업·반복 실수·일상적 번거로움 하나를 포착**해 **문서 에이전트 서비스**를 구축.
- **Upstage Studio를 사용**하고, **REST API와 웹훅으로 임의의 서비스와 연동.**
- **가장 중요**: **Upstage Studio가 핵심 문서 처리 단계를 구동**해야 함. 실제 배포 가능(deliverable)해야 함.

## A-4. 평가 기준 · 상품 · API 사용법

**평가 기준**

- **Upstage Studio와 API를 얼마나 깊이 활용했는가 — 30점**
- 설문(survey) 완료 필요
- (가능한 한) **오류 없이 실행**될 것
- **창의성**은 언제나 중요
- **제품 기획** — 마켓 핏, 구체적인 타깃 유저와 문제 정의

**상품·혜택**

- 굿즈 패키지 + **50달러 상당 크레딧**
- 우승 팀원에게 **200달러 상당 크레딧**

**API 사용법**

- Upstage 콘솔 가입 → 지정 코드 입력(원문 "reading code" `[?]`) → 무료 크레딧 수령.
- 웹에서 Upstage Studio로 워크플로우를 완성한 뒤 **API로 호출.** 문의는 현장에서 언제든 환영.

---

# 트랙 B — Lablup × Furiosa AI: 문제 해결 AI 에이전트 스쿼드

**발표** 래블업(Lablup) 대표 (한국어를 너무 많이 써서 "영어 토크나이저가 고장 났다"며 콩글리시로 진행)

## B-1. 회사 소개 — Lablup / Backend.AI

- **"We want to upgrade every laboratory in the world."**
- **2015년 "Lab Pipeline Up"** 이라는 이름으로 창업(→ Lablup). **AI의 민주화 — intelligence for humanity.**
- 오늘은 **Furiosa AI의 NPU 기반 AI 모델**을 PC에서 경험. **"지능이 전기처럼 흐르는 세상"** 을 지향.
- **11년간 AI를 접근 가능하게(accessible)** 만들어 왔고, 이제 **확장 가능하게(scalable)** 만드는 중.
- 본사 서울, 미국 **산호세** 지사.
- **오픈소스 기반** 창업. 사내에 오픈소스 컨트리뷰터 다수. **CNCF·PyTorch·Python·Linux Foundation의 스폰서.** Linux 커널 컨트리뷰터/커미터, Python 커미터, NumPy 커미터 등 다수 보유.
- 창업 후 **5~6년은 고객이 없어 힘들었음**(AI 인프라 운영 플랫폼 **Backend.AI**에 관심이 없었음). 지금은 많은 기업이 Backend.AI로 자체 AI 모델·서비스를 구축.
- 한국과 5개국 이상에서 고객사 운영. **갤럭시 스마트폰을 쓴다면 이미 Backend.AI로 만든 AI를 쓰는 것.** 주요 고객: **삼성전자, LG전자** 등. 한국에서 만들어진 다수의 대형 모델·비전 모델이 Backend.AI 위에서 구축됨.

## B-2. 제품 스택 — Backend.AI / Continuum / AIGO

- **AI 운영체제(AI OS) 벤더.** **HPC(고성능 컴퓨팅)와 AI를 단일 플랫폼으로 융합**하고, **이종(heterogeneous) AI 하드웨어**를 접근·사용 가능하게 만듦. (NVIDIA GPU, **Furiosa AI**, **Rebellions**(원문 "Riberium"), **Groq**(원문 "Glock") 등 다양한 반도체 — "그래도 Furiosa가 최고"라고 농담)
- **AI 인프라 규모는 최근 4년간 10,000배** 증가. 병목이 GPU-GPU 네트워크 → 스토리지 → CPU RAM → PCI Express 레인 등으로 계속 이동하는데, 이를 해결.
- **약 10년간 만들어 온 Backend.AI** — 여러 클라우드 사업자(CSP)에 제공되어, GPU 클라우드를 쓴다면 이미 익숙한 인터페이스. **오픈소스**라 클러스터·워크스테이션·PC·Mac에 설치 가능.
- **14종의 AI 가속기**를 지원하고, PyTorch·TensorFlow·**vLLM·SGLang**(원문 "S-Giraine")·**Jax·Flax**(원문 "Flex")·**Mojo** 등 다양한 환경에 배포.
- **MS Office에 비유하는 솔루션 스위트**: Backend.AI 엔진(인프라 OS) 위에 라우터 서비스, 라우터 허브, 패키지 프로바이더, MLOps 솔루션.

**오늘 사용하는 것 — AIGO**

- **AIGO** — Backend.AI 스위트에서 가장 작은 **데스크톱 솔루션.** 내 머신에서 실행되어 **Furiosa AI의 NPU 서버에 연결**해 NPU의 지능을 받음. **PC용 에이전틱 AI 플랫폼.**
- AIGO를 PC에 설치하면 **내 GPU·NPU·Apple Silicon**(원문 "FSILICONs")으로 로컬 실행하거나, **Furiosa AI 서버 또는 Upstage 서버에 연결**해 클라우드 기반 지능으로 에이전트 워크로드를 구동.
- **Continuum Route** — 여러 AI API 엔드포인트를 **하나의 AI API로 라우팅**하는 프로그램(직접 만드는 OpenRouter 같은 것).
- **Continuum Hub** — 여러 Continuum 라우터를 **라우터 그룹으로 관리**(자신만의 OpenRouter 서비스 구축).

## B-3. 트랙 챌린지

> **미션: 아주 어려운 수학·코딩 문제를 푸는 나만의 AI 에이전트 스쿼드(팀)를 만들라.**

- **Furiosa AI의 NPU로 구동되는 3종 모델**을 제공받음.
- **AIGO(무료)** 를 사용해, Furiosa AI의 엔드포인트를 AIGO에 연결 → AI 에이전트/스쿼드를 구성해 문제 해결.
- 챌린지 = **문제 해결형 AI 에이전트 스쿼드 편성.** 시스템이 자동 채점하는 도전 과제를 주므로, 스쿼드는 **어느 정도 범용적**이어야 함.
- **에이전트 간 통신·상호작용을 보여주는 인터랙티브 시각화**를 권장.
- 스쿼드를 만들면 **JSON 템플릿으로 다운로드** → 사이트에 복사·붙여넣기 → 이들의 솔루션/기준으로 실행해 **스쿼드 구성 성능을 채점.**
- **3종 모델 중 에이전트별로 하나씩 선택**해 조합 가능. 각 에이전트를 정의하고 **툴 기반 권한·서로 다른 루프·성능·도구**를 부여.

## B-4. 평가 · 제출 · 상품 · 세션

- **핸즈온 세션 9:00~9:30** — AIGO로 직접 스쿼드를 만드는 실습.
- 평가: **벤치마크 점수** + **시각화** + **토큰 효율(주어진 문제를 푸는 데 쓴 토큰)** 을 함께 봄.
- **검증**: 에이전트 구성 템플릿을 제출 → **실시간 리더보드**(원문 "RedoBoot" `[?]`)로 현재 상태 추적.
- **상품·혜택**: 우승 시 **회사 투어 + 커피챗** 기회.
- **별도 세션 오후 9시** — 레블업·퓨리오사 트랙에서 모델 사용법과 제공 내용에 대한 간단한 세션 예정.

---

# 진행 안내 (마무리)

- 트랙 파트너 소개 종료. **트랙을 신중히 선택**할 것.
- **자정까지 킥오프 미션 제안서 제출.**
- 오후 9시에 Lablup·Furiosa AI가 자체 세션(챌린지·플랫폼 설명) 진행 — 해당 트랙 참가자는 청강 권장.

---

# 전사 정리 노트 (불확실 구간)

**Upstage**

- **발표자 "이현(Lee-hyun)"** — 영문 발음 기준, 한글 표기는 추정
- **인수한 포털 기업** — "acquired the well-known portal down". 기업명 불명
- **"하나 라이브(HANA Live)"** — 제품 전 계약한 첫 고객사. 정확한 명칭 불명
- **"reading code"** — 콘솔에서 입력해 무료 크레딧을 받는 코드. 리딤/추천 코드로 추정
- **메뉴 번역 대상 언어** — 원문에 "Korean"이 중복되어 일부 언어 불명(일본어 등으로 추정)
- **식약처 데모의 의약품 분류 항목명**("진고담제", "허 진통제" 등) — 전사 오인식, 정확한 분류명 불명

**Lablup × Furiosa AI**

- **"PeggyZen AI"** — 갤럭시 관련 언급. 문맥상 Backend.AI로 추정
- **"Aeroxer"** — 로컬(Apple Silicon 등) 실행 관련 런타임/실행기로 추정되나 불명
- **"conversable"** — "making AI scalable and conversable" 중. conversational/composable로 추정
- **"MANOVA systems"** — 반도체 나열 중 등장. 정확한 대상 불명
- **"RedoBoot"** — 실시간 리더보드(leaderboard)로 추정
