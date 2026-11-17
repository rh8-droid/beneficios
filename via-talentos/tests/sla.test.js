const test = require('node:test');
const assert = require('node:assert');
const { createBackend } = require('./fake-gas');

const { ctx } = createBackend();
const { Sla } = ctx;
const H = new ctx.Set(['2026-11-20']); // Consciência Negra (sexta)

test('dias úteis entre datas ignoram fim de semana', () => {
  assert.strictEqual(Sla.businessDaysBetween('2026-11-13', '2026-11-17'), 2); // sex → ter
  assert.strictEqual(Sla.businessDaysBetween('2026-11-17', '2026-11-17'), 0);
  assert.strictEqual(Sla.businessDaysBetween('2026-11-18', '2026-11-17'), 0);
});

test('feriado da unidade não conta', () => {
  assert.strictEqual(Sla.businessDaysBetween('2026-11-19', '2026-11-23'), 2);
  assert.strictEqual(Sla.businessDaysBetween('2026-11-19', '2026-11-23', H), 1);
});

test('prazo de 15 dias úteis', () => {
  assert.strictEqual(Sla.addBusinessDays('2026-11-02', 15), '2026-11-23');
  assert.strictEqual(Sla.addBusinessDays('2026-11-02', 15, H), '2026-11-24');
});

test('semáforo 9/12/15', () => {
  const lvl = d => Sla.compute({ inicio: '2026-01-01', referencia: Sla.addBusinessDays('2026-01-01', d), slaDias: 15 }).nivel;
  assert.strictEqual(lvl(9), 'verde');
  assert.strictEqual(lvl(10), 'amarelo');
  assert.strictEqual(lvl(12), 'amarelo');
  assert.strictEqual(lvl(13), 'laranja');
  assert.strictEqual(lvl(15), 'laranja');
  assert.strictEqual(lvl(16), 'vermelho');
});

test('cálculo completo com atraso e percentual', () => {
  const r = Sla.compute({ inicio: '2026-11-02', referencia: '2026-11-25', slaDias: 15, holidays: H, fechado: true });
  assert.strictEqual(r.diasDecorridos, 16);
  assert.strictEqual(r.atraso, 1);
  assert.strictEqual(r.cumprido, false);
  assert.strictEqual(r.prazoOriginal, '2026-11-24');
  assert.strictEqual(r.percentual, 107);
});

test('suspensão autorizada pausa a contagem e preserva o prazo original', () => {
  const r = Sla.compute({
    inicio: '2026-11-02', referencia: '2026-11-25', slaDias: 15,
    suspensions: [{ inicio: '2026-11-09', fim: '2026-11-11', pausa: true }]
  });
  assert.strictEqual(r.diasPausados, 2); // 09 e 10
  assert.strictEqual(r.diasEfetivos, r.diasDecorridos - 2);
  assert.strictEqual(r.prazoOriginal, '2026-11-23');
  assert.strictEqual(r.prazoAjustado, '2026-11-25');
});

test('suspensão sem pausa não altera o SLA', () => {
  const r = Sla.compute({ inicio: '2026-11-02', referencia: '2026-11-25', slaDias: 15, suspensions: [{ inicio: '2026-11-09', fim: '2026-11-11', pausa: false }] });
  assert.strictEqual(r.diasPausados, 0);
});

test('suspensão em aberto pausa até a referência', () => {
  const r = Sla.compute({ inicio: '2026-11-02', referencia: '2026-11-13', slaDias: 15, suspensions: [{ inicio: '2026-11-12', fim: '', pausa: true }] });
  assert.strictEqual(r.diasPausados, 2);
  assert.strictEqual(r.diasEfetivos, 7);
});

test('exceção acrescenta dias ao limite', () => {
  const r = Sla.compute({ inicio: '2026-11-02', referencia: '2026-11-24', slaDias: 15, extras: 3 });
  assert.strictEqual(r.limite, 18);
  assert.strictEqual(r.diasRestantes, 2);
  assert.strictEqual(r.prazoOriginal, '2026-11-23');
});
