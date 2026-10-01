"""검토된 이름·학번 후보를 브라우저 조회 데이터로 생성한다."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    students = json.loads((ROOT / "data" / "lookup_source.json").read_text(encoding="utf-8"))
    seen = set()
    for student in students:
        key = (student["name"], student["id"])
        if key in seen:
            raise ValueError(f"중복된 이름·학번: {key}")
        seen.add(key)
        if student["status"] not in {"confirmed", "probable", "unknown"}:
            raise ValueError(f"잘못된 상태: {key}")
        if student["status"] == "unknown":
            if student["id"]:
                raise ValueError(f"학번 미상 항목에 학번이 있음: {key}")
        elif not re.fullmatch(r"2025-1\d{4}", student["id"]):
            raise ValueError(f"25학번 형식 오류: {key}")
    students.sort(key=lambda s: (s["name"], s["id"]))
    (ROOT / "data.js").write_text(
        "// scripts/build_data.py에서 생성합니다. data/lookup_source.json을 수정하세요.\n"
        + "window.STUDENTS = " + json.dumps(students, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"{len(set(s['name'] for s in students))} names / {len(students)} records")


if __name__ == "__main__":
    main()
