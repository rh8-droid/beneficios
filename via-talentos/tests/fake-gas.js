/**
 * Emulação mínima dos serviços do Google Apps Script usados pelo Via Talentos,
 * para rodar o back-end real (arquivos .gs) no Node — testes e servidor de demonstração.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

class FakeRange {
  constructor(sheet, row, col, rows, cols) { Object.assign(this, { sheet, row, col, rows, cols }); }
  getValues() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      const line = [];
      for (let c = 0; c < this.cols; c++) {
        const v = (this.sheet.data[this.row - 1 + r] || [])[this.col - 1 + c];
        line.push(v === undefined ? '' : v);
      }
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    if (values.length !== this.rows || values.some(v => v.length !== this.cols)) throw new Error('Dimensão incompatível em setValues');
    values.forEach((line, r) => {
      const idx = this.row - 1 + r;
      while (this.sheet.data.length <= idx) this.sheet.data.push([]);
      line.forEach((v, c) => { this.sheet.data[idx][this.col - 1 + c] = v; });
    });
    return this;
  }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
}

class FakeSheet {
  constructor(name, data) { this.name = name; this.data = data || []; }
  getName() { return this.name; }
  getRange(row, col, rows = 1, cols = 1) { return new FakeRange(this, row, col, rows, cols); }
  getLastRow() {
    for (let i = this.data.length - 1; i >= 0; i--) if ((this.data[i] || []).some(v => v !== '' && v !== undefined && v !== null)) return i + 1;
    return 0;
  }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, (r || []).length), 0); }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  deleteRow(n) { this.data.splice(n - 1, 1); }
  setFrozenRows() {}
}

class FakeSpreadsheet {
  constructor() { this.sheets = {}; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { this.sheets[n] = new FakeSheet(n); return this.sheets[n]; }
  getSheets() { return Object.values(this.sheets); }
  toJSON() { const o = {}; for (const k in this.sheets) o[k] = this.sheets[k].data; return o; }
  static fromJSON(obj) { const ss = new FakeSpreadsheet(); for (const k in obj) ss.sheets[k] = new FakeSheet(k, obj[k]); return ss; }
}

function formatDate(date, tz, fmt) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(p => [p.type, p.value]));
  return fmt.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day)
    .replace('HH', parts.hour).replace('mm', parts.minute).replace('ss', parts.second);
}

function createBackend(opts = {}) {
  const state = {
    ss: opts.spreadsheet || new FakeSpreadsheet(),
    email: opts.email || 'admin@viadupla.com',
    now: opts.now || null
  };
  const RealDate = Date;
  class ClockDate extends RealDate {
    constructor(...args) { if (args.length === 0 && state.now) super(state.now); else super(...args); }
    static now() { return state.now ? new RealDate(state.now).getTime() : RealDate.now(); }
  }
  const sandbox = {
    console,
    Date: ClockDate,
    Set, Map, JSON, Math, Object, Array, String, Number, RegExp, Error,
    SpreadsheetApp: { getActiveSpreadsheet: () => state.ss, openById: () => state.ss, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    Session: {
      getActiveUser: () => ({ getEmail: () => state.email }),
      getEffectiveUser: () => ({ getEmail: () => state.email })
    },
    Utilities: {
      formatDate,
      getUuid: () => crypto.randomUUID(),
      base64Encode: b => Buffer.from(b).toString('base64'),
      base64Decode: s => Array.from(Buffer.from(s, 'base64')),
      newBlob: (bytes, type, name) => ({ getBytes: () => bytes, getContentType: () => type, getName: () => name })
    },
    DriveApp: (() => {
      const files = {}, folders = {};
      const mkFile = (blob) => { const id = 'F' + crypto.randomUUID().slice(0, 8); const f = { id, blob, trashed: false, getId: () => id, getBlob: () => blob, setTrashed(t) { f.trashed = t; } }; files[id] = f; return f; };
      const mkFolder = (name) => { const id = 'D' + crypto.randomUUID().slice(0, 8); const d = { id, name, getId: () => id, createFile: mkFile }; folders[id] = d; return d; };
      return {
        _files: files,
        createFolder: mkFolder,
        getFolderById(id) { if (!folders[id]) throw new Error('pasta inexistente'); return folders[id]; },
        getFileById(id) { if (!files[id]) throw new Error('arquivo inexistente'); return files[id]; }
      };
    })(),
    HtmlService: { createHtmlOutput: (html) => ({ getBlob: () => ({ getAs: () => ({ getBytes: () => Array.from(Buffer.from('%PDF-1.4\n' + html)) }) }) }) },
    MailApp: { sent: [], getRemainingDailyQuota: () => 100, sendEmail(o) { this.sent.push(o); } },
    ScriptApp: (() => {
      const triggers = [];
      return {
        _triggers: triggers,
        getProjectTriggers: () => triggers.slice(),
        deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
        newTrigger: (fn) => { const b = { timeBased: () => b, everyDays: () => b, atHour: (h) => { b.h = h; return b; }, create: () => { const t = { getHandlerFunction: () => fn, hour: b.h }; triggers.push(t); return t; } }; return b; }
      };
    })()
  };
  vm.createContext(sandbox);
  const dir = opts.dir || path.join(__dirname, '..', 'apps-script');
  fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort().forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f });
  });
  return {
    ctx: sandbox,
    state,
    setUser(email) { state.email = email; sandbox.Auth.reset(); },
    setNow(iso) { state.now = iso; },
    call(action, payload) {
      sandbox.Db.reset();
      const res = JSON.parse(sandbox.api(action, payload));
      return res;
    },
    ok(action, payload) {
      const res = this.call(action, payload);
      if (!res.ok) throw new Error(`${action}: ${res.error}`);
      return res.data;
    },
    run(fnName, ...args) { sandbox.Db.reset(); sandbox.Auth.reset(); return sandbox[fnName](...args); }
  };
}

module.exports = { createBackend, FakeSpreadsheet };
