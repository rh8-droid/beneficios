/*
 * Executa a auditoria em relatórios reais pela linha de comando (resumo agregado).
 *   node tests/run-real.js <maxtrack.xlsx> <rasterjor.xlsx>
 */
const AJ = require('./load.js');
const U = AJ.util;
const [mtPath, rjPath] = process.argv.slice(2);
if (!mtPath || !rjPath) {
  console.error('Uso: node tests/run-real.js <maxtrack.xlsx> <rasterjor.xlsx>');
  process.exit(1);
}
const t0 = Date.now();
const mt = AJ.parsers.parseFile(AJ.readFile(mtPath), mtPath, { forceSystem: 'maxtrack' });
const rj = AJ.parsers.parseFile(AJ.readFile(rjPath), rjPath, { forceSystem: 'rasterjor' });
const a = AJ.audit.runAudit({ mt: [mt], rj: [rj], cfg: {} });
const k = a.kpis;
console.log(`Período ${a.periodo.ini} a ${a.periodo.fim} · processado em ${Date.now() - t0} ms`);
console.log(`MaxTrack: ${a.meta.mt.motoristas} motoristas, ${a.meta.mt.jornadas} jornadas | RasterJor: ${a.meta.rj.motoristas} motoristas, ${a.meta.rj.jornadas} jornadas`);
console.log(`Jornadas: ${k.jornadas} (conciliadas ${k.conciliadas}, conferência ${k.conferencia}, divergentes ${k.divergentes}; ausentes no RJ ${k.ausentesRJ}, ausentes no MT ${k.ausentesMT})`);
console.log(`Horas divergentes ${U.fmtDur(k.horasDivergentes)} · HE50 ${U.fmtDur(k.he50Divergentes)} · HE100 ${U.fmtDur(k.he100Divergentes)}`);
console.log(`Conformidade ${(k.percConformidade * 100).toFixed(1)}% · conciliação ${(k.percConciliacao * 100).toFixed(1)}%`);
const c = {};
for (const o of a.ocorrencias) c[`${o.categoria} | ${o.nomeTipo}`] = (c[`${o.categoria} | ${o.nomeTipo}`] || 0) + 1;
console.table(Object.entries(c).sort((x, y) => y[1] - x[1]).map(([t, n]) => ({ ocorrencia: t, qtd: n })));
const T = a.folha.totais;
console.log('Folha:', Object.fromEntries(Object.entries(T).filter(([, v]) => v !== null).map(([kk, v]) => [kk, /valor/.test(kk) ? v : U.fmtDur(v)])));
