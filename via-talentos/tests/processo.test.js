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
  cad('Gestores', { Nome: 'Gestor Transporte', Email: 'gestor@viadupla.com' });
  cad('Analistas', { Nome: 'Analista Um', Email: 'ana1@viadupla.com' });
  cad('Usuarios', { Email: 'ana1@viadupla.com', Nome: 'Analista Um', Perfil: 'Analista RH' });
  cad('Usuarios', { Email: 'gestor@viadupla.com', Nome: 'Gestor Transporte', Perfil: 'Gestor' });
  cad('Usuarios', { Email: 'dir@viadupla.com', Nome: 'Diretor', Perfil: 'Direção' });
  const vaga = b.ok('saveVaga', {
    Empresa: 'Via Dupla', Unidade: 'Araucária/PR', Cargo: 'Motorista Carreteiro', Departamento: 'Transporte',
    Gestor: 'Gestor Transporte', Analista: 'Analista Um', QtdPosicoes: 2, DataAbertura: '2026-11-02', DataAprovacao: '2026-11-03',
    MotivoAbertura: 'Aumento de quadro', TipoContrato: 'CLT', SalarioACombinar: 'Sim', Prioridade: 'Alta'
  });
  return { b, vaga };
}
const pessoa = (n, extra) => Object.assign({ Nome: 'Candidato ' + n + ' Silva', Email: `c${n}@mail.com`, Telefone: `(41) 99999-00${String(n).padStart(2, '0')}`, Origem: 'Site' }, extra);

test('cadastro de candidato bloqueia duplicidade por CPF, e-mail e telefone', () => {
  const { b } = setup();
  const c = b.ok('saveCandidato', pessoa(1, { CPF: '529.982.247-25' }));
  assert.strictEqual(c.Codigo, 'CAN-000001');
  let r = b.call('saveCandidato', pessoa(2, { CPF: '52998224725' }));
  assert.match(r.error, /mesmo CPF/); assert.strictEqual(r.duplicadoId, c.ID);
  r = b.call('saveCandidato', pessoa(3, { Email: 'C1@MAIL.COM' }));
  assert.match(r.error, /mesmo e-mail/);
  r = b.call('saveCandidato', pessoa(4, { Telefone: '+55 41 99999-0001' }));
  assert.match(r.error, /mesmo telefone/);
  assert.match(b.call('saveCandidato', pessoa(5, { CPF: '111.111.111-11' })).error, /CPF inválido/);
  assert.match(b.call('saveCandidato', { Nome: 'Fulano', Email: 'x@y.com' }).error, /nome completo/);
});

test('mesmo candidato participa de várias vagas sem duplicar o cadastro', () => {
  const { b, vaga } = setup();
  const v2 = b.ok('saveVaga', Object.assign({}, vaga, { ID: '', DataAprovacao: '2026-11-03', QtdPosicoes: 1 }));
  const cd = b.ok('addCandidatura', { vagaId: vaga.ID, candidato: pessoa(1), Origem: 'LinkedIn' });
  b.ok('addCandidatura', { vagaId: v2.ID, candidatoId: cd.CandidatoID, Origem: 'LinkedIn' });
  assert.match(b.call('addCandidatura', { vagaId: vaga.ID, candidatoId: cd.CandidatoID }).error, /já participa/);
  const cand = b.ok('getCandidato', { id: cd.CandidatoID });
  assert.strictEqual(cand.candidaturas.length, 2);
  assert.strictEqual(b.ok('listCandidatos', {}).length, 1);
});

test('kanban: movimentação registra tempo por etapa, reprovação exige motivo e contratação preenche posição', () => {
  const { b, vaga } = setup();
  const a = b.ok('addCandidatura', { vagaId: vaga.ID, candidato: pessoa(1), Origem: 'Site' });
  const r = b.ok('addCandidatura', { vagaId: vaga.ID, candidato: pessoa(2), Origem: 'Indeed' });
  b.setNow('2026-11-19T13:00:00Z');
  let k = b.ok('kanban', { vagaId: vaga.ID });
  assert.strictEqual(k.cards.length, 2);
  assert.strictEqual(k.cards[0].diasNaEtapa, 2);
  assert.strictEqual(k.cards[0].Responsavel, 'Analista Um');

  b.ok('moveCandidatura', { id: a.ID, etapa: 'Triagem de currículo' });
  assert.match(b.call('moveCandidatura', { id: r.ID, etapa: 'Reprovado / desistente' }).error, /motivo/);
  const rep = b.ok('moveCandidatura', { id: r.ID, etapa: 'Reprovado / desistente', motivoReprovacao: 'Candidato desistiu' });
  assert.strictEqual(rep.Status, 'Desistente');

  b.setNow('2026-11-24T13:00:00Z');
  const c = b.ok('moveCandidatura', { id: a.ID, etapa: 'Contratado' });
  assert.strictEqual(c.Status, 'Contratado');
  const v = b.ok('getVaga', { id: vaga.ID });
  assert.strictEqual(v.posicoes[0].Status, 'Preenchida');
  assert.strictEqual(v.posicoes[0].CandidatoID, a.CandidatoID);
  assert.strictEqual(v.candidatos.contratados, 1);
  assert.match(b.call('moveCandidatura', { id: a.ID, etapa: 'Aprovado' }).error, /já contratado/);

  const d = b.ok('dashboard', {});
  assert.strictEqual(d.cards.candidaturas, 2);
  assert.strictEqual(d.cards.reprovados, 1);
  assert.deepStrictEqual(d.graficos.motivos, [{ label: 'Candidato desistiu', valor: 1 }]);
  const triagem = d.graficos.tempoEtapaCandidato.find(x => x.label === 'Triagem de currículo');
  assert.strictEqual(triagem.valor, 3); // 19/11 → 24/11 (20/11 é feriado só se cadastrado; aqui 3 d.u.)
  assert.ok(d.graficos.funil[0].valor === 2);
});

test('etapas configuráveis por vaga', () => {
  const { b, vaga } = setup();
  const etapas = ['Candidatura recebida', 'Triagem de currículo', 'Entrevista RH', 'Aprovado', 'Contratado', 'Reprovado / desistente'].join(';');
  b.ok('saveVaga', Object.assign({}, vaga, { Etapas: etapas, QtdPosicoes: 2 }));
  const k = b.ok('kanban', { vagaId: vaga.ID });
  assert.ok(!k.colunas.includes('Entrevista direção'));
  const a = b.ok('addCandidatura', { vagaId: vaga.ID, candidato: pessoa(1) });
  assert.match(b.call('moveCandidatura', { id: a.ID, etapa: 'Entrevista direção' }).error, /não está habilitada/);
});

test('entrevistas: agendamento move a etapa; gestor registra parecer; reprovação move para reprovado', () => {
  const { b, vaga } = setup();
  const a = b.ok('addCandidatura', { vagaId: vaga.ID, candidato: pessoa(1) });
  let c = b.ok('saveEntrevista', { CandidaturaID: a.ID, Tipo: 'RH', Agendamento: '2026-11-18T10:00', Entrevistador: 'Analista Um' });
  assert.strictEqual(c.Etapa, 'Entrevista RH');
  assert.strictEqual(c.PrazoAcao, '2026-11-18');
  c = b.ok('saveEntrevista', { ID: c.entrevistas[0].ID, CandidaturaID: a.ID, Tipo: 'RH', Agendamento: '2026-11-17T10:00', Entrevistador: 'Analista Um', Resultado: 'Aprovado', ProximaEtapa: 'Entrevista gestor', Parecer: 'Bom perfil' });
  assert.strictEqual(c.Etapa, 'Entrevista gestor');

  b.setUser('gestor@viadupla.com');
  assert.strictEqual(b.ok('listCandidatos', {}).length, 1); // encaminhado ao gestor
  assert.strictEqual(b.call('saveEntrevista', { CandidaturaID: a.ID, Tipo: 'RH', Agendamento: '2026-11-17T14:00', Entrevistador: 'x' }).ok, false);
  assert.match(b.call('saveEntrevista', { CandidaturaID: a.ID, Tipo: 'Gestor', Agendamento: '2026-11-17T14:00', Entrevistador: 'Gestor Transporte', Resultado: 'Reprovado' }).error, /motivo/);
  c = b.ok('saveEntrevista', { CandidaturaID: a.ID, Tipo: 'Gestor', Agendamento: '2026-11-17T14:00', Entrevistador: 'Gestor Transporte', Resultado: 'Reprovado', MotivoReprovacao: 'Reprovado na entrevista com gestor' });
  assert.strictEqual(c.Etapa, 'Reprovado / desistente');
  assert.strictEqual(c.Observacoes, undefined); // observações restritas
  assert.match(b.call('moveCandidatura', { id: a.ID, etapa: 'Aprovado' }).error, /perfil/);

  b.setUser('admin@viadupla.com');
  const ents = b.ok('listEntrevistas', { situacao: 'realizadas' });
  assert.strictEqual(ents.length, 2);
});

test('gestor não vê candidato antes do encaminhamento', () => {
  const { b, vaga } = setup();
  b.ok('addCandidatura', { vagaId: vaga.ID, candidato: pessoa(1) });
  b.setUser('gestor@viadupla.com');
  assert.strictEqual(b.ok('listCandidatos', {}).length, 0);
  assert.strictEqual(b.ok('kanban', { vagaId: vaga.ID }).cards.length, 0);
});

test('indicações: reaproveita cadastro existente, vincula à vaga e calcula conversão', () => {
  const { b, vaga } = setup();
  const existente = b.ok('saveCandidato', pessoa(1));
  let r = b.ok('saveIndicacao', { Nome: 'Outro Nome', Email: 'c1@mail.com', Indicador: 'Colaborador X', EmpresaIndicador: 'Via Dupla', vagaId: vaga.ID });
  assert.strictEqual(r.jaExistia, true);
  assert.strictEqual(r.candidatoId, existente.ID);
  b.ok('saveIndicacao', { Nome: 'Novo Indicado Souza', Telefone: '41988887777', Indicador: 'Colaborador Y', CargoPretendido: 'Conferente' });
  const cdt = b.ok('getCandidato', { id: existente.ID }).candidaturas[0];
  assert.strictEqual(cdt.Origem, 'Indicação');
  b.ok('moveCandidatura', { id: cdt.ID, etapa: 'Contratado' });
  const ind = b.ok('listIndicacoes', {});
  assert.strictEqual(ind.indicadores.total, 2);
  assert.strictEqual(ind.indicadores.contratados, 1);
  assert.strictEqual(ind.indicadores.taxa, 50);
  assert.deepStrictEqual(ind.indicadores.origens, [{ label: 'Indicação', valor: 1 }]);
  assert.match(b.call('addCandidatura', { vagaId: vaga.ID, candidato: pessoa(9), Origem: 'Indicação' }).error, /indicou/);
});

test('currículo: upload restrito, download e anonimização LGPD', () => {
  const { b } = setup();
  const c = b.ok('saveCandidato', pessoa(1, { CPF: '529.982.247-25' }));
  assert.match(b.call('uploadCurriculo', { id: c.ID, arquivo: { nome: 'cv.exe', tipo: 'application/x-msdownload', base64: 'AAA=' } }).error, /Formato/);
  const up = b.ok('uploadCurriculo', { id: c.ID, arquivo: { nome: 'cv.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 teste').toString('base64') } });
  assert.strictEqual(up.temCurriculo, true);
  const dl = b.ok('downloadCurriculo', { id: c.ID });
  assert.strictEqual(Buffer.from(dl.base64, 'base64').toString(), '%PDF-1.4 teste');
  b.setUser('ana1@viadupla.com');
  assert.strictEqual(b.call('anonimizarCandidato', { id: c.ID, justificativa: 'pedido' }).ok, false);
  b.setUser('admin@viadupla.com');
  b.ok('anonimizarCandidato', { id: c.ID, justificativa: 'Pedido do titular' });
  const an = b.ok('getCandidato', { id: c.ID });
  assert.match(an.Nome, /anonimizado/);
  assert.strictEqual(an.CPF, '');
  assert.strictEqual(an.temCurriculo, false);
  // após anonimizar, o mesmo CPF pode ser cadastrado de novo
  assert.ok(b.ok('saveCandidato', pessoa(2, { CPF: '529.982.247-25' })).ID);
});
