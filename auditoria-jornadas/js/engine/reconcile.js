/*
 * Conciliação MaxTrack x RasterJor.
 *
 * 1) Motoristas: casamento por CPF; se o CPF não bater, tenta pelo nome
 *    normalizado (e sinaliza "CPF divergente"). A matrícula NÃO é usada como
 *    chave porque, nos relatórios reais, o Nº de Registro da Folha do RasterJor
 *    difere da matrícula do MaxTrack em vários casos (empresas diferentes do grupo).
 * 2) Jornadas: agrupadas por sobreposição de horário (início–fim). Assim uma
 *    jornada do MaxTrack que atravessa dois dias e foi dividida em duas no
 *    RasterJor (ou vice-versa) é comparada como um único grupo.
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const U = AJ.util;

  function stripZ(n) {
    // O MaxTrack prefixa "Z" no nome de alguns cadastros (ex.: "ZJOSE RONALDO")
    return n.replace(/^Z(?=[A-Z])/, '');
  }

  function matchDrivers(mt, rj) {
    const rjByCpf = new Map();
    const rjByName = new Map();
    for (const [k, d] of Object.entries(rj.motoristas)) {
      if (d.cpf) rjByCpf.set(d.cpf, k);
      rjByName.set(U.normName(d.nome), k);
    }
    const used = new Set();
    const out = [];
    for (const [k, d] of Object.entries(mt.motoristas)) {
      let rk = d.cpf && rjByCpf.get(d.cpf);
      let tipo = rk ? 'CPF' : null;
      if (!rk) {
        const n = U.normName(d.nome);
        rk = rjByName.get(n) || rjByName.get(stripZ(n));
        if (rk && !used.has(rk)) tipo = 'NOME';
        else rk = null;
      }
      if (rk) used.add(rk);
      const r = rk ? rj.motoristas[rk] : null;
      out.push({
        key: d.cpf || k,
        cpf: d.cpf,
        cpfRJ: r ? r.cpf : null,
        nome: r ? r.nome : stripZ(d.nome),
        nomeMT: d.nome,
        nomeRJ: r ? r.nome : null,
        matriculaMT: d.matricula || '',
        matriculaRJ: r ? r.matricula || '' : '',
        empresa: (r && r.empresa) || d.empresa || 'Não informada',
        cargo: (r && r.cargo) || '',
        admissao: (r && r.admissao) || '',
        vinculo: tipo || 'SO_MT',
        mtKey: k,
        rjKey: rk,
      });
    }
    for (const [k, r] of Object.entries(rj.motoristas)) {
      if (used.has(k)) continue;
      out.push({
        key: r.cpf || k,
        cpf: null,
        cpfRJ: r.cpf,
        nome: r.nome,
        nomeMT: null,
        nomeRJ: r.nome,
        matriculaMT: '',
        matriculaRJ: r.matricula || '',
        empresa: r.empresa || 'Não informada',
        cargo: r.cargo || '',
        admissao: r.admissao || '',
        vinculo: 'SO_RJ',
        mtKey: null,
        rjKey: k,
      });
    }
    out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return out;
  }

  function interval(j) {
    const ini = j.inicio !== null ? j.inicio : U.keyToMin(j.date);
    const fim = j.fim !== null && j.fim >= ini ? j.fim : ini + 1;
    return [ini, fim];
  }

  function overlap(a, b) {
    const [a1, a2] = interval(a);
    const [b1, b2] = interval(b);
    return Math.min(a2, b2) - Math.max(a1, b1);
  }

  function groupJornadas(mtJ, rjJ) {
    const items = mtJ.map((j) => ({ j, side: 'mt' })).concat(rjJ.map((j) => ({ j, side: 'rj' })));
    const parent = items.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const unite = (a, b) => (parent[find(a)] = find(b));
    const linked = new Set();
    for (let a = 0; a < items.length; a++) {
      if (items[a].side !== 'mt') continue;
      for (let b = 0; b < items.length; b++) {
        if (items[b].side !== 'rj') continue;
        if (overlap(items[a].j, items[b].j) > 0) {
          unite(a, b);
          linked.add(a);
          linked.add(b);
        }
      }
    }
    // Sem sobreposição: pareia pela mesma data de início, se houver exatamente 1x1
    const byDate = {};
    items.forEach((it, i) => {
      if (linked.has(i)) return;
      (byDate[it.j.date] = byDate[it.j.date] || { mt: [], rj: [] })[it.side].push(i);
    });
    for (const d of Object.values(byDate)) if (d.mt.length === 1 && d.rj.length === 1) unite(d.mt[0], d.rj[0]);

    const comps = {};
    items.forEach((it, i) => {
      const r = find(i);
      (comps[r] = comps[r] || { mt: [], rj: [] })[it.side].push(it.j);
    });
    return Object.values(comps);
  }

  const SUM_FIELDS = ['trabalho', 'normal', 'he50', 'he100', 'noturno', 'refeicao', 'descanso', 'espera'];

  function aggregate(list) {
    if (!list.length) return null;
    const a = { qtd: list.length };
    for (const f of SUM_FIELDS) a[f] = U.sum(...list.map((j) => j[f]));
    const inis = list.map((j) => j.inicio).filter((x) => x !== null);
    a.inicio = inis.length ? Math.min(...inis) : null;
    a.fim = list.some((j) => j.fim === null) ? null : Math.max(...list.map((j) => j.fim));
    a.placas = [...new Set(list.flatMap((j) => String(j.placa || '').split(/\s*[,\n;]\s*/)).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(x)))];
    a.aberta = list.some((j) => j.inicio !== null && j.fim === null);
    return a;
  }

  function compareGroup(g, cfg, feriados) {
    let m = aggregate(g.mtJ);
    const r = aggregate(g.rjJ);
    const res = { mt: m, rj: r, diffs: {}, motivos: [] };
    if (m && !r) {
      res.status = 'divergente';
      res.tipo = 'AUSENTE_RJ';
      res.motivos.push('Jornada registrada no MaxTrack e não apurada no RasterJor');
      return res;
    }
    if (r && !m) {
      res.status = 'divergente';
      res.tipo = 'AUSENTE_MT';
      res.motivos.push('Jornada apurada no RasterJor sem registro correspondente no MaxTrack');
      return res;
    }
    const msgs0 = [];
    // Dia especial (feriado/DSR) reconhecido em um sistema e não no outro:
    // compara com as horas do MaxTrack reclassificadas para 100%.
    const feriado = feriados && g.mtJ.some((j) => feriados.has(j.date));
    const diaDsr = g.rjJ.some((j) => j.diaDsr);
    if ((feriado || diaDsr) && U.nz(m.he100) === 0 && U.nz(r.he100) > 0 && U.nz(m.trabalho) > 0) {
      res.reclassificado = feriado ? 'FERIADO' : 'DSR';
      res.mtOriginal = m;
      m = Object.assign({}, m, { he100: m.trabalho, he50: 0, normal: 0 });
      res.mt = m;
      msgs0.push(
        feriado
          ? 'Feriado não reconhecido no MaxTrack (apurado como dia normal); RasterJor apura como HE 100% — comparação feita com reclassificação'
          : 'Dia de DSR da escala no RasterJor (HE 100%) apurado como dia normal no MaxTrack — comparação feita com reclassificação'
      );
    }
    const d = (k) => (m[k] === null && r[k] === null ? null : U.nz(m[k]) - U.nz(r[k]));
    res.diffs = {
      inicio: m.inicio !== null && r.inicio !== null ? m.inicio - r.inicio : null,
      fim: m.fim !== null && r.fim !== null ? m.fim - r.fim : null,
      trabalho: d('trabalho'),
      normal: d('normal'),
      he50: d('he50'),
      he100: d('he100'),
      refeicao: d('refeicao'),
      descanso: d('descanso'),
      espera: d('espera'),
      noturno: d('noturno'),
    };
    const D = res.diffs;
    const abs = (x) => Math.abs(U.nz(x));
    let level = 0; // 0 ok, 1 conferência, 2 divergente
    const bump = (l, msg) => {
      level = Math.max(level, l);
      if (msg) res.motivos.push(msg);
    };
    const classify = (val, tol, label) => {
      const a = abs(val);
      if (a > cfg.limiteConferencia) bump(2, `${label}: diferença de ${U.fmtDur(val, { sign: true })}`);
      else if (a > tol) bump(1, `${label}: diferença de ${U.fmtDur(val, { sign: true })}`);
    };
    for (const x of msgs0) bump(1, x);
    if (r.aberta || m.aberta) bump(1, `Jornada sem encerramento no ${r.aberta ? 'RasterJor' : 'MaxTrack'}`);
    classify(D.inicio, cfg.toleranciaMarcacao, 'Início');
    classify(D.fim, cfg.toleranciaMarcacao, 'Fim');
    classify(D.trabalho, cfg.toleranciaDiaria, 'Horas trabalhadas');
    classify(D.he50, cfg.toleranciaDiaria, 'HE 50%');
    classify(D.he100, cfg.toleranciaDiaria, 'HE 100%');
    // Campos acessórios: no máximo "conferência"
    for (const [k, lbl] of [['refeicao', 'Refeição'], ['descanso', 'Descanso'], ['espera', 'Espera']]) {
      if (abs(D[k]) > cfg.limiteConferencia) bump(1, `${lbl}: diferença de ${U.fmtDur(D[k], { sign: true })}`);
    }
    if (m.placas.length && r.placas.length && !r.placas.some((p) => m.placas.includes(p))) {
      bump(1, `Placa divergente (MaxTrack ${m.placas.join(', ')} × RasterJor ${r.placas.join(', ')})`);
      res.placaDivergente = true;
    }
    if (g.mtJ.length !== g.rjJ.length) {
      const gaps = (list) => {
        let t = 0;
        for (let i = 1; i < list.length; i++) if (list[i].inicio !== null && list[i - 1].fim !== null) t += Math.max(0, list[i].inicio - list[i - 1].fim);
        return t;
      };
      if (g.mtJ.length > g.rjJ.length) {
        const gp = gaps(g.mtJ);
        res.uniao = 'RJ';
        bump(1, `RasterJor uniu ${g.mtJ.length} jornadas do MaxTrack em ${g.rjJ.length}: o intervalo de ${U.fmtDur(gp)} entre elas foi incluído na jornada do RasterJor (provável fim de jornada não integrado)`);
      } else {
        const gp = gaps(g.rjJ);
        res.uniao = 'MT';
        bump(1, `MaxTrack manteve ${g.mtJ.length} jornada onde o RasterJor apurou ${g.rjJ.length} (pausa de ${U.fmtDur(gp)} tratada como interjornada no RasterJor)`);
      }
    }
    res.status = ['conciliado', 'conferencia', 'divergente'][level];
    return res;
  }

  function reconcile(mt, rj, cfg) {
    const motoristas = matchDrivers(mt, rj);
    const mtByKey = {};
    const rjByKey = {};
    for (const j of mt.jornadas) (mtByKey[j.cpf || 'NOME:' + U.normName(j.nome)] = mtByKey[j.cpf || 'NOME:' + U.normName(j.nome)] || []).push(j);
    for (const j of rj.jornadas) (rjByKey[j.cpf || 'NOME:' + U.normName(j.nome)] = rjByKey[j.cpf || 'NOME:' + U.normName(j.nome)] || []).push(j);
    const mtDias = {};
    const rjDias = {};
    for (const d of mt.dias) (mtDias[d.cpf || 'NOME:' + U.normName(d.nome)] = mtDias[d.cpf || 'NOME:' + U.normName(d.nome)] || []).push(d);
    for (const d of rj.dias) (rjDias[d.cpf || 'NOME:' + U.normName(d.nome)] = rjDias[d.cpf || 'NOME:' + U.normName(d.nome)] || []).push(d);

    const grupos = [];
    // Calendário de feriados: parâmetros + dias marcados como "Feriado" no RasterJor
    const feriados = new Set(cfg.feriados || []);
    const ferCount = {};
    for (const d of rj.dias) if (d.situacao === 'FERIADO') ferCount[d.date] = (ferCount[d.date] || 0) + 1;
    for (const [k, n] of Object.entries(ferCount)) if (n >= 2) feriados.add(k);
    const periodoIni = [mt.meta.periodoIni, rj.meta.periodoIni].filter(Boolean).sort()[0] || null;
    const periodoFim = [mt.meta.periodoFim, rj.meta.periodoFim].filter(Boolean).sort().reverse()[0] || null;
    // Período comum: só faz sentido cobrar ausência dentro do intervalo coberto pelos dois relatórios
    const comumIni = [mt.meta.periodoIni, rj.meta.periodoIni].filter(Boolean).sort().reverse()[0] || null;
    const comumFim = [mt.meta.periodoFim, rj.meta.periodoFim].filter(Boolean).sort()[0] || null;

    for (const mot of motoristas) {
      const mj = (mot.mtKey && mtByKey[mot.mtKey]) || [];
      const rjj = (mot.rjKey && rjByKey[mot.rjKey]) || [];
      mot.diasMT = (mot.mtKey && mtDias[mot.mtKey]) || [];
      mot.diasRJ = (mot.rjKey && rjDias[mot.rjKey]) || [];
      mot.jornadasMT = mj;
      mot.jornadasRJ = rjj;
      const comps = groupJornadas(mj, rjj);
      for (const c of comps) {
        c.mt.sort((a, b) => U.nz(a.inicio) - U.nz(b.inicio));
        c.rj.sort((a, b) => U.nz(a.inicio) - U.nz(b.inicio));
        const first = c.mt[0] || c.rj[0];
        const date = c.mt[0] ? c.mt[0].date : c.rj[0].date;
        const g = {
          id: U.hash(`${mot.key}|${date}|${first.inicio}`),
          motorista: mot.key,
          date,
          mtJ: c.mt,
          rjJ: c.rj,
        };
        Object.assign(g, compareGroup(g, cfg, feriados));
        for (const j of c.mt) j.grupo = g.id;
        for (const j of c.rj) j.grupo = g.id;
        // Fora do período comum aos dois relatórios => não validável
        if (comumIni && comumFim && (date < comumIni || date > comumFim) && (g.tipo === 'AUSENTE_RJ' || g.tipo === 'AUSENTE_MT')) {
          g.status = 'nao_validado';
          g.motivos = ['Data fora do período coberto pelos dois relatórios'];
        }
        // Motorista inexistente no outro sistema
        if (mot.vinculo === 'SO_MT' && g.tipo === 'AUSENTE_RJ') g.motivos.push('Motorista não localizado no RasterJor');
        if (mot.vinculo === 'SO_RJ' && g.tipo === 'AUSENTE_MT') g.motivos.push('Motorista não localizado no MaxTrack');
        // Contexto do dia no outro sistema
        const rjDay = mot.diasRJ.find((d) => d.date === date && !d.comJornada);
        if (g.tipo === 'AUSENTE_RJ' && rjDay && rjDay.situacao !== 'NORMAL') g.motivos.push(`RasterJor classificou o dia como "${rjDay.rotulo || rjDay.situacao}"`);
        const mtDay = mot.diasMT.find((d) => d.date === date);
        if (g.tipo === 'AUSENTE_MT' && mtDay) g.motivos.push(`MaxTrack: "${mtDay.rotulo}" no dia`);
        grupos.push(g);
      }
    }
    grupos.sort((a, b) => (a.motorista < b.motorista ? -1 : a.motorista > b.motorista ? 1 : a.date < b.date ? -1 : 1));
    return { motoristas, grupos, periodoIni, periodoFim, comumIni, comumFim, feriados: [...feriados].sort() };
  }

  AJ.reconcile = { reconcile, matchDrivers, groupJornadas, aggregate, compareGroup };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
