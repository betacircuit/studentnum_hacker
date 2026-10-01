(function () {
  "use strict";

  var students = window.STUDENTS || [];
  var input = document.getElementById("q");
  var clearBtn = document.getElementById("clear");
  var chipsEl = document.getElementById("chips");
  var metaEl = document.getElementById("meta");
  var listEl = document.getElementById("results");
  var lastResults = [];

  function highlighted(text, query, mode) {
    var frag = document.createDocumentFragment();
    Lookup.segments(text, query, mode).forEach(function (seg) {
      if (seg.hit) {
        var m = document.createElement("mark");
        m.textContent = seg.text;
        frag.appendChild(m);
      } else {
        frag.appendChild(document.createTextNode(seg.text));
      }
    });
    return frag;
  }

  function copyText(text, btn) {
    function done() {
      var prev = btn.textContent;
      btn.textContent = "복사됨";
      setTimeout(function () { btn.textContent = prev; }, 1200);
    }
    try {
      navigator.clipboard.writeText(text).then(done, function () {});
    } catch (e) {
      /* 클립보드를 쓸 수 없는 환경이면 조용히 무시 */
    }
  }

  function card(s, res) {
    var li = document.createElement("li");

    var who = document.createElement("div");
    who.className = "who";

    var name = document.createElement("div");
    name.className = "name";
    name.appendChild(highlighted(s.name, res.mode === "name" ? res.query : "", "name"));

    var sid = document.createElement("div");
    sid.className = "sid";
    sid.appendChild(highlighted(s.id || "학번 정보 없음", res.mode === "id" ? res.query : "", "id"));

    var status = document.createElement("div");
    status.className = "status " + s.status;
    status.textContent = Lookup.describeMatch(s, res.mode, students);

    var detail = document.createElement("div");
    detail.className = "detail";
    detail.textContent = s.dept + (s.seat ? " · 좌석표 " + s.seat : "");

    var note = document.createElement("div");
    note.className = "detail";
    note.textContent = s.note || "";

    who.appendChild(name);
    who.appendChild(sid);
    who.appendChild(status);
    who.appendChild(detail);
    who.appendChild(note);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy";
    btn.textContent = "학번 복사";
    btn.addEventListener("click", function () { copyText(s.id, btn); });

    li.appendChild(who);
    if (s.id) li.appendChild(btn);
    return li;
  }

  function render(res) {
    listEl.replaceChildren();
    lastResults = res.results;

    if (res.mode === "empty") {
      metaEl.textContent = "등록된 이름 " + new Set(students.map(function (s) { return s.name; })).size + "명 중에서 검색합니다.";
      return;
    }
    if (res.results.length === 0) {
      metaEl.textContent = "";
      var empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "일치하는 항목이 없습니다.";
      listEl.appendChild(empty);
      return;
    }

    var label = res.mode === "id" ? "학번" : "이름";
    metaEl.textContent = label + " 검색 · " + res.results.length + "건";
    res.results.forEach(function (s) { listEl.appendChild(card(s, res)); });
  }

  function run(isComposing) {
    clearBtn.hidden = input.value === "";
    var res = Lookup.search(students, input.value);
    // 한글 조합 중에는 자모만 있어 결과가 비는 순간이 잦으므로 직전 화면을 유지한다.
    if (isComposing && res.mode !== "empty" && res.results.length === 0 && lastResults.length > 0) return;
    render(res);
  }

  function buildChips() {
    if (students.length === 0) return;
    var counts = {};
    students.forEach(function (s) { counts[s.name] = (counts[s.name] || 0) + 1; });
    var dup = students.find(function (s) { return counts[s.name] > 1; });

    var example = students.find(function (s) { return s.status === "confirmed"; }) || students.find(function (s) { return s.id; });
    if (!example) return;
    var samples = [example.name, example.id, example.id.slice(-3)];
    if (dup && samples.indexOf(dup.name) === -1) samples.push(dup.name);

    input.placeholder = "이름 또는 학번 입력 (예: " + samples.slice(0, 3).join(", ") + ")";

    samples.forEach(function (text) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = text;
      b.addEventListener("click", function () {
        input.value = text;
        run(false);
        input.focus();
      });
      chipsEl.appendChild(b);
    });
  }

  input.addEventListener("input", function (e) { run(e.isComposing); });
  clearBtn.addEventListener("click", function () {
    input.value = "";
    run(false);
    input.focus();
  });

  buildChips();
  var missing = students.filter(function (s) { return s.status === "unknown"; });
  document.getElementById("missing-summary").textContent = "학번 정보가 없는 이름 " + missing.length + "명";
  missing.forEach(function (s) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = s.name;
    b.addEventListener("click", function () { input.value = s.name; run(false); input.focus(); });
    document.getElementById("missing-names").appendChild(b);
  });
  run(false);
})();
