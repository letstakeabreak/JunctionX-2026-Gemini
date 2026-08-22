#!/usr/bin/env python3
"""Checks for the STANDBY ↔ Upstage JSON contract fixtures.

This validator intentionally checks the small Upstage-supported schema subset
separately from the app-owned exchange JSON Schema. It also joins every gold
fact back to the exact reference CSV cell or script line.
"""

from __future__ import annotations

import csv
import copy
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
except ImportError:  # The source/fixture checks remain usable without dev deps.
    Draft202012Validator = None


ROOT = Path(__file__).resolve().parent
UPSTAGE = ROOT / "upstage"
FIXTURES = UPSTAGE / "fixtures"
DATA = ROOT / "data"

CUE_LOCATOR = re.compile(r"^cue:sheet0:r(?P<row>\d{4}):c(?P<column>\d{4})$")
SCRIPT_LOCATOR = re.compile(r"^script:line:(?P<line>\d{6})$")


class ContractError(AssertionError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def schema_item_properties(path: Path, top_level_array: str) -> set[str]:
    wrapper = load_json(path)
    require(wrapper.get("type") == "json_schema", f"{path.name}: response_format type")
    json_schema = wrapper.get("json_schema")
    require(isinstance(json_schema, dict), f"{path.name}: json_schema object")
    schema_name = json_schema.get("name")
    require(isinstance(schema_name, str) and 1 <= len(schema_name) <= 64,
            f"{path.name}: schema name length")
    require(re.fullmatch(r"[A-Za-z0-9_-]+", schema_name) is not None,
            f"{path.name}: schema name characters")
    schema = json_schema.get("schema")
    require(isinstance(schema, dict) and schema.get("type") == "object", f"{path.name}: root object")
    properties = schema.get("properties")
    require(isinstance(properties, dict), f"{path.name}: root properties")
    require(set(properties) == {top_level_array}, f"{path.name}: one role-specific top-level array")

    top_property = properties[top_level_array]
    require(top_property.get("type") == "array", f"{path.name}: {top_level_array} array")
    item = top_property.get("items")
    require(isinstance(item, dict) and item.get("type") == "object", f"{path.name}: array item object")
    item_properties = item.get("properties")
    require(isinstance(item_properties, dict) and item_properties, f"{path.name}: item properties")
    for key, value in item_properties.items():
        require(value.get("type") == "string", f"{path.name}: {key} must be scalar string")

    unsupported = {"required", "additionalProperties", "enum"}

    def walk(value: Any, inside_array: bool = False) -> None:
        if isinstance(value, dict):
            require(not (unsupported & set(value)), f"{path.name}: unverified schema keyword present")
            current_is_array = value.get("type") == "array"
            if inside_array:
                require(not current_is_array, f"{path.name}: nested array is not Upstage-safe")
            for key, child in value.items():
                walk(child, inside_array or (current_is_array and key == "items"))
        elif isinstance(value, list):
            for child in value:
                walk(child, inside_array)

    walk(schema)

    object_property_count = 0
    property_name_characters = 0

    def count_limits(value: Any) -> None:
        nonlocal object_property_count, property_name_characters
        if isinstance(value, dict):
            props = value.get("properties")
            if isinstance(props, dict):
                object_property_count += len(props)
                property_name_characters += sum(len(name) for name in props)
            for child in value.values():
                count_limits(child)
        elif isinstance(value, list):
            for child in value:
                count_limits(child)

    count_limits(schema)
    schema_characters = len(json.dumps(schema, ensure_ascii=False, separators=(",", ":")))
    require(object_property_count <= 100, f"{path.name}: sync object-property limit")
    require(schema_characters <= 15_000, f"{path.name}: sync schema-character limit")
    require(property_name_characters <= 10_000, f"{path.name}: property-name character limit")
    return set(item_properties)


def validate_fact_shape(payload: dict[str, Any], array_key: str, fields: set[str], filename: str) -> list[dict[str, str]]:
    require(set(payload) == {array_key}, f"{filename}: only {array_key} is allowed")
    facts = payload[array_key]
    require(isinstance(facts, list) and facts, f"{filename}: non-empty {array_key}")
    for index, fact in enumerate(facts):
        require(isinstance(fact, dict), f"{filename}[{index}]: object")
        require(set(fact) == fields, f"{filename}[{index}]: exact schema fields")
        for key, value in fact.items():
            require(isinstance(value, str), f"{filename}[{index}].{key}: string")
    return facts


def read_cue_rows() -> list[list[str]]:
    with (DATA / "reference-cuesheet.csv").open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.reader(handle))


def validate_cue_contract(fields: set[str]) -> None:
    source_path = DATA / "reference-cuesheet.csv"
    rows = read_cue_rows()
    require(len(rows) == 49, "cue source: 49 logical CSV records")
    require(all(len(row) == 17 for row in rows), "cue source: every logical record has 17 columns")

    data_rows = rows[3:]
    require(sum("\n" in cell for row in rows for cell in row) == 198,
            "cue source: 198 cells retain literal newline characters")
    require(sum("\n" in cell for row in data_rows for cell in row) == 196,
            "cue source: 196 data cells retain literal newline characters")
    require(sum("\n" in cell and not cell.strip() for row in rows for cell in row) == 4,
            "cue source: four whitespace-only newline cells are preserved")
    non_empty = [cell for row in data_rows for cell in row if cell.strip()]
    require(len(non_empty) == 360, "cue source: 360 non-empty data cells")
    require(
        sum(len([line for line in cell.splitlines() if line.strip()]) > 1 for cell in non_empty) == 170,
        "cue source: 170 cells contain multiple non-blank lines",
    )
    require(sum(not row[0].strip() for row in data_rows) == 13, "cue source: 13 continuation records")
    require(sum(len(re.findall(r"(?m)^[NS]#?\s*\d+", row[0])) for row in data_rows) == 30,
            "cue source: 30 numbered N/S markers")

    packet = load_json(FIXTURES / "cue-cell-packet.reference.json")
    column_map = load_json(FIXTURES / "cue-column-map.reference.json")
    require(packet["artifact_status"] == "SOURCE_MEASURED", "cue packet: source-measured label")
    require(column_map["artifact_status"] == "SOURCE_MEASURED", "cue column map: source-measured label")
    require(column_map["source_sha256"] == sha256(source_path), "cue column map: source hash")
    require(len(column_map["columns"]) == 17, "cue column map: all 17 columns")
    for expected_column, column in enumerate(column_map["columns"], start=1):
        require(column["column_number"] == expected_column, "cue column map: stable column order")
        require(column["header_group_cell_raw"] == rows[1][expected_column - 1],
                "cue column map: exact raw group header")
        require(column["header_lane_cell_raw"] == rows[2][expected_column - 1],
                "cue column map: exact raw lane header")
        require(column["populated_data_cell_count"] == sum(bool(row[expected_column - 1].strip()) for row in data_rows),
                "cue column map: populated cell count")
    candidate_columns = [column for column in column_map["columns"] if column["group_context_method"] == "FORWARD_FILL_CANDIDATE"]
    require([column["column_number"] for column in candidate_columns] == [3, 6, 8, 9, 10, 14],
            "cue column map: six merged-header candidates")
    require(sum(column["populated_data_cell_count"] for column in candidate_columns) == 122,
            "cue column map: 122 populated cells require reviewed group context")
    require(packet["source_sha256"] == sha256(source_path), "cue packet: source hash")
    require(packet["column_map_schema_version"] == column_map["schema_version"],
            "cue packet: column map lineage")
    match = CUE_LOCATOR.fullmatch(packet["source_locator_raw"])
    require(match is not None, "cue packet: canonical 1-based locator")
    row_number = int(match.group("row"))
    column_number = int(match.group("column"))
    require(packet["logical_record_number"] == row_number, "cue packet: row agrees with locator")
    require(packet["logical_column_number"] == column_number, "cue packet: column agrees with locator")
    require(packet["cell_text_raw"] == rows[row_number - 1][column_number - 1], "cue packet: lossless cell text")
    require(packet["section_cell_raw"] == rows[row_number - 1][0], "cue packet: explicit section cell")
    require(packet["department_group_raw"] == rows[1][column_number - 1], "cue packet: group header")
    require(packet["department_lane_raw"] == rows[2][column_number - 1], "cue packet: lane header")

    facts = validate_fact_shape(
        load_json(FIXTURES / "cue-facts.expected.json"),
        "cue_facts",
        fields,
        "cue-facts.expected.json",
    )
    require(len(facts) == 3, "cue gold: N#12 microphone cell must split into three facts")
    quote_offsets: list[int] = []
    for fact in facts:
        require(fact["source_locator_raw"] == packet["source_locator_raw"], "cue gold: packet locator copied")
        offset = packet["cell_text_raw"].find(fact["source_quote_raw"])
        require(offset >= 0, "cue gold: source quote is an exact contiguous cell substring")
        quote_offsets.append(offset)
    require(quote_offsets == sorted(quote_offsets), "cue gold: atomic facts retain source order")
    require([fact["operation_raw"] for fact in facts] == ["on", "on", "off"], "cue gold: on/on/off")
    require(facts[1]["unresolved_marker_raw"] == "??,??", "cue gold: unresolved marker preserved")


def validate_script_contract(fields: set[str]) -> None:
    source_path = DATA / "script-final.txt"
    lines = source_path.read_text(encoding="utf-8").splitlines()
    require(len(lines) == 2173, "script source: 2,173 logical lines")

    manifest = load_json(FIXTURES / "script-segment-manifest.reference.json")
    require(manifest["artifact_status"] == "SOURCE_MEASURED", "script manifest: source-measured label")
    require(manifest["sha256"] == sha256(source_path), "script manifest: source hash")
    require(manifest["logical_line_count"] == len(lines), "script manifest: logical line count")
    require(manifest["document_role"] == "SCRIPT", "script manifest: document role")
    segments = manifest["segments"]
    require(len(segments) == 7, "script manifest: seven observed candidate segments")
    expected_start = 1
    for segment in segments:
        require(segment["start_line"] == expected_start, "script manifest: no segment gap or overlap")
        require(segment["end_line"] >= segment["start_line"], "script manifest: valid range")
        require(segment["authority_status"] == "UNREVIEWED", "script manifest: no invented authority")
        label_line = segment.get("label_start_line")
        if isinstance(label_line, int):
            require(lines[label_line - 1] == segment["label_raw"], "script manifest: exact source label")
        expected_start = segment["end_line"] + 1
    require(expected_start == len(lines) + 1, "script manifest: ranges cover through final line")

    facts = validate_fact_shape(
        load_json(FIXTURES / "script-facts.expected.json"),
        "script_facts",
        fields,
        "script-facts.expected.json",
    )
    require(len(facts) == 4, "script gold: four reference facts")
    for fact in facts:
        start_match = SCRIPT_LOCATOR.fullmatch(fact["source_locator_start_raw"])
        end_match = SCRIPT_LOCATOR.fullmatch(fact["source_locator_end_raw"])
        require(start_match is not None and end_match is not None, "script gold: canonical line locator token")
        start = int(start_match.group("line"))
        end = int(end_match.group("line"))
        require(1 <= start <= end <= len(lines), "script gold: locator range")
        source_span = "\n".join(lines[start - 1:end])
        require(fact["source_quote_raw"] in source_span, "script gold: exact contiguous source quote")

    by_line = {int(SCRIPT_LOCATOR.fullmatch(fact["source_locator_start_raw"]).group("line")): fact for fact in facts}
    require(by_line[35]["duration_raw"] == "2분32초", "script gold: declared duration preserved")
    require(by_line[35]["cumulative_time_raw"] == "5분28초",
            "script gold: declared cumulative time preserved")
    require(by_line[48]["speaker_raw"] == "우현", "script gold: speaker preserved")
    require(by_line[48]["stage_direction_raw"] == "(수건을 털다 깜짝 놀라며)",
            "script gold: inline stage direction preserved")
    require(by_line[48]["prop_raw"] == "수건", "script gold: inline prop preserved")
    require(by_line[649]["unresolved_marker_raw"] == "분50초 (누적 분 초)",
            "script gold: incomplete timing stays unresolved")
    require(by_line[654]["movement_or_presence_raw"] == "허둥지둥 뛰어 나온다",
            "script gold: movement text preserved")
    require(by_line[654]["costume_state_raw"] == "우주비행사 유니폼을 갖춰 입은 채",
            "script gold: costume text preserved")
    require(by_line[654]["prop_raw"] == "이전에 아빠에게 선물로 받은 가방",
            "script gold: prop text preserved")


def validate_cue_exchange_fixture(cue_fields: set[str]) -> None:
    fixture = load_json(FIXTURES / "cue-exchange.expected.json")
    expected_payload = load_json(FIXTURES / "cue-facts.expected.json")
    require(fixture["contract_version"] == "standby.exchange.v1", "exchange fixture: contract version")
    require(fixture["source"]["document_role"] == "MASTER_CUE", "exchange fixture: source role")
    require(fixture["source"]["sha256"] == sha256(DATA / "reference-cuesheet.csv"),
            "exchange fixture: source hash")
    require(fixture["source_scope"] == {"authority_status": "NOT_APPLICABLE", "segments": []},
            "exchange fixture: cue source scope")
    extraction = fixture["extraction"]
    require(extraction["provider_run_status"] == "EXPECTED_GOLD",
            "exchange fixture: not presented as live output")
    require(extraction["decode_status"] == "NOT_RUN",
            "exchange fixture: expected payload was not decoded from a provider run")
    require(extraction["input_artifact"]["status"] == "NOT_BUILT",
            "exchange fixture: no adapted chunk is fabricated")
    require(extraction["request_schema_sha256"] == sha256(UPSTAGE / "cue-facts.schema.json"),
            "exchange fixture: cue request schema hash")
    require(extraction["decoder_version"] is None,
            "exchange fixture: no decoder run is fabricated")
    require(extraction["raw_response_ref"] is None and extraction["raw_response_sha256"] is None,
            "exchange fixture: no raw provider response is fabricated")
    require(extraction["input_artifact"]["chunk_index"] <= extraction["input_artifact"]["chunk_count"],
            "exchange fixture: valid chunk index")
    require(extraction["input_artifact"]["chunk_set_id"],
            "exchange fixture: chunk set identity")
    require(extraction["input_artifact"]["locator_start"] == "cue:sheet0:r0046:c0013",
            "exchange fixture: chunk locator start")
    require(extraction["returned_model"] is None and extraction["run_id"] is None,
            "exchange fixture: no invented provider run")
    require(json.loads(extraction["response_content_json_text"]) == expected_payload,
            "exchange fixture: raw content text round-trips to expected payload")
    require(extraction["additional_values_json_text"] is None,
            "exchange fixture: no invented location payload")
    require(extraction["additional_values_decoded"] is None,
            "exchange fixture: no invented decoded additional-values payload")
    require(extraction["additional_values_contract_status"] == "NOT_OBSERVED"
            and extraction["additional_values_decoder_version"] is None,
            "exchange fixture: unobserved additional-values mapping stays gated")

    cue_raw_fields = cue_fields - {"source_locator_raw", "source_quote_raw"}
    expected_facts = expected_payload["cue_facts"]
    records = fixture["records"]
    require(len(records) == len(expected_facts), "exchange fixture: every gold fact materialized once")
    for record, fact in zip(records, expected_facts):
        require(record["record_type"] == "CUE_FACT", "exchange fixture: record type")
        require(record["source_segment_id"] is None, "exchange fixture: cue has no script segment")
        require(record["review_status"] == "UNREVIEWED", "exchange fixture: no invented human review")
        require(record["source_locator"]["locator_start"] == fact["source_locator_raw"],
                "exchange fixture: locator start moved out of model raw fields")
        require(record["source_locator"]["locator_end"] == fact["source_locator_raw"],
                "exchange fixture: cue locator range remains one cell")
        require(record["source_locator"]["source_quote_raw"] == fact["source_quote_raw"],
                "exchange fixture: source quote moved out without change")
        locator_match = CUE_LOCATOR.fullmatch(record["source_locator"]["locator_start"])
        require(locator_match is not None, "exchange fixture: canonical cue locator")
        require(record["source_locator"]["row"] == int(locator_match.group("row"))
                and record["source_locator"]["column"] == int(locator_match.group("column")),
                "exchange fixture: cue row/column agree with locator token")
        require(set(record["raw_fields"]) == cue_raw_fields, "exchange fixture: exact cue raw fields")
        for key in cue_raw_fields:
            require(record["raw_fields"][key] == fact[key], f"exchange fixture: raw field {key}")
        evidence = record["provider_evidence"]
        require(evidence["location_status"] == "NOT_OBSERVED"
                and evidence["confidence_status"] == "NOT_OBSERVED",
                "exchange fixture: provider evidence not fabricated")
        require(evidence["location_quality"] == "NATIVE_ONLY"
                and evidence["field_mapping_status"] == "NOT_OBSERVED"
                and evidence["field_evidence"] == [],
                "exchange fixture: expected gold has only native evidence")
        require(evidence["coordinates"] == [] and evidence["word_coordinates"] == [],
                "exchange fixture: no fabricated coordinates")


def validate_script_exchange_fixture(script_fields: set[str]) -> None:
    fixture = load_json(FIXTURES / "script-exchange.expected.json")
    expected_payload = load_json(FIXTURES / "script-facts.expected.json")
    source_path = DATA / "script-final.txt"
    source_lines = source_path.read_text(encoding="utf-8").splitlines()
    manifest = load_json(FIXTURES / "script-segment-manifest.reference.json")
    expected_fact = next(
        fact for fact in expected_payload["script_facts"]
        if fact["source_locator_start_raw"] == "script:line:000654"
    )

    require(fixture["contract_version"] == "standby.exchange.v1",
            "script exchange fixture: contract version")
    require(fixture["source"]["document_role"] == "SCRIPT",
            "script exchange fixture: source role")
    require(fixture["source"]["sha256"] == sha256(source_path),
            "script exchange fixture: source hash")
    require(fixture["source"]["native_locator_kind"] == "LINE_RANGE",
            "script exchange fixture: native locator kind")

    scope = fixture["source_scope"]
    require(scope["authority_status"] == "UNREVIEWED",
            "script exchange fixture: no invented segment authority")
    require(len(scope["segments"]) == 1, "script exchange fixture: one explicit segment scope")
    scope_segment = scope["segments"][0]
    manifest_segment = next(
        segment for segment in manifest["segments"]
        if segment["source_segment_id"] == scope_segment["source_segment_id"]
    )
    require(scope_segment["start_locator"] == f"script:line:{manifest_segment['start_line']:06d}",
            "script exchange fixture: segment start joins manifest")
    require(scope_segment["end_locator"] == f"script:line:{manifest_segment['end_line']:06d}",
            "script exchange fixture: segment end joins manifest")
    require(scope_segment["segment_kind"] == manifest_segment["segment_kind_candidate"],
            "script exchange fixture: segment kind joins manifest")
    require(scope_segment["label_raw"] == manifest_segment["label_raw"],
            "script exchange fixture: segment label joins manifest")
    require(scope_segment["authority_status"] == manifest_segment["authority_status"],
            "script exchange fixture: segment authority joins manifest")

    extraction = fixture["extraction"]
    require(extraction["provider_run_status"] == "EXPECTED_GOLD",
            "script exchange fixture: not presented as live output")
    require(extraction["decode_status"] == "NOT_RUN",
            "script exchange fixture: expected payload was not decoded from a provider run")
    require(extraction["input_artifact"]["status"] == "NOT_BUILT",
            "script exchange fixture: no adapted chunk is fabricated")
    require(extraction["request_schema_sha256"] == sha256(UPSTAGE / "script-facts.schema.json"),
            "script exchange fixture: script request schema hash")
    require(extraction["decoder_version"] is None,
            "script exchange fixture: no decoder run is fabricated")
    require(extraction["raw_response_ref"] is None and extraction["raw_response_sha256"] is None,
            "script exchange fixture: no raw provider response is fabricated")
    require(extraction["input_artifact"]["chunk_index"] <= extraction["input_artifact"]["chunk_count"],
            "script exchange fixture: valid chunk index")
    require(extraction["input_artifact"]["chunk_set_id"],
            "script exchange fixture: chunk set identity")
    require(extraction["returned_model"] is None and extraction["run_id"] is None,
            "script exchange fixture: no invented provider run")
    require(json.loads(extraction["response_content_json_text"]) == {"script_facts": [expected_fact]},
            "script exchange fixture: raw content text round-trips to selected expected fact")
    require(extraction["additional_values_json_text"] is None,
            "script exchange fixture: no invented location payload")

    records = fixture["records"]
    require(len(records) == 1, "script exchange fixture: one expected fact materialized")
    record = records[0]
    require(record["record_type"] == "SCRIPT_FACT", "script exchange fixture: record type")
    require(record["source_segment_id"] == scope_segment["source_segment_id"],
            "script exchange fixture: record joins explicit segment")
    require(record["review_status"] == "UNREVIEWED",
            "script exchange fixture: no invented human review")

    locator = record["source_locator"]
    start_match = SCRIPT_LOCATOR.fullmatch(locator["locator_start"])
    end_match = SCRIPT_LOCATOR.fullmatch(locator["locator_end"])
    require(start_match is not None and end_match is not None,
            "script exchange fixture: canonical line locator tokens")
    start_line = int(start_match.group("line"))
    end_line = int(end_match.group("line"))
    require(locator["line_start"] == start_line and locator["line_end"] == end_line,
            "script exchange fixture: numeric lines agree with locator tokens")
    require(manifest_segment["start_line"] <= start_line <= end_line <= manifest_segment["end_line"],
            "script exchange fixture: fact stays inside declared segment")
    require(locator["source_quote_raw"] in "\n".join(source_lines[start_line - 1:end_line]),
            "script exchange fixture: exact quote joins source line")
    require(locator["locator_start"] == expected_fact["source_locator_start_raw"],
            "script exchange fixture: locator start moved out without change")
    require(locator["locator_end"] == expected_fact["source_locator_end_raw"],
            "script exchange fixture: locator end moved out without change")
    require(locator["source_quote_raw"] == expected_fact["source_quote_raw"],
            "script exchange fixture: source quote moved out without change")
    require(extraction["input_artifact"]["locator_start"] == locator["locator_start"]
            and extraction["input_artifact"]["locator_end"] == locator["locator_end"],
            "script exchange fixture: chunk range covers selected fact")

    script_raw_fields = script_fields - {
        "source_locator_start_raw", "source_locator_end_raw", "source_quote_raw"
    }
    require(set(record["raw_fields"]) == script_raw_fields,
            "script exchange fixture: exact script raw fields")
    for key in script_raw_fields:
        require(record["raw_fields"][key] == expected_fact[key],
                f"script exchange fixture: raw field {key}")
    evidence = record["provider_evidence"]
    require(evidence["location_status"] == "NOT_OBSERVED"
            and evidence["confidence_status"] == "NOT_OBSERVED",
            "script exchange fixture: provider evidence not fabricated")
    require(evidence["location_quality"] == "NATIVE_ONLY"
            and evidence["field_mapping_status"] == "NOT_OBSERVED"
            and evidence["field_evidence"] == [],
            "script exchange fixture: expected gold has only native evidence")
    require(evidence["coordinates"] == [] and evidence["word_coordinates"] == [],
            "script exchange fixture: no fabricated coordinates")
    require(extraction["additional_values_contract_status"] == "NOT_OBSERVED"
            and extraction["additional_values_decoder_version"] is None,
            "script exchange fixture: unobserved additional-values mapping stays gated")
    require(extraction["additional_values_decoded"] is None,
            "script exchange fixture: no invented decoded additional-values payload")


def validate_exchange_semantics(
    fixture: dict[str, Any],
    cue_fields: set[str],
    script_fields: set[str],
) -> None:
    role = fixture["source"]["document_role"]
    extraction = fixture["extraction"]
    artifact = extraction["input_artifact"]
    records = fixture["records"]

    require(artifact["chunk_index"] <= artifact["chunk_count"],
            "exchange semantics: chunk_index must not exceed chunk_count")
    require(len({record["record_id"] for record in records}) == len(records),
            "exchange semantics: record IDs must be unique")
    require(len({record["source_locator"]["locator_id"] for record in records}) == len(records),
            "exchange semantics: locator IDs must be unique")

    additional_values: Any | None = None
    additional_values_text = extraction["additional_values_json_text"]
    if additional_values_text is not None and extraction["decode_status"] == "SUCCEEDED":
        require(isinstance(additional_values_text, str) and additional_values_text,
                "exchange semantics: additional-values text must be a non-empty JSON string")
        try:
            additional_values = json.loads(additional_values_text)
        except json.JSONDecodeError as error:
            raise ContractError(
                f"exchange semantics: additional-values JSON decode failed: {error.msg}"
            ) from error
        require(isinstance(additional_values, dict),
                "exchange semantics: decoded additional-values must be an object")
        require(extraction["additional_values_decoded"] == additional_values,
                "exchange semantics: decoded additional-values must round-trip from raw text")

    for record in records:
        raw_record_evidence = record["provider_evidence"]["raw_additional_values_json_text"]
        if raw_record_evidence is not None:
            require(raw_record_evidence == additional_values_text,
                    "exchange semantics: record evidence must preserve extraction additional-values text")

    if extraction["additional_values_contract_status"] == "LIVE_OBSERVED":
        raise ContractError(
            "exchange semantics: LIVE_OBSERVED additional-values profile requires a real "
            "Upstage capture and an implemented field-mapping decoder"
        )

    decode_expected_payload = (
        extraction["provider_run_status"] == "EXPECTED_GOLD"
        or extraction["decode_status"] == "SUCCEEDED"
    )
    payload: dict[str, Any] | None = None
    if decode_expected_payload:
        content = extraction["response_content_json_text"]
        require(isinstance(content, str) and content,
                "exchange semantics: decodable state requires content JSON text")
        try:
            payload = json.loads(content)
        except json.JSONDecodeError as error:
            raise ContractError(f"exchange semantics: content JSON decode failed: {error.msg}") from error
        require(isinstance(payload, dict), "exchange semantics: decoded content must be an object")

    if role == "MASTER_CUE":
        require(extraction["request_schema_name"] == "standby_cue_facts_v1",
                "exchange semantics: cue request schema name")
        require(extraction["request_schema_sha256"] == sha256(UPSTAGE / "cue-facts.schema.json"),
                "exchange semantics: cue request schema hash")
        chunk_start = CUE_LOCATOR.fullmatch(artifact["locator_start"])
        chunk_end = CUE_LOCATOR.fullmatch(artifact["locator_end"])
        require(chunk_start is not None and chunk_end is not None,
                "exchange semantics: cue chunk locators")
        chunk_start_key = (int(chunk_start.group("row")), int(chunk_start.group("column")))
        chunk_end_key = (int(chunk_end.group("row")), int(chunk_end.group("column")))
        require(chunk_start_key <= chunk_end_key, "exchange semantics: cue chunk locator order")

        projected_facts: list[dict[str, Any]] = []
        cue_raw_fields = cue_fields - {"source_locator_raw", "source_quote_raw"}
        for record_index, record in enumerate(records):
            locator = record["source_locator"]
            start_match = CUE_LOCATOR.fullmatch(locator["locator_start"])
            end_match = CUE_LOCATOR.fullmatch(locator["locator_end"])
            require(start_match is not None and end_match is not None,
                    "exchange semantics: cue record locators")
            start_key = (int(start_match.group("row")), int(start_match.group("column")))
            end_key = (int(end_match.group("row")), int(end_match.group("column")))
            require(start_key == end_key, "exchange semantics: CueFact must point to one cell")
            require(chunk_start_key <= start_key <= chunk_end_key,
                    "exchange semantics: CueFact must stay inside chunk range")
            require(locator["row"] == start_key[0] and locator["column"] == start_key[1],
                    "exchange semantics: cue locator token and numeric coordinates")
            require(set(record["raw_fields"]) == cue_raw_fields,
                    "exchange semantics: exact cue raw field set")
            for field_evidence in record["provider_evidence"]["field_evidence"]:
                path_parts = field_evidence["field_path_json_pointer"].split("/")
                require(
                    len(path_parts) == 4
                    and path_parts[0] == ""
                    and path_parts[1] == "cue_facts"
                    and path_parts[2] == str(record_index)
                    and path_parts[3] in cue_fields,
                    "exchange semantics: cue field evidence JSON Pointer",
                )
            projected_facts.append({
                **record["raw_fields"],
                "source_locator_raw": locator["locator_start"],
                "source_quote_raw": locator["source_quote_raw"],
            })

        if payload is not None:
            require(set(payload) == {"cue_facts"},
                    "exchange semantics: cue content has one role-specific array")
            require(payload["cue_facts"] == projected_facts,
                    "exchange semantics: cue records losslessly project decoded facts")
        return

    if role == "SCRIPT":
        require(extraction["request_schema_name"] == "standby_script_facts_v1",
                "exchange semantics: script request schema name")
        require(extraction["request_schema_sha256"] == sha256(UPSTAGE / "script-facts.schema.json"),
                "exchange semantics: script request schema hash")
        chunk_start = SCRIPT_LOCATOR.fullmatch(artifact["locator_start"])
        chunk_end = SCRIPT_LOCATOR.fullmatch(artifact["locator_end"])
        require(chunk_start is not None and chunk_end is not None,
                "exchange semantics: script chunk locators")
        chunk_start_line = int(chunk_start.group("line"))
        chunk_end_line = int(chunk_end.group("line"))
        require(chunk_start_line <= chunk_end_line, "exchange semantics: script chunk locator order")

        segment_ranges: dict[str, tuple[int, int]] = {}
        for segment in fixture["source_scope"]["segments"]:
            require(segment["source_segment_id"] not in segment_ranges,
                    "exchange semantics: source segment IDs must be unique")
            segment_start = SCRIPT_LOCATOR.fullmatch(segment["start_locator"])
            segment_end = SCRIPT_LOCATOR.fullmatch(segment["end_locator"])
            require(segment_start is not None and segment_end is not None,
                    "exchange semantics: script segment locators")
            start_line = int(segment_start.group("line"))
            end_line = int(segment_end.group("line"))
            require(start_line <= end_line, "exchange semantics: script segment locator order")
            segment_ranges[segment["source_segment_id"]] = (start_line, end_line)

        projected_facts = []
        script_raw_fields = script_fields - {
            "source_locator_start_raw", "source_locator_end_raw", "source_quote_raw"
        }
        for record_index, record in enumerate(records):
            segment_id = record["source_segment_id"]
            require(segment_id in segment_ranges,
                    "exchange semantics: ScriptFact source_segment_id must belong to scope")
            locator = record["source_locator"]
            start_match = SCRIPT_LOCATOR.fullmatch(locator["locator_start"])
            end_match = SCRIPT_LOCATOR.fullmatch(locator["locator_end"])
            require(start_match is not None and end_match is not None,
                    "exchange semantics: script record locators")
            start_line = int(start_match.group("line"))
            end_line = int(end_match.group("line"))
            require(start_line <= end_line, "exchange semantics: ScriptFact locator order")
            require(locator["line_start"] == start_line and locator["line_end"] == end_line,
                    "exchange semantics: script locator token and numeric lines")
            require(chunk_start_line <= start_line <= end_line <= chunk_end_line,
                    "exchange semantics: ScriptFact must stay inside chunk range")
            segment_start, segment_end = segment_ranges[segment_id]
            require(segment_start <= start_line <= end_line <= segment_end,
                    "exchange semantics: ScriptFact must stay inside declared segment")
            require(set(record["raw_fields"]) == script_raw_fields,
                    "exchange semantics: exact script raw field set")
            for field_evidence in record["provider_evidence"]["field_evidence"]:
                path_parts = field_evidence["field_path_json_pointer"].split("/")
                require(
                    len(path_parts) == 4
                    and path_parts[0] == ""
                    and path_parts[1] == "script_facts"
                    and path_parts[2] == str(record_index)
                    and path_parts[3] in script_fields,
                    "exchange semantics: script field evidence JSON Pointer",
                )
            projected_facts.append({
                "source_locator_start_raw": locator["locator_start"],
                "source_locator_end_raw": locator["locator_end"],
                **record["raw_fields"],
                "source_quote_raw": locator["source_quote_raw"],
            })

        if payload is not None:
            require(set(payload) == {"script_facts"},
                    "exchange semantics: script content has one role-specific array")
            require(payload["script_facts"] == projected_facts,
                    "exchange semantics: script records losslessly project decoded facts")
        return

    raise ContractError(
        "exchange semantics: STAGE_SPEC is intentionally unsupported until stage-facts.schema.json exists"
    )


def validate_exchange_json_schema(
    envelope: dict[str, Any],
    cue_fields: set[str],
    script_fields: set[str],
) -> bool:
    if Draft202012Validator is None:
        raise ContractError(
            "strict Draft 2020-12 validation dependency missing; "
            "run `python3 -m pip install -r project/requirements-dev.txt`"
        )

    Draft202012Validator.check_schema(envelope)
    validator = Draft202012Validator(envelope)
    cue_fixture = load_json(FIXTURES / "cue-exchange.expected.json")
    script_fixture = load_json(FIXTURES / "script-exchange.expected.json")

    for name, fixture in (
        ("cue-exchange.expected.json", cue_fixture),
        ("script-exchange.expected.json", script_fixture),
    ):
        errors = sorted(validator.iter_errors(fixture), key=lambda error: list(error.absolute_path))
        require(not errors, f"{name}: Draft 2020-12 validation: {errors[0].message if errors else ''}")
        validate_exchange_semantics(fixture, cue_fields, script_fields)

    negative_cases: list[tuple[str, dict[str, Any]]] = []

    role_mismatch = copy.deepcopy(cue_fixture)
    role_mismatch["source"]["document_role"] = "SCRIPT"
    negative_cases.append(("document role and record/locator coupling", role_mismatch))

    unpinned_agent = copy.deepcopy(cue_fixture)
    unpinned_agent["extraction"]["surface"] = "STUDIO_AGENT"
    unpinned_agent["extraction"]["agent_id"] = "agent-demo"
    unpinned_agent["extraction"]["request_options"]["include"] = ["all"]
    negative_cases.append(("Studio Agent config pin", unpinned_agent))

    missing_line = copy.deepcopy(script_fixture)
    missing_line["records"][0]["source_locator"]["line_start"] = None
    negative_cases.append(("LINE_RANGE numeric locator", missing_line))

    missing_script_scope = copy.deepcopy(script_fixture)
    missing_script_scope["source_scope"] = {"authority_status": "NOT_APPLICABLE", "segments": []}
    negative_cases.append(("SCRIPT segment authority gate", missing_script_scope))

    mixed_segment_authority = copy.deepcopy(script_fixture)
    mixed_segment_authority["source_scope"]["segments"][0]["authority_status"] = "REVIEWED"
    negative_cases.append(("aggregate and segment authority consistency", mixed_segment_authority))

    live_without_provenance = copy.deepcopy(cue_fixture)
    live_without_provenance["extraction"]["provider_run_status"] = "SUCCEEDED"
    negative_cases.append(("live success provenance", live_without_provenance))

    agents_option_on_direct = copy.deepcopy(cue_fixture)
    agents_option_on_direct["extraction"]["request_options"]["include"] = ["all"]
    negative_cases.append(("Agents-only include on direct IE", agents_option_on_direct))

    additional_values_without_pointer = copy.deepcopy(cue_fixture)
    additional_values_without_pointer["extraction"]["additional_values_json_text"] = "{}"
    negative_cases.append(("additional-values JSON pointer", additional_values_without_pointer))

    not_run_with_decoded_values = copy.deepcopy(cue_fixture)
    not_run_extraction = not_run_with_decoded_values["extraction"]
    not_run_extraction["provider_run_status"] = "FAILED"
    not_run_extraction["provider_error_code"] = "UPSTREAM_FAILED"
    not_run_extraction["request_options"]["raw_request_sha256"] = "9" * 64
    not_run_extraction["additional_values_json_pointer"] = "/error/additional_values"
    not_run_extraction["additional_values_json_text"] = "{}"
    not_run_extraction["additional_values_decoded"] = {}
    not_run_with_decoded_values["records"] = []
    negative_cases.append(("NOT_RUN decoded additional-values", not_run_with_decoded_values))

    for name, invalid_fixture in negative_cases:
        require(not validator.is_valid(invalid_fixture),
                f"exchange schema must reject invalid {name}")

    semantic_negative_cases: list[tuple[str, dict[str, Any]]] = []

    impossible_chunk_index = copy.deepcopy(cue_fixture)
    impossible_chunk_index["extraction"]["input_artifact"]["chunk_index"] = 2
    semantic_negative_cases.append(("chunk index/count order", impossible_chunk_index))

    unknown_segment = copy.deepcopy(script_fixture)
    unknown_segment["records"][0]["source_segment_id"] = "seg-script-not-in-scope"
    semantic_negative_cases.append(("ScriptFact segment membership", unknown_segment))

    locator_number_drift = copy.deepcopy(cue_fixture)
    locator_number_drift["records"][0]["source_locator"]["row"] = 47
    semantic_negative_cases.append(("locator token/numeric agreement", locator_number_drift))

    decoded_record_drift = copy.deepcopy(cue_fixture)
    decoded_record_drift["records"][0]["raw_fields"]["operation_raw"] = "mute"
    semantic_negative_cases.append(("decoded payload/record lossless projection", decoded_record_drift))

    for name, invalid_fixture in semantic_negative_cases:
        require(validator.is_valid(invalid_fixture),
                f"semantic negative case must remain schema-valid: {name}")
        try:
            validate_exchange_semantics(invalid_fixture, cue_fields, script_fields)
        except ContractError:
            pass
        else:
            raise ContractError(f"semantic validator must reject invalid {name}")

    simulated_direct_success = copy.deepcopy(cue_fixture)
    simulated_extraction = simulated_direct_success["extraction"]
    simulated_extraction.update({
        "provider_run_status": "SUCCEEDED",
        "provider_error_code": None,
        "provider_error_message_raw": None,
        "decode_status": "SUCCEEDED",
        "decode_error_code": None,
        "decoder_version": "contract-test-decoder-v1",
        "returned_model": "information-extract",
        "run_id": "simulated_direct_response_id",
        "raw_response_ref": "memory://contract-test/direct-response.json",
        "raw_response_sha256": "1" * 64,
        "response_content_json_pointer": "/choices/0/message/content",
        "additional_values_json_pointer": "/choices/0/message/tool_calls/0/function/arguments",
        "additional_values_json_text": "{}",
        "additional_values_decoded": {},
    })
    simulated_extraction["request_options"]["raw_request_sha256"] = "2" * 64
    simulated_extraction["input_artifact"].update({
        "status": "READY",
        "adapter_version": "contract-test-adapter-v1",
        "adapted_filename": "simulated-cue-packet.xlsx",
        "adapted_sha256": "3" * 64,
        "manifest_sha256": "4" * 64,
        "manifest_ref": "memory://contract-test/cue-manifest.json",
        "page_start": 1,
        "page_end": 1,
    })
    for record in simulated_direct_success["records"]:
        record["provider_evidence"].update({
            "location_status": "MISSING",
            "confidence_status": "MISSING",
            "location_quality": "NATIVE_ONLY",
            "field_mapping_status": "MISSING",
            "field_evidence": [],
            "page": None,
            "coordinates": [],
            "word_coordinates": [],
            "confidence_raw": None,
            "raw_additional_values_json_text": "{}",
        })

    forged_provider_evidence = copy.deepcopy(simulated_direct_success)
    forged_provider_evidence["records"][0]["provider_evidence"].update({
        "location_status": "AVAILABLE",
        "confidence_status": "AVAILABLE",
        "location_quality": "NATIVE_AND_ELEMENT_BOX",
        "page": 1,
        "coordinates": [
            {"x": 0.10, "y": 0.20},
            {"x": 0.30, "y": 0.20},
            {"x": 0.30, "y": 0.25},
            {"x": 0.10, "y": 0.25},
        ],
        "word_coordinates": [],
        "confidence_raw": "high",
    })
    require(not validator.is_valid(forged_provider_evidence),
            "NOT_OBSERVED additional-values contract must reject forged provider evidence")

    simulated_agent_success = copy.deepcopy(simulated_direct_success)
    agent_extraction = simulated_agent_success["extraction"]
    agent_extraction.update({
        "surface": "STUDIO_AGENT",
        "agent_id": "agt_contract_test",
        "config_id": "cfg_contract_test_pinned",
        "returned_model": "agt_contract_test",
        "run_id": "simulated_agent_job_id",
        "raw_response_ref": "memory://contract-test/agent-response.json",
        "response_content_json_pointer": "/output/1/content/0/text",
        "additional_values_json_pointer": "/output/1/content/0/additional_values",
    })
    agent_extraction["request_options"]["include"] = ["all"]
    agent_extraction["extract_settings"] = {
        "source": "NOT_OBSERVED",
        "location": None,
        "location_granularity": None,
        "confidence": None,
        "node_config_snapshot_ref": None,
        "node_config_snapshot_sha256": None,
    }
    agent_extraction["input_artifact"]["provider_file_id"] = "file_contract_test"

    malformed_additional_values = copy.deepcopy(simulated_direct_success)
    malformed_additional_values["extraction"]["additional_values_json_text"] = "{"
    for record in malformed_additional_values["records"]:
        record["provider_evidence"]["raw_additional_values_json_text"] = "{"
    require(validator.is_valid(malformed_additional_values),
            "malformed additional-values case must remain schema-valid")
    try:
        validate_exchange_semantics(malformed_additional_values, cue_fields, script_fields)
    except ContractError:
        pass
    else:
        raise ContractError("semantic validator must reject malformed additional-values JSON")

    decoded_additional_values_drift = copy.deepcopy(simulated_direct_success)
    decoded_additional_values_drift["extraction"]["additional_values_decoded"] = {
        "unexpected": True
    }
    require(validator.is_valid(decoded_additional_values_drift),
            "decoded additional-values drift case must remain schema-valid")
    try:
        validate_exchange_semantics(decoded_additional_values_drift, cue_fields, script_fields)
    except ContractError:
        pass
    else:
        raise ContractError("semantic validator must reject decoded additional-values drift")

    simulated_decode_failure = copy.deepcopy(simulated_direct_success)
    failed_extraction = simulated_decode_failure["extraction"]
    failed_extraction["decode_status"] = "FAILED"
    failed_extraction["decode_error_code"] = "DECODE_FAILED"
    failed_extraction["additional_values_json_text"] = "{"
    failed_extraction["additional_values_decoded"] = None
    simulated_decode_failure["records"] = []
    errors = sorted(
        validator.iter_errors(simulated_decode_failure),
        key=lambda error: list(error.absolute_path),
    )
    require(not errors,
            f"simulated decode-failure contract: {errors[0].message if errors else ''}")
    validate_exchange_semantics(simulated_decode_failure, cue_fields, script_fields)

    for name, simulated_fixture in (
        ("direct Information Extract", simulated_direct_success),
        ("pinned Studio Agent", simulated_agent_success),
    ):
        errors = sorted(validator.iter_errors(simulated_fixture), key=lambda error: list(error.absolute_path))
        require(not errors,
                f"simulated {name} success contract: {errors[0].message if errors else ''}")
        validate_exchange_semantics(simulated_fixture, cue_fields, script_fields)

    print(
        "PASS: Two in-memory simulated-success contracts cover direct/Agent state, pinned config, pointer-field presence/format, and independent JSON decoding; they are not LIVE_CAPTURE."
    )
    print("PASS: Malformed additional-values JSON is rejected; field mapping remains gated until LIVE_CAPTURE.")
    print("PASS: NOT_OBSERVED rejects forged provider coordinates and confidence.")
    print("PASS: A decode-failure contract preserves malformed raw additional-values with DECODE_FAILED and zero records.")

    return True


def main() -> int:
    cue_fields = schema_item_properties(UPSTAGE / "cue-facts.schema.json", "cue_facts")
    script_fields = schema_item_properties(UPSTAGE / "script-facts.schema.json", "script_facts")
    validate_cue_contract(cue_fields)
    validate_script_contract(script_fields)
    validate_cue_exchange_fixture(cue_fields)
    validate_script_exchange_fixture(script_fields)

    envelope = load_json(UPSTAGE / "exchange-envelope.schema.json")
    require(envelope.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
            "exchange envelope: JSON Schema 2020-12")
    require(envelope.get("additionalProperties") is False, "exchange envelope: strict app-owned contract")
    strict_schema_checked = validate_exchange_json_schema(envelope, cue_fields, script_fields)

    if strict_schema_checked:
        print("PASS: Draft 2020-12 accepts both exchange fixtures and rejects nine invalid role/state/provenance cases.")
        print("PASS: Semantic validation rejects six schema-valid chunk/segment/locator/decoded/additional-values drifts.")
    print("PASS: Upstage schemas, source-measured manifests, gold facts, exchange joins, locators, and hashes are consistent.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ContractError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
