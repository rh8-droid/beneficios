/*
 * Testes do motor com dados SINTÉTICOS no mesmo layout dos relatórios reais.
 * Executar:  node tests/engine.test.js
 * (usa js/vendor/xlsx.full.min.js; nenhum dado pessoal real é usado)
 */
const assert = require('assert');
const AJ = require('./load.js');
const XLSX = globalThis.XLSX;
const U = AJ.util;

// ---------------------------------------------------------------- fixtures
const MT_HEAD = ['Matrícula', 'Pessoa', 'CPF', 'Interstício', 'Consecutivas', 'Início', 'Fim', 'Placa', 'Total', 'Total Semanal', 'Total de Trabalho', 'Total de Trabalho Semanal', 'Direção', 'Direção Semanal', 'Em Posição', 'Espera', 'Motor', 'Dir. Contínua', 'Refeição', 'Até refeição', 'Repouso', 'Diurnas', 'Noturnas', 'Extras Diurnas', 'Extras Noturnas', 'Extra Domingo', 'Extra Feriado', 'Extra Normal', 'Extra Excedente', 'Outros', 'Período 1', 'Período 2', 'Período 3'];
const N = ' - ';
function mtRow(o) {
  return [o.mat, o.nome, o.cpf, o.inter, o.cons || 1, o.ini, o.fim, o.placa || 'ABC1D23', o.total || N, N, o.trab || '-', N, o.dir || N, N, o.pos || N, o.esp || N, N, o.dirc || N, o.ref || N, N, o.rep || N, o.trab || N, N, o.extra || N, N, o.dom || N, o.fer || N, o.extra || N, N, N, ...(o.per || [])];
}
function mtDay(mat, nome, cpf, dia, sit) {
  return [mat, nome, cpf, sit || 'DSR', 0, `${dia} 00:00`, `${dia} 23:59`, N, '-', '-', '-', '-', ...Array(18).fill(N)];
}
function mtSheet(rows) {
  const aoa = [['Relatório de Jornadas Completas - (02/11 00:00 a 06/11 23:59)'], ['Emitido em: 07/11/2026 10:00:00 por TESTE - (Dados em GMT -03:00)'], [], MT_HEAD, ...rows, [], ['Parâmetros:'], ['Interstício: ', '11:00']];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Jornadas');
  return wb;
}

const RJ_H1 = ['Jornadas', null, null, null, 'Saldo das horas trabalhadas', null, null, null, null, null, 'Refeição', null, null, 'Descanso', null, null, 'Espera', 'Entre Jornada', null, null, null, 'Atividade', 'Diária'];
const RJ_H2 = ['Data', 'Placa', 'Data/Hora Início', 'Data/Hora Fim', 'Hora Normal', 'Hora Normal Noturna', 'Hora Extra 50%', 'Hora Extra 50% Noturna', 'Hora Extra 100%', 'Hora Extra 100% Noturna', 'Início Refeição', 'Fim Refeição', 'Horas Refeição', 'Início Descanso', 'Fim Descanso', 'Horas Descanso', 'Saldo Espera', 'Início Repouso', 'Fim Repouso', 'Entre Jornada', 'Hora Falta Repouso', 'Tempo Atividade', 'Diária'];
const W = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DASH = '—';
function rjRow(o) {
  const wd = W[new Date(Date.UTC(2026, +o.d.slice(3, 5) - 1, +o.d.slice(0, 2))).getUTCDay()];
  const first = `${o.d}/26\n${wd}${o.tag ? '\n' + o.tag : ''}`;
  if (o.allTag) return [first, ...Array(22).fill(o.allTag)];
  if (!o.ini) return [first, DASH, '', '', ...Array(18).fill(DASH), ''];
  return [first, o.placa || 'ABC1D23', o.ini, o.fim || '', o.hn || DASH, DASH, o.he50 || DASH, DASH, o.he100 || DASH, DASH, DASH, DASH, o.ref || DASH, DASH, DASH, DASH, DASH, DASH, DASH, DASH, o.falta || DASH, o.ativ || DASH, 'Inteira'];
}
function rjBook(drivers) {
  const wb = XLSX.utils.book_new();
  for (const d of drivers) {
    const aoa = [['Nome:', d.nome], ['CPF:', d.cpf], ['Cargo:', 'Motorista Carreteiro'], ['Nº Registro da Folha:', d.reg], ['Data de admissão:', '01/01/2020'], ['Empresa:', d.emp || 'EMPRESA TESTE - 00.000.000/0001-00'], ['Nº de Registro INPI:', 'X'], [], RJ_H1, RJ_H2, ...d.rows.map(rjRow)];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), d.nome.slice(0, 31));
  }
  return wb;
}
const toBuf = (wb) => {
  const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return u8;
};

// Motorista A: CPF igual, matrícula diferente. 02/11 feriado; 03/11 OK; 04/11 interjornada curta e sem refeição; 05/11 ausente no RJ
// Motorista B: só no MaxTrack. Motorista C: CPF diferente (vínculo pelo nome); RJ une 2 jornadas do MT em uma.
const mt = mtSheet([
  mtRow({ mat: '10', nome: 'MOTORISTA ALFA', cpf: '11111111111', inter: '30:00', ini: '02/11 06:00', fim: '02/11 15:00', trab: '08:00', ref: '01:00', dir: '05:00', dirc: '03:00', extra: N, per: ['06:00 até 10:00', '11:00 até 15:00'] }),
  mtRow({ mat: '10', nome: 'MOTORISTA ALFA', cpf: '11111111111', inter: '15:00', cons: 2, ini: '03/11 06:00', fim: '03/11 17:00', trab: '10:00', ref: '01:00', dir: '06:00', dirc: '06:10', extra: '02:00', per: ['06:00 até 11:00', '12:00 até 17:00'] }),
  mtRow({ mat: '10', nome: 'MOTORISTA ALFA', cpf: '11111111111', inter: '09:00', cons: 3, ini: '04/11 02:00', fim: '04/11 10:00', trab: '08:00', dir: '04:00', dirc: '02:00', per: ['02:00 até 10:00'] }),
  mtRow({ mat: '10', nome: 'MOTORISTA ALFA', cpf: '11111111111', inter: '20:00', cons: 4, ini: '05/11 06:00', fim: '05/11 15:00', trab: '08:00', ref: '01:00', dir: '04:00', dirc: '02:00', per: ['06:00 até 10:00', '11:00 até 15:00'] }),
  mtDay('10', 'MOTORISTA ALFA', '11111111111', '06/11'),
  mtRow({ mat: '20', nome: 'MOTORISTA BETA', cpf: '22222222222', inter: '40:00', ini: '03/11 08:00', fim: '03/11 17:00', trab: '08:00', ref: '01:00', dir: '04:00', dirc: '02:00', per: ['08:00 até 12:00', '13:00 até 17:00'] }),
  mtRow({ mat: '30', nome: 'MOTORISTA GAMA', cpf: '33333333333', inter: '40:00', ini: '03/11 05:00', fim: '03/11 14:00', trab: '08:00', ref: '01:00', dir: '04:00', dirc: '02:00', per: ['05:00 até 09:00', '10:00 até 14:00'] }),
  mtRow({ mat: '30', nome: 'MOTORISTA GAMA', cpf: '33333333333', inter: '15:00', cons: 2, ini: '04/11 05:00', fim: '04/11 14:00', trab: '08:00', ref: '01:00', dir: '04:00', dirc: '02:00', per: ['05:00 até 09:00', '10:00 até 14:00'] }),
]);
const rj = rjBook([
  {
    nome: 'MOTORISTA ALFA', cpf: '111.111.111-11', reg: '7',
    rows: [
      { d: '01/11', tag: 'DSR', allTag: 'DSR' },
      { d: '02/11', tag: 'Feriado', ini: '02/11 06:00', fim: '02/11 15:00', he100: '08:00', ref: '01:00', ativ: '08:00' },
      { d: '03/11', ini: '03/11 06:00', fim: '03/11 17:00', hn: '08:00', he50: '02:00', ref: '01:00', ativ: '10:00' },
      { d: '04/11', ini: '04/11 02:00', fim: '04/11 10:00', hn: '08:00', ativ: '08:00', falta: '02:00' },
      { d: '05/11' },
      { d: '06/11' },
    ],
  },
  {
    nome: 'MOTORISTA GAMA', cpf: '999.999.999-99', reg: '30',
    rows: [
      { d: '02/11', tag: 'Feriado', allTag: 'Feriado' },
      { d: '03/11', ini: '03/11 05:00', fim: '04/11 14:00', hn: '08:00', he50: '25:00', ref: '02:00', ativ: '33:00' },
      { d: '04/11' },
    ],
  },
  { nome: 'MOTORISTA DELTA', cpf: '444.444.444-44', reg: '40', rows: [{ d: '03/11' }, { d: '02/11', tag: 'Feriado', allTag: 'Feriado' }] },
]);

// ---------------------------------------------------------------- testes
let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    console.error('  ✕ ' + name + '\n    ' + e.message);
    process.exitCode = 1;
  }
}

const mtRes = AJ.parsers.parseFile(toBuf(mt), 'mt.xlsx');
const rjRes = AJ.parsers.parseFile(toBuf(rj), 'rj.xlsx');
const audit = AJ.audit.runAudit({ mt: [mtRes], rj: [rjRes], cfg: {} });
const mot = (n) => audit.motoristas.find((m) => m.nome.includes(n));
const grp = (n, d) => audit.grupos.find((g) => g.nome.includes(n) && g.date === d);
const ocs = (n, tipo) => audit.ocorrencias.filter((o) => o.nome.includes(n) && o.tipo === tipo);

console.log('Leitura');
test('detecta MaxTrack e RasterJor', () => {
  assert.strictEqual(mtRes.sistema, 'maxtrack');
  assert.strictEqual(rjRes.sistema, 'rasterjor');
});
test('lê jornadas e dias sem jornada do MaxTrack', () => {
  assert.strictEqual(mtRes.jornadas.length, 7);
  assert.strictEqual(mtRes.dias.length, 1);
  assert.strictEqual(mtRes.meta.parametros.length, 1);
});
test('normaliza CPF formatado do RasterJor', () => assert.ok(rjRes.motoristas['11111111111']));
test('infere o ano a partir da data de emissão', () => assert.strictEqual(mtRes.jornadas[0].date, '2026-11-02'));
test('reconstrói períodos do MaxTrack', () => assert.strictEqual(mtRes.jornadas[0].periodos.length, 2));

console.log('Conciliação');
test('vincula por CPF mesmo com matrícula diferente', () => {
  assert.strictEqual(mot('ALFA').vinculo, 'CPF');
  assert.strictEqual(ocs('ALFA', 'MATRICULA_DIVERGENTE').length, 1);
});
test('vincula pelo nome quando o CPF diverge', () => {
  assert.strictEqual(mot('GAMA').vinculo, 'NOME');
  assert.strictEqual(ocs('GAMA', 'CPF_DIVERGENTE').length, 1);
});
test('jornada idêntica fica conciliada', () => assert.strictEqual(grp('ALFA', '2026-11-03').status, 'conciliado'));
test('feriado não cadastrado no MaxTrack é reclassificado (conferência, não divergência)', () => {
  const g = grp('ALFA', '2026-11-02');
  assert.strictEqual(g.reclassificado, 'FERIADO');
  assert.strictEqual(g.status, 'conferencia');
  assert.strictEqual(g.diffs.he100, 0);
});
test('jornada ausente no RasterJor é divergente', () => {
  const g = grp('ALFA', '2026-11-05');
  assert.strictEqual(g.tipo, 'AUSENTE_RJ');
  assert.strictEqual(ocs('ALFA', 'JORNADA_AUSENTE_RJ').length, 1);
});
test('motorista só no MaxTrack gera uma ocorrência consolidada', () => {
  assert.strictEqual(mot('BETA').vinculo, 'SO_MT');
  assert.strictEqual(ocs('BETA', 'MOTORISTA_AUSENTE_RJ').length, 1);
  assert.strictEqual(ocs('BETA', 'JORNADA_AUSENTE_RJ').length, 0);
});
test('RasterJor unindo 2 jornadas do MaxTrack é agrupado e explicado', () => {
  const g = grp('GAMA', '2026-11-03');
  assert.strictEqual(g.mtJ.length, 2);
  assert.strictEqual(g.rjJ.length, 1);
  assert.strictEqual(g.uniao, 'RJ');
  assert.strictEqual(g.status, 'divergente');
});
test('motorista só no RasterJor é sinalizado', () => assert.strictEqual(ocs('DELTA', 'MOTORISTA_AUSENTE_MT').length, 1));

console.log('Regras');
test('interjornada < 11h detectada com horas faltantes', () => {
  const o = ocs('ALFA', 'INTERJORNADA');
  assert.strictEqual(o.length, 1);
  assert.strictEqual(o[0].minutos, 120);
  assert.ok(/RasterJor apurou falta de repouso de 02:00/.test(o[0].descricao));
});
test('jornada > 6h sem refeição registrada', () => assert.strictEqual(ocs('ALFA', 'SEM_REFEICAO').length, 1));
test('direção contínua > 5h30', () => assert.strictEqual(ocs('ALFA', 'DIRECAO_CONTINUA')[0].minutos, 40));
test('checks por jornada (ok / falha)', () => {
  const g = grp('ALFA', '2026-11-04');
  assert.strictEqual(g.checks.interjornada, 'falha');
  assert.strictEqual(g.checks.intrajornada, 'falha');
  assert.strictEqual(grp('ALFA', '2026-11-03').checks.direcao, 'falha');
});
test('parâmetro: fracionamento permitido vira inconformidade operacional', () => {
  const a2 = AJ.audit.runAudit({ mt: [mtRes], rj: [rjRes], cfg: { permitirFracionamentoInterjornada: true } });
  assert.strictEqual(a2.ocorrencias.filter((o) => o.tipo === 'INTERJORNADA_FRACIONADA').length, 1);
});

console.log('Folha');
test('HE e horas normais não apuradas', () => {
  const p = audit.folha.resumo.find((x) => x.nome.includes('ALFA'));
  assert.strictEqual(p.normalNaoApurada, 480);
  assert.strictEqual(p.interjornadaFaltante, 120);
});
test('HE computada a maior quando o RasterJor une jornadas', () => {
  const p = audit.folha.resumo.find((x) => x.nome.includes('GAMA'));
  assert.ok(p.he50Indevida > 0);
});
test('simulação financeira com valor hora', () => {
  const F = AJ.payroll.compute({ motoristas: audit.motoristas, grupos: audit.grupos }, audit.ocorrencias, AJ.config.merge(AJ.config.DEFAULTS, { valorHoraPadrao: 20 }));
  const p = F.resumo.find((x) => x.nome.includes('GAMA'));
  assert.ok(Math.abs(p.valorIndevido - (p.he50Indevida / 60) * 20 * 1.5) < 0.01);
});

console.log('Indicadores');
test('KPIs coerentes', () => {
  const k = audit.kpis;
  assert.strictEqual(k.conciliadas + k.conferencia + k.divergentes + k.naoValidadas, k.jornadas);
  assert.ok(k.percConformidade >= 0 && k.percConformidade <= 1);
});
test('IDs de ocorrência estáveis entre execuções', () => {
  const a2 = AJ.audit.runAudit({ mt: [mtRes], rj: [rjRes], cfg: {} });
  assert.deepStrictEqual(a2.ocorrencias.map((o) => o.id).sort(), audit.ocorrencias.map((o) => o.id).sort());
});

console.log(`\n${passed} teste(s) aprovados${process.exitCode ? ' — HÁ FALHAS' : ''}.`);
