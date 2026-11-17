/**
 * Abertura e gestão de vagas, posições, suspensões e exceções de SLA.
 */

function configMap_() {
  var map = {};
  Object.keys(VT.CONFIG_PADRAO).forEach(function (k) { map[k] = VT.CONFIG_PADRAO[k]; });
  Db.all('Config').forEach(function (r) {
    if (r.Chave && Util.str(r.Valor) !== '') map[r.Chave] = Util.str(r.Valor);
  });
  return map;
}

function loadCore_() {
  return {
    vagas: Db.all('Vagas'),
    posicoes: Db.all('Posicoes'),
    suspensoes: Db.all('Suspensoes'),
    excecoes: Db.all('ExcecoesSLA'),
    feriados: Db.all('Feriados'),
    config: configMap_()
  };
}

function groupBy_(list, key) {
  var out = {};
  list.forEach(function (r) { (out[r[key]] = out[r[key]] || []).push(r); });
  return out;
}

function clean_(obj) {
  var out = {};
  Object.keys(obj).forEach(function (k) { if (k.charAt(0) !== '_') out[k] = obj[k]; });
  return out;
}

/** Vagas visíveis + SLA calculado. */
function vagasComSla_(data, today) {
  var ctx = Sla.buildContext(data, today || Util.today());
  var posByVaga = groupBy_(data.posicoes, 'VagaID');
  return data.vagas.filter(Auth.canSeeVaga).map(function (v) {
    var pos = (posByVaga[v.ID] || []).sort(function (a, b) { return Util.int(a.Numero) - Util.int(b.Numero); });
    var out = clean_(v);
    out.sla = Sla.forVaga(v, pos, ctx);
    out.posicoesAbertas = pos.filter(function (p) { return p.Status === 'Aberta'; }).length;
    out.posicoesPreenchidas = pos.filter(function (p) { return p.Status === 'Preenchida'; }).length;
    out.posicoesTotal = pos.length;
    out.responsavelAcao = VT.RESPONSAVEL_STATUS[v.Status] || '';
    out.podeEditar = Auth.canEditVaga(v);
    return out;
  });
}

function filtrarVagas_(list, f) {
  f = f || {};
  var q = Util.norm(f.busca);
  return list.filter(function (v) {
    if (q) {
      var hay = Util.norm([v.Codigo, v.ID, v.Cargo, v.Gestor, v.Analista, v.Unidade, v.Departamento].join(' '));
      if (hay.indexOf(q) < 0) return false;
    }
    var eq = ['Empresa', 'Unidade', 'Cargo', 'Gestor', 'Analista', 'Status', 'Departamento', 'Prioridade'];
    for (var i = 0; i < eq.length; i++) {
      var val = f[eq[i]];
      if (val && Util.norm(v[eq[i]]) !== Util.norm(val)) return false;
    }
    var d = Util.toIsoDate(v.DataAbertura);
    if (f.de && (!d || d < f.de)) return false;
    if (f.ate && (!d || d > f.ate)) return false;
    if (f.nivel && v.sla.nivel !== f.nivel) return false;
    if (f.situacao === 'ativas' && VT.STATUS_FINAIS.indexOf(v.Status) >= 0) return false;
    return true;
  });
}

function listVagas(filtros) {
  var list = filtrarVagas_(vagasComSla_(loadCore_()), filtros);
  list.sort(function (a, b) { return (b.DataAbertura || '').localeCompare(a.DataAbertura || '') || (b.Codigo || '').localeCompare(a.Codigo || ''); });
  return list;
}

function getVaga(id) {
  var data = loadCore_();
  var vaga = Db.find('Vagas', id);
  if (!vaga) throw UserError('Vaga não encontrada.');
  if (!Auth.canSeeVaga(vaga)) throw UserError('Você não tem acesso a esta vaga.');
  var full = vagasComSla_({
    vagas: [vaga], posicoes: data.posicoes, suspensoes: data.suspensoes,
    excecoes: data.excecoes, feriados: data.feriados, config: data.config
  })[0];
  full.posicoes = data.posicoes.filter(function (p) { return p.VagaID === vaga.ID; })
    .sort(function (a, b) { return Util.int(a.Numero) - Util.int(b.Numero); }).map(clean_);
  var posIds = full.posicoes.map(function (p) { return p.ID; });
  full.historico = Db.all('Historico').filter(function (h) {
    return h.ReferenciaID === vaga.ID || posIds.indexOf(h.ReferenciaID) >= 0;
  }).map(clean_).sort(function (a, b) { return b.DataHora.localeCompare(a.DataHora); });
  full.suspensoes = data.suspensoes.filter(function (s) { return s.VagaID === vaga.ID; }).map(clean_);
  full.excecoes = data.excecoes.filter(function (s) { return s.VagaID === vaga.ID; }).map(clean_);
  full.candidatos = resumoCandidatosVaga_(vaga.ID);
  var pessoas = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var ctxV = Sla.buildContext(data, Util.today());
  full.candidaturas = candidaturasVisiveis_().filter(function (c) { return c.VagaID === vaga.ID; }).map(function (c) {
    return cardCandidatura_(c, vaga, pessoas[c.CandidatoID], ctxV, Util.today());
  });
  return full;
}

/* ------------------------------ validação ------------------------------ */

var CAMPOS_VAGA = ['Empresa', 'Unidade', 'Cargo', 'Departamento', 'Gestor', 'Analista', 'QtdPosicoes',
  'DataAbertura', 'DataAprovacao', 'MotivoAbertura', 'ColaboradorSubstituido', 'TipoContrato', 'Modalidade',
  'Horario', 'Salario', 'SalarioACombinar', 'Requisitos', 'Atribuicoes', 'Beneficios', 'Observacoes',
  'Prioridade', 'Etapas', 'ReaberturaDe'];

function validarVaga_(v) {
  var erros = [];
  var obrig = { Empresa: 'Empresa', Unidade: 'Unidade', Cargo: 'Cargo', Departamento: 'Departamento',
    Gestor: 'Gestor solicitante', Analista: 'Analista responsável', DataAbertura: 'Data de abertura',
    MotivoAbertura: 'Motivo da abertura', TipoContrato: 'Tipo de contrato', Prioridade: 'Prioridade' };
  Object.keys(obrig).forEach(function (k) { if (!Util.str(v[k])) erros.push(obrig[k] + ' é obrigatório.'); });
  var qtd = Util.int(v.QtdPosicoes, 0);
  if (qtd < 1 || qtd > 200) erros.push('Quantidade de posições deve ser entre 1 e 200.');
  if (v.DataAbertura && !Util.isIsoDate(v.DataAbertura)) erros.push('Data de abertura inválida.');
  if (v.DataAprovacao && !Util.isIsoDate(v.DataAprovacao)) erros.push('Data de aprovação inválida.');
  if (v.DataAprovacao && v.DataAbertura && v.DataAprovacao < v.DataAbertura) erros.push('A aprovação não pode ser anterior à abertura.');
  if (v.MotivoAbertura === 'Substituição' && !Util.str(v.ColaboradorSubstituido)) erros.push('Informe o colaborador substituído.');
  if (!Util.isYes(v.SalarioACombinar) && !Util.str(v.Salario)) erros.push('Informe a faixa salarial ou marque "A combinar".');
  if (v.Empresa && !Db.all('Empresas').some(function (e) { return Util.norm(e.Nome) === Util.norm(v.Empresa); })) erros.push('Empresa não cadastrada.');
  if (v.MotivoAbertura && VT.MOTIVOS_ABERTURA.indexOf(v.MotivoAbertura) < 0) erros.push('Motivo de abertura inválido.');
  if (v.TipoContrato && VT.TIPOS_CONTRATO.indexOf(v.TipoContrato) < 0) erros.push('Tipo de contrato inválido.');
  if (v.Prioridade && VT.PRIORIDADES.indexOf(v.Prioridade) < 0) erros.push('Prioridade inválida.');
  if (erros.length) throw UserError(erros.join('\n'));
}

function proximoCodigo_(empresa, dataAbertura) {
  var emp = Db.all('Empresas').filter(function (e) { return Util.norm(e.Nome) === Util.norm(empresa); })[0];
  var sigla = (emp && emp.Sigla) || Util.str(empresa).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  var ano = (dataAbertura || Util.today()).substr(0, 4);
  var prefix = sigla + '-' + ano + '-';
  var max = 0;
  Db.all('Vagas').forEach(function (v) {
    if (v.Codigo && v.Codigo.indexOf(prefix) === 0) max = Math.max(max, Util.int(v.Codigo.substr(prefix.length)));
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

/* ------------------------------ gravação ------------------------------ */

function saveVaga(input) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var v = {};
    CAMPOS_VAGA.forEach(function (k) { v[k] = Util.str(input[k]); });
    v.DataAbertura = Util.toIsoDate(v.DataAbertura);
    v.DataAprovacao = Util.toIsoDate(v.DataAprovacao);
    v.SalarioACombinar = Util.isYes(v.SalarioACombinar) ? 'Sim' : 'Não';
    if (v.SalarioACombinar === 'Sim') v.Salario = '';
    if (v.MotivoAbertura !== 'Substituição') v.ColaboradorSubstituido = '';
    validarVaga_(v);
    var u = Auth.user();
    var qtd = Util.int(v.QtdPosicoes);

    if (!input.ID) {
      v.ID = Util.id('VAG');
      v.Codigo = proximoCodigo_(v.Empresa, v.DataAbertura);
      v.Status = v.DataAprovacao ? 'Aprovada / aguardando divulgação' : VT.STATUS_AGUARDANDO_APROVACAO;
      v.Reaberturas = '0';
      v.CriadoEm = Util.now();
      v.CriadoPor = u.email;
      v.AtualizadoEm = v.CriadoEm;
      v.AtualizadoPor = u.email;
      Db.insert('Vagas', v);
      var posicoes = [];
      for (var i = 1; i <= qtd; i++) {
        posicoes.push({ ID: Util.id('POS'), VagaID: v.ID, Numero: String(i), Status: 'Aberta', Reaberturas: '0' });
      }
      Db.insertMany('Posicoes', posicoes);
      logHistory_('Vaga', v.ID, '', v.Status, 'Abertura da vaga ' + v.Codigo + (v.ReaberturaDe ? ' (reabertura de ' + v.ReaberturaDe + ')' : ''));
      return getVaga(v.ID);
    }

    var atual = Db.find('Vagas', input.ID);
    if (!atual) throw UserError('Vaga não encontrada.');
    if (!Auth.canEditVaga(atual)) throw UserError('Você só pode editar as vagas sob sua responsabilidade.');
    if (VT.STATUS_FINAIS.indexOf(atual.Status) >= 0) throw UserError('Vaga ' + atual.Status.toLowerCase() + ' não pode ser editada. Reabra a vaga primeiro.');

    // Data de aprovação só muda pelo fluxo de status (preserva o início oficial do SLA)
    if (atual.DataAprovacao && v.DataAprovacao !== atual.DataAprovacao) {
      if (!Auth.is('Administrador RH')) throw UserError('Somente o Administrador RH pode alterar a data oficial de aprovação.');
      if (!Util.str(input.Justificativa)) throw UserError('Justifique a alteração da data de aprovação.');
    }
    var alterados = [];
    CAMPOS_VAGA.forEach(function (k) { if (Util.str(atual[k]) !== v[k]) alterados.push(k); });
    ajustarPosicoes_(atual, qtd);
    var patch = Object.assign({}, v, { AtualizadoEm: Util.now(), AtualizadoPor: u.email });
    if (atual.Status === VT.STATUS_AGUARDANDO_APROVACAO && v.DataAprovacao) {
      patch.Status = 'Aprovada / aguardando divulgação';
      logHistory_('Vaga', atual.ID, atual.Status, patch.Status, 'Aprovação registrada na edição');
    }
    Db.update('Vagas', atual.ID, patch);
    if (alterados.length) {
      logHistory_('Vaga', atual.ID, '', '', 'Edição: ' + alterados.join(', ') + (input.Justificativa ? ' — ' + input.Justificativa : ''));
    }
    return getVaga(atual.ID);
  });
}

function ajustarPosicoes_(vaga, qtd) {
  var pos = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID; });
  var ativas = pos.filter(function (p) { return p.Status !== 'Cancelada'; });
  if (qtd > ativas.length) {
    var maxNum = pos.reduce(function (m, p) { return Math.max(m, Util.int(p.Numero)); }, 0);
    var novas = [];
    for (var i = 1; i <= qtd - ativas.length; i++) {
      novas.push({ ID: Util.id('POS'), VagaID: vaga.ID, Numero: String(maxNum + i), Status: 'Aberta', Reaberturas: '0' });
    }
    Db.insertMany('Posicoes', novas);
    logHistory_('Vaga', vaga.ID, ativas.length, qtd, 'Posições acrescentadas');
  } else if (qtd < ativas.length) {
    var remover = ativas.length - qtd;
    var abertas = ativas.filter(function (p) { return p.Status === 'Aberta'; })
      .sort(function (a, b) { return Util.int(b.Numero) - Util.int(a.Numero); });
    if (abertas.length < remover) throw UserError('Não é possível reduzir: há posições já preenchidas.');
    abertas.slice(0, remover).forEach(function (p) {
      Db.update('Posicoes', p.ID, { Status: 'Cancelada', DataFechamento: Util.today() });
      logHistory_('Posicao', p.ID, 'Aberta', 'Cancelada', 'Redução da quantidade de posições');
    });
  }
}

/**
 * Altera o status com histórico.
 * opts: {justificativa, data (aaaa-mm-dd), pausaSLA ('Sim'/'Não')}
 */
function changeVagaStatus(id, novo, opts) {
  opts = opts || {};
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var vaga = Db.find('Vagas', id);
    if (!vaga) throw UserError('Vaga não encontrada.');
    if (!Auth.canEditVaga(vaga)) throw UserError('Você só pode movimentar as vagas sob sua responsabilidade.');
    if (VT.STATUS_VAGA.indexOf(novo) < 0) throw UserError('Status inválido.');
    if (novo === vaga.Status) throw UserError('A vaga já está neste status.');
    var just = Util.str(opts.justificativa);
    var data = Util.toIsoDate(opts.data) || Util.today();
    if (opts.data && !Util.isIsoDate(data)) throw UserError('Data inválida.');
    if (data > Util.today()) throw UserError('A data não pode ser futura.');
    var anterior = vaga.Status;
    var eraFinal = VT.STATUS_FINAIS.indexOf(anterior) >= 0;
    var patch = { Status: novo, AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() };
    var posicoes = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID; });

    if ((novo === VT.STATUS_SUSPENSA || novo === VT.STATUS_CANCELADA || eraFinal) && !just) {
      throw UserError('Justificativa obrigatória para ' + (eraFinal ? 'reabrir a vaga' : novo.toLowerCase()) + '.');
    }

    // Validações antes de qualquer gravação
    if (novo === VT.STATUS_CONCLUIDA) {
      var abertas = posicoes.filter(function (p) { return p.Status === 'Aberta'; });
      if (abertas.length) throw UserError('Ainda há ' + abertas.length + ' posição(ões) em aberto. Registre o preenchimento de cada posição antes de concluir.');
      if (!posicoes.some(function (p) { return p.Status === 'Preenchida'; })) throw UserError('Nenhuma posição preenchida. Para encerrar sem contratação, cancele a vaga.');
    }
    if (eraFinal && VT.STATUS_FINAIS.indexOf(novo) < 0 && !posicoes.some(function (p) { return p.Status === 'Aberta'; })) {
      throw UserError('Nenhuma posição em aberto. Reabra uma posição específica (ela reabrirá a vaga automaticamente).');
    }
    if (anterior === VT.STATUS_SUSPENSA) {
      Db.all('Suspensoes').forEach(function (s) {
        if (s.VagaID === vaga.ID && !s.Fim && data < s.Inicio) throw UserError('A retomada não pode ser anterior ao início da suspensão (' + s.Inicio + ').');
      });
    }
    if (anterior === VT.STATUS_AGUARDANDO_APROVACAO && novo !== VT.STATUS_CANCELADA && !vaga.DataAprovacao && data < Util.toIsoDate(vaga.DataAbertura)) {
      throw UserError('A aprovação não pode ser anterior à abertura.');
    }

    // Aprovação: define o início oficial do SLA
    if (anterior === VT.STATUS_AGUARDANDO_APROVACAO && novo !== VT.STATUS_CANCELADA) {
      if (!vaga.DataAprovacao) patch.DataAprovacao = data;
    }

    // Saindo de suspensão: encerra a suspensão aberta
    if (anterior === VT.STATUS_SUSPENSA) {
      Db.all('Suspensoes').filter(function (s) { return s.VagaID === vaga.ID && !s.Fim; }).forEach(function (s) {
        Db.update('Suspensoes', s.ID, { Fim: data });
      });
    }
    if (novo === VT.STATUS_SUSPENSA) {
      Db.insert('Suspensoes', {
        ID: Util.id('SUS'), VagaID: vaga.ID, Inicio: data, Fim: '', Justificativa: just,
        PausaSLA: opts.pausaSLA === 'Não' ? 'Não' : 'Sim', Usuario: Auth.email(), CriadoEm: Util.now()
      });
    }

    if (novo === VT.STATUS_CONCLUIDA) {
      var datas = posicoes.filter(function (p) { return p.Status === 'Preenchida'; }).map(function (p) { return p.DataFechamento; }).sort();
      patch.DataFechamento = datas[datas.length - 1];
    }
    if (novo === VT.STATUS_CANCELADA) {
      posicoes.filter(function (p) { return p.Status === 'Aberta'; }).forEach(function (p) {
        Db.update('Posicoes', p.ID, { Status: 'Cancelada', DataFechamento: data });
      });
      patch.DataFechamento = data;
    }
    if (eraFinal && VT.STATUS_FINAIS.indexOf(novo) < 0) {
      patch.DataFechamento = '';
      patch.Reaberturas = String(Util.int(vaga.Reaberturas) + 1);
    }
    Db.update('Vagas', vaga.ID, patch);
    logHistory_('Vaga', vaga.ID, anterior, novo, just + (opts.data ? ' [data: ' + data + ']' : ''));
    return getVaga(vaga.ID);
  });
}

/** Registra o preenchimento de uma posição. Conclui a vaga quando não restarem posições abertas. */
function fillPosition(posId, info) {
  info = info || {};
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var pos = Db.find('Posicoes', posId);
    if (!pos) throw UserError('Posição não encontrada.');
    var vaga = Db.find('Vagas', pos.VagaID);
    if (!Auth.canEditVaga(vaga)) throw UserError('Sem permissão para esta vaga.');
    fillPositionCore_(pos, vaga, info);
    return getVaga(vaga.ID);
  });
}

/** Preenche a posição (sem lock — chamado dentro de Db.withLock). */
function fillPositionCore_(pos, vaga, info) {
  if (pos.Status !== 'Aberta') throw UserError('A posição não está aberta.');
  if (!vaga.DataAprovacao) throw UserError('A vaga ainda não foi aprovada.');
  if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0 || vaga.Status === VT.STATUS_SUSPENSA) throw UserError('A vaga está ' + vaga.Status.toLowerCase() + '.');
  var data = Util.toIsoDate(info.data) || Util.today();
  if (!Util.isIsoDate(data)) throw UserError('Data inválida.');
  if (data < vaga.DataAprovacao) throw UserError('O fechamento não pode ser anterior à aprovação (' + vaga.DataAprovacao + ').');
  if (data > Util.today()) throw UserError('A data de fechamento não pode ser futura.');
  var nome = Util.str(info.nome);
  if (!nome) throw UserError('Informe o nome do contratado.');
  Db.update('Posicoes', pos.ID, { Status: 'Preenchida', DataFechamento: data, NomeContratado: nome, CandidatoID: Util.str(info.candidatoId) });
  logHistory_('Posicao', pos.ID, 'Aberta', 'Preenchida', 'Posição ' + pos.Numero + ' preenchida por ' + nome + ' em ' + data);

  var restantes = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID && p.Status === 'Aberta'; });
  if (!restantes.length) {
    var datas = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID && p.Status === 'Preenchida'; })
      .map(function (p) { return p.DataFechamento; }).sort();
    var anterior = vaga.Status;
    Db.update('Vagas', vaga.ID, { Status: VT.STATUS_CONCLUIDA, DataFechamento: datas[datas.length - 1], AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() });
    logHistory_('Vaga', vaga.ID, anterior, VT.STATUS_CONCLUIDA, 'Conclusão automática: todas as posições preenchidas');
  }
  return data;
}

/** Reabre uma posição preenchida/cancelada (conta como reabertura da requisição). */
function reopenPosition(posId, justificativa) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var pos = Db.find('Posicoes', posId);
    if (!pos) throw UserError('Posição não encontrada.');
    var vaga = Db.find('Vagas', pos.VagaID);
    if (!Auth.canEditVaga(vaga)) throw UserError('Sem permissão para esta vaga.');
    if (pos.Status === 'Aberta') throw UserError('A posição já está aberta.');
    if (!Util.str(justificativa)) throw UserError('Justificativa obrigatória para reabrir.');
    var anteriorPos = pos.Status;
    Db.update('Posicoes', pos.ID, { Status: 'Aberta', DataFechamento: '', NomeContratado: '', CandidatoID: '', Reaberturas: String(Util.int(pos.Reaberturas) + 1) });
    logHistory_('Posicao', pos.ID, anteriorPos, 'Aberta', 'Reabertura da posição ' + pos.Numero + ': ' + justificativa);
    var patch = { Reaberturas: String(Util.int(vaga.Reaberturas) + 1), AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() };
    if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0) {
      patch.Status = 'Aberta / recebendo candidaturas';
      patch.DataFechamento = '';
      logHistory_('Vaga', vaga.ID, vaga.Status, patch.Status, 'Reaberta pela posição ' + pos.Numero + ': ' + justificativa);
    }
    Db.update('Vagas', vaga.ID, patch);
    return getVaga(vaga.ID);
  });
}

function cancelPosition(posId, justificativa) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var pos = Db.find('Posicoes', posId);
    if (!pos) throw UserError('Posição não encontrada.');
    var vaga = Db.find('Vagas', pos.VagaID);
    if (!Auth.canEditVaga(vaga)) throw UserError('Sem permissão para esta vaga.');
    if (pos.Status !== 'Aberta') throw UserError('Somente posições abertas podem ser canceladas.');
    if (!Util.str(justificativa)) throw UserError('Justificativa obrigatória.');
    Db.update('Posicoes', pos.ID, { Status: 'Cancelada', DataFechamento: Util.today() });
    logHistory_('Posicao', pos.ID, 'Aberta', 'Cancelada', 'Posição ' + pos.Numero + ': ' + justificativa);
    var todas = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID; });
    if (!todas.some(function (p) { return p.Status === 'Aberta'; })) {
      var preenchidas = todas.filter(function (p) { return p.Status === 'Preenchida'; }).map(function (p) { return p.DataFechamento; }).sort();
      var novo = preenchidas.length ? VT.STATUS_CONCLUIDA : VT.STATUS_CANCELADA;
      Db.update('Vagas', vaga.ID, { Status: novo, DataFechamento: preenchidas.length ? preenchidas[preenchidas.length - 1] : Util.today(), AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() });
      logHistory_('Vaga', vaga.ID, vaga.Status, novo, 'Encerramento automático: nenhuma posição em aberto');
    }
    return getVaga(vaga.ID);
  });
}

/** Exceção justificada: amplia o prazo sem alterar o prazo original. */
function addSlaException(vagaId, dias, justificativa) {
  Auth.require('Administrador RH');
  return Db.withLock(function () {
    var vaga = Db.find('Vagas', vagaId);
    if (!vaga) throw UserError('Vaga não encontrada.');
    var n = Util.int(dias, 0);
    if (n < 1 || n > 60) throw UserError('Dias adicionais devem estar entre 1 e 60.');
    if (!Util.str(justificativa)) throw UserError('Justificativa obrigatória.');
    Db.insert('ExcecoesSLA', { ID: Util.id('EXC'), VagaID: vaga.ID, DiasAdicionais: String(n), Justificativa: justificativa, Usuario: Auth.email(), CriadoEm: Util.now() });
    logHistory_('Vaga', vaga.ID, '', '', 'Exceção de SLA: +' + n + ' dia(s) útil(eis) — ' + justificativa);
    return getVaga(vaga.ID);
  });
}

/** Contagem de candidatos da vaga por etapa alcançada (cabeçalho da página da vaga). */
function resumoCandidatosVaga_(vagaId) {
  var etapas = VT.ETAPAS_KANBAN;
  var idxReprov = etapas.indexOf('Reprovado / desistente');
  var cands = Db.all('Candidaturas').filter(function (c) { return c.VagaID === vagaId; });
  var ids = {};
  cands.forEach(function (c) { ids[c.ID] = true; });
  var max = {};
  cands.forEach(function (c) { var i = etapas.indexOf(c.Etapa); max[c.ID] = i >= 0 && i !== idxReprov ? i : 0; });
  Db.all('EtapasCandidatura').forEach(function (e) {
    if (!ids[e.CandidaturaID]) return;
    var i = etapas.indexOf(e.Etapa);
    if (i >= 0 && i !== idxReprov) max[e.CandidaturaID] = Math.max(max[e.CandidaturaID], i);
  });
  var entrevistados = {};
  Db.all('Entrevistas').forEach(function (e) { if (ids[e.CandidaturaID] && e.Realizacao) entrevistados[e.CandidaturaID] = true; });
  function alcancou(nome) { var n = etapas.indexOf(nome); return cands.filter(function (c) { return max[c.ID] >= n; }).length; }
  return {
    total: cands.length,
    triados: alcancou('Triagem de currículo'),
    entrevistados: Math.max(Object.keys(entrevistados).length, alcancou('Entrevista RH')),
    encaminhados: alcancou('Entrevista gestor'),
    aprovados: alcancou('Aprovado'),
    admissao: alcancou('Processo admissional'),
    contratados: alcancou('Contratado'),
    reprovados: cands.filter(function (c) { return etapas.indexOf(c.Etapa) === idxReprov; }).length
  };
}
