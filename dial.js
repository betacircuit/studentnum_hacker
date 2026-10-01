(function (root) {
  "use strict";
  function parts(name) {
    var chars = Array.from(name.replace(/\s+/g, ""));
    if (chars.length <= 3) return [chars[0] || "·", chars[1] || "·", chars[2] || "·"];
    var width = Math.ceil(chars.length / 3);
    return [chars.slice(0, width).join(""), chars.slice(width, width * 2).join(""), chars.slice(width * 2).join("") || "·"];
  }
  function stepName(names, current, column, direction) {
    if (!names.length) return "";
    if (!current) return names[0];
    var previous = parts(current);
    var pool = names.filter(function (name) {
      var p = parts(name);
      return p.slice(0, column).every(function (value, i) { return value === previous[i]; });
    });
    var choices = Array.from(new Set(pool.map(function (name) { return parts(name)[column]; }))).sort(function (a, b) { return a.localeCompare(b, "ko"); });
    var at = choices.indexOf(previous[column]);
    var next = choices[(at + direction + choices.length) % choices.length];
    return pool.filter(function (name) { return parts(name)[column] === next; }).sort(function (a, b) {
      function score(name) { return parts(name).reduce(function (n, p, i) { return n + (i > column && p === previous[i] ? 1 : 0); }, 0); }
      return score(b) - score(a) || a.localeCompare(b, "ko");
    })[0] || current;
  }
  function numberQuery(raw) {
    var d = String(raw || "").replace(/\D/g, "").slice(0, 9);
    if (!d) return { query: "", display: "20251????" };
    if (d.length === 9) return { query: d, display: d };
    if (d.length === 5) return { query: "2025" + d, display: "2025" + d };
    if (d.length === 4) return { query: "20251" + d, display: "20251" + d };
    if (d.length <= 3) return { query: d, display: "20251" + "?".repeat(4 - d.length) + d };
    return { query: d, display: (d + "?????????").slice(0, 9) };
  }
  var api = { parts: parts, stepName: stepName, numberQuery: numberQuery };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Dial = api;
})(typeof window !== "undefined" ? window : globalThis);
