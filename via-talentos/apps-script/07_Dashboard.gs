/**
 * Indicadores gerenciais — sempre calculados a partir dos registros.
 */
function getDashboard(filtros) {
  filtros = filtros || {};
  var today = Util.today();
  var core = loadCore_();
  var todas = vagasComSla_(core, today);
  var vagas = filtrarVagas_(todas, filtros);
  var ids = {};
  vagas.forEach(function (v) { ids[v.ID] = v; });
  var cfg = core.config;
  var alertaDias = Util.int(cfg.ALERTA_DIAS_RESTANTES, 3);
  var semMovDias = Util.int(cfg.SEM_MOVIMENTACAO_DIAS, 3);
  var mes = today.substr(0, 7);

  var ativas = vagas.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0 && v.Status !== VT.STATUS_SUSPENSA; });
  var suspensas = vagas.filter(function (v) { return v.Status === VT.STATUS_SUSPENSA; });
  var concluidas = vagas.filter(function (v) { return v.Status === VT.STATUS_CONCLUIDA; });
  var concluidasNoSla = concluidas.filter(function (v) { return v.sla.cumprido === true; });
  var concluidasForaSla = concluidas.filter(function (v) { return v.sla.cumprido === false; });
  var abertasVencidas = ativas.filter(function (v) { return v.sla.iniciado && v.sla.diasRestantes < 0; });
  var proximas = ativas.filter(function (v) { return v.sla.iniciado && v.sla.diasRestantes >= 0 && v.sla.diasRestantes <= alertaDias; });

  // Posições preenchidas (base do tempo médio e da taxa de SLA)
  var preenchidas = [];
  vagas.forEach(function (v) {
    (v.sla.posicoes || []).forEach(function (p) {
      if (p.status === 'Preenchida' && p.fechado) preenchidas.push({ vaga: v, sla: p });
    });
  });
  var tempoMedio = Util.avg(preenchidas.map(function (p) { return p.sla.diasEfetivos; }));
  var noPrazo = preenchidas.filter(function (p) { return p.sla.cumprido; }).length;

  // Candidaturas (Fase 2) — ligadas às vagas filtradas
  var cands = Db.all('Candidaturas').filter(function (c) { return ids[c.VagaID]; });
  var etapas = VT.ETAPAS_KANBAN;
  var idxReprov = etapas.indexOf('Reprovado / desistente');
  var idxAprov = etapas.indexOf('Aprovado');
  var idxContr = etapas.indexOf('Contratado');
  function idx(e) { return etapas.indexOf(e); }

  var cards = {
    vagasAbertas: ativas.length,
    vagasSuspensas: suspensas.length,
    posicoesDisponiveis: ativas.reduce(function (s, v) { return s + v.posicoesAbertas; }, 0),
    abertasNoMes: vagas.filter(function (v) { return Util.monthKey(v.DataAbertura) === mes; }).length,
    encerradasNoMes: vagas.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) >= 0 && Util.monthKey(v.DataFechamento) === mes; }).length,
    concluidasNoSla: concluidasNoSla.length,
    foraDoSla: concluidasForaSla.length + abertasVencidas.length,
    foraDoSlaAbertas: abertasVencidas.length,
    foraDoSlaConcluidas: concluidasForaSla.length,
    proximasVencimento: proximas.length,
    candidaturas: cands.length,
    emProcesso: cands.filter(function (c) { var i = idx(c.Etapa); return i >= 0 && i < idxAprov; }).length,
    aprovados: cands.filter(function (c) { var i = idx(c.Etapa); return i >= idxAprov && i <= idxContr; }).length,
    reprovados: cands.filter(function (c) { return idx(c.Etapa) === idxReprov; }).length,
    contratacoes: preenchidas.length,
    tempoMedioFechamento: tempoMedio === null ? null : Util.round(tempoMedio, 1),
    taxaSla: preenchidas.length ? Util.round(noPrazo / preenchidas.length * 100, 0) : null,
    posicoesPreenchidas: preenchidas.length
  };

  // 1. Abertas x fechadas por mês (últimos 12 meses ou período filtrado)
  var meses = monthRange_(filtros.de, filtros.ate, today);
  var abertasMes = Util.groupCount(vagas, function (v) { return Util.monthKey(v.DataAbertura); });
  var fechadasMes = Util.groupCount(concluidas, function (v) { return Util.monthKey(v.DataFechamento); });
  var canceladasMes = Util.groupCount(vagas.filter(function (v) { return v.Status === VT.STATUS_CANCELADA; }), function (v) { return Util.monthKey(v.DataFechamento); });

  // 2. Tempo médio de fechamento por cargo
  var porCargo = {};
  preenchidas.forEach(function (p) { (porCargo[p.vaga.Cargo] = porCargo[p.vaga.Cargo] || []).push(p.sla.diasEfetivos); });
  var tempoCargo = Object.keys(porCargo).map(function (k) {
    return { label: k, valor: Util.round(Util.avg(porCargo[k]), 1), n: porCargo[k].length };
  }).sort(function (a, b) { return b.valor - a.valor; }).slice(0, 12);

  // 3. Tempo médio em cada etapa (status) da vaga — a partir do histórico
  var tempoEtapa = tempoPorStatus_(vagas, core, today);

  // 4/7. Funil e conversão por etapa
  var maxEtapa = {};
  cands.forEach(function (c) { var i = idx(c.Etapa); if (i >= 0 && i !== idxReprov) maxEtapa[c.ID] = i; });
  var candById = {};
  cands.forEach(function (c) { candById[c.ID] = c; });
  Db.all('EtapasCandidatura').forEach(function (e) {
    var c = candById[e.CandidaturaID];
    if (!c) return;
    var i = idx(e.Etapa);
    if (i >= 0 && i !== idxReprov) maxEtapa[c.ID] = Math.max(maxEtapa[c.ID] === undefined ? -1 : maxEtapa[c.ID], i);
  });
  cands.forEach(function (c) { if (maxEtapa[c.ID] === undefined) maxEtapa[c.ID] = 0; });
  var funil = etapas.slice(0, idxReprov).map(function (e, i) {
    var n = cands.filter(function (c) { return maxEtapa[c.ID] >= i; }).length;
    return { label: e, valor: n };
  });
  var conversao = funil.slice(1).map(function (f, i) {
    var prev = funil[i].valor;
    return { label: f.label, valor: prev ? Util.round(f.valor / prev * 100, 0) : null };
  });

  // 5. Motivos de reprovação
  var motivos = toSeries_(Util.groupCount(cands, function (c) { return c.MotivoReprovacao; }));

  // 6. Vagas por analista
  var analistas = {};
  vagas.forEach(function (v) {
    var a = v.Analista || 'Sem analista';
    analistas[a] = analistas[a] || { label: a, ativas: 0, concluidas: 0, outras: 0 };
    if (VT.STATUS_FINAIS.indexOf(v.Status) < 0) analistas[a].ativas++;
    else if (v.Status === VT.STATUS_CONCLUIDA) analistas[a].concluidas++;
    else analistas[a].outras++;
  });

  // 8. Reaberturas por cargo
  var reab = {};
  vagas.forEach(function (v) {
    var n = Util.int(v.Reaberturas) + (v.ReaberturaDe ? 1 : 0);
    if (n) reab[v.Cargo] = (reab[v.Cargo] || 0) + n;
  });

  // 9. Contratações por origem
  var origens = toSeries_(Util.groupCount(cands.filter(function (c) { return c.Etapa === 'Contratado'; }), function (c) { return c.Origem || 'Não informada'; }));

  // 10. Dentro x fora do SLA
  var slaDist = { verde: 0, amarelo: 0, laranja: 0, vermelho: 0 };
  ativas.forEach(function (v) { if (v.sla.iniciado && slaDist[v.sla.nivel] !== undefined) slaDist[v.sla.nivel]++; });

  // Alertas de SLA / gargalos
  var ultimaMov = ultimaMovimentacao_(core);
  var ctxAlertas = Sla.buildContext(core, today);
  var alertas = vagas.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0; }).map(function (v) {
    var mov = ultimaMov[v.ID] || { data: Util.toIsoDate(v.CriadoEm) || v.DataAbertura, status: v.Status };
    var holidays = ctxAlertas.holidaysFor(v.Unidade);
    var parado = Sla.businessDaysBetween(Util.toIsoDate(mov.data), today, holidays);
    return {
      ID: v.ID, Codigo: v.Codigo || v.ID, Cargo: v.Cargo, Unidade: v.Unidade, Analista: v.Analista, Gestor: v.Gestor,
      Status: v.Status, responsavel: v.responsavelAcao, diasNaEtapa: parado,
      semMovimentacao: parado > semMovDias, sla: {
        iniciado: v.sla.iniciado, diasEfetivos: v.sla.diasEfetivos, diasRestantes: v.sla.diasRestantes,
        nivel: v.sla.nivel, prazoAjustado: v.sla.prazoAjustado, percentual: v.sla.percentual,
        limite: v.sla.limite, atraso: v.sla.atraso, fechado: false, suspensa: v.sla.suspensa
      }
    };
  }).filter(function (a) {
    return a.semMovimentacao || (a.sla.iniciado && a.sla.diasRestantes <= alertaDias) || !a.sla.iniciado;
  }).sort(function (a, b) {
    var ra = a.sla.iniciado ? a.sla.diasRestantes : 999, rb = b.sla.iniciado ? b.sla.diasRestantes : 999;
    return ra - rb || b.diasNaEtapa - a.diasNaEtapa;
  }).slice(0, 30);

  return {
    atualizadoEm: Util.now(),
    referencia: today,
    cards: cards,
    graficos: {
      mensal: meses.map(function (m) { return { label: m, abertas: abertasMes[m] || 0, fechadas: fechadasMes[m] || 0, canceladas: canceladasMes[m] || 0 }; }),
      tempoCargo: tempoCargo,
      tempoEtapa: tempoEtapa,
      funil: funil,
      conversao: conversao,
      motivos: motivos,
      analistas: Object.keys(analistas).map(function (k) { return analistas[k]; }).sort(function (a, b) { return (b.ativas + b.concluidas) - (a.ativas + a.concluidas); }),
      reaberturas: toSeries_(reab),
      origens: origens,
      sla: slaDist,
      slaConcluidas: { noPrazo: concluidasNoSla.length, atrasadas: concluidasForaSla.length }
    },
    alertas: alertas
  };
}

function toSeries_(obj) {
  return Object.keys(obj).map(function (k) { return { label: k, valor: obj[k] }; })
    .sort(function (a, b) { return b.valor - a.valor; });
}

function monthRange_(de, ate, today) {
  var end = (ate || today).substr(0, 7);
  var start = de ? de.substr(0, 7) : null;
  var out = [];
  var y = +end.substr(0, 4), m = +end.substr(5, 2);
  for (var i = 0; i < 36; i++) {
    var key = y + '-' + (m < 10 ? '0' : '') + m;
    out.unshift(key);
    if (start ? key <= start : out.length >= 12) break;
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}

/** Última mudança de status por vaga. */
function ultimaMovimentacao_(core) {
  var out = {};
  var posVaga = {};
  core.posicoes.forEach(function (p) { posVaga[p.ID] = p.VagaID; });
  Db.all('Historico').forEach(function (h) {
    if (h.Tipo !== 'Vaga' && h.Tipo !== 'Posicao') return;
    var vagaId = h.Tipo === 'Posicao' ? posVaga[h.ReferenciaID] : h.ReferenciaID;
    if (!vagaId) return;
    if (!out[vagaId] || h.DataHora > out[vagaId].dataHora) out[vagaId] = { data: h.DataHora.substr(0, 10), dataHora: h.DataHora };
  });
  return out;
}

/** Tempo médio (dias úteis) em cada status, a partir do histórico de transições. */
function tempoPorStatus_(vagas, core, today) {
  var ctx = Sla.buildContext(core, today);
  var hist = {};
  Db.all('Historico').forEach(function (h) {
    if (h.Tipo === 'Vaga' && h.Para && VT.STATUS_VAGA.indexOf(h.Para) >= 0) (hist[h.ReferenciaID] = hist[h.ReferenciaID] || []).push(h);
  });
  var acc = {};
  vagas.forEach(function (v) {
    var list = (hist[v.ID] || []).sort(function (a, b) { return a.DataHora.localeCompare(b.DataHora); });
    var holidays = ctx.holidaysFor(v.Unidade);
    list.forEach(function (h, i) {
      var status = h.Para;
      if (VT.STATUS_FINAIS.indexOf(status) >= 0) return;
      var ini = h.DataHora.substr(0, 10);
      var fim = list[i + 1] ? list[i + 1].DataHora.substr(0, 10) : (VT.STATUS_FINAIS.indexOf(v.Status) >= 0 ? null : today);
      if (!fim) return;
      (acc[status] = acc[status] || []).push(Sla.businessDaysBetween(ini, fim, holidays));
    });
  });
  return VT.STATUS_VAGA.filter(function (s) { return acc[s]; }).map(function (s) {
    return { label: s, valor: Util.round(Util.avg(acc[s]), 1), n: acc[s].length, responsavel: VT.RESPONSAVEL_STATUS[s] || '' };
  });
}
