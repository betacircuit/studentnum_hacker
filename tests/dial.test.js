const test = require("node:test");
const assert = require("node:assert/strict");
const Dial = require("../dial.js");
const names = [...new Set(require("../data/cohort.json").map(s => s.name))];

test("세 글자 다이얼은 항상 등록된 이름만 선택하고 앞 글자 조건을 유지", () => {
  for (const name of names) {
    for (let column=0; column<3; column++) {
      for (const direction of [-1,1]) {
        const next = Dial.stepName(names, name, column, direction);
        assert.ok(names.includes(next));
        assert.deepEqual(Dial.parts(next).slice(0,column), Dial.parts(name).slice(0,column));
      }
    }
  }
});

test("짧은 이름과 영문 표시명도 세 칸에 손실 없이 보존", () => {
  assert.deepEqual(Dial.parts("박준후"), ["박","준","후"]);
  assert.deepEqual(Dial.parts("최민"), ["최","민","·"]);
  assert.equal(Dial.parts("Jordan Sayno").join(""), "JordanSayno");
});

test("학번 입력: 전체 학번, 뒷자리와 미확인 숫자를 정확히 표시", () => {
  assert.deepEqual(Dial.numberQuery("2025-19418"), { query:"202519418", display:"202519418" });
  assert.equal(Dial.numberQuery("9418").query, "202519418");
  assert.equal(Dial.numberQuery("19418").query, "202519418");
  assert.deepEqual(Dial.numberQuery("418"), { query:"418", display:"20251?418" });
  assert.equal(Dial.numberQuery("").display, "20251????");
});
