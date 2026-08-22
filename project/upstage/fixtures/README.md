# Fixture inventory

| file | status | meaning |
|---|---|---|
| `cue-column-map.reference.json` | `SOURCE_MEASURED` | CSV header와 column별 data count를 그대로 계측한 candidate map |
| `cue-cell-packet.reference.json` | `SOURCE_MEASURED` | N#12 microphone source cell의 deterministic packet |
| `script-segment-manifest.reference.json` | `SOURCE_MEASURED` | 2,173-line source에서 관찰한 7개 segment 후보; 모두 `UNREVIEWED` |
| `cue-facts.expected.json` | `EXPECTED_GOLD` | CueFact schema 단위 테스트용 사람 작성 기대 payload |
| `script-facts.expected.json` | `EXPECTED_GOLD` | ScriptFact schema 단위 테스트용 사람 작성 기대 payload |
| `cue-exchange.expected.json` | `EXPECTED_GOLD` | Upstage live run이 아닌 app-envelope 기대 payload |
| `script-exchange.expected.json` | `EXPECTED_GOLD` | Upstage live run이 아닌 segment-bound app-envelope 기대 payload |

`LIVE_CAPTURE`는 아직 없다. 실제 Upstage 응답을 저장할 때 schema/input/request/raw-response hash, JSON pointer, returned model, config/run ID를 이 기대 fixture와 별도 artifact로 보관한다. stringified `additional_values_json_text`와 opaque `additional_values_decoded`는 exact round-trip으로 함께 보존하고, `provider_evidence.location_status`와 `confidence_status`는 서로 독립적으로 기록한다.

`validate_json_contract.py`는 direct IE와 pinned Agent의 성공 상태, raw response pointer, 이중 JSON decode를 메모리에서 합성해 strict branch를 positive-test한다. 실제 repeating-array `additional_values` 응답을 얻기 전에는 field mapping을 합성하지 않으며 `field_evidence=[]`로 닫는다. 이 값은 실제 provider 응답이나 정확도 증거가 아니다.
