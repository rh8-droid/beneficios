const test = require('node:test');
const assert = require('node:assert');
const { createBackend } = require('./fake-gas');

function setup() {
  const b = createBackend({ now: '2026-11-17T13:00:00Z', email: 'admin@viadupla.com' });
  b.run('setup');
  const cad = (tabela, registro) => b.ok('saveCadastro', { tabela, registro });
  cad('Unidades', { Empresa: 'Via Dupla', Nome: 'Araucária/PR' });
  cad('Departamentos', { Nome: 'Transporte' });
  cad('Cargos', { Nome: 'Motorista Carreteiro', Departamento: 'Transporte' });
  cad('Cargos', { Nome: 'Conferente', Departamento: 'Transporte' });
  cad('Gestores', { Nome: 'Gestor Transporte', Email: 'gestor@viadupla.com' });
  cad('Analistas', { Nome: 'Analista Um', Email: 'ana1@viadupla.com' });
  cad('Analistas', { Nome: 'Analista Dois', Email: 'ana2@viadupla.com' });
  cad('Usuarios', { Email: 'ana1@viadupla.com', Nome: 'Analista Um', Perfil: 'Analista RH' });
  cad('Usuarios', { Email: 'gestor@viadupla.com', Nome: 'Gestor Transporte', Perfil: 'Gestor' });
  const base = { Empresa: 'Via Dupla', Unidade: 'Araucária/PR', Departamento: 'Transporte', Gestor: 'Gestor Transporte', MotivoAbertura: 'Aumento de quadro', TipoContrato: 'CLT', SalarioACombinar: 'Sim', Prioridade: 'Alta' };
  const nova = (o) => b.ok('saveVaga', Object.assign({}, base, o));
  const v1 = nova({ Cargo: 'Motorista Carreteiro', Analista: 'Analista Um', QtdPosicoes: 2, DataAbertura: '2026-09-01', DataAprovacao: '2026-09-01' });
  b.ok('fillPosition', { id: v1.posicoes[0].ID, data: '2026-09-10', nome: 'A' });
  b.ok('fillPosition', { id: v1.posicoes[1].ID, data: '2026-10-05', nome: 'B' });
  const v2 = nova({ Cargo: 'Motorista Carreteiro', Analista: 'Analista Dois', QtdPosicoes: 1, DataAbertura: '2026-10-01', DataAprovacao: '2026-10-01' });
  const v3 = nova({ Cargo: 'Conferente', Analista: 'Analista Um', QtdPosicoes: 3, DataAbertura: '2026-11-03', DataAprovacao: '2026-11-03' });
  const cd = b.ok('addCandidatura', { vagaId: v3.ID, candidato: { Nome: 'Pessoa Teste Um', Telefone: '41999990001' }, Origem: 'LinkedIn' });
  b.ok('moveCandidatura', { id: cd.ID, etapa: 'Reprovado / desistente', motivoReprovacao: 'Pretensão salarial incompatível' });
  const cd2 = b.ok('addCandidatura', { vagaId: v3.ID, candidato: { Nome: 'Pessoa Teste Dois', Telefone: '41999990002' }, Origem: 'Site' });
  b.ok('saveEntrevista', { CandidaturaID: cd2.ID, Tipo: 'RH', Agendamento: '2026-11-18T10:00', Entrevistador: 'Analista Um' });
  return { b, v1, v2, v3 };
}

test('os 11 relatórios geram colunas e linhas coerentes', () => {
  const { b } = setup();
  const tipos = Object.keys(b.ok('lookups').relatorios);
  assert.strictEqual(tipos.length, 11);
  for (const t of tipos) {
    const r = b.ok('relatorio', { tipo: t, filtros: {} });
    assert.ok(r.colunas.length > 2, t);
    r.linhas.forEach(l => assert.strictEqual(l.length, r.colunas.length, t + ' largura da linha'));
  }
  const geral = b.ok('relatorio', { tipo: 'geral', filtros: { Cargo: 'Motorista Carreteiro' } });
  assert.strictEqual(geral.linhas.length, 2);
  const sla = b.ok('relatorio', { tipo: 'sla', filtros: {} });
  const v1 = sla.linhas.find(l => l[1] === 'Motorista Carreteiro' && l[13].startsWith('Concluída'));
  assert.strictEqual(v1[13], 'Concluída com atraso'); // 01/09 → 05/10 > 15 d.u.
  const rep = b.ok('relatorio', { tipo: 'reprovacao', filtros: {} });
  assert.deepStrictEqual(rep.linhas[0].slice(0, 3), ['Pretensão salarial incompatível', 1, '100%']);
});

test('recorrência separa requisições, posições, preenchidas e compara períodos', () => {
  const { b } = setup();
  const r = b.ok('recorrencia', { de: '2026-09-01', ate: '2026-11-30', deB: '2026-01-01', ateB: '2026-08-31' });
  const mot = r.cargos.find(c => c.cargo === 'Motorista Carreteiro');
  assert.strictEqual(mot.requisicoes, 2);
  assert.strictEqual(mot.posicoes, 3);
  assert.strictEqual(mot.preenchidas, 2);
  assert.strictEqual(mot.porMes['2026-09'], 1);
  assert.strictEqual(r.comparacao.find(c => c.cargo === 'Motorista Carreteiro').variacao, -2);
});

test('produtividade separa espera do RH e de áreas externas', () => {
  const { b } = setup();
  const p = b.ok('produtividade', {}).analistas;
  const um = p.find(x => x.analista === 'Analista Um');
  assert.strictEqual(um.vagas, 2);
  assert.strictEqual(um.preenchidas, 2);
  assert.strictEqual(um.candidaturas, 2);
  assert.ok('esperaExterna' in um && 'esperaRH' in um);
});

test('PDF do relatório é gerado', () => {
  const { b } = setup();
  const pdf = b.ok('relatorioPdf', { tipo: 'geral', filtros: {} });
  assert.match(pdf.nome, /\.pdf$/);
  assert.match(Buffer.from(pdf.base64, 'base64').toString(), /^%PDF/);
});

test('alertas: vencida, entrevista amanhã e filtro por perfil; e-mail diário e gatilho', () => {
  const { b } = setup();
  const a = b.ok('alertas');
  assert.ok(a.alertas.some(x => x.tipo === 'vencida' && x.vaga.includes('Motorista')));
  assert.ok(a.alertas.some(x => x.tipo === 'entrevista'));
  const vencida = a.alertas.find(x => x.tipo === 'vencida');
  assert.match(vencida.texto, /Responsável pela próxima ação/);
  b.setUser('ana1@viadupla.com');
  const meus = b.ok('alertas').alertas.filter(x => x.meu);
  assert.ok(meus.every(x => x.analista === 'Analista Um'));
  b.setUser('admin@viadupla.com');
  assert.strictEqual(b.ok('configurarAlertasEmail', { ativar: true, hora: 8 }).ativo, true);
  assert.strictEqual(b.ctx.ScriptApp._triggers.length, 1);
  b.ok('configurarAlertasEmail', { ativar: true, hora: 9 });
  assert.strictEqual(b.ctx.ScriptApp._triggers.length, 1);
  const msg = b.run('enviarAlertasEmailAgendado');
  assert.match(msg, /e-mail/);
  assert.ok(b.ctx.MailApp.sent.length >= 2);
  assert.ok(b.ctx.MailApp.sent.every(m => /Via Talentos/.test(m.subject)));
  assert.match(b.run('enviarAlertasEmailAgendado'), /já enviados/);
});

test('importação da planilha antiga com cabeçalho mesclado, sem duplicar', () => {
  const { b } = setup();
  const sh = b.state.ss.insertSheet('RECRUTAMENTO');
  sh.data = [
    ['', 'VIA DUPLA TRANSPORTES'],
    ['', 'ABERTURA DA VAGA', 'ANALISTA RESPONSÁVEL', 'FUNÇÃO', 'SETOR', 'VAGAS', 'RECRUTAMENTO E SELEÇÃO', '', '', '', 'PROCESSO ADMISSIONAL'],
    ['', '', '', '', '', '', 'STATUS DO PROCESSO', 'Vagas fechadas', 'Data Aprovação', 'Candidato Aprovado', 'Data de Contratação'],
    ['', '14/09/2023', 'Camila', 'Instrutor', 'Transporte', 1, 'Vaga cancelada', 0, '', 'Vaga cancelada', ''],
    ['1° semestre 2024', '15/01/2024', 'Camila', 'Analista de Qualidade', 'Qualidade', 1, 'Finalizado', 1, '31/01/2024', 'Cirlei Idalino', '04/03/2024'],
    ['', new Date(Date.UTC(2026, 10, 10, 12)), 'Ari', 'Conferente', 'Logística', 2, 'Entrevista com gestor', 0, '', '', ''],
    ['', 'xx', 'Ari', 'Sem data', 'Logística', 1, 'Finalizado', 1, '', '', '']
  ];
  assert.ok(b.ok('listAbasPlanilha').includes('RECRUTAMENTO'));
  const pv = b.ok('previewImportacao', { aba: 'RECRUTAMENTO', empresa: 'Via Dupla' });
  assert.strictEqual(pv.novas, 3);
  assert.strictEqual(pv.invalidas.length, 1);
  assert.deepStrictEqual(pv.amostra.map(x => x.status), ['Cancelada', 'Concluída / contratada', 'Entrevistas com gestor']);
  const r = b.ok('executarImportacao', { aba: 'RECRUTAMENTO', empresa: 'Via Dupla' });
  assert.strictEqual(r.importadas, 3);
  assert.strictEqual(b.ok('executarImportacao', { aba: 'RECRUTAMENTO', empresa: 'Via Dupla' }).importadas, 0);
  const vagas = b.ok('listVagas', {});
  const q = vagas.find(v => v.Cargo === 'Analista de Qualidade');
  assert.strictEqual(q.Status, 'Concluída / contratada');
  assert.strictEqual(q.DataFechamento, '2024-01-31');
  assert.strictEqual(q.Codigo, 'VD-2024-0001');
  assert.strictEqual(q.sla.cumprido, true);
  const conf = vagas.find(v => v.Cargo === 'Conferente' && v.ImportKey);
  assert.strictEqual(conf.posicoesAbertas, 2);
  b.setUser('ana1@viadupla.com');
  assert.strictEqual(b.call('executarImportacao', { aba: 'RECRUTAMENTO' }).ok, false);
});

test('importação somente com movimentação no período e desfazer importação', () => {
  const { b } = setup();
  const sh = b.state.ss.insertSheet('RECRUTAMENTO');
  sh.data = [
    ['', 'ABERTURA DA VAGA', 'ANALISTA RESPONSÁVEL', 'FUNÇÃO', 'SETOR', 'VAGAS', 'RECRUTAMENTO E SELEÇÃO'],
    ['', '', '', '', '', '', 'STATUS DO PROCESSO', 'Vagas fechadas', 'Data Aprovação'],
    ['', '10/01/2026', 'Ari', 'Antiga', 'X', 1, 'Finalizado', 1, '20/01/2026'],
    ['', '07/08/2026', 'Ari', 'Aberta antes, fechada no período', 'X', 1, 'Finalizado', 1, '09/09/2026'],
    ['', '20/08/2026', 'Ari', 'Aberta no período', 'X', 1, 'Finalizado', 1, '31/08/2026'],
    ['', '02/09/2026', 'Ari', 'Sem data de fechamento', 'X', 1, 'Finalizado', 1, ''],
    ['', '01/09/2026', 'Ari', 'Pausada', 'X', 1, 'Pausado', 0, '']
  ];
  const pv = b.ok('previewImportacao', { aba: 'RECRUTAMENTO', empresa: 'Via Dupla', desde: '2026-08-17' });
  assert.strictEqual(pv.novas, 3);
  assert.strictEqual(pv.foraPeriodo, 1);
  assert.strictEqual(pv.invalidas.length, 1);
  assert.ok(pv.amostra.some(x => x.status === 'Suspensa'));
  assert.strictEqual(b.ok('executarImportacao', { aba: 'RECRUTAMENTO', empresa: 'Via Dupla', desde: '2026-08-17' }).importadas, 3);
  const antes = b.ok('listVagas', {}).length;
  const r = b.ok('desfazerImportacao', { aba: 'RECRUTAMENTO' });
  assert.strictEqual(r.removidas, 3);
  assert.strictEqual(b.ok('listVagas', {}).length, antes - 3);
  assert.ok(b.ok('listVagas', {}).length >= 3); // vagas criadas no sistema continuam
});
