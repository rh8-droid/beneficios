/**
 * FASE 2 — Candidaturas, Kanban, entrevistas, reprovações, indicações e tempo por etapa.
 */
var ETAPAS_OBRIGATORIAS = ['Candidatura recebida', 'Aprovado', 'Contratado', 'Reprovado / desistente'];
var MOTIVOS_DESISTENCIA = ['Candidato desistiu', 'Não compareceu à entrevista', 'Não respondeu aos contatos'];

function etapasDaVaga_(vaga) {
  var sel = Util.str(vaga.Etapas).split(';').map(Util.str).filter(Boolean);
  return VT.ETAPAS_KANBAN.filter(function (e) { return !sel.length || sel.indexOf(e) >= 0 || ETAPAS_OBRIGATORIAS.indexOf(e) >= 0; });
}

function responsavelPadrao_(etapa, vaga) {
  var papel = VT.RESPONSAVEL_ETAPA[etapa] || '';
  if (papel === 'RH') return vaga.Analista || 'RH';
  if (papel === 'Gestor') return vaga.Gestor || 'Gestor';
  return papel;
}

function publicCandidatura_(c) {
  var o = clean_(c);
  if (!podeVerRestrito_()) delete o.Observacoes;
  return o;
}

/** Maior etapa alcançada por candidatura (uma leitura do histórico). */
function maxEtapaMap_() {
  var etapas = VT.ETAPAS_KANBAN, rep = etapas.indexOf('Reprovado / desistente');
  var out = {};
  Db.all('Candidaturas').forEach(function (c) { var i = etapas.indexOf(c.Etapa); out[c.ID] = i >= 0 && i !== rep ? i : 0; });
  Db.all('EtapasCandidatura').forEach(function (e) {
    var i = etapas.indexOf(e.Etapa);
    if (i >= 0 && i !== rep && out[e.CandidaturaID] !== undefined && i > out[e.CandidaturaID]) out[e.CandidaturaID] = i;
  });
  return out;
}
function maxEtapaIdx_(c) { return maxEtapaMap_()[c.ID] || 0; }

function exigirEdicaoCandidatura_(cand) {
  var vaga = Db.find('Vagas', cand.VagaID);
  if (!vaga) throw UserError('Vaga da candidatura não encontrada.');
  Auth.require('Administrador RH', 'Analista RH');
  if (!Auth.canEditVaga(vaga)) throw UserError('Você só pode movimentar candidatos das vagas sob sua responsabilidade.');
  return vaga;
}

/* ------------------------------ candidaturas ------------------------------ */

/**
 * Inscreve um candidato numa vaga. input: {vagaId, candidatoId | candidato:{...}, Origem, Indicador,
 * EmpresaIndicador, DepartamentoIndicador, Observacoes}
 */
function addCandidatura(input) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var id = addCandidaturaCore_(input);
    return getCandidatura(id);
  });
}

function addCandidaturaCore_(input) {
  var vaga = Db.find('Vagas', input.vagaId);
  if (!vaga) throw UserError('Selecione a vaga.');
  if (!Auth.canEditVaga(vaga)) throw UserError('Você só pode incluir candidatos nas vagas sob sua responsabilidade.');
  if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0) throw UserError('A vaga está ' + vaga.Status.toLowerCase() + '.');
  var candId = input.candidatoId;
  if (!candId) {
    if (!input.candidato) throw UserError('Selecione ou cadastre o candidato.');
    var dados = Object.assign({}, input.candidato);
    if (!dados.Origem) dados.Origem = input.Origem;
    if (!dados.CargoInteresse) dados.CargoInteresse = vaga.Cargo;
    if (!dados.Analista) dados.Analista = vaga.Analista;
    candId = saveCandidatoCore_(dados);
  }
  var cand = Db.find('Candidatos', candId);
  if (!cand) throw UserError('Candidato não encontrado.');
  if (cand.Anonimizado === 'Sim') throw UserError('Cadastro anonimizado (LGPD).');
  var existente = Db.all('Candidaturas').filter(function (x) { return x.VagaID === vaga.ID && x.CandidatoID === cand.ID; })[0];
  if (existente) throw UserError(cand.Nome + ' já participa desta vaga (etapa: ' + existente.Etapa + ').');
  var origem = Util.str(input.Origem) || cand.Origem || 'Outro';
  if (VT.ORIGENS_CANDIDATURA.indexOf(origem) < 0) throw UserError('Origem inválida.');
  if (origem === 'Indicação' && !Util.str(input.Indicador)) throw UserError('Informe o colaborador que indicou.');
  var agora = Util.now();
  var etapa = 'Candidatura recebida';
  var c = {
    ID: Util.id('CDT'), VagaID: vaga.ID, CandidatoID: cand.ID, Origem: origem, Indicador: Util.str(input.Indicador),
    DataCandidatura: Util.toIsoDate(input.DataCandidatura) || Util.today(), Etapa: etapa, EntradaEtapa: agora,
    Responsavel: responsavelPadrao_(etapa, vaga), ProximaAcao: 'Triagem do currículo',
    PrazoAcao: Sla.addBusinessDays(Util.today(), Util.int(Db.config('PRAZO_ACAO_DIAS'), 2) || 2, Sla.buildContext(loadCore_(), Util.today()).holidaysFor(vaga.Unidade)),
    Status: 'Em andamento', MotivoReprovacao: '', Observacoes: Util.str(input.Observacoes), DataConclusao: '',
    CriadoEm: agora, CriadoPor: Auth.email()
  };
  Db.insert('Candidaturas', c);
  Db.insert('EtapasCandidatura', { ID: Util.id('ETP'), CandidaturaID: c.ID, Etapa: etapa, Entrada: agora, Saida: '', Responsavel: c.Responsavel, MotivoAtraso: '', Usuario: Auth.email() });
  if (origem === 'Indicação') {
    var ind = Db.all('Indicacoes').filter(function (i) { return i.CandidatoID === cand.ID && !i.CandidaturaID; })[0];
    if (ind) Db.update('Indicacoes', ind.ID, { CandidaturaID: c.ID });
    else Db.insert('Indicacoes', {
      ID: Util.id('IND'), CandidatoID: cand.ID, CandidaturaID: c.ID, Indicador: c.Indicador,
      EmpresaIndicador: Util.str(input.EmpresaIndicador), DepartamentoIndicador: Util.str(input.DepartamentoIndicador),
      DataIndicacao: c.DataCandidatura, CargoPretendido: vaga.Cargo, Resultado: 'Em andamento', CriadoEm: agora, CriadoPor: Auth.email()
    });
  }
  logHistory_('Candidatura', c.ID, '', etapa, cand.Nome + ' inscrito(a) na vaga ' + (vaga.Codigo || vaga.ID) + ' — origem: ' + origem);
  return c.ID;
}

/**
 * Move o candidato de etapa. opts: {motivoReprovacao, observacao, proximaAcao, responsavel, prazoAcao, motivoAtraso, data}
 */
function moveCandidatura(id, etapa, opts) {
  return Db.withLock(function () {
    var cand = Db.find('Candidaturas', id);
    if (!cand) throw UserError('Candidatura não encontrada.');
    var vaga = exigirEdicaoCandidatura_(cand);
    moveCore_(cand, vaga, etapa, opts || {});
    return getCandidatura(cand.ID);
  });
}

function moveCore_(cand, vaga, etapa, opts) {
  if (VT.ETAPAS_KANBAN.indexOf(etapa) < 0) throw UserError('Etapa inválida.');
  if (etapa === cand.Etapa) throw UserError('O candidato já está nesta etapa.');
  if (etapasDaVaga_(vaga).indexOf(etapa) < 0) throw UserError('A etapa "' + etapa + '" não está habilitada para esta vaga.');
  if (cand.Etapa === 'Contratado') throw UserError('Candidato já contratado. Para desfazer, reabra a posição na vaga.');
  var reprov = etapa === 'Reprovado / desistente';
  if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0 && !reprov) throw UserError('A vaga está ' + vaga.Status.toLowerCase() + '. Só é possível encerrar candidaturas.');
  var pessoa = Db.find('Candidatos', cand.CandidatoID) || {};
  var agora = Util.now();
  var hoje = Util.today();
  var patch = { Etapa: etapa, EntradaEtapa: agora };
  var nota = '';

  if (reprov) {
    var motivo = Util.str(opts.motivoReprovacao);
    if (VT.MOTIVOS_REPROVACAO.indexOf(motivo) < 0) throw UserError('Selecione o motivo da reprovação/desistência.');
    if (motivo === 'Outro motivo' && !Util.str(opts.observacao)) throw UserError('Descreva o motivo em observações.');
    patch.Status = MOTIVOS_DESISTENCIA.indexOf(motivo) >= 0 ? 'Desistente' : 'Reprovado';
    patch.MotivoReprovacao = motivo;
    patch.DataConclusao = hoje;
    patch.ProximaAcao = 'Dar retorno ao candidato';
    nota = 'Motivo: ' + motivo;
  } else if (etapa === 'Contratado') {
    var pos = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID && p.Status === 'Aberta'; })
      .sort(function (a, b) { return Util.int(a.Numero) - Util.int(b.Numero); })[0];
    if (!pos) throw UserError('Não há posição aberta nesta vaga para registrar a contratação.');
    var data = fillPositionCore_(pos, vaga, { data: opts.data, nome: pessoa.Nome, candidatoId: pessoa.ID });
    patch.Status = 'Contratado';
    patch.DataConclusao = data;
    patch.ProximaAcao = '';
    patch.PrazoAcao = '';
    nota = 'Posição ' + pos.Numero + ' preenchida em ' + data;
    Db.all('Indicacoes').filter(function (i) { return i.CandidaturaID === cand.ID; }).forEach(function (i) {
      Db.update('Indicacoes', i.ID, { Resultado: 'Contratado', DataContratacao: data });
    });
  } else {
    patch.Status = 'Em andamento';
    patch.MotivoReprovacao = '';
    patch.DataConclusao = '';
  }
  if (reprov) {
    Db.all('Indicacoes').filter(function (i) { return i.CandidaturaID === cand.ID; }).forEach(function (i) { Db.update('Indicacoes', i.ID, { Resultado: patch.Status }); });
  } else if (etapa !== 'Contratado') {
    Db.all('Indicacoes').filter(function (i) { return i.CandidaturaID === cand.ID && i.Resultado !== 'Em andamento'; }).forEach(function (i) { Db.update('Indicacoes', i.ID, { Resultado: 'Em andamento' }); });
  }
  if (etapa !== 'Contratado') {
    patch.Responsavel = Util.str(opts.responsavel) || (reprov ? (vaga.Analista || 'RH') : responsavelPadrao_(etapa, vaga));
    if (!reprov) patch.ProximaAcao = Util.str(opts.proximaAcao) || proximaAcaoPadrao_(etapa);
    var prazo = Util.toIsoDate(opts.prazoAcao);
    if (opts.prazoAcao && !Util.isIsoDate(prazo)) throw UserError('Prazo da próxima ação inválido.');
    patch.PrazoAcao = prazo || Sla.addBusinessDays(hoje, Util.int(Db.config('PRAZO_ACAO_DIAS'), 2) || 2, Sla.buildContext(loadCore_(), hoje).holidaysFor(vaga.Unidade));
  }
  if (opts.observacao) patch.Observacoes = Util.str(cand.Observacoes ? cand.Observacoes + '\n' : '') + Util.today().split('-').reverse().join('/') + ': ' + Util.str(opts.observacao);

  Db.all('EtapasCandidatura').filter(function (e) { return e.CandidaturaID === cand.ID && !e.Saida; }).forEach(function (e) {
    Db.update('EtapasCandidatura', e.ID, { Saida: agora, MotivoAtraso: Util.str(opts.motivoAtraso) });
  });
  Db.insert('EtapasCandidatura', { ID: Util.id('ETP'), CandidaturaID: cand.ID, Etapa: etapa, Entrada: agora, Saida: (reprov || etapa === 'Contratado') ? agora : '', Responsavel: patch.Responsavel || '', MotivoAtraso: '', Usuario: Auth.email() });
  var anterior = cand.Etapa;
  Db.update('Candidaturas', cand.ID, patch);
  logHistory_('Candidatura', cand.ID, anterior, etapa, (pessoa.Nome || '') + (nota ? ' — ' + nota : '') + (opts.motivoAtraso ? ' — atraso: ' + opts.motivoAtraso : ''));
}

function proximaAcaoPadrao_(etapa) {
  return {
    'Candidatura recebida': 'Triagem do currículo', 'Triagem de currículo': 'Analisar currículo', 'Contato inicial': 'Contatar candidato',
    'Entrevista RH': 'Realizar entrevista com RH', 'Entrevista gestor': 'Realizar entrevista com gestor',
    'Entrevista direção': 'Realizar entrevista com direção', 'Testes / avaliações': 'Aplicar/corrigir testes',
    'Aguardando decisão': 'Decisão do gestor', 'Aprovado': 'Enviar proposta', 'Processo admissional': 'Concluir admissão'
  }[etapa] || '';
}

/** Atualiza próxima ação, responsável, prazo e observações. */
function updateCandidaturaAcao(id, opts) {
  return Db.withLock(function () {
    var cand = Db.find('Candidaturas', id);
    if (!cand) throw UserError('Candidatura não encontrada.');
    exigirEdicaoCandidatura_(cand);
    var prazo = Util.toIsoDate(opts.prazoAcao);
    if (opts.prazoAcao && !Util.isIsoDate(prazo)) throw UserError('Prazo inválido.');
    var patch = { ProximaAcao: Util.str(opts.proximaAcao), Responsavel: Util.str(opts.responsavel), PrazoAcao: prazo };
    if (Util.str(opts.observacao)) patch.Observacoes = Util.str(cand.Observacoes ? cand.Observacoes + '\n' : '') + Util.today().split('-').reverse().join('/') + ': ' + Util.str(opts.observacao);
    Db.update('Candidaturas', cand.ID, patch);
    logHistory_('Candidatura', cand.ID, '', '', 'Próxima ação: ' + patch.ProximaAcao + ' · ' + patch.Responsavel + ' · prazo ' + prazo);
    return getCandidatura(cand.ID);
  });
}

function cardCandidatura_(c, vaga, pessoa, ctx, hoje) {
  var o = publicCandidatura_(c);
  var holidays = ctx.holidaysFor(vaga.Unidade);
  var final = c.Etapa === 'Contratado' || c.Etapa === 'Reprovado / desistente';
  o.nome = pessoa ? pessoa.Nome : '—';
  o.candidatoCodigo = pessoa ? pessoa.Codigo : '';
  o.vagaCodigo = vaga.Codigo || vaga.ID;
  o.vagaCargo = vaga.Cargo;
  o.analista = vaga.Analista;
  o.gestor = vaga.Gestor;
  o.diasNaEtapa = final ? null : Sla.businessDaysBetween(Util.toIsoDate(c.EntradaEtapa), hoje, holidays);
  o.acaoAtrasada = !final && !!c.PrazoAcao && c.PrazoAcao < hoje;
  o.podeEditar = Auth.canEditVaga(vaga);
  return o;
}

/** Quadro Kanban. f: {vagaId, Analista, busca} */
function getKanban(f) {
  f = f || {};
  var core = loadCore_();
  var hoje = Util.today();
  var ctx = Sla.buildContext(core, hoje);
  var vagas = {};
  core.vagas.forEach(function (v) { if (Auth.canSeeVaga(v)) vagas[v.ID] = v; });
  var pessoas = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var vaga = f.vagaId ? vagas[f.vagaId] : null;
  if (f.vagaId && !vaga) throw UserError('Vaga não encontrada.');
  var q = Util.norm(f.busca);
  var cards = candidaturasVisiveis_().filter(function (c) {
    var v = vagas[c.VagaID];
    if (!v) return false;
    if (vaga && c.VagaID !== vaga.ID) return false;
    if (!vaga && VT.STATUS_FINAIS.indexOf(v.Status) >= 0) return false;
    if (f.Analista && Util.norm(v.Analista) !== Util.norm(f.Analista)) return false;
    if (q && Util.norm((pessoas[c.CandidatoID] || {}).Nome + ' ' + v.Cargo + ' ' + v.Codigo).indexOf(q) < 0) return false;
    return true;
  }).map(function (c) { return cardCandidatura_(c, vagas[c.VagaID], pessoas[c.CandidatoID], ctx, hoje); });
  var colunas = vaga ? etapasDaVaga_(vaga) : VT.ETAPAS_KANBAN;
  return {
    colunas: colunas,
    cards: cards,
    vaga: vaga ? { ID: vaga.ID, Codigo: vaga.Codigo, Cargo: vaga.Cargo, Status: vaga.Status, podeEditar: Auth.canEditVaga(vaga) } : null,
    vagasAtivas: core.vagas.filter(function (v) { return vagas[v.ID] && VT.STATUS_FINAIS.indexOf(v.Status) < 0; })
      .map(function (v) { return { ID: v.ID, Codigo: v.Codigo || v.ID, Cargo: v.Cargo, Unidade: v.Unidade }; })
  };
}

function getCandidatura(id) {
  var c = Db.find('Candidaturas', id);
  if (!c) throw UserError('Candidatura não encontrada.');
  if (!candidaturasVisiveis_().some(function (x) { return x.ID === c.ID; })) throw UserError('Você não tem acesso a esta candidatura.');
  var vaga = Db.find('Vagas', c.VagaID);
  var pessoa = Db.find('Candidatos', c.CandidatoID);
  var hoje = Util.today();
  var ctx = Sla.buildContext(loadCore_(), hoje);
  var o = cardCandidatura_(c, vaga, pessoa, ctx, hoje);
  o.candidato = pessoa ? publicCandidato_(pessoa) : null;
  o.etapasVaga = etapasDaVaga_(vaga);
  o.outrosProcessos = Db.all('Candidaturas').filter(function (x) { return x.CandidatoID === c.CandidatoID && x.ID !== c.ID; }).length;
  o.entrevistas = Db.all('Entrevistas').filter(function (e) { return e.CandidaturaID === c.ID; }).map(clean_)
    .sort(function (a, b) { return (b.Agendamento || '').localeCompare(a.Agendamento || ''); });
  var holidays = ctx.holidaysFor(vaga.Unidade);
  o.etapas = Db.all('EtapasCandidatura').filter(function (e) { return e.CandidaturaID === c.ID; }).map(function (e) {
    var x = clean_(e);
    var fim = e.Saida ? Util.toIsoDate(e.Saida) : hoje;
    x.dias = Sla.businessDaysBetween(Util.toIsoDate(e.Entrada), fim, holidays);
    return x;
  }).sort(function (a, b) { return a.Entrada.localeCompare(b.Entrada); });
  o.historico = Db.all('Historico').filter(function (h) { return h.ReferenciaID === c.ID; }).map(clean_)
    .sort(function (a, b) { return b.DataHora.localeCompare(a.DataHora); });
  return o;
}

/* ------------------------------ entrevistas ------------------------------ */

function saveEntrevista(input) {
  return Db.withLock(function () {
    var cand = Db.find('Candidaturas', input.CandidaturaID);
    if (!cand) throw UserError('Candidatura não encontrada.');
    var vaga = Db.find('Vagas', cand.VagaID);
    var u = Auth.user();
    var tipo = Util.str(input.Tipo);
    if (VT.TIPOS_ENTREVISTA.indexOf(tipo) < 0) throw UserError('Tipo de entrevista inválido.');
    var permitido = Auth.canEditVaga(vaga) ||
      (u.perfil === 'Gestor' && tipo === 'Gestor' && Auth.canSeeVaga(vaga)) ||
      (u.perfil === 'Direção' && tipo === 'Direção');
    if (!permitido) throw UserError('Seu perfil não permite registrar esta entrevista.');

    var ag = Util.str(input.Agendamento).replace('T', ' ').substr(0, 16);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(ag)) throw UserError('Informe data e horário do agendamento.');
    var resultado = Util.str(input.Resultado) || 'Pendente';
    if (VT.RESULTADOS_ENTREVISTA.indexOf(resultado) < 0) throw UserError('Resultado inválido.');
    var realizacao = Util.toIsoDate(input.Realizacao);
    if (resultado !== 'Pendente' && !realizacao) realizacao = Util.today();
    if (realizacao && realizacao > Util.today()) throw UserError('A data de realização não pode ser futura.');
    if (!Util.str(input.Entrevistador)) throw UserError('Informe o entrevistador.');
    var motivo = Util.str(input.MotivoReprovacao);
    if (resultado === 'Reprovado' && VT.MOTIVOS_REPROVACAO.indexOf(motivo) < 0) throw UserError('Selecione o motivo da reprovação.');
    var proxima = Util.str(input.ProximaEtapa);
    if (proxima && VT.ETAPAS_KANBAN.indexOf(proxima) < 0) throw UserError('Próxima etapa inválida.');
    var retorno = Util.toIsoDate(input.RetornoPrevisto);

    var row = {
      CandidaturaID: cand.ID, Tipo: tipo, Agendamento: ag, Realizacao: realizacao, Entrevistador: Util.str(input.Entrevistador),
      Resultado: resultado, Parecer: Util.str(input.Parecer), MotivoReprovacao: resultado === 'Reprovado' ? motivo : '',
      ProximaEtapa: resultado === 'Aprovado' ? proxima : '', RetornoPrevisto: retorno
    };
    var antes = null;
    if (input.ID) {
      antes = Db.find('Entrevistas', input.ID);
      if (!antes) throw UserError('Entrevista não encontrada.');
      Db.update('Entrevistas', antes.ID, row);
    } else {
      row.ID = Util.id('ENT');
      row.CriadoEm = Util.now();
      row.CriadoPor = u.email;
      Db.insert('Entrevistas', row);
    }
    var pessoa = Db.find('Candidatos', cand.CandidatoID) || {};
    logHistory_('Candidatura', cand.ID, antes ? antes.Resultado : '', 'Entrevista ' + tipo + ': ' + resultado,
      (pessoa.Nome || '') + ' · ' + ag + ' · ' + row.Entrevistador + (row.Parecer && podeVerRestrito_() ? ' — ' + row.Parecer : ''));

    // Movimentação automática do candidato conforme a entrevista
    var etapaEntrevista = VT.ETAPA_DA_ENTREVISTA[tipo];
    var etapas = VT.ETAPAS_KANBAN;
    var finalCand = cand.Etapa === 'Contratado' || cand.Etapa === 'Reprovado / desistente';
    var podeMover = !finalCand && VT.STATUS_FINAIS.indexOf(vaga.Status) < 0;
    if (podeMover && resultado === 'Pendente' && etapas.indexOf(cand.Etapa) < etapas.indexOf(etapaEntrevista) && etapasDaVaga_(vaga).indexOf(etapaEntrevista) >= 0) {
      moveCore_(cand, vaga, etapaEntrevista, { proximaAcao: 'Entrevista ' + tipo + ' em ' + ag.substr(8, 2) + '/' + ag.substr(5, 2) + ' ' + ag.substr(11), prazoAcao: ag.substr(0, 10) });
    } else if (!finalCand && resultado === 'Reprovado') {
      moveCore_(Db.find('Candidaturas', cand.ID), vaga, 'Reprovado / desistente', { motivoReprovacao: motivo });
    } else if (podeMover && resultado === 'Aprovado' && proxima && proxima !== cand.Etapa && etapasDaVaga_(vaga).indexOf(proxima) >= 0) {
      moveCore_(Db.find('Candidaturas', cand.ID), vaga, proxima, { prazoAcao: retorno });
    } else if (podeMover && retorno) {
      Db.update('Candidaturas', cand.ID, { PrazoAcao: retorno, ProximaAcao: 'Retorno após entrevista ' + tipo });
    }
    return getCandidatura(cand.ID);
  });
}

/** f: {de, ate, Tipo, situacao: 'agendadas'|'pendentes'|'realizadas', busca} */
function listEntrevistas(f) {
  f = f || {};
  var vis = {};
  candidaturasVisiveis_().forEach(function (c) { vis[c.ID] = c; });
  var u = Auth.user();
  var vagas = {}, pessoas = {};
  Db.all('Vagas').forEach(function (v) { vagas[v.ID] = v; });
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var agora = Util.now().substr(0, 16);
  var q = Util.norm(f.busca);
  return Db.all('Entrevistas').filter(function (e) {
    var c = vis[e.CandidaturaID];
    if (!c && !(u.perfil === 'Direção' && e.Tipo === 'Direção')) return false;
    if (!c) c = Db.find('Candidaturas', e.CandidaturaID);
    if (!c) return false;
    var d = (e.Agendamento || '').substr(0, 10);
    if (f.de && d < f.de) return false;
    if (f.ate && d > f.ate) return false;
    if (f.Tipo && e.Tipo !== f.Tipo) return false;
    if (f.situacao === 'agendadas' && !(e.Resultado === 'Pendente' && e.Agendamento >= agora)) return false;
    if (f.situacao === 'pendentes' && !(e.Resultado === 'Pendente' && e.Agendamento < agora)) return false;
    if (f.situacao === 'realizadas' && e.Resultado === 'Pendente') return false;
    if (q && Util.norm((pessoas[c.CandidatoID] || {}).Nome + ' ' + e.Entrevistador + ' ' + (vagas[c.VagaID] || {}).Cargo).indexOf(q) < 0) return false;
    e._cand = c;
    return true;
  }).map(function (e) {
    var c = e._cand, v = vagas[c.VagaID] || {}, p = pessoas[c.CandidatoID] || {};
    var o = clean_(e);
    if (!podeVerRestrito_() && !(u.perfil === 'Gestor' && e.Tipo === 'Gestor') && !(u.perfil === 'Direção' && e.Tipo === 'Direção')) o.Parecer = '';
    o.nome = p.Nome; o.vagaCodigo = v.Codigo; o.vagaCargo = v.Cargo; o.etapaAtual = c.Etapa;
    o.atrasada = e.Resultado === 'Pendente' && e.Agendamento < agora;
    return o;
  }).sort(function (a, b) { return (a.Agendamento || '').localeCompare(b.Agendamento || ''); });
}

/* ------------------------------ indicações ------------------------------ */

function saveIndicacao(input) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    if (!Util.str(input.Indicador)) throw UserError('Informe o colaborador que indicou.');
    var candId = input.candidatoId;
    var jaExistia = false;
    if (!candId) {
      var dados = { Nome: input.Nome, Email: input.Email, Telefone: input.Telefone, CPF: input.CPF, Cidade: input.Cidade, UF: input.UF, CargoInteresse: input.CargoPretendido, Origem: 'Indicação', ConsentimentoLGPD: input.ConsentimentoLGPD };
      var dup = findDuplicateCandidato_({ CPF: dados.CPF, Email: Util.str(dados.Email).toLowerCase(), Telefone: dados.Telefone });
      if (dup) { candId = dup.candidato.ID; jaExistia = true; }
      else candId = saveCandidatoCore_(dados);
    }
    var cand = Db.find('Candidatos', candId);
    if (!cand) throw UserError('Candidato não encontrado.');
    var ind = {
      ID: Util.id('IND'), CandidatoID: cand.ID, CandidaturaID: '', Indicador: Util.str(input.Indicador),
      EmpresaIndicador: Util.str(input.EmpresaIndicador), DepartamentoIndicador: Util.str(input.DepartamentoIndicador),
      DataIndicacao: Util.toIsoDate(input.DataIndicacao) || Util.today(), Resultado: 'Sem processo',
      DataContratacao: '', CargoPretendido: Util.str(input.CargoPretendido) || cand.CargoInteresse,
      Observacoes: Util.str(input.Observacoes), CriadoEm: Util.now(), CriadoPor: Auth.email()
    };
    Db.insert('Indicacoes', ind);
    logHistory_('Candidato', cand.ID, '', 'Indicação', 'Indicado(a) por ' + ind.Indicador + (jaExistia ? ' (candidato já cadastrado)' : ''));
    if (input.vagaId) {
      var cdt = addCandidaturaCore_({ vagaId: input.vagaId, candidatoId: cand.ID, Origem: 'Indicação', Indicador: ind.Indicador, EmpresaIndicador: ind.EmpresaIndicador, DepartamentoIndicador: ind.DepartamentoIndicador });
      Db.update('Indicacoes', ind.ID, { CandidaturaID: cdt, Resultado: 'Em andamento' });
    }
    return { indicacaoId: ind.ID, candidatoId: cand.ID, jaExistia: jaExistia };
  });
}

function listIndicacoes(f) {
  f = f || {};
  if (Auth.is('Gestor')) throw UserError('Seu perfil não acessa o controle de indicações.');
  var pessoas = {}, vagas = {}, cands = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  Db.all('Vagas').forEach(function (v) { vagas[v.ID] = v; });
  Db.all('Candidaturas').forEach(function (c) { cands[c.ID] = c; });
  var procPorCand = Util.groupCount(Db.all('Candidaturas'), function (c) { return c.CandidatoID; });
  var rows = Db.all('Indicacoes').map(function (i) {
    var o = clean_(i), p = pessoas[i.CandidatoID] || {}, c = cands[i.CandidaturaID], v = c ? vagas[c.VagaID] || {} : {};
    o.nome = p.Nome; o.candidatoCodigo = p.Codigo;
    o.etapa = c ? c.Etapa : '';
    o.status = c ? c.Status : 'Sem processo';
    o.vagaCodigo = v.Codigo; o.vagaCargo = v.Cargo;
    o.cargo = i.CargoPretendido || v.Cargo || p.CargoInteresse || '';
    o.processosAnteriores = Math.max(0, (procPorCand[i.CandidatoID] || 0) - (c ? 1 : 0));
    if (c && c.Status === 'Contratado') { o.Resultado = 'Contratado'; o.DataContratacao = o.DataContratacao || c.DataConclusao; }
    else if (c) o.Resultado = c.Status;
    return o;
  }).filter(function (o) {
    if (f.de && o.DataIndicacao < f.de) return false;
    if (f.ate && o.DataIndicacao > f.ate) return false;
    if (f.busca && Util.norm(o.nome + ' ' + o.Indicador + ' ' + o.cargo).indexOf(Util.norm(f.busca)) < 0) return false;
    return true;
  }).sort(function (a, b) { return (b.DataIndicacao || '').localeCompare(a.DataIndicacao || ''); });
  var contratados = rows.filter(function (r) { return r.Resultado === 'Contratado'; }).length;
  var origens = Util.groupCount(Db.all('Candidaturas').filter(function (c) { return c.Status === 'Contratado'; }), function (c) { return c.Origem || 'Não informada'; });
  return {
    linhas: rows,
    indicadores: {
      total: rows.length,
      contratados: contratados,
      emAndamento: rows.filter(function (r) { return r.Resultado === 'Em andamento'; }).length,
      taxa: rows.length ? Util.round(contratados / rows.length * 100, 0) : null,
      cargos: toSeries_(Util.groupCount(rows, function (r) { return r.cargo; })).slice(0, 10),
      indicadores: toSeries_(Util.groupCount(rows, function (r) { return r.Indicador; })).slice(0, 10),
      origens: toSeries_(origens)
    }
  };
}

/* ------------------------------ tempo por etapa (candidatos) ------------------------------ */

/** Tempo médio aguardando em cada etapa do candidato + pendências por responsável. */
function tempoEtapasCandidato_(vagaIds, core, hoje) {
  var ctx = Sla.buildContext(core, hoje);
  var vagas = {};
  core.vagas.forEach(function (v) { vagas[v.ID] = v; });
  var cands = {};
  Db.all('Candidaturas').forEach(function (c) { if (vagaIds[c.VagaID]) cands[c.ID] = c; });
  var acc = {};
  Db.all('EtapasCandidatura').forEach(function (e) {
    var c = cands[e.CandidaturaID];
    if (!c || e.Etapa === 'Contratado' || e.Etapa === 'Reprovado / desistente') return;
    var fim = e.Saida ? Util.toIsoDate(e.Saida) : hoje;
    var d = Sla.businessDaysBetween(Util.toIsoDate(e.Entrada), fim, ctx.holidaysFor(vagas[c.VagaID].Unidade));
    (acc[e.Etapa] = acc[e.Etapa] || []).push(d);
  });
  var tempos = VT.ETAPAS_KANBAN.filter(function (e) { return acc[e]; }).map(function (e) {
    return { label: e, valor: Util.round(Util.avg(acc[e]), 1), n: acc[e].length, responsavel: VT.RESPONSAVEL_ETAPA[e] || '' };
  });
  var pend = {};
  Object.keys(cands).forEach(function (id) {
    var c = cands[id];
    if (c.Status !== 'Em andamento' || !c.PrazoAcao || c.PrazoAcao >= hoje) return;
    var r = c.Responsavel || 'Não definido';
    pend[r] = pend[r] || { label: r, valor: 0, maisAntigo: c.PrazoAcao };
    pend[r].valor++;
    if (c.PrazoAcao < pend[r].maisAntigo) pend[r].maisAntigo = c.PrazoAcao;
  });
  return {
    tempos: tempos,
    pendencias: Object.keys(pend).map(function (k) { return pend[k]; }).sort(function (a, b) { return b.valor - a.valor; })
  };
}
