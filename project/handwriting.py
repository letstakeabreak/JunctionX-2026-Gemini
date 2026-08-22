#!/usr/bin/env python3
"""
STANDBY — 빨간펜 레이어 분리기

손글씨를 '문서'가 아니라 '수정 이력(diff)'으로 다루기 위한 전처리.
인쇄 레이어와 손글씨 레이어를 색으로 갈라서

  · 인쇄 레이어  → Document Parse에 넘긴다 (표 구조 복원 정확도가 올라간다)
  · 손글씨 레이어 → 셀 좌표와 교차해 "어느 셀이 수정됐는가"를 찾는다

핵심: 손글씨를 정확히 읽지 못해도, **어디가 수정됐는지**는 정확히 알 수 있다.
그것만으로 무대감독에게 "이 3개 셀을 확인하세요"라고 말할 수 있다.

사용법
    python3 handwriting.py photo.jpg                    # 레이어 분리
    python3 handwriting.py photo.jpg --cells cells.json # 셀별 수정 감지

`cells.json`은 Document Parse의 좌표 출력을 아래 형태로 정리한 것:
    [{"id": "45행-음향", "bbox": [x1, y1, x2, y2]}, ...]
"""

import json
import sys
from PIL import Image, ImageChops

REDNESS_THRESHOLD = 45      # r - max(g,b) 가 이 값을 넘으면 빨간펜으로 본다
MIN_INK_RATIO = 0.004       # 셀 면적 대비 잉크 비율이 이 값을 넘으면 '수정됨'


def redness_mask(img):
    """빨간펜 픽셀만 흰색(255)인 흑백 마스크를 만든다."""
    r, g, b = img.convert("RGB").split()
    brighter_of_gb = ImageChops.lighter(g, b)
    redness = ImageChops.subtract(r, brighter_of_gb)
    return redness.point(lambda v: 255 if v > REDNESS_THRESHOLD else 0, mode="1")


def split_layers(img, mask):
    """(손글씨만 남긴 이미지, 손글씨를 지운 인쇄 이미지)"""
    white = Image.new("RGB", img.size, (255, 255, 255))
    handwriting = Image.composite(img.convert("RGB"), white, mask)
    printed = Image.composite(white, img.convert("RGB"), mask)
    return handwriting, printed


def ink_ratio(mask, bbox):
    """셀 영역 안에서 빨간펜이 차지하는 비율."""
    x1, y1, x2, y2 = (int(v) for v in bbox)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    region = mask.crop((x1, y1, x2, y2))
    ink = sum(region.point(lambda v: 1 if v else 0).getdata())
    return ink / float((x2 - x1) * (y2 - y1))


def scan_bands(mask, rows=12, cols=6):
    """셀 좌표가 없을 때: 이미지를 격자로 나눠 잉크가 몰린 칸을 보고한다."""
    w, h = mask.size
    hits = []
    for i in range(rows):
        for j in range(cols):
            box = (j * w // cols, i * h // rows,
                   (j + 1) * w // cols, (i + 1) * h // rows)
            ratio = ink_ratio(mask, box)
            if ratio > MIN_INK_RATIO:
                hits.append((i, j, ratio))
    return sorted(hits, key=lambda x: -x[2])


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    path = sys.argv[1]
    img = Image.open(path)
    mask = redness_mask(img)

    total = sum(mask.point(lambda v: 1 if v else 0).getdata())
    coverage = total / float(img.size[0] * img.size[1])
    print(f"\n이미지        {path}  ({img.size[0]}×{img.size[1]})")
    print(f"빨간펜 픽셀   {total:,} ({coverage*100:.2f}%)")

    if coverage < 0.0002:
        print("\n⚠ 빨간펜이 거의 감지되지 않았다. REDNESS_THRESHOLD를 낮추거나,")
        print("  더 진한 펜으로 다시 쓰거나, 조명을 균일하게 하고 다시 촬영할 것.")

    handwriting, printed = split_layers(img, mask)
    handwriting.save("layer-handwriting.png")
    printed.save("layer-printed.png")
    print("\n저장        layer-handwriting.png  (손글씨만)")
    print("            layer-printed.png      (인쇄만 — Parse에 넘길 것)")

    if "--cells" in sys.argv:
        cells = json.load(open(sys.argv[sys.argv.index("--cells") + 1],
                              encoding="utf-8"))
        edited = [(c["id"], ink_ratio(mask, c["bbox"])) for c in cells]
        edited = [(i, r) for i, r in edited if r > MIN_INK_RATIO]
        print(f"\n수정된 셀 {len(edited)}개 / 전체 {len(cells)}개")
        for cell_id, ratio in sorted(edited, key=lambda x: -x[1]):
            print(f"  · {cell_id}  (잉크 {ratio*100:.1f}%)")
    else:
        hits = scan_bands(mask)
        print(f"\n셀 좌표가 없으므로 격자 스캔 — 잉크 밀집 {len(hits)}칸")
        for i, j, ratio in hits[:8]:
            print(f"  · {i+1}행대 {j+1}열대  (잉크 {ratio*100:.1f}%)")
        print("\n  → Parse의 coordinates 출력을 cells.json으로 넘기면 셀 단위로 보고한다.")
    print()


if __name__ == "__main__":
    main()
