/*
 * Orquestra a auditoria: parse → conciliação → regras → folha → indicadores.
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const U = AJ.util;

  const STATUS_LABEL = {
    conciliado: 'Conciliado',
    conferencia: 'Necessita conferência',
    divergente: 'Divergência / inconformidade',
    nao_validado: 'Não foi possível validar',
  };

  function runAudit(input) {
    const cfg = AJ.config.merge(AJ.config.DEFAULTS, input.cfg || {});
    const mt = AJ.parsers.mergeResults(input.mt, 'maxtrack');
    const rj = AJ.parsers.mergeResults(input.rj, 'rasterjor');
    const rec = AJ.reconcile.reconcile(mt, rj, cfg);
    // Motoristas presentes somente no MaxTrack (agregados): fora do escopo
    let ignoradosSomenteMT = [];
    if (cfg.ignorarSomenteMaxTrack) {
      const fora = new Set(rec.motoristas.filter((m) => m.vinculo === 'SO_MT').map((m) => m.key));
      ignoradosSomenteMT = rec.motoristas.filter((m) => fora.has(m.key)).map((m) => ({ nome: m.nome, cpf: m.cpf, jornadas: m.jornadasMT ? m.jornadasMT.length : 0 }));
      rec.motoristas = rec.motoristas.filter((m) => !fora.has(m.key));
      rec.grupos = rec.grupos.filter((g) => !fora.has(g.motorista));
    }
    const rules = AJ.rules.run(rec, cfg);
    const ign = new Set((cfg.ignorarCpfs || []).map(U.normCpf));

    // Duplicidades exatas detectadas na junção de arquivos
    for (const [lista, sist] of [[mt.duplicados, 'MaxTrack'], [rj.duplicados, 'RasterJor']]) {
      for (const d of lista || []) {
        const mot = rec.motoristas.find((m) => m.cpf === d.duplicado.cpf || m.cpfRJ === d.duplicado.cpf);
        if (!mot) continue;
        const t = AJ.config.TIPOS.DUPLICIDADE;
        rules.ocorrencias.push({
          id: U.hash('DUPEXATA|' + sist + d.duplicado.cpf + d.duplicado.inicio),
          tipo: 'DUPLICIDADE', nomeTipo: t.nome, categoria: AJ.config.CATEGORIAS[t.cat], catKey: t.cat, gravidade: t.grav,
          motorista: mot.key, nome: mot.nome, cpf: mot.cpf || mot.cpfRJ, matricula: mot.matriculaMT || mot.matriculaRJ, empresa: mot.empresa,
          date: d.duplicado.date, sistema: sist, grupo: d.original.grupo || null, minutos: null, baseLegal: '',
          descricao: `Registro repetido no ${sist} (${d.duplicado.origem} duplica ${d.original.origem}); considerado apenas uma vez.`,
        });
      }
    }

    // Criticidade (Crítica / Alta / Média / Baixa)
    for (const o of rules.ocorrencias) o.gravidade = AJ.config.criticidade(o, cfg);

    // Status final de cada jornada = conciliação + ocorrências vinculadas
    const motByKey = {};
    for (const m of rec.motoristas) motByKey[m.key] = m;
    for (const g of rec.grupos) {
      const ocs = (rules.porGrupo[g.id] || []).filter((o) => !ign.has(o.cpf));
      g.ocorrencias = ocs.map((o) => o.id);
      g.checks = rules.checks[g.id] || {};
      let st = g.status;
      const grave = ocs.some((o) => o.catKey === 'INFRACAO' || o.gravidade === 'Crítica' || (o.gravidade === 'Alta' && o.catKey !== 'DIVERGENCIA'));
      const ordem = AJ.config.GRAV_ORDEM;
      g.criticidade = ocs.length ? ocs.reduce((a, o) => (ordem[o.gravidade] > ordem[a] ? o.gravidade : a), 'Baixa') : 'SEM_AJUSTE';
      if (grave) st = 'divergente';
      else if (ocs.length && st === 'conciliado') st = 'conferencia';
      g.statusAuditoria = st;
      g.empresa = motByKey[g.motorista].empresa;
      g.nome = motByKey[g.motorista].nome;
    }

    const folha = AJ.payroll.compute(rec, rules.ocorrencias, cfg);
    const grupos = rec.grupos.filter((g) => !ign.has(motByKey[g.motorista].cpf || motByKey[g.motorista].cpfRJ));
    const ocorrencias = rules.ocorrencias.sort((a, b) => AJ.config.GRAV_ORDEM[b.gravidade] - AJ.config.GRAV_ORDEM[a.gravidade] || (a.nome < b.nome ? -1 : 1) || ((a.date || '') < (b.date || '') ? -1 : 1));

    // Resumo por motorista
    const motoristas = rec.motoristas
      .filter((m) => !ign.has(m.cpf || m.cpfRJ))
      .map((m) => {
        const gs = grupos.filter((g) => g.motorista === m.key);
        const os = ocorrencias.filter((o) => o.motorista === m.key);
        const sumF = (side, f) => gs.reduce((a, g) => a + U.nz(g[side] && g[side][f]), 0);
        return Object.assign({}, m, {
          qtdJornadas: gs.length,
          qtdConciliadas: gs.filter((g) => g.statusAuditoria === 'conciliado').length,
          qtdConferencia: gs.filter((g) => g.statusAuditoria === 'conferencia').length,
          qtdDivergentes: gs.filter((g) => g.statusAuditoria === 'divergente').length,
          qtdOcorrencias: os.length,
          qtdInfracoes: os.filter((o) => o.catKey === 'INFRACAO').length,
          horasMT: sumF('mt', 'trabalho'),
          horasRJ: sumF('rj', 'trabalho'),
          he50MT: sumF('mt', 'he50'),
          he50RJ: sumF('rj', 'he50'),
          he100MT: sumF('mt', 'he100'),
          he100RJ: sumF('rj', 'he100'),
          statusAuditoria: !gs.length && !os.length ? 'nao_validado' : gs.some((g) => g.statusAuditoria === 'divergente') || os.some((o) => o.gravidade === 'Alta') ? 'divergente' : gs.some((g) => g.statusAuditoria === 'conferencia') || os.length ? 'conferencia' : 'conciliado',
        });
      });

    const kpis = computeKpis(grupos, ocorrencias, motoristas, folha);
    kpis.diariasIndevidas = rules.diarias.resumo.semJornada || 0;
    kpis.diariasNaoGeradas = rules.diarias.resumo.naoGeradas || 0;

    return {
      id: 'aud-' + Date.now().toString(36),
      criadoEm: new Date().toISOString(),
      versaoMotor: AJ.VERSION,
      cfg,
      ignoradosSomenteMT,
      periodo: { ini: rec.periodoIni, fim: rec.periodoFim, comumIni: rec.comumIni, comumFim: rec.comumFim },
      feriados: rec.feriados,
      meta: {
        mt: Object.assign({}, mt.meta, { avisos: mt.avisos, jornadas: mt.jornadas.length, dias: mt.dias.length, motoristas: Object.keys(mt.motoristas).length, layout: mt.layout.slice(0, 1) }),
        rj: Object.assign({}, rj.meta, { avisos: rj.avisos, jornadas: rj.jornadas.length, dias: rj.dias.length, motoristas: Object.keys(rj.motoristas).length, layout: rj.layout.slice(0, 1) }),
      },
      motoristas,
      grupos,
      ocorrencias,
      folha,
      diarias: rules.diarias,
      kpis,
    };
  }

  function computeKpis(grupos, ocorrencias, motoristas, folha) {
    const pares = grupos.filter((g) => g.mt && g.rj);
    const nv = grupos.filter((g) => g.statusAuditoria === 'nao_validado').length;
    const validos = grupos.length - nv;
    const sumAbs = (f) => grupos.filter((g) => g.status !== 'conciliado').reduce((a, g) => a + Math.abs(U.nz(g.mt && g.mt[f]) - U.nz(g.rj && g.rj[f])), 0);
    const byStatus = (s) => grupos.filter((g) => g.statusAuditoria === s).length;
    const byRec = (s) => grupos.filter((g) => g.status === s).length;
    const cat = (k) => ocorrencias.filter((o) => o.catKey === k).length;
    return {
      motoristas: motoristas.filter((m) => m.qtdJornadas > 0).length,
      motoristasCadastro: motoristas.length,
      jornadas: grupos.length,
      pares: pares.length,
      conciliadas: byRec('conciliado'),
      conferencia: byRec('conferencia'),
      divergentes: byRec('divergente'),
      naoValidadas: nv,
      ausentesRJ: grupos.filter((g) => g.tipo === 'AUSENTE_RJ').length,
      ausentesMT: grupos.filter((g) => g.tipo === 'AUSENTE_MT').length,
      audConciliado: byStatus('conciliado'),
      audConferencia: byStatus('conferencia'),
      audDivergente: byStatus('divergente'),
      horasDivergentes: sumAbs('trabalho'),
      he50Divergentes: sumAbs('he50'),
      he100Divergentes: sumAbs('he100'),
      falhasIntegracao: cat('INTEGRACAO'),
      divergenciasApuracao: cat('DIVERGENCIA'),
      infracoes: cat('INFRACAO'),
      operacionais: cat('OPERACIONAL'),
      registros: cat('REGISTRO'),
      cadastro: cat('CADASTRO'),
      inconformidades: cat('INFRACAO') + cat('OPERACIONAL') + cat('REGISTRO'),
      diarias: cat('DIARIA'),
      criticas: ocorrencias.filter((o) => o.gravidade === 'Crítica').length,
      ocorrencias: ocorrencias.length,
      percConciliacao: validos ? byRec('conciliado') / validos : null,
      percConformidade: validos ? byStatus('conciliado') / validos : null,
      he50NaoComputada: folha.totais.he50NaoComputada,
      he100NaoComputada: folha.totais.he100NaoComputada,
    };
  }

  AJ.VERSION = '1.1.0';
  AJ.audit = { runAudit, computeKpis, STATUS_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
