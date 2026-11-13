// Carrega o motor no Node para testes: node tests/<script>.js <maxtrack.xlsx> <rasterjor.xlsx>
const path = require('path');
const fs = require('fs');
let XLSX;
XLSX = require(path.join(__dirname, '../js/vendor/xlsx.full.min.js'));
globalThis.XLSX = XLSX;
for (const f of ['util', 'config', 'parsers', 'reconcile', 'rules', 'payroll', 'audit']) {
  const p = path.join(__dirname, '../js/engine', f + '.js');
  if (fs.existsSync(p)) require(p);
}
module.exports = globalThis.AJ;
module.exports.readFile = (p) => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
