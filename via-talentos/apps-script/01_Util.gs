/**
 * Utilitários de data, texto e identificadores.
 * Datas de negócio são tratadas como strings ISO 'aaaa-mm-dd' e calculadas em UTC
 * para não sofrer com fuso horário/horário de verão.
 */
var Util = (function () {
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function now() {
    return Utilities.formatDate(new Date(), VT.TZ, 'yyyy-MM-dd HH:mm:ss');
  }

  function today() {
    return Utilities.formatDate(new Date(), VT.TZ, 'yyyy-MM-dd');
  }

  /** Converte Date, 'dd/mm/aaaa', 'aaaa-mm-dd' (com ou sem hora) em 'aaaa-mm-dd'. */
  function toIsoDate(value) {
    if (value === null || value === undefined || value === '') return '';
    if (Object.prototype.toString.call(value) === '[object Date]') {
      if (isNaN(value.getTime())) return '';
      return Utilities.formatDate(value, VT.TZ, 'yyyy-MM-dd');
    }
    var s = String(value).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]);
    return '';
  }

  function isIsoDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    var d = parse(s);
    return d && fmt(d) === s;
  }

  /** 'aaaa-mm-dd' → Date UTC (meia-noite). */
  function parse(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  /** Date UTC → 'aaaa-mm-dd'. */
  function fmt(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function addDays(iso, n) {
    var d = parse(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return fmt(d);
  }

  function monthKey(iso) { return iso ? String(iso).substr(0, 7) : ''; }

  function id(prefix) {
    var hex = Utilities.getUuid().replace(/-/g, '').substr(0, 8).toUpperCase();
    return prefix + '-' + hex;
  }

  function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }

  function norm(v) {
    return str(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  }

  function int(v, def) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (def === undefined ? 0 : def) : n;
  }

  function isYes(v) { return ['sim', 's', 'true', '1', 'yes', 'ativo'].indexOf(norm(v)) >= 0; }

  function round(n, d) {
    var f = Math.pow(10, d || 0);
    return Math.round(n * f) / f;
  }

  function avg(list) {
    if (!list.length) return null;
    return list.reduce(function (a, b) { return a + b; }, 0) / list.length;
  }

  function groupCount(list, keyFn) {
    var out = {};
    list.forEach(function (item) {
      var k = keyFn(item);
      if (k === null || k === undefined || k === '') return;
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  return {
    now: now, today: today, toIsoDate: toIsoDate, isIsoDate: isIsoDate, parse: parse, fmt: fmt,
    addDays: addDays, monthKey: monthKey, id: id, str: str, norm: norm, int: int, isYes: isYes,
    round: round, avg: avg, groupCount: groupCount
  };
})();

/** Erro de validação exibido ao usuário sem stack trace. */
function UserError(message) {
  var e = new Error(message);
  e.userError = true;
  return e;
}
