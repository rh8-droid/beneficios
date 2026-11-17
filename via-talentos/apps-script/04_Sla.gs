/**
 * Motor de dias úteis e SLA (funções puras — sem acesso à planilha).
 *
 * Convenções:
 *  - Dia útil: segunda a sexta, exceto feriados (Set de 'aaaa-mm-dd').
 *  - Dias decorridos = dias úteis d com início < d <= referência (o dia da aprovação é o dia 0).
 *  - Prazo = N-ésimo dia útil após o início.
 *  - Suspensão autorizada pausa os dias úteis no intervalo [Inicio, Fim) (aberta: até a referência).
 */
var Sla = (function () {

  function isBusinessDay(iso, holidays) {
    var dow = Util.parse(iso).getUTCDay();
    if (dow === 0 || dow === 6) return false;
    return !(holidays && holidays.has(iso));
  }

  /** Dias úteis em (a, b]. */
  function businessDaysBetween(a, b, holidays) {
    if (!a || !b || b <= a) return 0;
    var count = 0;
    var d = Util.parse(a);
    var end = Util.parse(b).getTime();
    d.setUTCDate(d.getUTCDate() + 1);
    while (d.getTime() <= end) {
      var iso = Util.fmt(d);
      if (isBusinessDay(iso, holidays)) count++;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return count;
  }

  /** N-ésimo dia útil depois de 'a'. */
  function addBusinessDays(a, n, holidays) {
    var d = Util.parse(a);
    var added = 0;
    if (n <= 0) return a;
    while (added < n) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (isBusinessDay(Util.fmt(d), holidays)) added++;
    }
    return Util.fmt(d);
  }

  /** Dias úteis pausados até a referência. */
  function pausedDays(suspensions, start, ref, holidays) {
    var total = 0;
    (suspensions || []).forEach(function (s) {
      if (!s.pausa || !s.inicio) return;
      var ini = s.inicio < start ? start : s.inicio;
      var fimExclusivo = s.fim ? s.fim : Util.addDays(ref, 1);
      if (fimExclusivo > Util.addDays(ref, 1)) fimExclusivo = Util.addDays(ref, 1);
      if (fimExclusivo <= ini) return;
      // dias úteis em [ini, fimExclusivo) = (ini-1, fimExclusivo-1]
      total += businessDaysBetween(Util.addDays(ini, -1), Util.addDays(fimExclusivo, -1), holidays);
    });
    return total;
  }

  /** Cor do semáforo a partir dos dias restantes (regra 9/12/15 para SLA de 15). */
  function level(remaining) {
    if (remaining < 0) return 'vermelho';
    if (remaining <= 2) return 'laranja';
    if (remaining <= 5) return 'amarelo';
    return 'verde';
  }

  /**
   * Calcula o SLA de um intervalo.
   * @param {Object} p {inicio, referencia, fechado (bool), slaDias, extras, holidays, suspensions}
   */
  function compute(p) {
    var limiteBase = p.slaDias;
    var decorridos = businessDaysBetween(p.inicio, p.referencia, p.holidays);
    var pausados = pausedDays(p.suspensions, p.inicio, p.referencia, p.holidays);
    var efetivos = Math.max(0, decorridos - pausados);
    var limite = limiteBase + (p.extras || 0);
    var restantes = limite - efetivos;
    return {
      iniciado: true,
      inicio: p.inicio,
      referencia: p.referencia,
      fechado: !!p.fechado,
      diasDecorridos: decorridos,
      diasPausados: pausados,
      diasEfetivos: efetivos,
      diasAdicionais: p.extras || 0,
      limite: limite,
      diasRestantes: restantes,
      atraso: Math.max(0, -restantes),
      percentual: limite ? Util.round(efetivos / limite * 100, 0) : 0,
      prazoOriginal: addBusinessDays(p.inicio, limiteBase, p.holidays),
      prazoAjustado: addBusinessDays(p.inicio, limite + pausados, p.holidays),
      nivel: level(restantes),
      cumprido: p.fechado ? restantes >= 0 : null
    };
  }

  /** Contexto com feriados por unidade, suspensões e exceções agrupadas por vaga. */
  function buildContext(data, today) {
    var feriados = data.feriados || [];
    var geral = [];
    var porUnidade = {};
    feriados.forEach(function (f) {
      var d = Util.toIsoDate(f.Data);
      if (!d) return;
      var u = Util.norm(f.Unidade);
      if (!u || u === 'todas') geral.push(d);
      else (porUnidade[u] = porUnidade[u] || []).push(d);
    });
    var holidayCache = {};
    function holidaysFor(unidade) {
      var u = Util.norm(unidade);
      if (!holidayCache[u]) holidayCache[u] = new Set(geral.concat(porUnidade[u] || []));
      return holidayCache[u];
    }

    var pausaGlobal = Util.isYes(data.config.SLA_SUSPENSAO_PAUSA);
    var susp = {};
    (data.suspensoes || []).forEach(function (s) {
      (susp[s.VagaID] = susp[s.VagaID] || []).push({
        inicio: Util.toIsoDate(s.Inicio), fim: Util.toIsoDate(s.Fim),
        pausa: pausaGlobal && s.PausaSLA !== 'Não'
      });
    });
    var extras = {};
    (data.excecoes || []).forEach(function (e) {
      extras[e.VagaID] = (extras[e.VagaID] || 0) + Util.int(e.DiasAdicionais);
    });

    return {
      today: today,
      slaDias: Util.int(data.config.SLA_DIAS_UTEIS, 15) || 15,
      holidaysFor: holidaysFor,
      suspensoes: susp,
      extras: extras
    };
  }

  /**
   * SLA de uma vaga e de cada posição.
   * Retorna {iniciado, nivel, ..., posicoes:[{ID, ...sla}], cumprido}
   */
  function forVaga(vaga, posicoes, ctx) {
    var inicio = Util.toIsoDate(vaga.DataAprovacao);
    if (!inicio || vaga.Status === VT.STATUS_AGUARDANDO_APROVACAO) {
      return { iniciado: false, nivel: 'neutro', posicoes: [] };
    }
    var holidays = ctx.holidaysFor(vaga.Unidade);
    var base = {
      inicio: inicio, slaDias: ctx.slaDias, extras: ctx.extras[vaga.ID] || 0,
      holidays: holidays, suspensions: ctx.suspensoes[vaga.ID] || []
    };
    var finalizada = VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0;
    var fechamentoVaga = Util.toIsoDate(vaga.DataFechamento) || ctx.today;

    var posSla = posicoes.map(function (p) {
      var preenchida = p.Status === 'Preenchida' && Util.toIsoDate(p.DataFechamento);
      var ref = preenchida ? Util.toIsoDate(p.DataFechamento) : (finalizada ? fechamentoVaga : ctx.today);
      var r = compute(Object.assign({}, base, { referencia: ref, fechado: !!preenchida }));
      r.posicaoId = p.ID;
      r.numero = p.Numero;
      r.status = p.Status;
      return r;
    });

    var ref = finalizada ? fechamentoVaga : ctx.today;
    var abertas = posicoes.filter(function (p) { return p.Status === 'Aberta'; }).length;
    var geral = compute(Object.assign({}, base, {
      referencia: ref, fechado: vaga.Status === VT.STATUS_CONCLUIDA
    }));
    var preenchidas = posSla.filter(function (s) { return s.fechado; });
    geral.posicoes = posSla;
    geral.posicoesAbertas = abertas;
    geral.cancelada = vaga.Status === VT.STATUS_CANCELADA;
    geral.suspensa = vaga.Status === VT.STATUS_SUSPENSA;
    if (vaga.Status === VT.STATUS_CONCLUIDA) {
      geral.cumprido = preenchidas.length ? preenchidas.every(function (s) { return s.cumprido; }) : geral.diasRestantes >= 0;
    }
    if (geral.cancelada) { geral.nivel = 'neutro'; geral.cumprido = null; }
    if (geral.fechado && !geral.cancelada) geral.nivel = geral.cumprido ? 'verde' : 'vermelho';
    return geral;
  }

  return {
    isBusinessDay: isBusinessDay, businessDaysBetween: businessDaysBetween,
    addBusinessDays: addBusinessDays, pausedDays: pausedDays, level: level,
    compute: compute, buildContext: buildContext, forVaga: forVaga
  };
})();
