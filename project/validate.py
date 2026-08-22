#!/usr/bin/env python3
"""
STANDBY — 큐시트 정적 검증기 (프로토타입)

    python3 validate.py data/reference-cuesheet.csv

이 스크립트는 Upstage Studio가 구조화한 결과 뒤에서 실행할 탐색용 규칙을
로컬 CSV로 먼저 실험한 것이다. 현재 공개 Studio에는 별도 Validate 실행 노드가 없다.
실제 제품에서는:

    Parse   → 종이/PDF 큐시트를 표 구조로 복원
    Extract → 셀 자연어에서 (대상, 동작, 시점)을 정규화        ← 아래 ALIASES를 대체
    App code→ 검증된 CueFact에 결정론적 규칙을 실행
    Instruct→ 리포트를 무대감독용 언어로 서술

아래 ALIASES/CAST 하드코딩은 Extract가 공통 CueFact를 만들어야 하는 이유다.
공연마다 소품 이름도 배우 이름도 다르므로 규칙은 재사용되지만 사전은 재사용되지 않는다.

주의: R1~R6 출력은 ground truth가 아니라 가설이다. 특히 문맥 열을 보지 않는 상태머신,
임의 시간 임계값, 부분문자열 집계는 사람 확인 없이 실제 결함으로 단정하면 안 된다.
"""

import csv
import re
import sys
from collections import defaultdict

# ─── 큐시트 열 배치 (레퍼런스 시트 기준) ────────────────────────────
COLS = {
    "마커": 0, "무대_상수": 1, "무대_하수": 2, "이동": 3,
    "소품_상수": 4, "소품_하수": 5,
    "환복시간": 6, "의상_연기자": 7, "의상_여": 8, "의상_남": 9,
    "기타": 10, "조명": 11, "음향": 12, "사운드": 13,
    "반주": 14, "빔프로젝터": 15, "프롬프터": 16,
}
DEPT_COLS = [1, 2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16]
HEADER_ROWS = 3

# ─── 도메인 사전 (실제 제품에서는 Extract 노드가 생성) ──────────────
ALIASES = {
    "마루가방":       ["마루가방"],
    "침대세트":       ["침대+이불베개", "침대,이불,베개", "침대,이불+베개", "침대"],
    "식탁의자":       ["식탁+의자2", "식탁+의자", "식탁,의자", "식탁"],
    "동화책":         ["동화책"],
    "꼬깔모자":       ["꼬깔모자"],
    "장바구니":       ["장바구니"],
    "수건":           ["수건"],
    "정원휴대폰":     ["정원휴대폰"],
    "민서휴대폰":     ["민서휴대폰 공기계", "민서휴대폰"],
    "영단어장":       ["영단어장"],
    "마루우주복":     ["마루우주복"],
}
CAST = ["정원", "혜원", "은비", "민서", "유림", "윤서", "현서", "정민"]
# 배역명 → 배우명. 큐시트가 두 이름을 섞어 쓰는지 검사하기 위한 대응표.
ROLE_TO_ACTOR = {"마루": "혜원", "우현": "정원", "수연": "은비"}
LOCATION_SUFFIX = re.compile(r"^\s*(위|옆|앞|뒤)")


def load(path):
    with open(path, encoding="utf-8") as f:
        rows = list(csv.reader(f))
    return [r + [""] * (17 - len(r)) for r in rows]


def cell(rows, r, c):
    return rows[r][c].strip()


def lines(text):
    return [ln.strip() for ln in text.split("\n") if ln.strip()]


def scene_label(rows, r):
    """행의 소속 장면. 마커가 비면 직전 장면의 '전환' 구간이다."""
    mark = cell(rows, r, COLS["마커"]).replace("\n", " ")
    if mark:
        return mark[:34]
    for back in range(r - 1, HEADER_ROWS - 1, -1):
        prev = cell(rows, back, COLS["마커"]).replace("\n", " ")
        if prev:
            return f"{prev[:26]} 이후 전환"
    return "(도입부)"


# ─── R1. 미해결 마커 ────────────────────────────────────────────────
def r1_unresolved(rows):
    pattern = re.compile(r"\?\?+|TBD|미정|확인要|\bTODO\b", re.IGNORECASE)
    out = []
    for r in range(HEADER_ROWS, len(rows)):
        for name, c in COLS.items():
            for ln in lines(rows[r][c]):
                if pattern.search(ln):
                    out.append((r, scene_label(rows, r), name, ln))
    return out


# ─── R2. 소품 반출입 상태머신 ───────────────────────────────────────
def find_props(line):
    """한 줄에서 '주체로 언급된' 소품만 뽑는다. 'X 위에'는 위치이므로 제외."""
    found = []
    for canonical, aliases in ALIASES.items():
        for alias in aliases:
            pos = line.find(alias)
            if pos == -1:
                continue
            tail = line[pos + len(alias):]
            if LOCATION_SUFFIX.match(tail):   # "식탁 위에 꼬깔모자 in" → 식탁은 위치
                continue
            found.append(canonical)
            break
    return found


def r2_props(rows):
    timeline = defaultdict(list)          # prop → [(row, side, direction, line)]
    for r in range(HEADER_ROWS, len(rows)):
        for c, side in ((COLS["소품_상수"], "상수"), (COLS["소품_하수"], "하수")):
            for ln in lines(rows[r][c]):
                m = re.search(r"\b(in|out)\b", ln, re.IGNORECASE)
                if not m:
                    continue
                direction = m.group(1).lower()
                for prop in find_props(ln):
                    timeline[prop].append((r, side, direction, ln))

    issues, clean = [], []
    for prop, events in sorted(timeline.items()):
        state, bad = None, []
        for (r, side, direction, ln) in events:
            if direction == state:
                bad.append((r, side, direction, ln))
            state = direction
        (issues if bad else clean).append((prop, events, bad))
    return issues, clean


# ─── R3. 마이크 on/off 상태머신 ─────────────────────────────────────
def r3_mics(rows):
    opened = {}                            # 배우 → 켠 행
    events, dangling = [], []
    for r in range(HEADER_ROWS, len(rows)):
        for ln in lines(rows[r][COLS["음향"]]):
            m = re.search(r"\b(on|off)\b", ln, re.IGNORECASE)
            if not m:
                continue
            action = m.group(1).lower()
            head = ln[:m.start()]
            if "전체" in head:
                targets = ["전체"]
            else:
                targets = [n for n in CAST if n in head]
            for t in targets:
                events.append((r, t, action, ln))
                if action == "on":
                    opened[t] = r
                else:
                    opened.pop(t, None)
                if "전체" in targets and action == "off":
                    opened.clear()
    # 커튼콜 이후 켜진 채로 끝나는 것은 정상이므로 제외한다.
    curtain = next((r for r in range(len(rows) - 1, HEADER_ROWS - 1, -1)
                    if "커튼콜" in rows[r][COLS["마커"]]), len(rows))
    for actor, r in opened.items():
        if r < curtain:
            dangling.append((actor, r, scene_label(rows, r)))
    return events, dangling


# ─── R4. 퀵체인지 시간 ──────────────────────────────────────────────
def r4_quickchange(rows, danger_sec=60):
    out = []
    for r in range(HEADER_ROWS, len(rows)):
        raw = rows[r][COLS["환복시간"]]
        for ln in lines(raw):
            for m in re.finditer(r"([가-힣]{2,3}(?:\s*,\s*[가-힣]{2,3})*|전캐스트|캐스트)\s*"
                                 r"(?:(\d+)\s*분)?\s*(?:(\d+)\s*초)?", ln):
                who, mm, ss = m.group(1), m.group(2), m.group(3)
                if not mm and not ss:
                    continue
                total = int(mm or 0) * 60 + int(ss or 0)
                if total == 0:
                    continue
                out.append((r, scene_label(rows, r), who, total,
                            total <= danger_sec, ln))
    return out


# ─── R5. 부서 동시 관여 밀도 ────────────────────────────────────────
def r5_density(rows):
    out = []
    for r in range(HEADER_ROWS, len(rows)):
        active = [n for n, c in COLS.items() if c in DEPT_COLS and cell(rows, r, c)]
        if active:
            out.append((r, scene_label(rows, r), len(active), active))
    return sorted(out, key=lambda x: -x[2])


# ─── R6. 배우명/배역명 혼용 ─────────────────────────────────────────
def r6_naming(rows):
    """같은 인물이 배우명과 배역명으로 번갈아 불리면 부서 간 오독 위험이 있다."""
    usage = defaultdict(lambda: defaultdict(int))   # 배우 → 표기 → 등장 횟수
    for r in range(HEADER_ROWS, len(rows)):
        for c in DEPT_COLS:
            text = rows[r][c]
            for role, actor in ROLE_TO_ACTOR.items():
                usage[actor][role] += text.count(role)
                usage[actor][actor] += text.count(actor)
    return {a: v for a, v in usage.items()
            if sum(1 for label, n in v.items() if n > 0) > 1}


# ─── 리포트 ─────────────────────────────────────────────────────────
def main(path):
    rows = load(path)
    print(f"\n{'='*74}\n  STANDBY 큐시트 검증 리포트  ·  {path}")
    print(f"  {len(rows)-HEADER_ROWS}개 큐 행 × {len(DEPT_COLS)}개 부서\n{'='*74}")

    print("\n[R1] 미해결 마커                                        🔴 오류")
    hits = r1_unresolved(rows)
    for r, scene, dept, ln in hits:
        print(f"  · {r:>2}행 {scene} — {dept}")
        print(f"      \"{ln}\"")
    print(f"  → {len(hits)}건" if hits else "  → 없음")

    print("\n[R2] 소품 반출입 정합성                                  🟡 확인 필요")
    issues, clean = r2_props(rows)
    for prop, events, bad in issues:
        trace = " → ".join(f"{r}행{side}:{d}" for r, side, d, _ in events)
        print(f"  · {prop}")
        print(f"      {trace}")
        for r, side, d, ln in bad:
            print(f"      ⚠ {r}행 {side} '{d}' 직전도 '{d}' — \"{ln[:52]}\"")
    print(f"  → 이상 {len(issues)}건 / 정상 {len(clean)}건"
          f" ({', '.join(p for p, _, _ in clean)})")

    print("\n[R3] 마이크 on/off 상태머신                              🟡 확인 필요")
    events, dangling = r3_mics(rows)
    print(f"  → 큐 {len(events)}건 추적, 미종료 {len(dangling)}건")
    for actor, r, scene in dangling:
        print(f"  · {actor}: {r}행 {scene} 에서 on, 이후 off 없음")

    print("\n[R4] 퀵체인지 물리 가능성                                🔴 오류")
    qc = r4_quickchange(rows)
    for r, scene, who, sec, risky, ln in qc:
        if risky:
            print(f"  · {r:>2}행 {scene} — {who} {sec}초  ⚠")
    print(f"  → 총 {len(qc)}건 중 60초 이하 {sum(1 for x in qc if x[4])}건")

    print("\n[R5] 부서 동시 관여 밀도 — 리허설 우선순위               ⚑ 위험 구간")
    for r, scene, n, active in r5_density(rows)[:5]:
        print(f"  · {n:>2}개 부서 │ {r:>2}행 {scene}")
        print(f"      {', '.join(active)}")

    print("\n[R6] 배우명 / 배역명 혼용                                🟡 확인 필요")
    for actor, usage in r6_naming(rows).items():
        parts = [f"'{label}' {n}회" for label, n in
                 sorted(usage.items(), key=lambda x: -x[1]) if n]
        print(f"  · 동일 인물이 {' / '.join(parts)} 로 불림")
    print()


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/reference-cuesheet.csv")
