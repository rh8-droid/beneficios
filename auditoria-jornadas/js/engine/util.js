/*
 * Auditoria de Jornadas — utilitários de data/hora.
 *
 * Todas as datas/horas são representadas como "minutos ingênuos" (naive):
 * minutos desde 1970-01-01 00:00 no relógio local dos relatórios
 * (os dois sistemas exportam em America/Sao_Paulo). Isso evita qualquer
 * conversão de fuso feita pelo navegador.
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});

  const EMPTY = new Set(['', '-', '—', '–', ' - ', 'null', 'undefined']);

  function clean(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/ /g, ' ').trim();
  }

  function isEmpty(v) {
    return EMPTY.has(clean(v));
  }

  /** "HH:MM" ou "HHH:MM" (pode passar de 24h) -> minutos. Vazio -> null. */
  function parseDuration(v) {
    if (typeof v === 'number' && isFinite(v)) {
      // Excel guarda duração como fração de dia
      return Math.round(v * 24 * 60);
    }
    const s = clean(v);
    if (isEmpty(s)) return null;
    const m = s.match(/^(-)?(\d{1,4}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const total = parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
    return m[1] ? -total : total;
  }

  function mk(y, mo, d, h, mi) {
    return Math.round(Date.UTC(y, mo - 1, d, h || 0, mi || 0) / 60000);
  }

  function parts(min) {
    const dt = new Date(min * 60000);
    return {
      y: dt.getUTCFullYear(),
      mo: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
      h: dt.getUTCHours(),
      mi: dt.getUTCMinutes(),
      wd: dt.getUTCDay(), // 0 = domingo
    };
  }

  /** Escolhe o ano de um "dd/mm" sem ano, a partir de uma data de referência (minutos). */
  function inferYear(day, month, refMin) {
    const ref = parts(refMin);
    let y = ref.y;
    // Diferença de mais de 6 meses indica virada de ano
    if (month - ref.mo > 6) y -= 1;
    else if (ref.mo - month > 6) y += 1;
    return y;
  }

  /** "06/11 07:42" | "06/11/26 07:42" | "06/11/2026 07:42" -> minutos. */
  function parseDateTime(v, refMin) {
    if (v instanceof Date && !isNaN(v)) {
      return mk(v.getFullYear(), v.getMonth() + 1, v.getDate(), v.getHours(), v.getMinutes());
    }
    if (typeof v === 'number' && isFinite(v) && v > 20000) {
      // número serial do Excel
      const ms = Math.round((v - 25569) * 86400000);
      return Math.round(ms / 60000);
    }
    const s = clean(v);
    if (isEmpty(s)) return null;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
    if (!m) return null;
    const d = +m[1];
    const mo = +m[2];
    let y;
    if (m[3]) {
      y = +m[3];
      if (y < 100) y += 2000;
    } else {
      y = inferYear(d, mo, refMin != null ? refMin : mk(new Date().getFullYear(), new Date().getMonth() + 1, 1));
    }
    return mk(y, mo, d, m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  }

  /** "HH:MM" (hora do dia) -> minutos desde 00:00 */
  function parseClock(v) {
    const s = clean(v);
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return +m[1] * 60 + +m[2];
  }

  function dayKey(min) {
    const p = parts(min);
    return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  }

  function dayStart(min) {
    return Math.floor(min / 1440) * 1440;
  }

  function keyToMin(key) {
    const [y, mo, d] = key.split('-').map(Number);
    return mk(y, mo, d);
  }

  function fmtDur(min, opts) {
    if (min === null || min === undefined || isNaN(min)) return (opts && opts.empty) || '—';
    const neg = min < 0;
    const a = Math.abs(Math.round(min));
    const s = `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
    if (neg) return '-' + s;
    return opts && opts.sign && min > 0 ? '+' + s : s;
  }

  function fmtDateTime(min, opts) {
    if (min === null || min === undefined) return '—';
    const p = parts(min);
    const dd = `${String(p.d).padStart(2, '0')}/${String(p.mo).padStart(2, '0')}`;
    const hh = `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
    if (opts && opts.timeOnly) return hh;
    if (opts && opts.withYear) return `${dd}/${p.y} ${hh}`;
    return `${dd} ${hh}`;
  }

  function fmtDate(keyOrMin, withWeekday) {
    if (keyOrMin === null || keyOrMin === undefined) return '—';
    const min = typeof keyOrMin === 'string' ? keyToMin(keyOrMin) : keyOrMin;
    const p = parts(min);
    const s = `${String(p.d).padStart(2, '0')}/${String(p.mo).padStart(2, '0')}/${p.y}`;
    return withWeekday ? `${s} (${WEEKDAYS[p.wd].slice(0, 3)})` : s;
  }

  const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  function onlyDigits(v) {
    return clean(v).replace(/\D/g, '');
  }

  function normCpf(v) {
    const d = onlyDigits(v);
    if (!d) return '';
    return d.padStart(11, '0');
  }

  function fmtCpf(cpf, mask) {
    if (!cpf) return '—';
    if (mask) return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  }

  function normName(v) {
    return clean(v)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normMatricula(v) {
    const s = clean(v);
    if (!s) return '';
    return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s.toUpperCase();
  }

  function sum(...vals) {
    let any = false;
    let t = 0;
    for (const v of vals) {
      if (v !== null && v !== undefined && !isNaN(v)) {
        any = true;
        t += v;
      }
    }
    return any ? t : null;
  }

  function nz(v) {
    return v === null || v === undefined || isNaN(v) ? 0 : v;
  }

  /** Hash estável (FNV-1a 32 bits, hex) para IDs de ocorrência. */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function isoWeekKey(min) {
    // Semana de segunda a domingo; chave = data da segunda-feira
    const p = parts(min);
    const offset = (p.wd + 6) % 7;
    return dayKey(dayStart(min) - offset * 1440);
  }

  AJ.util = {
    clean,
    isEmpty,
    parseDuration,
    parseDateTime,
    parseClock,
    mk,
    parts,
    inferYear,
    dayKey,
    dayStart,
    keyToMin,
    fmtDur,
    fmtDateTime,
    fmtDate,
    WEEKDAYS,
    onlyDigits,
    normCpf,
    fmtCpf,
    normName,
    normMatricula,
    sum,
    nz,
    hash,
    isoWeekKey,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
