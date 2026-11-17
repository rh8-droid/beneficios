/**
 * FASE 3 — Relatórios gerenciais (tabela + resumo), exportação em PDF,
 * produtividade por analista e recorrência por cargo.
 * Todos os números vêm dos registros do sistema.
 */
var RELATORIOS = {
  geral: 'Relatório geral de vagas',
  mensal: 'Abertura e fechamento por mês',
  analista: 'Vagas por analista',
  sla: 'Cumprimento de SLA',
  gargalos: 'Gargalos (tempo de espera por etapa)',
  candidatosEtapa: 'Candidatos por etapa',
  reprovacao: 'Motivos de reprovação',
  indicacoes: 'Indicações',
  recorrencia: 'Recorrência por cargo',
  produtividade: 'Produtividade dos analistas',
  canceladas: 'Vagas canceladas e suspensas'
};

function br_(iso) { return iso ? String(iso).substr(0, 10).split('-').reverse().join('/') : ''; }
function pct_(a, b) { return b ? Util.round(a / b * 100, 0) + '%' : '—'; }
function med_(list) { var a = Util.avg(list); return a === null ? '—' : Util.round(a, 1); }

function semPeriodo_(f) {
  var o = {};
  Object.keys(f || {}).forEach(function (k) { if (k !== 'de' && k !== 'ate') o[k] = f[k]; });
  return o;
}
function noPeriodo_(iso, f) {
  var d = Util.toIsoDate(iso);
  if (!d) return !f.de && !f.ate;
  return (!f.de || d >= f.de) && (!f.ate || d <= f.ate);
}

/** Contexto comum dos relatórios. */
function baseRelatorio_(f) {
  f = f || {};
  var hoje = Util.today();
  var core = loadCore_();
  var todas = vagasComSla_(core, hoje);
  var dim = filtrarVagas_(todas, semPeriodo_(f));          // filtros de dimensão (sem período)
  var per = filtrarVagas_(todas, f);                        // com período sobre a data de abertura
  var vagaMap = {};
  dim.forEach(function (v) { vagaMap[v.ID] = v; });
  var pessoas = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var cands = candidaturasVisiveis_().filter(function (c) { return vagaMap[c.VagaID]; });
  return { f: f, hoje: hoje, core: core, ctx: Sla.buildContext(core, hoje), dim: dim, per: per, vagaMap: vagaMap, pessoas: pessoas, cands: cands };
}

function descricaoFiltros_(f) {
  var partes = [];
  if (f.de || f.ate) partes.push('Período: ' + (br_(f.de) || 'início') + ' a ' + (br_(f.ate) || 'hoje'));
  ['Empresa', 'Unidade', 'Cargo', 'Gestor', 'Analista', 'Departamento', 'Status'].forEach(function (k) { if (f[k]) partes.push(k + ': ' + f[k]); });
  return partes.length ? partes.join(' · ') : 'Sem filtros (todos os registros)';
}

function getRelatorio(tipo, f) {
  if (!RELATORIOS[tipo]) throw UserError('Relatório inválido.');
  var b = baseRelatorio_(f);
  var r = REL_BUILDERS[tipo](b);
  r.tipo = tipo;
  r.titulo = RELATORIOS[tipo];
  r.filtros = descricaoFiltros_(b.f);
  r.geradoEm = Util.now();
  r.geradoPor = Auth.user().nome;
  return r;
}

var REL_BUILDERS = {
  geral: function (b) {
    var linhas = b.per.map(function (v) {
      var s = v.sla;
      return [v.Codigo || v.ID, v.Empresa, v.Unidade, v.Cargo, v.Departamento, v.Gestor, v.Analista, Util.int(v.QtdPosicoes),
        v.posicoesPreenchidas, br_(v.DataAbertura), br_(v.DataAprovacao), v.Status, br_(v.DataFechamento),
        s.iniciado ? s.diasEfetivos : '', s.iniciado ? s.nivel : 'não iniciado', s.cumprido === null || s.cumprido === undefined ? '' : (s.cumprido ? 'Sim' : 'Não')];
    });
    return {
      colunas: ['Código', 'Empresa', 'Unidade', 'Cargo', 'Departamento', 'Gestor', 'Analista', 'Posições', 'Preenchidas', 'Abertura', 'Aprovação', 'Status', 'Fechamento', 'Dias úteis', 'SLA', 'No prazo'],
      linhas: linhas,
      resumo: [{ label: 'Requisições', valor: b.per.length }, { label: 'Posições solicitadas', valor: b.per.reduce(function (a, v) { return a + Util.int(v.QtdPosicoes); }, 0) },
        { label: 'Posições preenchidas', valor: b.per.reduce(function (a, v) { return a + v.posicoesPreenchidas; }, 0) },
        { label: 'Concluídas', valor: b.per.filter(function (v) { return v.Status === VT.STATUS_CONCLUIDA; }).length }]
    };
  },

  mensal: function (b) {
    var meses = monthRange_(b.f.de, b.f.ate, b.hoje);
    var linhas = meses.map(function (m) {
      var abertas = b.dim.filter(function (v) { return Util.monthKey(v.DataAbertura) === m; });
      var concl = b.dim.filter(function (v) { return v.Status === VT.STATUS_CONCLUIDA && Util.monthKey(v.DataFechamento) === m; });
      var canc = b.dim.filter(function (v) { return v.Status === VT.STATUS_CANCELADA && Util.monthKey(v.DataFechamento) === m; });
      var pos = [];
      b.dim.forEach(function (v) { (v.sla.posicoes || []).forEach(function (p) { if (p.status === 'Preenchida' && Util.monthKey(p.referencia) === m) pos.push(p); }); });
      var noPrazo = pos.filter(function (p) { return p.cumprido; }).length;
      return [m.substr(5) + '/' + m.substr(0, 4), abertas.length, abertas.reduce(function (a, v) { return a + Util.int(v.QtdPosicoes); }, 0),
        concl.length, canc.length, pos.length, noPrazo, pos.length - noPrazo, med_(pos.map(function (p) { return p.diasEfetivos; })), pct_(noPrazo, pos.length)];
    });
    return { colunas: ['Mês', 'Vagas abertas', 'Posições solicitadas', 'Vagas concluídas', 'Vagas canceladas', 'Posições preenchidas', 'No prazo', 'Fora do prazo', 'Tempo médio (d.u.)', '% SLA'], linhas: linhas, resumo: [] };
  },

  analista: function (b) {
    var grupos = {};
    b.per.forEach(function (v) { (grupos[v.Analista || 'Sem analista'] = grupos[v.Analista || 'Sem analista'] || []).push(v); });
    var linhas = Object.keys(grupos).sort().map(function (a) {
      var vs = grupos[a], pos = [];
      vs.forEach(function (v) { (v.sla.posicoes || []).forEach(function (p) { if (p.status === 'Preenchida') pos.push(p); }); });
      var noPrazo = pos.filter(function (p) { return p.cumprido; }).length;
      return [a, vs.length, vs.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0; }).length,
        vs.filter(function (v) { return v.Status === VT.STATUS_CONCLUIDA; }).length, vs.filter(function (v) { return v.Status === VT.STATUS_CANCELADA; }).length,
        vs.reduce(function (s, v) { return s + v.posicoesAbertas; }, 0), pos.length, med_(pos.map(function (p) { return p.diasEfetivos; })), pct_(noPrazo, pos.length),
        vs.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0 && v.sla.iniciado && v.sla.diasRestantes < 0; }).length];
    });
    return { colunas: ['Analista', 'Vagas', 'Ativas', 'Concluídas', 'Canceladas', 'Posições em aberto', 'Posições preenchidas', 'Tempo médio (d.u.)', '% SLA', 'Vencidas em aberto'], linhas: linhas, resumo: [] };
  },

  sla: function (b) {
    var linhas = b.per.filter(function (v) { return v.sla.iniciado && v.Status !== VT.STATUS_CANCELADA; }).map(function (v) {
      var s = v.sla;
      var sit = s.fechado ? (s.cumprido ? 'Concluída no prazo' : 'Concluída com atraso') : (s.diasRestantes < 0 ? 'Vencida' : 'Em andamento');
      return [v.Codigo || v.ID, v.Cargo, v.Analista, v.Gestor, br_(s.inicio), br_(s.prazoOriginal), br_(s.prazoAjustado), br_(v.DataFechamento),
        s.diasEfetivos, s.diasPausados, s.diasAdicionais, s.atraso, s.percentual + '%', sit];
    });
    var fech = linhas.filter(function (l) { return /^Concluída/.test(l[13]); });
    var ok = fech.filter(function (l) { return l[13] === 'Concluída no prazo'; }).length;
    return {
      colunas: ['Código', 'Cargo', 'Analista', 'Gestor', 'Aprovação', 'Prazo original', 'Prazo ajustado', 'Fechamento', 'Dias úteis efetivos', 'Dias pausados', 'Dias de exceção', 'Atraso (d.u.)', '% consumido', 'Situação'],
      linhas: linhas,
      resumo: [{ label: 'Vagas avaliadas', valor: linhas.length }, { label: 'Concluídas no prazo', valor: ok }, { label: 'Concluídas com atraso', valor: fech.length - ok },
        { label: 'Vencidas em aberto', valor: linhas.filter(function (l) { return l[13] === 'Vencida'; }).length }, { label: 'Cumprimento', valor: pct_(ok, fech.length) }]
    };
  },

  gargalos: function (b) {
    var linhas = [];
    tempoPorStatus_(b.per, b.core, b.hoje).forEach(function (x) {
      var agora = b.per.filter(function (v) { return v.Status === x.label; }).length;
      linhas.push(['Vaga', x.label, x.valor, x.n, agora, x.responsavel]);
    });
    var ids = {};
    b.per.forEach(function (v) { ids[v.ID] = true; });
    var tc = tempoEtapasCandidato_(ids, b.core, b.hoje);
    tc.tempos.forEach(function (x) {
      var agora = b.cands.filter(function (c) { return ids[c.VagaID] && c.Etapa === x.label; }).length;
      linhas.push(['Candidato', x.label, x.valor, x.n, agora, x.responsavel]);
    });
    linhas.sort(function (a, c) { return c[2] - a[2]; });
    return {
      colunas: ['Tipo', 'Etapa', 'Tempo médio (d.u.)', 'Registros', 'Em aberto agora', 'Responsável típico'],
      linhas: linhas,
      resumo: tc.pendencias.slice(0, 5).map(function (p) { return { label: 'Ações vencidas — ' + p.label, valor: p.valor }; }),
      nota: 'Tempo de espera por etapa; não representa produtividade individual.'
    };
  },

  candidatosEtapa: function (b) {
    var linhas = b.cands.filter(function (c) { return noPeriodo_(c.DataCandidatura, b.f); }).map(function (c) {
      var v = b.vagaMap[c.VagaID], p = b.pessoas[c.CandidatoID] || {};
      var final = c.Etapa === 'Contratado' || c.Etapa === 'Reprovado / desistente';
      var dias = final ? '' : Sla.businessDaysBetween(Util.toIsoDate(c.EntradaEtapa), b.hoje, b.ctx.holidaysFor(v.Unidade));
      return [p.Nome || '', p.Codigo || '', v.Codigo || v.ID, v.Cargo, c.Etapa, c.Status, br_(c.EntradaEtapa), dias, c.ProximaAcao || '', c.Responsavel || '', br_(c.PrazoAcao), c.Origem, br_(c.DataCandidatura)];
    }).sort(function (a, c) { return VT.ETAPAS_KANBAN.indexOf(a[4]) - VT.ETAPAS_KANBAN.indexOf(c[4]); });
    var porEtapa = Util.groupCount(linhas, function (l) { return l[4]; });
    return {
      colunas: ['Candidato', 'Código', 'Vaga', 'Cargo', 'Etapa', 'Status', 'Na etapa desde', 'Dias úteis', 'Próxima ação', 'Responsável', 'Prazo', 'Origem', 'Inscrição'],
      linhas: linhas,
      resumo: VT.ETAPAS_KANBAN.filter(function (e) { return porEtapa[e]; }).map(function (e) { return { label: e, valor: porEtapa[e] }; })
    };
  },

  reprovacao: function (b) {
    var rep = b.cands.filter(function (c) { return c.Etapa === 'Reprovado / desistente' && c.MotivoReprovacao && noPeriodo_(c.DataConclusao, b.f); });
    var grupos = {};
    rep.forEach(function (c) { (grupos[c.MotivoReprovacao] = grupos[c.MotivoReprovacao] || []).push(c); });
    function topo(list, fn) { var g = toSeries_(Util.groupCount(list, fn)); return g.length ? g[0].label + ' (' + g[0].valor + ')' : ''; }
    var linhas = Object.keys(grupos).map(function (m) {
      var l = grupos[m];
      return [m, l.length, pct_(l.length, rep.length), topo(l, function (c) { return b.vagaMap[c.VagaID].Cargo; }), topo(l, function (c) { return b.vagaMap[c.VagaID].Analista; }),
        l.filter(function (c) { return c.Status === 'Desistente'; }).length];
    }).sort(function (a, c) { return c[1] - a[1]; });
    return { colunas: ['Motivo', 'Total', '% do total', 'Cargo mais frequente', 'Analista mais frequente', 'Desistências'], linhas: linhas,
      resumo: [{ label: 'Reprovações/desistências', valor: rep.length }, { label: 'Desistências', valor: rep.filter(function (c) { return c.Status === 'Desistente'; }).length }] };
  },

  indicacoes: function (b) {
    var r = listIndicacoes({ de: b.f.de, ate: b.f.ate });
    return {
      colunas: ['Data', 'Indicado', 'Código', 'Cargo pretendido', 'Indicado por', 'Empresa', 'Departamento', 'Vaga', 'Etapa', 'Resultado', 'Contratação', 'Processos anteriores'],
      linhas: r.linhas.map(function (x) { return [br_(x.DataIndicacao), x.nome, x.candidatoCodigo, x.cargo, x.Indicador, x.EmpresaIndicador, x.DepartamentoIndicador, x.vagaCodigo || 'Banco de talentos', x.etapa, x.Resultado, br_(x.DataContratacao), x.processosAnteriores]; }),
      resumo: [{ label: 'Indicações', valor: r.indicadores.total }, { label: 'Contratados', valor: r.indicadores.contratados }, { label: 'Conversão', valor: r.indicadores.taxa === null ? '—' : r.indicadores.taxa + '%' }]
    };
  },

  recorrencia: function (b) {
    var rec = recorrencia_(b, b.f);
    var meses = rec.meses;
    return {
      colunas: ['Cargo', 'Requisições', 'Posições solicitadas', 'Posições preenchidas', 'Reaberturas', 'Tempo médio (d.u.)', 'Principal motivo', 'Gestor que mais solicitou'].concat(meses.map(function (m) { return m.substr(5) + '/' + m.substr(2, 2); })),
      linhas: rec.cargos.map(function (c) { return [c.cargo, c.requisicoes, c.posicoes, c.preenchidas, c.reaberturas, c.tempoMedio, c.motivo, c.gestor].concat(meses.map(function (m) { return c.porMes[m] || 0; })); }),
      resumo: [{ label: 'Cargos', valor: rec.cargos.length }, { label: 'Requisições', valor: rec.total.requisicoes }, { label: 'Posições solicitadas', valor: rec.total.posicoes },
        { label: 'Posições preenchidas', valor: rec.total.preenchidas }, { label: 'Reaberturas', valor: rec.total.reaberturas }]
    };
  },

  produtividade: function (b) {
    var p = produtividade_(b);
    return {
      colunas: ['Analista', 'Vagas sob responsabilidade', 'Posições em aberto', 'Vagas concluídas', 'Posições preenchidas', 'Candidaturas recebidas', 'Entrevistas realizadas',
        'Encaminhados ao gestor', 'Contratações', 'Tempo médio de fechamento (d.u.)', '% SLA', 'Processos com pendências', 'Espera média em etapas do RH (d.u.)', 'Espera média em gestor/direção (d.u.)'],
      linhas: p.map(function (x) { return [x.analista, x.vagas, x.posicoesAbertas, x.concluidas, x.preenchidas, x.candidaturas, x.entrevistas, x.encaminhados, x.contratacoes, x.tempoMedio, x.sla, x.pendencias, x.esperaRH, x.esperaExterna]; }),
      resumo: [],
      nota: 'A espera em gestor/direção mede o tempo em etapas sob responsabilidade de outras áreas — não é atribuída à produtividade do analista.'
    };
  },

  canceladas: function (b) {
    var hist = {};
    Db.all('Historico').forEach(function (h) { if (h.Tipo === 'Vaga') (hist[h.ReferenciaID] = hist[h.ReferenciaID] || []).push(h); });
    var susp = groupBy_(b.core.suspensoes, 'VagaID');
    var linhas = [];
    b.per.forEach(function (v) {
      var ss = susp[v.ID] || [];
      if (v.Status !== VT.STATUS_CANCELADA && v.Status !== VT.STATUS_SUSPENSA && !ss.length) return;
      var ultimo = (hist[v.ID] || []).filter(function (h) { return h.Para === v.Status; }).sort(function (a, c) { return c.DataHora.localeCompare(a.DataHora); })[0];
      var holidays = b.ctx.holidaysFor(v.Unidade);
      var diasSusp = ss.reduce(function (a, s) { return a + Sla.businessDaysBetween(Util.addDays(Util.toIsoDate(s.Inicio), -1), Util.addDays(Util.toIsoDate(s.Fim) || Util.addDays(b.hoje, 1), -1), holidays); }, 0);
      linhas.push([v.Codigo || v.ID, v.Cargo, v.Analista, v.Gestor, v.Status, br_(ultimo ? ultimo.DataHora : v.DataFechamento), ultimo ? ultimo.Nota : '',
        ss.length, ss.map(function (s) { return br_(s.Inicio) + ' a ' + (s.Fim ? br_(s.Fim) : 'em aberto') + ' — ' + s.Justificativa; }).join(' | '), diasSusp]);
    });
    return { colunas: ['Código', 'Cargo', 'Analista', 'Gestor', 'Status atual', 'Data do status', 'Justificativa', 'Suspensões', 'Períodos de suspensão', 'Dias úteis suspensos'], linhas: linhas,
      resumo: [{ label: 'Canceladas', valor: linhas.filter(function (l) { return l[4] === VT.STATUS_CANCELADA; }).length }, { label: 'Suspensas agora', valor: linhas.filter(function (l) { return l[4] === VT.STATUS_SUSPENSA; }).length }] };
  }
};

/* ------------------------------ produtividade ------------------------------ */
function produtividade_(b) {
  var porAnalista = {};
  b.per.forEach(function (v) { var a = v.Analista || 'Sem analista'; (porAnalista[a] = porAnalista[a] || []).push(v); });
  var ents = Db.all('Entrevistas');
  var etapas = Db.all('EtapasCandidatura');
  var maxMap = maxEtapaMap_();
  var idxGestor = VT.ETAPAS_KANBAN.indexOf('Entrevista gestor');
  return Object.keys(porAnalista).sort().map(function (a) {
    var vs = porAnalista[a], ids = {};
    vs.forEach(function (v) { ids[v.ID] = v; });
    var cands = b.cands.filter(function (c) { return ids[c.VagaID]; });
    var cIds = {};
    cands.forEach(function (c) { cIds[c.ID] = c; });
    var pos = [];
    vs.forEach(function (v) { (v.sla.posicoes || []).forEach(function (p) { if (p.status === 'Preenchida') pos.push(p); }); });
    var noPrazo = pos.filter(function (p) { return p.cumprido; }).length;
    var rh = [], ext = [];
    etapas.forEach(function (e) {
      var c = cIds[e.CandidaturaID];
      if (!c || e.Etapa === 'Contratado' || e.Etapa === 'Reprovado / desistente') return;
      var d = Sla.businessDaysBetween(Util.toIsoDate(e.Entrada), e.Saida ? Util.toIsoDate(e.Saida) : b.hoje, b.ctx.holidaysFor(ids[c.VagaID].Unidade));
      var papel = VT.RESPONSAVEL_ETAPA[e.Etapa] || 'RH';
      if (papel === 'Gestor' || papel === 'Direção') ext.push(d); else rh.push(d);
    });
    return {
      analista: a,
      vagas: vs.length,
      ativas: vs.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0; }).length,
      posicoesAbertas: vs.reduce(function (s, v) { return s + v.posicoesAbertas; }, 0),
      concluidas: vs.filter(function (v) { return v.Status === VT.STATUS_CONCLUIDA; }).length,
      preenchidas: pos.length,
      candidaturas: cands.length,
      entrevistas: ents.filter(function (e) { return cIds[e.CandidaturaID] && e.Realizacao; }).length,
      encaminhados: cands.filter(function (c) { return maxMap[c.ID] >= idxGestor; }).length,
      contratacoes: cands.filter(function (c) { return c.Etapa === 'Contratado'; }).length || pos.length,
      tempoMedio: med_(pos.map(function (p) { return p.diasEfetivos; })),
      sla: pct_(noPrazo, pos.length),
      slaNum: pos.length ? Util.round(noPrazo / pos.length * 100, 0) : null,
      pendencias: cands.filter(function (c) { return c.Status === 'Em andamento' && c.PrazoAcao && c.PrazoAcao < b.hoje; }).length +
        vs.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0 && v.sla.iniciado && v.sla.diasRestantes < 0; }).length,
      esperaRH: med_(rh),
      esperaExterna: med_(ext)
    };
  });
}

function getProdutividade(f) {
  var b = baseRelatorio_(f);
  return { analistas: produtividade_(b), filtros: descricaoFiltros_(b.f) };
}

/* ------------------------------ recorrência por cargo ------------------------------ */
function recorrencia_(b, f) {
  var vs = b.dim.filter(function (v) { return noPeriodo_(v.DataAbertura, f); });
  var meses = monthRange_(f.de, f.ate, b.hoje);
  var grupos = {};
  vs.forEach(function (v) { (grupos[v.Cargo] = grupos[v.Cargo] || []).push(v); });
  var total = { requisicoes: 0, posicoes: 0, preenchidas: 0, reaberturas: 0 };
  var cargos = Object.keys(grupos).map(function (cargo) {
    var l = grupos[cargo], pos = [];
    l.forEach(function (v) { (v.sla.posicoes || []).forEach(function (p) { if (p.status === 'Preenchida') pos.push(p); }); });
    var c = {
      cargo: cargo,
      requisicoes: l.length,
      posicoes: l.reduce(function (s, v) { return s + Util.int(v.QtdPosicoes); }, 0),
      preenchidas: pos.length,
      reaberturas: l.reduce(function (s, v) { return s + Util.int(v.Reaberturas) + (v.ReaberturaDe ? 1 : 0); }, 0),
      tempoMedio: med_(pos.map(function (p) { return p.diasEfetivos; })),
      motivo: (toSeries_(Util.groupCount(l, function (v) { return v.MotivoAbertura; }))[0] || {}).label || '',
      gestor: (toSeries_(Util.groupCount(l, function (v) { return v.Gestor; }))[0] || {}).label || '',
      porMes: Util.groupCount(l, function (v) { return Util.monthKey(v.DataAbertura); })
    };
    total.requisicoes += c.requisicoes; total.posicoes += c.posicoes; total.preenchidas += c.preenchidas; total.reaberturas += c.reaberturas;
    return c;
  }).sort(function (a, c) { return c.requisicoes - a.requisicoes || c.posicoes - a.posicoes; });
  return { meses: meses, cargos: cargos, total: total };
}

/** Recorrência com comparação de dois períodos (A e B). */
function getRecorrencia(f) {
  f = f || {};
  var b = baseRelatorio_(semPeriodo_(f));
  var a = recorrencia_(b, { de: f.de, ate: f.ate });
  var out = { meses: a.meses, cargos: a.cargos, total: a.total, filtros: descricaoFiltros_(f) };
  if (f.deB || f.ateB) {
    var bb = recorrencia_(b, { de: f.deB, ate: f.ateB });
    var mapB = {};
    bb.cargos.forEach(function (c) { mapB[c.cargo] = c; });
    var nomes = {};
    a.cargos.concat(bb.cargos).forEach(function (c) { nomes[c.cargo] = true; });
    out.comparacao = Object.keys(nomes).map(function (n) {
      var x = a.cargos.filter(function (c) { return c.cargo === n; })[0] || { requisicoes: 0, posicoes: 0, preenchidas: 0 };
      var y = mapB[n] || { requisicoes: 0, posicoes: 0, preenchidas: 0 };
      return { cargo: n, reqA: x.requisicoes, reqB: y.requisicoes, posA: x.posicoes, posB: y.posicoes, preA: x.preenchidas, preB: y.preenchidas, variacao: y.requisicoes - x.requisicoes };
    }).sort(function (p, q) { return Math.abs(q.variacao) - Math.abs(p.variacao); });
    out.totalB = bb.total;
  }
  return out;
}

/* ------------------------------ PDF ------------------------------ */
function htmlRelatorio_(r) {
  var e = function (s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var resumo = (r.resumo || []).map(function (x) { return '<td style="padding:6px 12px;border:1px solid #ddd;background:#fafafa"><div style="font-size:9px;color:#666">' + e(x.label) + '</div><div style="font-size:14px;font-weight:bold">' + e(x.valor) + '</div></td>'; }).join('');
  var fonte = r.colunas.length > 12 ? 7 : (r.colunas.length > 8 ? 8 : 9);
  return '<html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#111}' +
    'table.d{border-collapse:collapse;width:100%;font-size:' + fonte + 'px}table.d th{background:#111;color:#fff;text-align:left;padding:4px}table.d td{border-bottom:1px solid #ddd;padding:3px 4px}table.d tr:nth-child(even) td{background:#f6f6f4}</style></head><body>' +
    '<div style="border-bottom:4px solid #f2c200;padding-bottom:6px;margin-bottom:8px"><span style="font-weight:bold;letter-spacing:2px">VIA <span style="color:#b38f00">TALENTOS</span></span> · Grupo Via Dupla' +
    '<h2 style="margin:4px 0">' + e(r.titulo) + '</h2><div style="font-size:9px;color:#555">' + e(r.filtros) + ' · Gerado em ' + e(br_(r.geradoEm)) + ' ' + e(String(r.geradoEm).substr(11, 5)) + ' por ' + e(r.geradoPor) + '</div></div>' +
    (resumo ? '<table style="border-collapse:collapse;margin-bottom:8px"><tr>' + resumo + '</tr></table>' : '') +
    (r.nota ? '<p style="font-size:9px;color:#555">' + e(r.nota) + '</p>' : '') +
    '<table class="d"><thead><tr>' + r.colunas.map(function (c) { return '<th>' + e(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    (r.linhas.length ? r.linhas.map(function (l) { return '<tr>' + l.map(function (c) { return '<td>' + e(c) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + r.colunas.length + '">Sem registros.</td></tr>') +
    '</tbody></table><p style="font-size:8px;color:#888">Via Talentos — documento gerado a partir dos registros do sistema. Contém dados pessoais: uso restrito (LGPD).</p></body></html>';
}

function exportRelatorioPdf(tipo, f) {
  var r = getRelatorio(tipo, f);
  var blob = HtmlService.createHtmlOutput(htmlRelatorio_(r)).getBlob().getAs('application/pdf');
  var nome = 'via-talentos-' + tipo + '-' + Util.today() + '.pdf';
  return { nome: nome, base64: Utilities.base64Encode(blob.getBytes()) };
}
