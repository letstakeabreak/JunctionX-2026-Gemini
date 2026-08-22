# STANDBY JSON Contract

> 상태: **DRAFT — Upstage 실호출 전**  
> 기준일: 2026-08-22  
> 실행·검증 범위: `SCRIPT`, `MASTER_CUE` v1. `STAGE_SPEC`는 설계 초안이며 아직 실행 계약이 아니다.

## 0. 먼저 읽을 결론

STANDBY는 JSON을 하나로 설계하지 않는다. 서로 목적이 다른 두 계약을 분리한다.

1. **Upstage-facing extraction contract**
   - 역할별 문서 한 개에서 raw fact를 뽑기 위한 얕은 스키마다.
   - 최상위 scalar와 `array<object>`를 사용하고, 반복 item 내부는 가능한 한 flat하게 유지한다.
   - AI가 source ID, 순서 ID, authority, 정규화 시간, 무대 geometry, verdict를 만들지 않는다.
2. **App-owned strict exchange envelope**
   - source hash, adapter lineage, model/config, raw response, locator, review, schema version을 보존하는 STANDBY 소유 계약이다.
   - 앱에서 strict validation을 적용하고, Upstage의 스키마 제한과 독립적으로 중첩 구조를 사용할 수 있다.

```text
immutable source
  → source adapter
  → human source-segment authority gate (SCRIPT)
  → one adapted chunk / one role / one extraction job (role당 여러 job 가능)
  → Upstage-facing flat facts
  → decoder + locator join
  → app-owned strict envelope
  → human fact/link review gate
  → compiler
  → deterministic verifier
```

이 문서는 실제 API 응답을 관찰해 확정한 구현 명세가 아니다. `*.reference.json`은 원본에서 결정론적으로 계측한 **`SOURCE_MEASURED`**, `*.expected.json`은 사람이 작성한 **`EXPECTED_GOLD`**다. 실제 Upstage 호출 결과인 것처럼 발표하거나 정확도 근거로 사용하지 않는다. 실제 응답은 향후 `LIVE_CAPTURE`로 별도 저장한다.

---

## 1. 사실 상태 라벨

| 라벨 | 의미 |
|---|---|
| `SOURCE_MEASURED` | 현재 workspace 파일을 로컬에서 계측한 값 |
| `OFFICIAL_CONTRACT` | Upstage 공식 Console 문서가 명시한 값 |
| `DESIGN_DECISION` | 공식 제약을 바탕으로 STANDBY가 선택한 내부 규칙 |
| `EXPECTED_GOLD` | 사람이 작성한 fixture 기대값. 모델 실측값이 아님 |
| `UNVERIFIED_UPSTREAM` | 실제 계정과 응답 fixture로 아직 확인하지 못한 Upstage 동작 |

`EXPECTED_GOLD`와 향후 캡처할 `LIVE_CAPTURE`를 같은 파일이나 같은 지표로 합치지 않는다.

---

## 2. 현재 reference source 계측

### 2.1 `reference-cuesheet.csv`

`SOURCE_MEASURED`:

| 항목 | 값 |
|---|---:|
| 경로 | `project/data/reference-cuesheet.csv` |
| SHA-256 | `8c7efcdd9ea7d98b2b035d0d702d2c919a8f547ed65cff9bf6b8ff4ebbb16039` |
| 파일 크기 | 23,305 bytes |
| 물리 줄 수 | 459 |
| CSV parser 기준 행 | 49 |
| 열 | 모든 행 17열 |
| 비어 있지 않은 셀 | 전체 381 / 데이터 360 |
| literal newline을 포함한 셀 | 전체 198 / 데이터 196 |
| 그중 nonblank인 셀 | 전체 194 / 데이터 192 |
| 2개 이상 nonblank line인 데이터 셀 | 170 |
| 데이터 셀의 nonblank line 합계 | 644 |
| 줄바꿈 셀이 있는 행 | 41 |
| 가장 긴 셀 | 181 Unicode characters |
| 첫 행 | 17개 셀 전부 공백 |
| 구조 행 | 첫 행 공백, 다음 2개 행은 부서·하위 항목 헤더 |
| 첫 열이 비어 있지 않은 행 | 33 |

따라서 물리 줄 수를 cue row 수로 사용하면 안 된다. 첫 행을 단일 header로 간주하는 일반 CSV import도 이 문서의 병합 헤더 의미를 잃는다. source adapter는 49×17 cell matrix, multiline value, 원본 row index를 그대로 보존해야 한다.

### 2.2 `script-final.txt`

`SOURCE_MEASURED`:

| 항목 | 값 |
|---|---:|
| 경로 | `project/data/script-final.txt` |
| SHA-256 | `fce64dced545ced45a0230cddabfb861239d0a0b83c3910720bf3179afa950a5` |
| 파일 크기 | 212,497 bytes |
| 인코딩·개행 | UTF-8, CRLF |
| Unicode characters | CR 포함 raw decode 94,090 / universal-newline 적용 후 91,918 |
| 논리 줄 | 2,173 |
| 비어 있지 않은 줄 | 1,447 |
| 빈 줄 | 726 |
| 가장 긴 줄 | 459 characters |
| URL | 2 |
| `^S\d+` scene heading 후보 | 71 |
| `^N#?\d+` number heading 후보 | 61 |
| 숫자+분/초가 있는 줄 | 90 |
| 여는 괄호로 시작하는 지시문 후보 | 105 |

마지막 다섯 값은 정규식 후보 수이지 확정된 scene, duration, stage direction ground truth가 아니다. 실제로 같은 `S6`가 서로 다른 revision에서 다른 사건을 뜻한다. TXT의 줄·공백·heading 후보를 보존한 뒤 사람이 segment를 검토해야 한다.

### 2.3 현재 format gap

Information Extract의 공식 지원 목록에는 `XLSX`, `DOCX`, `PDF`, 이미지 등이 있지만 **CSV와 TXT는 없다**. 따라서 현재 두 reference 파일을 그대로 Information Extract가 받는다고 가정하지 않는다. 공식 형식 목록은 [Universal extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction)과 [Parse input requirements](https://console.upstage.ai/docs/capabilities/parse/input-requirements)를 따른다.

---

## 3. Upstage 공식 제약

### 3.1 Information Extract schema

`OFFICIAL_CONTRACT`:

- schema root는 `object`다.
- 지원 타입은 `string`, `number`, `integer`, `boolean`, `array`, `object`다.
- 공식 제한은 first-level property 타입으로 `string`, `integer`, `number`, `array`를 열거하며 first-level `object`를 금지한다.
- `array`의 item에 `object`를 두는 표 구조는 지원한다.
- array가 array item을 직접 포함하는 nested array는 허용하지 않는다.
- schema name은 64자 이하이며 영숫자, underscore, dash를 사용할 수 있다.
- property·definition name 문자열 합계는 10,000자 이하다.
- 동기 API는 object property 최대 100개와 schema 15,000자까지다.
- 비동기 API는 object property 최대 5,000개와 schema 120,000자까지다.
- 명확한 field name과 description을 권장한다.
- 자동 schema generation은 최대 3개 sample file로 시작할 수 있지만, 생성 schema를 실제 추출 전에 목적에 맞게 수정하는 것을 권장한다.

공식 근거: [Writing a schema](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema)

### 3.2 Direct Information Extract input

`OFFICIAL_CONTRACT`:

- direct call의 user message content에는 파일 item 하나만 허용된다.
- XLSX와 DOCX는 지원 목록에 있고 CSV와 TXT는 없다.
- 최대 파일 크기는 50MB, 최대 100페이지다.
- 30페이지 이상 문서 또는 50행 이상 table에는 chunking을 권장한다.
- `mode="enhanced"`는 복잡한 표, 낮은 품질 scan, 필기에 더 강하지만 추가 비용이 발생한다.

공식 근거: [Universal extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction), [Universal Extraction API](https://console.upstage.ai/api/information-extraction/universal-extraction)

### 3.3 Document Parse output

`OFFICIAL_CONTRACT`인 기본 `oac` 응답의 핵심:

- `api`, `model`, `usage`
- 문서 전체 `content.text | html | markdown`
- `elements[].id`
- `elements[].category`
- `elements[].page`
- `elements[].content.text | html | markdown`
- `elements[].coordinates`
- 요청 시 word-level OCR 결과

`coordinates`는 page width·height 기준 0–1 상대 좌표다. native XLSX `sheet/row/cell`이나 DOCX paragraph ID가 아니다.

공식 근거: [Document Parsing API](https://console.upstage.ai/api/parse/document-parsing), [Understanding output](https://console.upstage.ai/docs/capabilities/parse/understanding-output)

### 3.4 Information Extract response

추출 결과는 OpenAI Chat Completion과 유사한 envelope 안에 오지만 JSON object가 바로 들어오지 않는다.

```text
choices[0].message.content
  = stringified extraction JSON

choices[0].message.tool_calls[*]
  .function.name == "additional_values"
  .function.arguments
  = stringified location/confidence JSON
```

adapter는 두 문자열을 각각 parse해야 한다. raw string과 decoded object를 모두 보존한다.

공식 근거: [Universal Extraction API](https://console.upstage.ai/api/information-extraction/universal-extraction), [Location coordinates](https://console.upstage.ai/docs/capabilities/extract/location-coordinates)

### 3.5 `location_granularity="all"`과 `include=["all"]`

서로 다른 API 옵션이다.

| 옵션 | 계층 | 의미 |
|---|---|---|
| `location=true`, `location_granularity="all"` | Information Extract | element coordinates와 word coordinates를 함께 요청 |
| `include=["all"]` | Agents Jobs | 마지막 step뿐 아니라 Parse·Extract 등 전체 step output을 실행 순서대로 요청 |

Agents Jobs의 기본 include는 `['last']`다. `include=['all']` 결과의 각 step은 `output[].content[].text`와 `output[].content[].additional_values`를 가지며, `additional_values` 역시 stringified JSON이다.

Agents Create Job request 자체에는 direct Information Extract의 `location`, `location_granularity`, `confidence` 필드가 없다. 따라서 envelope의 `request_options`에는 실제 job request인 `include`와 request hash만 기록한다. Studio Extract node의 추출 설정은 pinned config snapshot으로 따로 증명하고, snapshot을 아직 관찰하지 못했다면 `extract_settings.source="NOT_OBSERVED"`로 둔다.

공식 근거: [Location coordinates](https://console.upstage.ai/docs/capabilities/extract/location-coordinates), [Agents Jobs](https://console.upstage.ai/docs/agents/jobs), [Create Job](https://console.upstage.ai/api/agents/jobs/create-job), [Retrieve Job](https://console.upstage.ai/api/agents/jobs/retrieve-job)

### 3.6 confidence는 authority가 아니다

`confidence=true`의 `high | low`는 모델의 주관적 확신이다. 공식 문서도 high-confidence 결과가 틀릴 수 있다고 명시한다. confidence는 review 우선순위를 정할 보조값일 뿐 `REVIEWED`나 ground truth를 대체하지 않는다.

공식 근거: [Confidence](https://console.upstage.ai/docs/capabilities/extract/confidence)

---

## 4. Source adapter 계약

### 4.1 원본 불변성

adapter는 원본을 수정하지 않는다. 다음 세 artifact를 분리 보관한다.

1. `raw source`: 사용자가 준 원본 bytes
2. `adapted source`: Upstage 공식 지원 형식으로 변환한 파일
3. `adapter manifest`: 원본 위치와 adapted 위치의 deterministic mapping

각 artifact에는 SHA-256, byte size, MIME, adapter version을 기록한다.

### 4.2 CSV → lossless table + CueCellPacket XLSX

`DESIGN_DECISION`:

첫 artifact인 `RawCueTable.v1`은 감사용 원본 복제다.

- 49×17 cell matrix를 그대로 보존한다.
- 빈 첫 행, 두 단계 header, multiline cell, 빈 cell을 유지한다.
- CSV row 1은 raw table row 1로 유지한다.
- 원본 bytes와 SHA-256이 최종 authority이며 JSON이 원본을 대체하지 않는다.

두 번째 artifact인 `CueCellPacket.v1`이 실제 semantic extraction 단위다. 데이터 영역의 비어 있지 않은 360개 cell마다 다음 값을 앱이 결정론적으로 붙인다.

360개는 first-column section/intro/end cell 33개와 나머지 department cell 327개의 합이다. first-column cell도 `긴 암전\nS#16`처럼 실행 정보를 포함할 수 있어 일괄 폐기하지 않는다. 순수 heading이면 모델 `record_kind="NOTE"`, 앱 coverage `NOTE_ONLY`로 남기고, 실행 statement가 있으면 정상 fact로 분해한다.

```json
{
  "source_locator_raw": "cue:sheet0:r0046:c0013",
  "logical_record_number": 46,
  "logical_column_number": 13,
  "section_cell_raw": "N#12 Fantasy",
  "section_context_raw": "N#12 Fantasy",
  "section_context_method": "EXPLICIT",
  "column_map_schema_version": "standby.cue_column_map.v1",
  "department_group_raw": "음향",
  "department_group_context_method": "EXPLICIT",
  "department_lane_raw": "마이크\n(음향탭에 상세 큐 작성)",
  "lane_side_raw": "",
  "cell_text_raw": "노래 시작하면 전체 on\n중간 기자회견 장면\n-> 혜원,??,?? on\n노래 끝나면 전체 off"
}
```

- locator는 1-based logical record·column이며 모델이 만들지 않는다.
- 빈 section continuation row는 빈 `section_cell_raw`를 그대로 보존한다.
- 이전 marker를 붙인 값은 `section_context_method="FORWARD_FILL_CANDIDATE"`이며 사람 승인 전 authority가 아니다. 원본 XLSX merge span을 확인했다면 별도 method로 기록한다.
- department path는 [cue-column-map.reference.json](upstage/fixtures/cue-column-map.reference.json)을 통해 붙인다. CSV에서 상위 header가 빈 6개 subordinate column(c3, c6, c8, c9, c10, c14)에 실행 데이터 122개가 있으므로 단순 raw header lookup만으로는 부족하다. `FORWARD_FILL_CANDIDATE`는 사람이 검토하기 전 department authority가 아니다. 원 XLSX merge span이 확보되면 candidate 대신 그 source evidence를 사용한다.
- packet들을 XLSX 행으로 렌더링하되 section 경계를 우선하여 50행 미만 chunk로 나눈다.
- Upstage는 `cell_text_raw` 안의 서로 다른 statement를 `cue_facts[]`로 나누고 locator token을 그대로 복사한다.

실제 packet과 기대 출력은 [cue-cell-packet.reference.json](upstage/fixtures/cue-cell-packet.reference.json), [cue-facts.expected.json](upstage/fixtures/cue-facts.expected.json)에 있다.

### 4.3 TXT → segment gate + locator-tagged DOCX

`DESIGN_DECISION`:

- 전체 원본은 한 logical line을 한 record로 보존하고, 빈 줄도 잃지 않는다.
- 먼저 관찰된 반복 block을 `SourceSegment` 후보로 나눈다. 현재 7개 후보는 [script-segment-manifest.reference.json](upstage/fixtures/script-segment-manifest.reference.json)에 있으며 전부 `UNREVIEWED`다.
- 사람이 authoritative segment를 고르기 전에는 전체 파일을 하나의 최종 대본처럼 추출·병합하지 않는다.
- 선택된 segment의 각 line 앞에 `script:line:000654` 같은 visible locator token을 붙여 DOCX paragraph 또는 packet XLSX로 렌더링한다.
- Upstage는 locator token을 복사할 뿐 line number, segment ID, scene ID를 만들지 않는다.
- `S6` 같은 marker는 global ID가 아니다. section instance는 `document hash + reviewed source_segment_id + heading locator`로 식별한다.
- URL, 괄호, comment marker, 미완성 시간을 삭제하거나 교정하지 않는다.
- 긴 segment는 scene 경계를 우선해 chunking하며 chunk가 revision 경계를 넘지 못한다.

기대 ScriptFact은 [script-facts.expected.json](upstage/fixtures/script-facts.expected.json)에 있다.

### 4.4 원본 XLSX/DOCX가 생긴 경우

원본 XLSX 또는 DOCX가 제공되면 변환본보다 원본을 우선한다. 그래도 native cell/paragraph index manifest는 로컬 adapter가 생성한다. Upstage page coordinate를 native cell address로 가장하지 않는다.

### 4.5 adapter가 하면 안 되는 일

- 배우명과 배역명 통합
- `??`, `TBD`, `미정` 보정
- 분/초 변환 또는 duration 계산
- cue ID 생성
- 상수·하수 zone 표준화
- 하나의 multiline cell을 의미 추정으로 분할
- source에 없는 stage route 생성

---

## 5. Upstage-facing extraction contract

### 5.1 공통 원칙

- direct API는 **한 adapted chunk file, 한 역할, 한 호출**이다. 한 역할이 여러 chunk/job으로 나뉠 수 있다.
- Agents API도 한 job에는 **한 file ID와 한 role-specific Agent**만 둔다. 같은 source의 여러 chunk는 동일 source hash 아래 서로 다른 `chunk_id/index`로 병합한다.
- 한 schema가 `script_facts`, `cue_facts`, `stage_fact_rows`를 동시에 반환하지 않는다.
- top-level은 P0에서 역할별 array 하나만 둔다. production title, version, hash 같은 metadata는 앱 envelope에 둔다.
- item 안에 반복 array를 다시 두지 않는다. 복수 대상은 raw string으로 유지하거나 atomic item으로 분리한다.
- 문서에 없는 값은 추측하지 않는다.
- `source_quote_raw`는 연속 원문을 그대로 복사한다.
- AI는 ID, origin, authority, sequence, normalized value를 생성하지 않는다. adapter가 입력에 심은 locator token만 정확히 복사하게 하고, decoder가 packet manifest membership을 검증한다.

### 5.2 Script Extract

실행 artifact는 [script-facts.schema.json](upstage/script-facts.schema.json)이다. top-level은 `script_facts[]` 하나이며 item의 22개 field는 모두 scalar string이다.

핵심 field:

| 구분 | field |
|---|---|
| locator copy | `source_locator_start_raw`, `source_locator_end_raw` |
| 분류 | `fact_kind` |
| 대본 원문 | `document_label_raw`, `section_marker_raw`, `section_title_raw`, `speaker_raw`, `dialogue_line_raw`, `stage_direction_raw` |
| 인물 원문 | `character_or_subject_raw`, `performer_raw`, `role_or_alias_raw` |
| 물리 단서 | `movement_or_presence_raw`, `location_or_side_raw`, `prop_raw`, `costume_state_raw` |
| 시간 | `duration_raw`, `cumulative_time_raw`, `timing_qualifier_raw` |
| 미해결·댓글 | `comment_marker_raw`, `unresolved_marker_raw` |
| 근거 | `source_quote_raw` |

`dialogue_anchor`를 모델이 새로 요약하게 하지 않는다. 전체 `dialogue_line_raw`를 보존하고, trigger 후보 계산은 앱이 exact normalization → substring → fuzzy 순으로 수행한다. fuzzy 결과는 승인 전 `PROPOSED`다.

line 654처럼 movement·costume·prop이 같은 연속 지시문에 함께 있으면 한 ScriptFact의 여러 raw field로 보존한다. 모델이 임의의 세 canonical event로 쪼개지 않는다. 반대로 cue cell은 여러 독립 실행 statement가 들어 있으므로 statement별 CueFact로 분리한다. 두 source의 원자성 기준은 같지 않다.

### 5.3 Master Cue Extract

실행 artifact는 [cue-facts.schema.json](upstage/cue-facts.schema.json)이다. top-level은 `cue_facts[]` 하나이며 item의 16개 field는 모두 scalar string이다.

`source_locator_raw`는 packet locator의 copy다. section과 department는 모델 출력에 중복시키지 않고 locator join 뒤 packet manifest에서 붙인다. 나머지는 `record_kind`, cue ID·trigger·target·operation·state·location·prop·costume·담당자·duration·qualifier·unresolved·note와 exact `source_quote_raw`다.

현재 source에는 명시적 부서 cue ID가 0건이므로 `department_cue_id_raw`를 앱 ID로 채우면 안 된다. `암전` 같은 동일 quote도 반복되므로 quote는 key가 아니다. key는 source hash 범위 안의 locator다.

N#12 mic cell의 합격 기대값:

```text
cue:sheet0:r0046:c0013
  1. 노래 시작하면 전체 on
  2. 중간 기자회견 장면 → 혜원,??,?? on
  3. 노래 끝나면 전체 off
```

세 fact는 같은 locator를 공유하며 가운데 `??,??`를 그대로 보존한다. 실제 fixture는 [cue-facts.expected.json](upstage/fixtures/cue-facts.expected.json)이다.

### 5.4 Stage Spec Extract

```json
{
  "type": "object",
  "properties": {
    "stage_fact_rows": {
      "type": "array",
      "description": "문서에 명시된 zone, route, capacity, change location, minimum time의 atomic fact 목록.",
      "items": {
        "type": "object",
        "properties": {
          "fact_type_raw": {"type": "string"},
          "subject_raw": {"type": "string"},
          "zone_raw": {"type": "string"},
          "from_zone_raw": {"type": "string"},
          "to_zone_raw": {"type": "string"},
          "direction_raw": {"type": "string"},
          "value_raw": {"type": "string"},
          "unit_raw": {"type": "string"},
          "semantics_raw": {"type": "string"},
          "route_status_raw": {"type": "string"},
          "topology_complete_raw": {"type": "string"},
          "source_quote_raw": {"type": "string"}
        }
      }
    }
  }
}
```

역할별 JSON은 Information Extract request의 `response_format` wrapper다. Studio의 Extract-fields import/export JSON이라고 가정하지 않는다. `STAGE_SPEC` schema는 아직 workspace artifact로 만들지 않았으며 위 예시는 설계 초안이다.

---

## 6. 요청·응답 adapter

### 6.1 Direct API request

역할별 schema와 파일 하나를 보낸다. provenance smoke test에서는 다음 beta option을 함께 켠다.

```python
import json

with open("project/upstage/cue-facts.schema.json", encoding="utf-8") as handle:
    response_format = json.load(handle)

extraction_response = client.chat.completions.create(
    model="information-extract",
    messages=[{
        "role": "user",
        "content": [{
            "type": "image_url",
            "image_url": {"url": adapted_chunk_data_url},
        }],
    }],
    response_format=response_format,
    extra_body={
        "location": True,
        "location_granularity": "all",
        "confidence": True,
    },
)
```

`adapted_chunk_data_url`은 source adapter가 만든 지원 형식의 chunk 한 개다. 실제 content MIME과 SDK call은 공식 [Universal extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction), 위치 옵션은 [Location coordinates](https://console.upstage.ai/docs/capabilities/extract/location-coordinates)를 따른다.

### 6.2 Agents job request

Studio에서 만든 role-specific Agent를 사용할 때는 검증된 config를 pin한다.

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

`config_id`를 생략하면 최신 config가 사용된다. STANDBY는 재현성을 위해 생략을 금지한다. Studio의 version 운용 근거는 [Versions and deployment](https://console.upstage.ai/docs/studio/deployment)를 따른다.

### 6.3 Double parse

```text
raw_content_text
  = output[].content[].text 또는 choices[0].message.content
  → JSON.parse
  → extracted_payload

raw_additional_values
  = output[].content[].additional_values
    또는 additional_values tool call의 function.arguments
  → JSON.parse
  → decoded_additional_values
```

decoder 규칙:

1. raw response 전체를 먼저 immutable storage에 저장한다.
2. main content parse와 additional-values parse를 독립적으로 수행한다.
3. parse 실패 시 원문을 폐기하지 않고 `decode_status="FAILED"`, `decode_error_code="DECODE_FAILED"`로 종료한다.
4. missing key, `null`, 빈 문자열은 canonical `null`로 정규화하되 원문 형태를 별도 보존한다.
5. 예상하지 않은 extra key는 자동 채택하지 않고 decoder report에 남긴다.
6. array item 순서를 source order로 가정하기 전 실제 fixture에서 확인한다.
7. 반환 `model`과 요청한 `agent_id`, `config_id`를 모두 audit에 기록한다.

---

## 7. App-owned strict exchange envelope

### 7.1 Envelope 예시

실행 schema는 [exchange-envelope.schema.json](upstage/exchange-envelope.schema.json), source-backed 기대 fixture는 [cue-exchange.expected.json](upstage/fixtures/cue-exchange.expected.json)과 [script-exchange.expected.json](upstage/fixtures/script-exchange.expected.json)이다. 이 envelope는 Upstage에 보내는 `response_format`이 아니라 decoder 이후 서비스들이 주고받는 앱 계약이다. 아래 JSON은 필드 설명용 축약 예시이며, 검증의 canonical 값은 두 fixture다.

```json
{
  "contract_version": "standby.exchange.v1",
  "envelope_id": "fixture_cue_n12_mic_expected_gold",
  "source": {
    "document_id": "doc_sha256_8c7efcdd9ea7d98b2b035d0d702d2c919a8f547ed65cff9bf6b8ff4ebbb16039",
    "document_role": "MASTER_CUE",
    "filename": "reference-cuesheet.csv",
    "sha256": "8c7efcdd9ea7d98b2b035d0d702d2c919a8f547ed65cff9bf6b8ff4ebbb16039",
    "origin": "REAL_REFERENCE",
    "native_locator_kind": "SHEET_CELL"
  },
  "source_scope": {
    "authority_status": "NOT_APPLICABLE",
    "segments": []
  },
  "extraction": {
    "provider": "UPSTAGE",
    "surface": "INFORMATION_EXTRACT",
    "provider_run_status": "EXPECTED_GOLD",
    "provider_error_code": null,
    "provider_error_message_raw": null,
    "decode_status": "NOT_RUN",
    "decode_error_code": null,
    "request_schema_name": "standby_cue_facts_v1",
    "request_schema_version": "1.0.0",
    "request_schema_sha256": "26aafd33a38d55ccf5e2b6af652abe1cac9ac1d27f527cdea68a4ce0a594a566",
    "request_options": {
      "include": [],
      "raw_request_sha256": null
    },
    "extract_settings": {
      "source": "DIRECT_REQUEST",
      "location": true,
      "location_granularity": "all",
      "confidence": true,
      "node_config_snapshot_ref": null,
      "node_config_snapshot_sha256": null
    },
    "additional_values_contract_status": "NOT_OBSERVED",
    "additional_values_decoder_version": null,
    "input_artifact": {
      "status": "NOT_BUILT",
      "adapter_version": null,
      "adapted_filename": null,
      "adapted_sha256": null,
      "manifest_sha256": null,
      "manifest_ref": null,
      "provider_file_id": null,
      "chunk_set_id": "expected-gold-cue-n12",
      "chunk_id": "expected-gold-n12-mic-001",
      "chunk_index": 1,
      "chunk_count": 1,
      "locator_start": "cue:sheet0:r0046:c0013",
      "locator_end": "cue:sheet0:r0046:c0013",
      "page_start": null,
      "page_end": null
    },
    "decoder_version": null,
    "returned_model": null,
    "agent_id": null,
    "config_id": null,
    "run_id": null,
    "raw_response_ref": null,
    "raw_response_sha256": null,
    "response_content_json_pointer": null,
    "response_content_json_text": "<문서 예시에서는 생략; canonical fixture에는 stringified JSON 보존>",
    "additional_values_json_pointer": null,
    "additional_values_json_text": null,
    "additional_values_decoded": null
  },
  "records": [
    {
      "record_id": "fact_app_generated",
      "record_type": "CUE_FACT",
      "source_segment_id": null,
      "source_locator": {
        "locator_id": "loc_app_generated",
        "locator_start": "cue:sheet0:r0046:c0013",
        "locator_end": "cue:sheet0:r0046:c0013",
        "locator_kind": "SHEET_CELL",
        "row": 46,
        "column": 13,
        "line_start": null,
        "line_end": null,
        "source_quote_raw": "노래 시작하면 전체 on"
      },
      "raw_fields": {
        "record_kind": "ACTION",
        "department_cue_id_raw": "",
        "trigger_raw": "노래 시작하면",
        "target_raw": "전체",
        "operation_raw": "on",
        "state_raw": "",
        "location_raw": "",
        "prop_raw": "",
        "costume_raw": "",
        "responsible_party_raw": "",
        "duration_raw": "",
        "duration_qualifier_raw": "",
        "unresolved_marker_raw": "",
        "note_raw": ""
      },
      "provider_evidence": {
        "location_status": "NOT_OBSERVED",
        "confidence_status": "NOT_OBSERVED",
        "location_quality": "NATIVE_ONLY",
        "field_mapping_status": "NOT_OBSERVED",
        "field_evidence": [],
        "page": null,
        "coordinates": [],
        "word_coordinates": [],
        "confidence_raw": null,
        "raw_additional_values_json_text": null
      },
      "review_status": "UNREVIEWED"
    }
  ]
}
```

### 7.2 Strict validation rules

- 모든 envelope는 `contract_version`을 요구한다.
- unknown `document_role`, `origin`, `provider_run_status`, `decode_status`, `review_status`는 거부한다.
- `SCRIPT → SCRIPT_FACT + LINE_RANGE + nonempty source segment`, `MASTER_CUE → CUE_FACT + SHEET_CELL` 관계가 어긋나면 거부한다.
- Script envelope의 aggregate authority와 각 segment authority가 다르거나 record의 `source_segment_id`가 scope에 없으면 거부한다. 후자는 앱 validator가 membership을 검사한다.
- `source.sha256`, request schema SHA-256, adapted artifact·manifest lineage가 없으면 live extraction을 current-use로 승격하지 않는다.
- `chunk_set_id`, `chunk_id`, `chunk_index/count`, source locator range를 보존한다. `chunk_index <= chunk_count`와 locator token·숫자 일치는 앱 validator가 검사한다.
- Studio Agents run의 `agent_id`, pinned `config_id`, provider `file_id`, `include=['all']` 중 하나라도 없으면 실행 전 거부한다.
- direct Information Extract에서는 Agents 전용 `include`, `agent_id`, `config_id`를 허용하지 않는다.
- direct IE의 추출 옵션과 Studio Agent job request를 합치지 않는다. Studio의 location/confidence 설정은 pinned Extract-node snapshot의 reference/hash가 있을 때만 `PINNED_NODE_CONFIG`로 기록하고, 아니면 `NOT_OBSERVED`다.
- live success는 `input_artifact.status=READY`, raw request hash, returned model/run ID, raw response reference/hash, content JSON pointer와 stringified main content를 요구한다. `EXPECTED_GOLD`는 이 필드를 실제 호출처럼 꾸미지 않는다.
- provider failure와 decoder failure는 한 상태로 합치지 않는다. 전자는 `provider_error_code + decode_status=NOT_RUN`, 후자는 `provider_run_status=SUCCEEDED + decode_error_code`다.
- `decode_status=SUCCEEDED|FAILED`에는 decoder version을 요구하고, 실패 시 nonempty `decode_error_code`를 요구한다.
- `additional_values_json_text`가 정상 decode되면 opaque `additional_values_decoded` object와 exact round-trip해야 한다. decode 실패는 malformed raw string을 보존하되 decoded 값은 `null`, records는 0건이다.
- `extract_settings.location=false`이면 granularity는 `null`, `location=true`이면 `element|word|all` 중 하나여야 한다.
- `provider_evidence`는 record 요약과 `field_evidence[]`를 분리한다. 각 field evidence는 decoded payload의 JSON Pointer, location 상태, confidence 상태, page·box를 가진다.
- `location_status`, `confidence_status`, `field_mapping_status`를 하나의 성공 배지로 합치지 않는다. 배열 item의 upstream mapping을 실제 응답에서 확인하지 못했으면 `additional_values_contract_status=NOT_OBSERVED`, `field_mapping_status=MISSING`, `field_evidence=[]`다.
- `additional_values_contract_status=NOT_OBSERVED`이면 provider 좌표·confidence·field mapping을 모두 사용할 수 없고 native locator만 남는다. 어느 provider evidence라도 `AVAILABLE`이면 `LIVE_OBSERVED` profile을 요구한다.
- `additional_values_contract_status=LIVE_OBSERVED`는 raw capture, decoder version, pointer와 stringified JSON이 모두 있고 실제 응답 profile용 decoder가 구현된 뒤에만 허용한다. 현재 validator는 이 상태를 fail-closed로 거부한다.
- materialized record는 앱이 만든 `locator_id`와 native locator를 반드시 가지며, provider box가 없을 때 `location_quality=NATIVE_ONLY`다.
- model output의 `record_id`, `document_id`, `origin`, `review_status`를 채택하지 않는다.
- normalized data는 이 raw exchange record를 덮어쓰지 않고 별도 compile artifact에 둔다.
- raw source, raw provider response, decoded artifact는 서로 덮어쓰지 않는다.
- contract migration은 새 version을 만들며 기존 artifact를 제자리 변경하지 않는다.

---

## 8. Source locator packet

### 8.1 목적

한 segment가 어느 source의 어느 위치에서 왔는지 UI와 verifier가 같은 방식으로 참조하기 위한 앱 소유 객체다. native locator와 Upstage page locator를 병렬로 둔다.

```json
{
  "locator_id": "loc_app_generated",
  "source_document_id": "doc_master_v1",
  "source_sha256": "8c7efcdd9ea7d98b2b035d0d702d2c919a8f547ed65cff9bf6b8ff4ebbb16039",
  "source_role": "MASTER_CUE",
  "field_path": "cue_facts[0].operation_raw",
  "source_quote_raw": "전체조명 in",
  "native_locator": {
    "kind": "SHEET_CELL",
    "sheet_name": "Sheet1",
    "row": 6,
    "column": 12,
    "a1": "L6",
    "original_csv_row": 6,
    "original_csv_column": 12
  },
  "provider_locator": {
    "page": null,
    "element_coordinates": null,
    "word_coordinates": null,
    "parse_element_ids": []
  },
  "location_quality": "NATIVE_ONLY",
  "provenance": {
    "native": "SOURCE_ADAPTER",
    "provider": "UNVERIFIED_UPSTREAM"
  }
}
```

### 8.2 Native locator variants

| `kind` | 필수 값 | 생성 주체 |
|---|---|---|
| `SHEET_CELL` | raw CSV row/column과 adapted sheet/row/column/A1 | source adapter |
| `LINE_RANGE` | original TXT line start/end와 adapted paragraph range | source adapter |
| `PAGE_BOX` | provider page와 verified box | decoder 또는 reviewer |
| `NONE` | 없음. pre-exchange quarantine에서만 허용 | 위치를 증명할 수 없을 때 |

strict exchange의 `source_locator.locator_kind`는 `SHEET_CELL | LINE_RANGE | PAGE_BOX`만 허용한다. `NONE`은 materialized record가 아니므로 exchange에 넣지 않고 `FAILED` coverage/quarantine으로 남긴다. `native_locator`에는 raw source 좌표와 adapted file 좌표를 함께 기록해 CSV cell과 XLSX rendered page를 혼동하지 않는다.

materialized exchange record의 `location_quality`는 native locator가 전제되므로 `NATIVE_ONLY | NATIVE_AND_ELEMENT_BOX | NATIVE_AND_WORD_BOX`만 허용한다. 아래 provider-only quality 값은 pre-exchange quarantine이나 UI fallback에서만 쓰며 strict record로 승격하지 않는다.

Upstage raw locator의 canonical mapping:

```text
CueFact.source_locator_raw
  → exchange.locator_start = exchange.locator_end

ScriptFact.source_locator_start_raw
  → exchange.locator_start
ScriptFact.source_locator_end_raw
  → exchange.locator_end
```

decoder는 token의 숫자를 `row/column` 또는 `line_start/line_end`로 다시 계산하고 token과 숫자가 일치하는지 검사한다. `LINE_RANGE`는 `line_start <= line_end`여야 한다.

### 8.3 Provider locator 규칙

- 공식 `coordinates`는 내부 `element_coordinates`로 명시적으로 rename한다.
- `word_coordinates`는 실제 `location_granularity="all"` 응답에서 확인한 경우에만 저장한다.
- field별 좌표는 `provider_evidence.field_evidence[]`에 decoded payload JSON Pointer와 함께 저장한다. record-level box는 대표 source quote의 요약일 뿐 field path를 대체하지 않는다.
- Information Extract location은 parse `element_id`를 직접 보장하지 않는다.
- `parse_element_ids`는 Document Parse bbox와의 adapter-side matching 결과이며 derivation을 기록한다.
- array item별 location shape가 smoke test에서 확인되지 않으면 `PAGE_QUOTE_ONLY`로 downgrade한다.
- native cell/paragraph와 provider page box가 다르면 자동으로 하나를 정답 처리하지 않고 `LOCATOR_CONFLICT_REVIEW`를 만든다.

권장 `location_quality`:

```text
NATIVE_AND_WORD_BOX
NATIVE_AND_ELEMENT_BOX
NATIVE_ONLY
WORD_BOX_ONLY
ELEMENT_BOX_ONLY
PAGE_QUOTE_ONLY
NONE
```

---

## 9. Human source·fact authority gates

Upstage가 값을 추출했다는 사실은 그 값이 공연 실행의 authority라는 뜻이 아니다.

- **pre-extraction source gate**: SCRIPT의 반복 revision 중 사용할 `SourceSegment`를 사람이 선택한다.
- **post-extraction fact gate**: 선택된 source에서 나온 각 fact와 cross-source link를 사람이 검토한다.

### 9.1 상태

```text
UNREVIEWED → REVIEWED
           → REJECTED
```

`REVIEWED`로 바꾸려면 사람은 source segment와 extracted fact별로 다음을 확인한다.

1. source role과 selected revision/hash가 맞다.
2. `source_quote_raw`와 locator가 실제 source를 가리킨다.
3. raw field가 원문을 왜곡하지 않는다.
4. normalized value가 있다면 변환 근거가 명시되어 있다.
5. 배우·배역, cue·trigger, zone·route를 임의로 동일시하지 않았다.
6. origin badge가 유지된다.

### 9.2 Compiler hard gate

Compiler가 사용할 수 있는 segment:

```text
source hash is selected
AND locator quality is sufficient for the rule
AND segment authority == REVIEWED
AND required cross-source event link == REVIEWED
AND required stage topology == REVIEWED
```

하나라도 실패하면 hard verdict를 만들지 않고 `INSUFFICIENT_EVIDENCE` 또는 명시적인 review request로 내린다.

파일 전체에 `REVIEWED` badge 하나를 붙이는 것으로 모든 segment authority를 대신하지 않는다. bulk review를 제공하더라도 각 segment decision을 audit에 materialize한다.

### 9.3 confidence와 review

- `low`: 우선 검토 대상으로 올린다.
- `high`: review 생략 근거가 아니다.
- locator 없음: confidence와 무관하게 hard rule 입력 금지다.
- 사람 correction: raw model output을 덮지 않고 `normalized_fields`와 review record에 저장한다.

---

## 10. 책임 분리

| 구성요소 | 책임 | 하면 안 되는 일 |
|---|---|---|
| Source adapter | CSV→XLSX, TXT→DOCX, native index, hash·lineage | 의미 추론, cue 병합, 시간 계산 |
| Document Parse | layout-aware text, element/page/coordinates | 공연 의미 확정, native cell 주소 생성 |
| Information Extract | 역할별 schema에 맞는 raw fact 후보 | source ID·authority·verdict·geometry 생성 |
| Studio Extract Agent | 고정 schema/config로 반복 추출 | 최신 draft를 암묵적으로 production에 사용 |
| Agents adapter | file/job lifecycle, `include=['all']`, pinned node snapshot, raw 보존, double parse | direct IE 옵션을 job request field로 꾸밈, step 경계 제거, role identity 추정 |
| Locator joiner | native locator와 provider box 결합 | 근거 없는 exact cell/word box 생성 |
| Human reviewer | segment·link·topology authority 결정 | model confidence를 review로 대체 |
| Compiler | reviewed facts를 typed event graph로 변환 | unreviewed fact 사용, AI 설명을 수치로 채택 |
| Verifier | blocking·quick-change·prop rule의 결정론적 계산 | LLM에게 최종 verdict 위임 |
| UI | raw/normalized/locator/review/diff 표시 | fixture를 실제 발견 결함으로 표현 |

Studio의 Parse·Extract·Instruct 역할 설명은 [Studio Nodes](https://console.upstage.ai/docs/studio/key-features)를 따른다. Instruct는 설명·정규화·검토 보조에 사용할 수 있지만 canonical fact나 deterministic verdict의 소유자가 아니다.

---

## 11. Chunking과 호출 전략

### 11.1 현재 source

- Raw cue matrix는 parser 기준 49행이지만 semantic extraction용 packet은 비어 있지 않은 데이터 cell 360행이다. 따라서 packet workbook은 한 번에 보내지 않고 50행 미만으로 나눈다.
- Script TXT의 DOCX 변환 후 page 수는 아직 측정되지 않았다.
- adapted file을 실제 Document Parse 또는 Information Extract에 넣기 전 page count를 추측하지 않는다.

### 11.2 결정 규칙

1. adapted chunk가 30페이지 미만이고 table이 50행 미만이면 sync direct extraction smoke test를 허용한다.
2. CueCellPacket은 section 경계를 우선해 50행 미만으로 미리 분할한다. 하나의 cell packet은 절대 둘로 자르지 않는다.
3. 30페이지 이상 또는 50행 이상 table이면 공식 chunking option도 별도로 검토한다.
4. chunking을 켜도 source는 하나의 immutable document identity를 유지한다.
5. chunk boundary에서 scene 또는 cue row가 분리되면 자동 join하지 않고 overlap 또는 review 전략을 사용한다.
6. chunk별 결과에는 `chunk_set_id`, locator 범위, chunk index/count를 기록하고, provider page 범위가 실제 관찰된 경우에만 page range를 추가한다.
7. chunk 결과 merge는 앱이 수행하며 AI가 전역 sequence ID를 생성하게 하지 않는다.
8. async 전환 시에도 동일 exchange envelope와 authority gate를 사용한다.

공식 근거: [Universal Extraction API](https://console.upstage.ai/api/information-extraction/universal-extraction), [Handling large documents](https://console.upstage.ai/docs/capabilities/parse/handling-large-documents)

---

## 12. Smoke-test gates

아래 gate를 순서대로 통과하기 전 `UPSTAGE_INTEGRATED`라고 표시하지 않는다. 로컬 계약 검사는 `python3 -m pip install -r project/requirements-dev.txt` 후 `python3 project/validate_json_contract.py`로 실행한다.

### G0. Source freeze

- [ ] 두 reference hash가 이 문서의 `SOURCE_MEASURED` 값과 일치한다.
- [ ] `*.reference.json`은 `SOURCE_MEASURED`, `*.expected.json`은 `EXPECTED_GOLD`로 inventory에 구분된다.
- [ ] 실제 모델 응답을 뜻하는 `LIVE_CAPTURE` 파일은 아직 없다고 표시된다.

### G1. Adapter fidelity

- [ ] CSV→XLSX 후 49×17 matrix가 동일하다.
- [ ] 빈 첫 행과 literal-newline cell 198개가 유지된다. 공백처럼 보여도 newline bytes만 있는 4개 cell을 삭제하지 않는다.
- [ ] 데이터 영역의 비어 있지 않은 360개 cell이 각각 packet 하나가 된다.
- [ ] 모든 packet은 `EXTRACTED | NOTE_ONLY | FAILED` 중 하나의 coverage 결과를 가지며 silent drop은 0건이다.
- [ ] TXT→DOCX 후 2,173 logical line/paragraph mapping이 복원 가능하다.
- [ ] raw/adapted SHA-256와 adapter version을 보존한다.
- [ ] 임의의 header fill, 시간 정규화, 인물 통합이 0건이다.

### G2. One-file/one-role execution

- [ ] v1은 SCRIPT와 MASTER_CUE를 별도 job으로 실행한다. STAGE_SPEC는 별도 schema·fixture·validator가 생기기 전 실행 범위가 아니다.
- [ ] Studio Agents job마다 role-specific `agent_id`와 non-null pinned `config_id`가 있다.
- [ ] Agents job은 `include=['all']`을 요청한다.
- [ ] Studio Extract-node 설정은 pinned config snapshot/hash로 증명하거나 `NOT_OBSERVED`로 둔다. job body에 direct IE 옵션을 기록하지 않는다.
- [ ] direct IE smoke test는 user content item이 정확히 하나다.

### G3. Raw response preservation and double parse

- [ ] provider response 전체를 수정 없이 저장하고 reference와 SHA-256을 envelope에 남긴다.
- [ ] main content string을 JSON으로 parse한다.
- [ ] `additional_values` string을 별도로 JSON으로 parse한다.
- [ ] raw string과 parsed object가 모두 남는다.
- [ ] malformed JSON fixture가 silent recovery되지 않고 `decode_status="FAILED"` / `DECODE_FAILED`다.

### G4. Step history

- [ ] `include=['all']` 응답에 실제 Parse·Extract step이 실행 순서대로 보인다.
- [ ] `include=['last']`와 결과 차이를 캡처한다.
- [ ] step model과 content boundary를 유지한다.

### G5. Item-level provenance

- [ ] direct IE는 `location=true`, `location_granularity='all'` 요청을 기록한다. Studio는 같은 값을 job request로 가정하지 않고 node config snapshot에서 확인한다.
- [ ] array item field별 page/element/word coordinate shape를 raw fixture로 확인한다.
- [ ] `field_evidence[].field_path_json_pointer`가 decoded payload의 실제 field를 가리키고 raw `additional_values`와 왕복된다.
- [ ] profile 확인 전에는 `additional_values_contract_status=NOT_OBSERVED`, `field_evidence=[]`를 유지한다.
- [ ] native XLSX cell 또는 DOCX paragraph와 provider location을 연결한다.
- [ ] 연결 실패 시 exact locator를 만들지 않고 quality를 downgrade한다.

### G6. Flat extraction integrity

- [ ] top-level 역할 array 하나만 반환한다.
- [ ] array item 안에 nested repeating array가 없다.
- [ ] 원문에 없는 cue ID, time, actor mapping, route 생성이 0건이다.
- [ ] missing, null, empty normalization이 raw 값을 삭제하지 않는다.
- [ ] unknown OCR replacement character `�`가 있으면 review warning을 만든다.

### G7. Human segment authority

- [ ] gold segment를 source와 나란히 review할 수 있다.
- [ ] `UNREVIEWED` segment로 compiler hard verdict가 0건이다.
- [ ] correction이 raw output을 덮어쓰지 않는다.
- [ ] rejected segment가 current compile set에서 제외된다.
- [ ] cross-source event link와 stage topology에 별도 review record가 있다.

### G8. Reproducibility

- [ ] 같은 source hash + adapted hash + schema hash + agent/config ID + decoder version이 같은 cache key를 만든다.
- [ ] response의 실제 returned model을 저장한다.
- [ ] Studio의 새 draft가 pinned config 실행을 바꾸지 않는다.
- [ ] config를 바꾸면 새 extraction run이며 source revision 변경으로 취급하지 않는다.

### G9. Expected-gold comparison

- [ ] `EXPECTED_GOLD`와 `LIVE_CAPTURE`를 별도 artifact로 비교한다.
- [ ] raw extraction accuracy와 human-reviewed downstream 정확도를 분리한다.
- [ ] fixture 통과 수치를 제품 전체 성능 주장으로 사용하지 않는다.
- [ ] 실호출 전에는 모든 live metric을 `NOT_MEASURED`로 표시한다.

---

## 13. 아직 확인되지 않은 것

다음은 `UNVERIFIED_UPSTREAM`이며 실제 계정 smoke test가 필요하다.

- Studio Extract node가 `location_granularity="all"`을 어떤 설정으로 노출하는가
- repeating array item의 `additional_values` exact JSON shape
- Combined case에서 location이 원본 file identity를 충분히 보존하는가
- adapted XLSX의 sheet/page boundary와 Upstage page number 대응
- 병합·multiline cell의 word coordinate 범위
- optional field가 없을 때 key omission, `null`, empty string 중 무엇이 반복적으로 오는가
- chunking 이후 array item 순서와 중복 여부
- Studio export fields JSON의 정확한 import/export contract

이 항목을 확인하기 전에는 schema와 decoder example을 실제 응답이라고 부르지 않는다.

`validate_json_contract.py`는 direct IE와 pinned Agent의 `SUCCEEDED` 상태를 메모리 안의 합성 계약으로 positive-test하지만, 이 테스트는 상태기계·pointer 필드의 존재/형식·이중 JSON decode 검증일 뿐 Upstage `LIVE_CAPTURE`가 아니다. raw response에 대한 RFC 6901 pointer resolve는 아직 검증하지 않는다. repeating-array field provenance는 합성하지 않으며 실제 capture용 profile decoder가 생길 때까지 fail-closed다.

---

## 14. 공식 자료

- [Universal extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction)
- [Writing a schema](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema)
- [Location coordinates](https://console.upstage.ai/docs/capabilities/extract/location-coordinates)
- [Confidence](https://console.upstage.ai/docs/capabilities/extract/confidence)
- [Universal Extraction API](https://console.upstage.ai/api/information-extraction/universal-extraction)
- [Parse input requirements](https://console.upstage.ai/docs/capabilities/parse/input-requirements)
- [Understanding Document Parse output](https://console.upstage.ai/docs/capabilities/parse/understanding-output)
- [Document Parsing API](https://console.upstage.ai/api/parse/document-parsing)
- [Handling large documents](https://console.upstage.ai/docs/capabilities/parse/handling-large-documents)
- [Agents API](https://console.upstage.ai/docs/agents)
- [Agents Jobs](https://console.upstage.ai/docs/agents/jobs)
- [Create Job](https://console.upstage.ai/api/agents/jobs/create-job)
- [Retrieve Job](https://console.upstage.ai/api/agents/jobs/retrieve-job)
- [Studio Nodes](https://console.upstage.ai/docs/studio/key-features)
- [Studio Versions and deployment](https://console.upstage.ai/docs/studio/deployment)
- [Studio Run and review](https://console.upstage.ai/docs/studio/feedback-loop)

---

## 15. 다음 구현 순서

1. source adapter와 manifest를 먼저 구현한다.
2. 역할별 Upstage-facing schema를 작은 subset으로 고정한다.
3. 실제 API raw response를 역할별 1건씩 `LIVE_CAPTURE`로 저장한다.
4. double parser와 source locator packet을 fixture-driven으로 구현한다.
5. 사람 segment review gate를 통과한 값만 compiler에 보낸다.
6. 이후에만 cross-document linking과 verifier를 연결한다.

디자인 화면보다 먼저 확인할 핵심은 **“원본 위치를 잃지 않은 flat fact를 Upstage가 실제로 반환하고, 우리 decoder가 같은 strict envelope로 교환할 수 있는가”**다.
