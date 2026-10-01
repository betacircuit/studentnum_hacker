const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { search, describeMatch } = require("../lookup.js");
const students = require("../data/lookup_source.json");

test("박준후는 양방향에서 확인된 2025-19418", () => {
  const byName = search(students, "박준후").results;
  const byId = search(students, "2025-19418").results;
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, "2025-19418");
  assert.equal(byId.length, 1);
  assert.equal(byId[0].name, "박준후");
  assert.equal(describeMatch(byName[0], "name", students), "확인됨");
});

test("확인된 구본철·김건우 학번은 양방향에서 한 명만 연결하고 잘못된 후보를 제거", () => {
  for (const [name,id] of [["구본철","2025-14574"],["김건우","2025-10292"]]) {
    const byName = search(students,name).results;
    assert.equal(byName.length,1);
    assert.equal(byName[0].id,id);
    assert.equal(byName[0].status,"confirmed");
    assert.deepEqual(search(students,id).results.map(s=>s.name),[name]);
  }
  assert.deepEqual(search(students,"2025-15574").results.map(s=>s.name),["문수빈"]);
  assert.equal(search(students,"문수빈").results[0].status,"probable");
});

test("사용자가 정정한 표시명은 전체 이름으로 조회하고 학번은 추정 상태 유지", () => {
  const cohort = require("../data/cohort.json");
  for (const [oldName, name, id] of [["Sassy 승경", "서승경", "2025-11412"], ["규원", "홍규원", "2025-18846"]]) {
    assert.ok(!cohort.some(s => s.name === oldName));
    assert.ok(cohort.some(s => s.name === name && s.fullName));
    assert.ok(!students.some(s => s.name === oldName));
    const result = search(students, name).results;
    assert.equal(result.length, 1);
    assert.equal(result[0].id, id);
    assert.equal(result[0].status, "probable");
    assert.ok(search(students, id).results.some(s => s.name === name));
  }
});

test("편성주는 제외하고 동일 끝자리 남석윤을 양방향으로 조회", () => {
  assert.equal(search(students, "편성주").results.length, 0);
  assert.deepEqual(search(students, "2025-12803").results.map(s => s.name), ["남석윤"]);
});

test("추정 연결의 문구는 검색 방향을 반영하고 충돌 후보를 모두 유지", () => {
  const names = search(students, "김태수").results;
  assert.equal(names.length, 2);
  assert.match(describeMatch(names[0], "name", students), /^이 학번일 가능성이 높음/);
  assert.match(describeMatch(names[0], "id", students), /^이 이름일 가능성이 높음/);
  assert.match(describeMatch(names[0], "id", students), /미확정/);
  assert.deepEqual(search(students, "2025-16891").results.map(s => s.name), ["김태수", "이우진"]);
});

test("명단에 있지만 학번이 없는 이름과 별명은 임의로 배정하지 않는다", () => {
  for (const name of ["강승범", "허준혁", "최수현", "An Phan", "준구"]) {
    const result = search(students, name).results;
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "");
    assert.equal(describeMatch(result[0], "name", students), "학번 정보 없음");
  }
  assert.ok(search(students, "2025").results.every(s => s.id));
});

test("생성된 화면 데이터와 검토 원본이 일치하고 등록 학번은 전부 25학번", () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve("../data.js"), "utf8"), context);
  const generated = JSON.parse(JSON.stringify(context.window.STUDENTS));
  const sorted = [...students].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : a.id.localeCompare(b.id));
  assert.deepEqual(generated, sorted);
  assert.ok(generated.filter(s => s.id).every(s => /^2025-1\d{4}$/.test(s.id)));
});
