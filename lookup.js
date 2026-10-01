/* 이름 <-> 학번 조회 로직. DOM에 의존하지 않아 node에서도 테스트할 수 있다. */
(function (root) {
  "use strict";

  var ID_QUERY_RE = /^[\d\-\s]+$/;

  function digitsOf(text) {
    return text.replace(/\D/g, "");
  }

  function compact(text) {
    return text.replace(/\s+/g, "");
  }

  /**
   * 입력이 숫자/하이픈/공백뿐이면 학번 검색, 아니면 이름 검색.
   * 둘 다 부분 일치이며, 완전 일치 결과를 앞에 둔다.
   * @returns {{mode: "empty"|"id"|"name", query: string, results: Array}}
   */
  function search(students, rawQuery) {
    var q = (rawQuery || "").trim();
    if (!q) return { mode: "empty", query: "", results: [] };

    if (ID_QUERY_RE.test(q)) {
      var d = digitsOf(q);
      if (!d) return { mode: "empty", query: "", results: [] };
      var byId = students.filter(function (s) {
        return !!s.id && digitsOf(s.id).indexOf(d) !== -1;
      });
      byId.sort(function (a, b) {
        var ea = digitsOf(a.id) === d ? 0 : 1;
        var eb = digitsOf(b.id) === d ? 0 : 1;
        return ea - eb || a.id.localeCompare(b.id) || a.name.localeCompare(b.name, "ko");
      });
      return { mode: "id", query: d, results: byId };
    }

    var n = compact(q);
    var byName = students.filter(function (s) {
      return compact(s.name).indexOf(n) !== -1;
    });
    byName.sort(function (a, b) {
      var ea = compact(a.name) === n ? 0 : 1;
      var eb = compact(b.name) === n ? 0 : 1;
      return ea - eb || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id);
    });
    return { mode: "name", query: n, results: byName };
  }

  /**
   * text 안에서 query와 겹치는 구간을 [{text, hit}] 조각으로 나눈다.
   * 학번은 하이픈을 건너뛰고 숫자 위치 기준으로 계산한다.
   */
  function segments(text, query, mode) {
    if (!query) return [{ text: text, hit: false }];
    var start = -1;
    var end = -1;

    if (mode === "id") {
      var digits = digitsOf(text);
      var idx = digits.indexOf(query);
      if (idx === -1) return [{ text: text, hit: false }];
      var seen = 0;
      for (var i = 0; i < text.length; i++) {
        if (/\d/.test(text[i])) {
          if (seen === idx) start = i;
          if (seen === idx + query.length - 1) end = i + 1;
          seen++;
        }
      }
    } else {
      start = text.indexOf(query);
      if (start === -1) return [{ text: text, hit: false }];
      end = start + query.length;
    }

    var out = [];
    if (start > 0) out.push({ text: text.slice(0, start), hit: false });
    out.push({ text: text.slice(start, end), hit: true });
    if (end < text.length) out.push({ text: text.slice(end), hit: false });
    return out;
  }

  function describeMatch(student, mode, students) {
    if (student.status === "unknown") return "학번 정보 없음";
    if (student.status === "confirmed") return "확인됨";
    var sameName = new Set(students.filter(function (s) {
      return s.name === student.name && s.id;
    }).map(function (s) { return s.id; })).size;
    var sameId = new Set(students.filter(function (s) {
      return s.id === student.id;
    }).map(function (s) { return s.name; })).size;
    var text = mode === "id" ? "이 이름일 가능성이 높음" : "이 학번일 가능성이 높음";
    if (sameName > 1 || sameId > 1) {
      text += " · 미확정 (학번 후보 " + sameName + "개 / 이름 후보 " + sameId + "명)";
    }
    return text;
  }

  var api = { search: search, segments: segments, describeMatch: describeMatch };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Lookup = api;
})(typeof window !== "undefined" ? window : globalThis);
