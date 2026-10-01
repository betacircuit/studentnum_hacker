const test = require("node:test");
const assert = require("node:assert/strict");
const { search, segments } = require("../lookup.js");

const students = [
  { name: "김샘플", dept: "샘플전자학부", id: "2099-12018", seat: "A1" },
  { name: "김샘플", dept: "샘플기계학부", id: "2099-15018", seat: "B2" },
  { name: "이예시", dept: "샘플전자학부", id: "2099-11156", seat: "C3" },
  { name: "박테스트", dept: "샘플자유전공", id: "2099-13770", seat: "D4" },
];

test("빈 입력은 empty", () => {
  assert.equal(search(students, "").mode, "empty");
  assert.equal(search(students, "   ").mode, "empty");
  assert.equal(search(students, "--").mode, "empty");
});

test("이름 검색: 동명이인은 모두 나온다", () => {
  const r = search(students, "김샘플");
  assert.equal(r.mode, "name");
  assert.deepEqual(r.results.map((s) => s.id), ["2099-12018", "2099-15018"]);
});

test("이름 검색: 부분 일치와 공백 무시", () => {
  assert.equal(search(students, "예시").results.length, 1);
  assert.equal(search(students, " 박 테스트 ").results[0].name, "박테스트");
});

test("이름 검색: 완전 일치가 부분 일치보다 앞에 온다", () => {
  const list = [
    { name: "김샘플러", dept: "", id: "2099-10001", seat: "A1" },
    { name: "김샘플", dept: "", id: "2099-10002", seat: "A2" },
  ];
  assert.equal(search(list, "김샘플").results[0].name, "김샘플");
});

test("학번 검색: 하이픈 유무와 관계없이 같은 결과", () => {
  assert.deepEqual(
    search(students, "2099-12018").results.map((s) => s.name),
    search(students, "209912018").results.map((s) => s.name),
  );
  assert.equal(search(students, "2099-12018").results[0].name, "김샘플");
});

test("학번 검색: 일부 숫자(뒤 3자리)도 가능, 여러 건이 나올 수 있다", () => {
  const r = search(students, "018");
  assert.equal(r.mode, "id");
  assert.equal(r.results.length, 2);
});

test("일치 없음", () => {
  assert.equal(search(students, "없는이름").results.length, 0);
  assert.equal(search(students, "0000").results.length, 0);
});

test("segments: 이름 하이라이트", () => {
  assert.deepEqual(segments("김샘플", "샘플", "name"), [
    { text: "김", hit: false },
    { text: "샘플", hit: true },
  ]);
});

test("segments: 학번 하이라이트는 하이픈을 건너뛴다", () => {
  assert.deepEqual(segments("2099-12018", "9912", "id"), [
    { text: "20", hit: false },
    { text: "99-12", hit: true },
    { text: "018", hit: false },
  ]);
});

test("segments: 일치가 없으면 통째로 한 조각", () => {
  assert.deepEqual(segments("이예시", "박", "name"), [{ text: "이예시", hit: false }]);
});
