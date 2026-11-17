/**
 * Camada de dados: cada aba da planilha é uma tabela; cada linha um objeto.
 * Trocar este arquivo é o único passo necessário para migrar para outro banco.
 */
var Db = (function () {
  var cache = {};
  var ensured = {};
  var ss = null;

  function spreadsheet() {
    if (ss) return ss;
    var id = PropertiesService.getScriptProperties().getProperty(VT.SPREADSHEET_ID_PROPERTY);
    ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Planilha não encontrada. Defina a propriedade de script SPREADSHEET_ID.');
    return ss;
  }

  function keyOf(name) {
    return Object.prototype.hasOwnProperty.call(SCHEMA_KEY, name) ? SCHEMA_KEY[name] : 'ID';
  }

  /** Garante que a aba exista e tenha todas as colunas do esquema. Retorna a aba. */
  function ensure(name) {
    var book = spreadsheet();
    var sheet = book.getSheetByName(name);
    var wanted = SCHEMA[name];
    if (!wanted) throw new Error('Tabela desconhecida: ' + name);
    if (!sheet) {
      sheet = book.insertSheet(name);
    }
    if (ensured[name]) return sheet;

    var lastCol = sheet.getLastColumn();
    var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(Util.str) : [];
    var missing = wanted.filter(function (h) { return headers.indexOf(h) < 0; });
    if (missing.length) {
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      sheet.getRange(1, 1, 1, headers.length + missing.length)
        .setFontWeight('bold').setBackground('#1f1f1f').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    ensured[name] = true;

    // Registros antigos sem ID recebem um identificador (ex.: feriados digitados à mão).
    if (keyOf(name) === 'ID') backfillIds_(name, sheet);
    return sheet;
  }

  function backfillIds_(name, sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    var headers = headersOf(sheet);
    var col = headers.indexOf('ID');
    var range = sheet.getRange(2, col + 1, lastRow - 1, 1);
    var values = range.getValues();
    var changed = false;
    var prefix = name.substr(0, 3).toUpperCase();
    values.forEach(function (r) {
      if (!Util.str(r[0])) { r[0] = Util.id(prefix); changed = true; }
    });
    if (changed) range.setValues(values);
  }

  function headersOf(sheet) {
    var lastCol = sheet.getLastColumn();
    return lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(Util.str) : [];
  }

  function cellToString(v) {
    if (v === null || v === undefined) return '';
    if (Object.prototype.toString.call(v) === '[object Date]') {
      if (isNaN(v.getTime())) return '';
      var full = Utilities.formatDate(v, VT.TZ, 'yyyy-MM-dd HH:mm:ss');
      return /00:00:00$/.test(full) ? full.substr(0, 10) : full;
    }
    return String(v).trim();
  }

  /** Todas as linhas como objetos ({_row} guarda a linha física). */
  function all(name) {
    if (cache[name]) return cache[name];
    var sheet = ensure(name);
    var lastRow = sheet.getLastRow();
    var headers = headersOf(sheet);
    var rows = [];
    if (lastRow >= 2) {
      var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      values.forEach(function (r, i) {
        var empty = r.every(function (c) { return c === '' || c === null; });
        if (empty) return;
        var obj = { _row: i + 2 };
        headers.forEach(function (h, j) { if (h) obj[h] = cellToString(r[j]); });
        rows.push(obj);
      });
    }
    cache[name] = rows;
    return rows;
  }

  function find(name, key) {
    var k = keyOf(name);
    var target = Util.norm(key);
    for (var i = 0, list = all(name); i < list.length; i++) {
      if (Util.norm(list[i][k]) === target) return list[i];
    }
    return null;
  }

  function rowValues_(headers, obj) {
    return headers.map(function (h) {
      var v = obj[h];
      return v === null || v === undefined ? '' : String(v);
    });
  }

  function insert(name, obj) {
    return insertMany(name, [obj])[0];
  }

  function insertMany(name, list) {
    if (!list.length) return [];
    var sheet = ensure(name);
    var headers = headersOf(sheet);
    var k = keyOf(name);
    var start = sheet.getLastRow() + 1;
    var saved = list.map(function (obj, i) {
      var copy = {};
      Object.keys(obj).forEach(function (key) { if (key !== '_row') copy[key] = obj[key]; });
      if (k === 'ID' && !copy.ID) copy.ID = Util.id(name.substr(0, 3).toUpperCase());
      copy._row = start + i;
      return copy;
    });
    var range = sheet.getRange(start, 1, saved.length, headers.length);
    range.setNumberFormat('@');
    range.setValues(saved.map(function (o) { return rowValues_(headers, o); }));
    if (cache[name]) saved.forEach(function (o) { cache[name].push(o); });
    return saved;
  }

  function update(name, key, patch) {
    var current = find(name, key);
    if (!current) throw UserError('Registro não encontrado em ' + name + ': ' + key);
    var sheet = ensure(name);
    var headers = headersOf(sheet);
    Object.keys(patch).forEach(function (h) {
      if (h !== '_row' && h !== keyOf(name)) current[h] = patch[h];
    });
    var range = sheet.getRange(current._row, 1, 1, headers.length);
    range.setNumberFormat('@');
    range.setValues([rowValues_(headers, current)]);
    return current;
  }

  function remove(name, key) {
    var current = find(name, key);
    if (!current) throw UserError('Registro não encontrado em ' + name + ': ' + key);
    ensure(name).deleteRow(current._row);
    delete cache[name];
    return true;
  }

  function config(key) {
    var row = find('Config', key);
    var v = row ? Util.str(row.Valor) : '';
    if (v === '' && Object.prototype.hasOwnProperty.call(VT.CONFIG_PADRAO, key)) return VT.CONFIG_PADRAO[key];
    return v;
  }

  /** Executa fn com o lock do script (evita códigos/duplicidades em gravações simultâneas). */
  function withLock(fn) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw UserError('Sistema ocupado. Tente novamente em alguns segundos.');
    try {
      cache = {}; // relê dados frescos dentro do lock
      return fn();
    } finally {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
  }

  function reset() { cache = {}; ensured = {}; ss = null; }

  return {
    spreadsheet: spreadsheet, ensure: ensure, all: all, find: find, insert: insert,
    insertMany: insertMany, update: update, remove: remove, config: config,
    withLock: withLock, reset: reset
  };
})();

/** Registra uma linha na trilha de auditoria. */
function logHistory_(tipo, refId, de, para, nota) {
  Db.insert('Historico', {
    ID: Util.id('HIS'), Tipo: tipo, ReferenciaID: refId, De: de || '', Para: para || '',
    DataHora: Util.now(), Usuario: Auth.email(), Nota: nota || ''
  });
}
