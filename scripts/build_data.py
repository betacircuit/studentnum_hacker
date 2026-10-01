"""샘플 출석부 + 샘플 좌석표 -> 조회용 data.js 생성.

출석부는 학번이 `2099-**042`처럼 가려져 있고, 좌석표에는 전체 학번이 있다.
(연도, 뒤 3자리)가 같은 항목끼리 이어 붙이되, 한쪽이라도 후보가 둘 이상이면
추측하지 않고 '모호'로 분류해 결과에서 뺀다.

입력은 data/ 아래 가상 샘플 CSV로 고정되어 있다. 실제 학생 데이터는 넣지 않는다.
"""
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROSTER = ROOT / "data" / "sample_roster.csv"
SEATS = ROOT / "data" / "sample_seats.csv"
OUT = ROOT / "data.js"

MASKED_RE = re.compile(r"^(\d{4})-\*{2}(\d{3})$")
FULL_RE = re.compile(r"^(\d{4})-(\d{5})$")


def read_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def main() -> None:
    roster = read_csv(ROSTER)
    seats = read_csv(SEATS)

    by_key_seat: dict[tuple, list[dict]] = defaultdict(list)
    for row in seats:
        m = FULL_RE.match(row["student_id"].strip())
        if not m:
            raise SystemExit(f"좌석표 학번 형식 오류: {row}")
        by_key_seat[(m[1], m[2][2:])].append(row)

    by_key_roster: dict[tuple, list[dict]] = defaultdict(list)
    for row in roster:
        m = MASKED_RE.match(row["masked_id"].strip())
        if not m:
            raise SystemExit(f"출석부 학번 형식 오류: {row}")
        by_key_roster[(m[1], m[2])].append(row)

    matched, ambiguous, no_seat = [], [], []
    for key, people in by_key_roster.items():
        cands = by_key_seat.get(key, [])
        if not cands:
            no_seat.extend(p["name"] for p in people)
        elif len(people) == 1 and len(cands) == 1:
            p, c = people[0], cands[0]
            matched.append(
                {
                    "name": p["name"],
                    "dept": p["dept"],
                    "id": c["student_id"].strip(),
                    "seat": c["seat"],
                }
            )
        else:
            ambiguous.append((key, [p["name"] for p in people], [c["student_id"] for c in cands]))

    only_seat = [k for k in by_key_seat if k not in by_key_roster]

    matched.sort(key=lambda s: (s["name"], s["id"]))
    OUT.write_text(
        "// build_data.py가 생성한 파일 (가상 샘플 데이터). 직접 수정하지 마세요.\n"
        "window.STUDENTS = "
        + json.dumps(matched, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    print(f"매칭 성공 {len(matched)}명 -> {OUT.name}")
    print(f"모호하여 제외 {sum(len(n) for _, n, _ in ambiguous)}명")
    for key, names, ids in ambiguous:
        print(f"  {key}: 이름 {names} / 후보 학번 {ids}")
    print(f"좌석표에 없음 {len(no_seat)}명: {no_seat}")
    print(f"출석부에 없는 좌석 학번 {len(only_seat)}개")


if __name__ == "__main__":
    main()
