/*
 * Impacto potencial na folha. NÃO altera a folha: apenas aponta diferenças
 * entre o que o MaxTrack registrou e o que o RasterJor apurou para pagamento.
 *
 * Convenção: diferença = MaxTrack − RasterJor.
 *   > 0  → horas registradas e não apuradas (risco de pagamento a menor / passivo)
 *   < 0  → horas apuradas a maior no RasterJor (risco de pagamento indevido)
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const U = AJ.util;

  function valorHora(cfg, cpf) {
    const v = cfg.valoresHora && cfg.valoresHora[cpf];
    return v !== undefined && v !== null && v !== '' ? Number(v) : Number(cfg.valorHoraPadrao) || 0;
  }

  function compute(rec, oc, cfg) {
    const porMot = {};
    const linhas = [];
    const tol = cfg.toleranciaDiaria;
    const get = (k, mot) =>
      (porMot[k] =
        porMot[k] ||
        {
          motorista: k,
          nome: mot.nome,
          cpf: mot.cpf || mot.cpfRJ,
          matricula: mot.matriculaMT || mot.matriculaRJ,
          empresa: mot.empresa,
          he50NaoComputada: 0,
          he50Indevida: 0,
          he100NaoComputada: 0,
          he100Indevida: 0,
          normalNaoApurada: 0,
          horasPendentes: 0,
          intrajornadaSuprimida: 0,
          interjornadaFaltante: 0,
          jornadasAfetadas: 0,
        });
    const motByKey = {};
    for (const m of rec.motoristas) motByKey[m.key] = m;
    const ign = new Set((cfg.ignorarCpfs || []).map(U.normCpf));

    for (const g of rec.grupos) {
      if (g.status === 'conciliado' || g.status === 'nao_validado') continue;
      const mot = motByKey[g.motorista];
      if (ign.has(mot.cpf || mot.cpfRJ)) continue;
      const m = g.mt || {};
      const r = g.rj || {};
      const d50 = U.nz(m.he50) - U.nz(r.he50);
      const d100 = U.nz(m.he100) - U.nz(r.he100);
      const dNorm = U.nz(m.normal) - U.nz(r.normal);
      const dTrab = U.nz(m.trabalho) - U.nz(r.trabalho);
      if (Math.abs(d50) <= tol && Math.abs(d100) <= tol && Math.abs(dTrab) <= tol && Math.abs(dNorm) <= tol) continue;
      const p = get(g.motorista, mot);
      p.jornadasAfetadas++;
      const aberta = (g.rj && g.rj.aberta) || (g.mt && g.mt.aberta);
      if (aberta) {
        // Jornada sem fim: horas ainda "correndo" no sistema – não é diferença real de HE
        p.jornadasAbertas = (p.jornadasAbertas || 0) + 1;
        p.horasPendentes += Math.abs(dTrab);
        linhas.push({ grupo: g.id, motorista: g.motorista, nome: mot.nome, cpf: mot.cpf || mot.cpfRJ, date: g.date, status: g.status, tipo: 'ABERTA', mtTrab: m.trabalho, rjTrab: r.trabalho, mtHe50: m.he50, rjHe50: r.he50, mtHe100: m.he100, rjHe100: r.he100, d50: 0, d100: 0, dTrab, dNorm: 0, causa: 'Jornada sem encerramento — diferença não computada até o fechamento. ' + g.motivos.join('; ') });
        continue;
      }
      if (d50 > tol) p.he50NaoComputada += d50;
      if (d50 < -tol) p.he50Indevida += -d50;
      if (d100 > tol) p.he100NaoComputada += d100;
      if (d100 < -tol) p.he100Indevida += -d100;
      if (g.tipo === 'AUSENTE_RJ' && dNorm > 0) p.normalNaoApurada += dNorm;
      p.horasPendentes += Math.abs(dTrab);
      linhas.push({
        grupo: g.id,
        motorista: g.motorista,
        nome: mot.nome,
        cpf: mot.cpf || mot.cpfRJ,
        date: g.date,
        status: g.status,
        tipo: g.tipo || (g.reclassificado ? 'RECLASSIFICADO' : 'PAR'),
        mtTrab: m.trabalho,
        rjTrab: r.trabalho,
        mtHe50: m.he50,
        rjHe50: r.he50,
        mtHe100: m.he100,
        rjHe100: r.he100,
        d50,
        d100,
        dTrab,
        dNorm,
        causa: g.motivos.join('; '),
      });
    }

    for (const o of oc) {
      if (!o.minutos || o.minutos <= 0) continue;
      const mot = motByKey[o.motorista];
      if (!mot) continue;
      if (o.tipo === 'INTRAJORNADA' || o.tipo === 'SEM_REFEICAO') get(o.motorista, mot).intrajornadaSuprimida += o.minutos;
      if (o.tipo === 'INTERJORNADA') get(o.motorista, mot).interjornadaFaltante += o.minutos;
    }

    const pct50 = 1 + (Number(cfg.adicionalHE50) || 0) / 100;
    const pct100 = 1 + (Number(cfg.adicionalHE100) || 0) / 100;
    const resumo = Object.values(porMot).map((p) => {
      const vh = valorHora(cfg, p.cpf);
      p.valorHora = vh;
      if (vh > 0) {
        p.valorNaoComputado = (p.he50NaoComputada / 60) * vh * pct50 + (p.he100NaoComputada / 60) * vh * pct100;
        p.valorIndevido = (p.he50Indevida / 60) * vh * pct50 + (p.he100Indevida / 60) * vh * pct100;
        // art. 71 §4º: período suprimido + 50%; OJ 355: horas faltantes da interjornada como extras (50%)
        p.valorIndenizacoes = (p.intrajornadaSuprimida / 60) * vh * 1.5 + (p.interjornadaFaltante / 60) * vh * pct50;
      } else {
        p.valorNaoComputado = p.valorIndevido = p.valorIndenizacoes = null;
      }
      return p;
    });
    resumo.sort((a, b) => b.he50NaoComputada + b.he100NaoComputada - (a.he50NaoComputada + a.he100NaoComputada));

    const tot = (k) => resumo.reduce((a, p) => a + (p[k] || 0), 0);
    const totais = {
      he50NaoComputada: tot('he50NaoComputada'),
      he50Indevida: tot('he50Indevida'),
      he100NaoComputada: tot('he100NaoComputada'),
      he100Indevida: tot('he100Indevida'),
      normalNaoApurada: tot('normalNaoApurada'),
      horasPendentes: tot('horasPendentes'),
      intrajornadaSuprimida: tot('intrajornadaSuprimida'),
      interjornadaFaltante: tot('interjornadaFaltante'),
      valorNaoComputado: resumo.some((p) => p.valorNaoComputado !== null) ? tot('valorNaoComputado') : null,
      valorIndevido: resumo.some((p) => p.valorIndevido !== null) ? tot('valorIndevido') : null,
      valorIndenizacoes: resumo.some((p) => p.valorIndenizacoes !== null) ? tot('valorIndenizacoes') : null,
    };
    linhas.sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : a.date < b.date ? -1 : 1));
    return { resumo, linhas, totais };
  }

  AJ.payroll = { compute, valorHora };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
