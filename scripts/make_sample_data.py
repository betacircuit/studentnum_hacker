"""가상 샘플 데이터 생성기.

실제 학생 정보는 전혀 사용하지 않는다. 학번 연도는 실존할 수 없는 2099로 고정하고,
이름은 '김샘플', '이예시'처럼 가짜임이 드러나는 조합만 쓴다.

생성 파일
  data/sample_roster.csv : 이름, 학부, 가려진 학번 (출석부 PDF를 흉내낸 형태)
  data/sample_seats.csv  : 좌석, 전체 학번 (좌석표를 흉내낸 형태)

일부러 넣은 예외 케이스
  - 동명이인 1쌍
  - 뒤 3자리가 같은 학번 1쌍 (매칭이 모호해지는 경우)
  - 좌석표에만 있는 학번 / 출석부에만 있는 이름
"""
import csv
import itertools
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"]
GIVEN = ["샘플", "예시", "테스트", "더미", "가상", "임시", "연습", "데모", "견본", "표본"]
DEPTS = ["샘플전자학부"] * 5 + ["샘플기계학부"] * 2 + ["샘플자유전공"]

YEAR = "2099"
COUNT = 40


def mask(student_id: str) -> str:
    """2099-13042 -> 2099-**042"""
    year, rest = student_id.split("-")
    return f"{year}-**{rest[2:]}"


def main() -> None:
    rng = random.Random(7)

    names = rng.sample(list(itertools.product(SURNAMES, GIVEN)), COUNT)
    names = ["".join(pair) for pair in names]
    names.append(names[0])  # 동명이인

    # 의도한 모호 케이스(아래 042 한 쌍)를 빼면 뒤 3자리가 겹치지 않게 한다.
    AMBIGUOUS_TAIL = "042"
    used_tails: set[str] = {AMBIGUOUS_TAIL}

    def fresh_id() -> str:
        while True:
            sid = f"{YEAR}-{rng.randrange(10000, 20000)}"
            if sid[-3:] not in used_tails:
                used_tails.add(sid[-3:])
                return sid

    students: list[dict] = [
        {"name": name, "dept": rng.choice(DEPTS), "id": fresh_id()} for name in names
    ]

    # 뒤 3자리가 같은 학번 한 쌍을 강제로 만든다 (모호한 매칭 케이스)
    a, b = students[3], students[4]
    a["id"], b["id"] = f"{YEAR}-13{AMBIGUOUS_TAIL}", f"{YEAR}-17{AMBIGUOUS_TAIL}"

    roster = list(students)

    # 출석부에만 있는 사람 (좌석표에 학번이 없음)
    absent = roster[-2]
    seats = [s for s in students if s is not absent]
    # 좌석표에만 있는 학번 (출석부에 이름이 없음)
    seats.append({"name": "", "dept": "", "id": fresh_id()})

    rng.shuffle(seats)
    rows = list(itertools.product("ABCDEF", range(1, 9)))
    DATA.mkdir(exist_ok=True)

    with open(DATA / "sample_roster.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["name", "dept", "masked_id"])
        for s in sorted(roster, key=lambda s: s["name"]):
            w.writerow([s["name"], s["dept"], mask(s["id"])])

    with open(DATA / "sample_seats.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["seat", "student_id"])
        for (row, col), s in zip(rows, seats):
            w.writerow([f"{row}{col}", s["id"]])

    print(f"roster={len(roster)}명, seats={len(seats)}석 생성")


if __name__ == "__main__":
    main()
