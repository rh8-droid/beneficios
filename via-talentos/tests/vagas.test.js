const test = require('node:test');
const assert = require('node:assert');
const { createBackend } = require('./fake-gas');

function setupBackend() {
  const b = createBackend({ now: '2026-11-17T13:00:00Z', email: 'admin@viadupla.com' });
  b.run('setup');
  const cad = (tabela, registro) => b.ok('saveCadastro', { tabela, registro });
  cad('Unidades', { Empresa: 'Via Dupla', Nome: 'Araucária/PR', Cidade: 'Araucária', UF: 'PR' });
  cad('Departamentos', { Nome: 'Gestão de Pessoas' });
  cad('Cargos', { Nome: 'Analista de Gestão de Pessoas', Departamento: 'Gestão de Pessoas' });
  cad('Gestores', { Nome: 'Gestora Teste', Email: 'gestora@viadupla.com' });
  cad('Analistas', { Nome: 'Analista Um', Email: 'ana1@viadupla.com' });
  cad('Analistas', { Nome: 'Analista Dois', Email: 'ana2@viadupla.com' });
  cad('Usuarios', { Email: 'ana1@viadupla.com', Nome: 'Analista Um', Perfil: 'Analista RH' });
  cad('Usuarios', { Email: 'ana2@viadupla.com', Nome: 'Analista Dois', Perfil: 'Analista RH' });
  cad('Usuarios', { Email: 'gestora@viadupla.com', Nome: 'Gestora Teste', Perfil: 'Gestor' });
  cad('Usuarios', { Email: 'diretor@viadupla.com', Nome: 'Diretor', Perfil: 'Direção' });
  return b;
}

const base = {
  Empresa: 'Via Dupla', Unidade: 'Araucária/PR', Cargo: 'Analista de Gestão de Pessoas', Departamento: 'Gestão de Pessoas',
  Gestor: 'Gestora Teste', Analista: 'Analista Um', QtdPosicoes: 2, DataAbertura: '2026-10-26',
  MotivoAbertura: 'Aumento de quadro', TipoContrato: 'CLT', Modalidade: 'Presencial', Horario: '08h às 18h',
  SalarioACombinar: 'Sim', Requisitos: 'Superior em RH', Atribuicoes: 'Rotinas de DP', Beneficios: 'VR; Plano de saúde', Prioridade: 'Alta'
};

test('abre vaga com código, posições e histórico; SLA só após aprovação', () => {
  const b = setupBackend();
  const v = b.ok('saveVaga', base);
  assert.match(v.Codigo, /^VD-2026-0001$/);
  assert.strictEqual(v.Status, 'Aguardando aprovação');
  assert.strictEqual(v.posicoes.length, 2);
  assert.strictEqual(v.sla.iniciado, false);
  assert.ok(v.historico.length >= 1);

  const v2 = b.ok('saveVaga', base);
  assert.strictEqual(v2.Codigo, 'VD-2026-0002');

  const ap = b.ok('changeVagaStatus', { id: v.ID, status: 'Aberta / recebendo candidaturas', data: '2026-10-27' });
  assert.strictEqual(ap.DataAprovacao, '2026-10-27');
  assert.strictEqual(ap.sla.iniciado, true);
  // 27/10 → 17/11: 15 dias úteis (Finados 02/11 não cadastrado)
  assert.strictEqual(ap.sla.diasDecorridos, 15);
  assert.strictEqual(ap.sla.nivel, 'laranja');
});

test('validações de campos obrigatórios', () => {
  const b = setupBackend();
  let r = b.call('saveVaga', Object.assign({}, base, { Cargo: '', QtdPosicoes: 0 }));
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /Cargo é obrigatório/);
  assert.match(r.error, /posições/);
  r = b.call('saveVaga', Object.assign({}, base, { MotivoAbertura: 'Substituição' }));
  assert.match(r.error, /colaborador substituído/);
  r = b.call('saveVaga', Object.assign({}, base, { SalarioACombinar: 'Não', Salario: '' }));
  assert.match(r.error, /faixa salarial/);
});

test('preenchimento das posições conclui a vaga e mede SLA por posição', () => {
  const b = setupBackend();
  b.run('cadastrarFeriadosNacionais', 2026);
  let v = b.ok('saveVaga', Object.assign({}, base, { DataAprovacao: '2026-10-26' }));
  assert.strictEqual(v.Status, 'Aprovada / aguardando divulgação');
  v = b.ok('fillPosition', { id: v.posicoes[0].ID, data: '2026-11-05', nome: 'Pessoa A' });
  assert.notStrictEqual(v.Status, 'Concluída / contratada');
  v = b.ok('fillPosition', { id: v.posicoes[1].ID, data: '2026-11-17', nome: 'Pessoa B' });
  assert.strictEqual(v.Status, 'Concluída / contratada');
  assert.strictEqual(v.DataFechamento, '2026-11-17');
  const [p1, p2] = v.sla.posicoes;
  assert.strictEqual(p1.cumprido, true);
  assert.strictEqual(p2.diasDecorridos, 15); // 26/10→17/11 sem 02/11 (Finados)
  assert.strictEqual(p2.cumprido, true);
  assert.strictEqual(v.sla.cumprido, true);

  // edição de vaga concluída é bloqueada
  assert.strictEqual(b.call('saveVaga', Object.assign({}, base, { ID: v.ID })).ok, false);

  // reabertura da posição reabre a vaga e conta reabertura
  const r = b.call('reopenPosition', { id: p2.posicaoId, justificativa: '' });
  assert.match(r.error, /Justificativa/);
  v = b.ok('reopenPosition', { id: p2.posicaoId, justificativa: 'Desistiu no período de experiência' });
  assert.strictEqual(v.Status, 'Aberta / recebendo candidaturas');
  assert.strictEqual(v.Reaberturas, '1');
  assert.strictEqual(v.DataFechamento, '');
});

test('não conclui com posições abertas; cancelamento exige justificativa', () => {
  const b = setupBackend();
  const v = b.ok('saveVaga', Object.assign({}, base, { DataAprovacao: '2026-11-02' }));
  assert.match(b.call('changeVagaStatus', { id: v.ID, status: 'Concluída / contratada' }).error, /posição/);
  assert.match(b.call('changeVagaStatus', { id: v.ID, status: 'Cancelada' }).error, /Justificativa/);
  const c = b.ok('changeVagaStatus', { id: v.ID, status: 'Cancelada', justificativa: 'Orçamento' });
  assert.ok(c.posicoes.every(p => p.Status === 'Cancelada'));
  assert.strictEqual(c.sla.nivel, 'neutro');
});

test('suspensão registra início/fim e pausa o SLA', () => {
  const b = setupBackend();
  let v = b.ok('saveVaga', Object.assign({}, base, { DataAprovacao: '2026-11-02' }));
  v = b.ok('changeVagaStatus', { id: v.ID, status: 'Suspensa', justificativa: 'Gestor em férias', data: '2026-11-09' });
  assert.strictEqual(v.suspensoes.length, 1);
  assert.strictEqual(v.suspensoes[0].Fim, '');
  v = b.ok('changeVagaStatus', { id: v.ID, status: 'Entrevistas com gestor', data: '2026-11-16' });
  assert.strictEqual(v.suspensoes[0].Fim, '2026-11-16');
  assert.strictEqual(v.sla.diasPausados, 5);
  assert.strictEqual(v.sla.prazoOriginal, '2026-11-23');
  assert.notStrictEqual(v.sla.prazoAjustado, v.sla.prazoOriginal);
});

test('exceção de SLA só pelo administrador', () => {
  const b = setupBackend();
  let v = b.ok('saveVaga', Object.assign({}, base, { DataAprovacao: '2026-11-02' }));
  b.setUser('ana1@viadupla.com');
  assert.strictEqual(b.call('addSlaException', { id: v.ID, dias: 3, justificativa: 'x' }).ok, false);
  b.setUser('admin@viadupla.com');
  v = b.ok('addSlaException', { id: v.ID, dias: 3, justificativa: 'Exame admissional reagendado pela clínica' });
  assert.strictEqual(v.sla.limite, 18);
});

test('perfis: gestor só vê suas vagas e não edita; analista só edita as suas', () => {
  const b = setupBackend();
  const v1 = b.ok('saveVaga', base);
  b.ok('saveVaga', Object.assign({}, base, { Gestor: 'Outro Gestor', Analista: 'Analista Dois' }));

  b.setUser('gestora@viadupla.com');
  const lista = b.ok('listVagas', {});
  assert.strictEqual(lista.length, 1);
  assert.strictEqual(b.call('saveVaga', base).ok, false);

  b.setUser('ana2@viadupla.com');
  assert.match(b.call('changeVagaStatus', { id: v1.ID, status: 'Cancelada', justificativa: 'x' }).error, /sob sua responsabilidade/);

  b.setUser('diretor@viadupla.com');
  assert.strictEqual(b.ok('listVagas', {}).length, 2);
  assert.strictEqual(b.call('saveVaga', base).ok, false);

  b.setUser('intruso@gmail.com');
  assert.match(b.call('listVagas', {}).error, /não autorizado/);
});

test('cadastros: duplicidade e inativação', () => {
  const b = setupBackend();
  assert.match(b.call('saveCadastro', { tabela: 'Cargos', registro: { Nome: 'analista de gestão de pessoas' } }).error, /Já existe/);
  const cargos = b.ok('listCadastro', { tabela: 'Cargos' });
  const after = b.ok('deleteCadastro', { tabela: 'Cargos', key: cargos[0].ID });
  assert.strictEqual(after[0].Ativo, 'Não');
  assert.strictEqual(b.ok('lookups').cargos.length, 0);
});

test('dashboard calcula indicadores a partir dos registros', () => {
  const b = setupBackend();
  const a = b.ok('saveVaga', Object.assign({}, base, { DataAprovacao: '2026-10-01', DataAbertura: '2026-10-01', QtdPosicoes: 1 }));
  b.ok('fillPosition', { id: a.posicoes[0].ID, data: '2026-10-30', nome: 'Atrasado' }); // > 15 dias úteis
  const c = b.ok('saveVaga', Object.assign({}, base, { DataAprovacao: '2026-11-10', DataAbertura: '2026-11-10', QtdPosicoes: 3 }));
  b.ok('fillPosition', { id: c.posicoes[0].ID, data: '2026-11-12', nome: 'Rápido' });
  b.ok('saveVaga', Object.assign({}, base, { DataAbertura: '2026-11-16', QtdPosicoes: 1 })); // aguardando aprovação
  const d = b.ok('dashboard', {});
  assert.strictEqual(d.cards.vagasAbertas, 2);
  assert.strictEqual(d.cards.posicoesDisponiveis, 3);
  assert.strictEqual(d.cards.abertasNoMes, 2);
  assert.strictEqual(d.cards.encerradasNoMes, 0);
  assert.strictEqual(d.cards.foraDoSlaConcluidas, 1);
  assert.strictEqual(d.cards.contratacoes, 2);
  assert.strictEqual(d.cards.taxaSla, 50);
  assert.strictEqual(d.graficos.mensal.length, 12);
  assert.strictEqual(d.graficos.mensal.at(-1).label, '2026-11');
  assert.strictEqual(d.graficos.mensal.at(-2).fechadas, 1);
  assert.ok(d.graficos.tempoEtapa.length > 0);
  assert.ok(d.alertas.some(x => !x.sla.iniciado));
  const filtrado = b.ok('dashboard', { Status: 'Concluída / contratada' });
  assert.strictEqual(filtrado.cards.vagasAbertas, 0);
});
