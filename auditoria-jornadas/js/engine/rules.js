/*
 * Regras de auditoria: gera as ocorrências a partir da conciliação.
 *
 * Princípios:
 *  - A fonte primária para regras legais é o MaxTrack (registro das macros);
 *    o RasterJor é usado quando a jornada só existe nele.
 *  - Divergência de integração ≠ inconformidade operacional ≠ infração trabalhista.
 *  - Ausência de informação NÃO comprova que algo não ocorreu: nesses casos a
 *    regra fica "Não foi possível validar".
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const U = AJ.util;
  const C = AJ.config;

  const BASE_LEGAL = {
    INTERJORNADA: 'CLT art. 66 e art. 235-C §3º (Lei 13.103/2015); fracionamento declarado inconstitucional pelo STF (ADI 5322). Horas suprimidas devem ser pagas como extras (OJ 355 SDI-1/TST).',
    INTERJORNADA_FRACIONADA: 'Fracionamento da interjornada habilitado nos parâmetros (verificar CCT e ADI 5322).',
    INTRAJORNADA: 'CLT art. 71 e art. 235-C §2º. Supressão gera pagamento indenizatório do período suprimido com acréscimo de 50% (art. 71 §4º).',
    SEM_REFEICAO: 'CLT art. 71. Ausência de macro de refeição não comprova supressão do intervalo — conferir com o motorista/gestor.',
    DIRECAO_CONTINUA: 'CTB art. 67-C (redação da Lei 13.103/2015): vedado dirigir mais de 5h30 ininterruptas; descanso de 30 min a cada 6h.',
    EXCESSO_JORNADA: 'CLT art. 235-C: 8h diárias + até 2h extras, ou até 4h extras quando previsto em convenção/acordo coletivo.',
    DIAS_CONSECUTIVOS: 'CLT art. 67 e Lei 605/1949: descanso semanal remunerado de 24h consecutivas (art. 235-D para viagens de longa distância).',
    LIMITE_SEMANAL: 'Limite semanal parametrizado (CF art. 7º XIII: 44h semanais + horas extras autorizadas).',
    DIRECAO_DIARIA: 'Regra operacional configurada no MaxTrack (Tempo Máximo de Direção).',
    PAUSA_INTERNA_LONGA: 'Pausa longa dentro da mesma jornada: se foi repouso, a jornada deveria ter sido encerrada e a interjornada (11h) não foi cumprida.',
    TEMPO_ATE_REFEICAO: 'Regra operacional configurada no MaxTrack (Tempo até Refeição).',
    JORNADA_ABERTA: 'Controle de jornada (CLT art. 74 §2º e art. 2º V "b" da Lei 13.103/2015): toda jornada deve ter início e fim registrados.',
    SEQUENCIA_INVALIDA: 'Consistência dos registros de jornada.',
    SEM_DIRECAO: 'Jornada sem macro de direção – pode indicar macro não enviada ou jornada sem condução (pátio, manutenção).',
  };

  function newOc(ctx, tipo, mot, extra) {
    const t = C.TIPOS[tipo];
    const o = Object.assign(
      {
        tipo,
        nomeTipo: t.nome,
        categoria: C.CATEGORIAS[t.cat],
        catKey: t.cat,
        gravidade: t.grav,
        motorista: mot.key,
        nome: mot.nome,
        cpf: mot.cpf || mot.cpfRJ,
        matricula: mot.matriculaMT || mot.matriculaRJ,
        empresa: mot.empresa,
        date: null,
        sistema: 'MaxTrack',
        descricao: '',
        baseLegal: BASE_LEGAL[tipo] || '',
        minutos: null,
        grupo: null,
      },
      extra
    );
    o.id = U.hash([tipo, mot.key, o.date || '', o.chave || o.grupo || ''].join('|'));
    ctx.out.push(o);
    if (o.grupo) (ctx.porGrupo[o.grupo] = ctx.porGrupo[o.grupo] || []).push(o);
    return o;
  }

  const D = (m) => U.fmtDur(m);
  const DT = (m) => U.fmtDateTime(m);

  // ------------------------------------------------------------------
  // Divergências de conciliação e integração
  // ------------------------------------------------------------------
  function integrationRules(ctx, rec, cfg) {
    for (const mot of rec.motoristas) {
      const grupos = rec.grupos.filter((g) => g.motorista === mot.key);
      // Cadastro
      if (mot.vinculo === 'NOME') {
        newOc(ctx, 'CPF_DIVERGENTE', mot, {
          sistema: 'Ambos',
          chave: 'cpf',
          descricao: `Motorista vinculado pelo nome. CPF no MaxTrack ${U.fmtCpf(mot.cpf, cfg.mascararCpf)} × CPF no RasterJor ${U.fmtCpf(mot.cpfRJ, cfg.mascararCpf)}. A integração por CPF pode estar falhando para este motorista.`,
        });
      }
      if (mot.matriculaMT && mot.matriculaRJ && U.clean(mot.matriculaRJ) && U.normMatricula(mot.matriculaMT) !== U.normMatricula(mot.matriculaRJ)) {
        newOc(ctx, 'MATRICULA_DIVERGENTE', mot, {
          sistema: 'Ambos',
          chave: 'mat',
          descricao: `Matrícula MaxTrack ${mot.matriculaMT} × Nº Registro da Folha RasterJor ${mot.matriculaRJ}. Conferir se a integração/folha usa a matrícula correta.`,
        });
      }
      if (mot.vinculo === 'SO_MT') {
        const gs = grupos.filter((g) => g.tipo === 'AUSENTE_RJ' && g.status !== 'nao_validado');
        if (gs.length) {
          const horas = gs.reduce((a, g) => a + U.nz(g.mt.trabalho), 0);
          const he = gs.reduce((a, g) => a + U.nz(g.mt.he50) + U.nz(g.mt.he100), 0);
          newOc(ctx, 'MOTORISTA_AUSENTE_RJ', mot, {
            sistema: 'Integração',
            chave: 'mot',
            date: gs[0].date,
            minutos: horas,
            descricao: `Motorista com ${gs.length} jornada(s) no MaxTrack (${D(horas)} trabalhadas, ${D(he)} de HE) não localizado no RasterJor. Verificar cadastro/integração ou se é usuário não-motorista (ex.: manutenção).`,
          });
        }
      }
      if (mot.vinculo === 'SO_RJ') {
        const gs = grupos.filter((g) => g.tipo === 'AUSENTE_MT');
        newOc(ctx, 'MOTORISTA_AUSENTE_MT', mot, {
          sistema: 'Integração',
          chave: 'mot',
          gravidade: gs.length ? 'Média' : 'Baixa',
          descricao: gs.length
            ? `Motorista com ${gs.length} jornada(s) no RasterJor e sem cadastro correspondente (CPF/nome) no MaxTrack.`
            : 'Motorista cadastrado no RasterJor sem registros no MaxTrack no período (verificar se está ativo/afastado).',
        });
      }

      for (const g of grupos) {
        if (g.status === 'nao_validado') continue;
        if (g.tipo === 'AUSENTE_RJ') {
          if (mot.vinculo === 'SO_MT') continue; // já consolidado acima
          const j = g.mt;
          newOc(ctx, 'JORNADA_AUSENTE_RJ', mot, {
            date: g.date,
            grupo: g.id,
            sistema: 'Integração',
            minutos: j.trabalho,
            descricao: `Jornada ${DT(j.inicio)} → ${DT(j.fim)} (${D(j.trabalho)} trabalhadas; HE 50% ${D(j.he50)}; HE 100% ${D(j.he100)}) registrada no MaxTrack e não apurada no RasterJor. ${g.motivos.slice(1).join('. ')}`.trim(),
          });
        } else if (g.tipo === 'AUSENTE_MT') {
          const j = g.rj;
          newOc(ctx, 'JORNADA_AUSENTE_MT', mot, {
            date: g.date,
            grupo: g.id,
            sistema: 'Integração',
            minutos: j.trabalho,
            descricao: `Jornada ${DT(j.inicio)} → ${DT(j.fim)} (${D(j.trabalho)}) apurada no RasterJor sem registro correspondente no MaxTrack (possível lançamento manual ou macro não integrada). ${g.motivos.slice(1).join('. ')}`.trim(),
          });
        } else if (g.status !== 'conciliado') {
          const df = g.diffs;
          const big = (x, tol) => Math.abs(U.nz(x)) > tol;
          let tipo = 'INTERVALO_DIVERGENTE';
          if (g.reclassificado) tipo = 'HE100_DIVERGENTE';
          else if (big(df.trabalho, cfg.toleranciaDiaria)) tipo = 'HORAS_DIVERGENTES';
          else if (big(df.he50, cfg.toleranciaDiaria)) tipo = 'HE50_DIVERGENTE';
          else if (big(df.he100, cfg.toleranciaDiaria)) tipo = 'HE100_DIVERGENTE';
          else if (big(df.inicio, cfg.toleranciaMarcacao) || big(df.fim, cfg.toleranciaMarcacao)) tipo = 'HORARIO_DIVERGENTE';
          else if (g.placaDivergente) tipo = 'PLACA_DIVERGENTE';
          let grav = g.status === 'divergente' ? 'Alta' : 'Baixa';
          if (g.reclassificado) grav = 'Média';
          if (g.status === 'divergente' && tipo === 'HORARIO_DIVERGENTE') grav = 'Média';
          const heDiff = U.nz(df.he50) + U.nz(df.he100);
          newOc(ctx, tipo, mot, {
            date: g.date,
            grupo: g.id,
            sistema: 'Ambos',
            gravidade: grav,
            minutos: Math.abs(U.nz(df.trabalho)) || Math.abs(heDiff) || null,
            descricao:
              `MaxTrack: ${DT(g.mt.inicio)}→${DT(g.mt.fim)}, ${D(g.mt.trabalho)} (HE50 ${D(g.mt.he50)}, HE100 ${D(g.mt.he100)}) | ` +
              `RasterJor: ${DT(g.rj.inicio)}→${DT(g.rj.fim)}, ${D(g.rj.trabalho)} (HE50 ${D(g.rj.he50)}, HE100 ${D(g.rj.he100)}). ` +
              g.motivos.join('; ') +
              '.',
          });
        }
      }

      // Situação do dia divergente (férias/afastamento/suspensão)
      const ESPECIAIS = ['FERIAS', 'SUSPENSAO', 'AFASTAMENTO', 'FALTA'];
      const mtDia = {};
      const rjDia = {};
      for (const d of mot.diasMT) mtDia[d.date] = d;
      for (const d of mot.diasRJ) if (!rjDia[d.date] || !d.comJornada) rjDia[d.date] = d;
      const mtWork = new Set(mot.jornadasMT.map((j) => j.date));
      const rjWork = new Set(mot.jornadasRJ.map((j) => j.date));
      const conflitos = [];
      const dates = new Set([...Object.keys(mtDia), ...Object.keys(rjDia), ...mtWork, ...rjWork]);
      for (const dt of [...dates].sort()) {
        if (rec.comumIni && (dt < rec.comumIni || dt > rec.comumFim)) continue;
        const a = mtDia[dt];
        const b = rjDia[dt];
        const aSit = a ? a.situacao : mtWork.has(dt) ? 'TRABALHO' : null;
        const bSit = b && !b.comJornada ? b.situacao : rjWork.has(dt) ? 'TRABALHO' : b ? b.situacao : null;
        if (!aSit || !bSit) continue;
        const aE = ESPECIAIS.includes(aSit);
        const bE = ESPECIAIS.includes(bSit);
        const conflito =
          (aSit === 'TRABALHO' && bE) || // trabalhou em dia de férias/afastamento no outro sistema
          (bSit === 'TRABALHO' && aE) ||
          (aE && bE && aSit !== bSit) ||
          (aSit === 'FERIAS' && bSit !== 'FERIAS'); // férias no MaxTrack não lançadas no RasterJor
        if (conflito) conflitos.push({ dt, a: a ? a.rotulo : 'Jornada', b: b && !b.comJornada ? b.rotulo : 'Jornada', aSit, bSit });
      }
      // Agrupa datas consecutivas com o mesmo conflito
      let cur = null;
      const flush = () => {
        if (!cur) return;
        newOc(ctx, 'SITUACAO_DIVERGENTE', mot, {
          date: cur.ini,
          chave: cur.ini + cur.k,
          sistema: 'Ambos',
          gravidade: cur.aSit === 'TRABALHO' || cur.bSit === 'TRABALHO' ? 'Alta' : 'Média',
          descricao: `${U.fmtDate(cur.ini)}${cur.fim !== cur.ini ? ' a ' + U.fmtDate(cur.fim) : ''}: MaxTrack "${cur.a}" × RasterJor "${cur.b}". Conferir lançamento de férias/afastamentos nos dois sistemas.`,
        });
        cur = null;
      };
      for (const c of conflitos) {
        const k = c.aSit + '|' + c.bSit;
        if (cur && cur.k === k && U.keyToMin(c.dt) - U.keyToMin(cur.fim) === 1440) cur.fim = c.dt;
        else {
          flush();
          cur = { ini: c.dt, fim: c.dt, k, a: c.a.split(':')[0], b: c.b.split(':')[0], aSit: c.aSit, bSit: c.bSit };
        }
      }
      flush();

      // Duplicidades / sobreposição dentro do mesmo sistema
      for (const [lista, sist] of [[mot.jornadasMT, 'MaxTrack'], [mot.jornadasRJ, 'RasterJor']]) {
        const s = lista.filter((j) => j.inicio !== null && j.fim !== null).sort((a, b) => a.inicio - b.inicio);
        for (let i = 1; i < s.length; i++) {
          if (s[i].inicio < s[i - 1].fim) {
            newOc(ctx, 'DUPLICIDADE', mot, {
              date: s[i].date,
              grupo: s[i].grupo,
              chave: sist + s[i].inicio,
              sistema: sist,
              descricao: `Jornadas sobrepostas no ${sist}: ${DT(s[i - 1].inicio)}→${DT(s[i - 1].fim)} e ${DT(s[i].inicio)}→${DT(s[i].fim)}.`,
            });
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Regras legais / operacionais / de registro
  // ------------------------------------------------------------------
  function referenceJornadas(mot, rec) {
    // MaxTrack como fonte primária; RasterJor apenas onde não há MaxTrack
    const gruposSoRJ = new Set(rec.grupos.filter((g) => g.motorista === mot.key && g.tipo === 'AUSENTE_MT').map((g) => g.id));
    const refs = mot.jornadasMT.map((j) => ({ j, src: 'MaxTrack' }));
    for (const j of mot.jornadasRJ) if (gruposSoRJ.has(j.grupo)) refs.push({ j, src: 'RasterJor' });
    refs.sort((a, b) => U.nz(a.j.inicio) - U.nz(b.j.inicio));
    return refs;
  }

  function legalRules(ctx, rec, cfg) {
    const gruposById = {};
    for (const g of rec.grupos) gruposById[g.id] = g;

    for (const mot of rec.motoristas) {
      const refs = referenceJornadas(mot, rec);
      for (let i = 0; i < refs.length; i++) {
        const { j, src } = refs[i];
        const g = gruposById[j.grupo];
        const chk = (ctx.checks[j.grupo] = ctx.checks[j.grupo] || {});
        const base = { date: j.date, grupo: j.grupo, sistema: src };
        const trab = j.trabalho;

        // --- Registro: jornada aberta / sequência
        if (j.inicio !== null && j.fim === null) {
          newOc(ctx, 'JORNADA_ABERTA', mot, Object.assign({}, base, { chave: 'ab' + j.inicio, descricao: `Jornada iniciada em ${DT(j.inicio)} sem registro de fim no ${src}.` }));
        }
        if (g && g.rjJ) {
          for (const r of g.rjJ) {
            if (src === 'MaxTrack' && r.inicio !== null && r.fim === null) {
              newOc(ctx, 'JORNADA_ABERTA', mot, Object.assign({}, base, { sistema: 'RasterJor', chave: 'abrj' + r.inicio, descricao: `Jornada iniciada em ${DT(r.inicio)} sem registro de fim no RasterJor (MaxTrack encerrou em ${DT(j.fim)}). Horas no RasterJor: ${D(r.trabalho)}.` }));
            }
          }
        }
        if (j.inicio !== null && j.fim !== null && j.fim < j.inicio) {
          newOc(ctx, 'SEQUENCIA_INVALIDA', mot, Object.assign({}, base, { chave: 'seq', descricao: `Fim (${DT(j.fim)}) anterior ao início (${DT(j.inicio)}).` }));
        }
        if (j.periodos && j.periodos.length > 1) {
          for (let k = 1; k < j.periodos.length; k++) {
            const gap = j.periodos[k].ini - j.periodos[k - 1].fim;
            if (gap >= cfg.pausaInternaLonga) {
              const insuf = gap < cfg.interjornadaMin;
              newOc(ctx, 'PAUSA_INTERNA_LONGA', mot, Object.assign({}, base, {
                chave: 'pz' + j.periodos[k].ini,
                gravidade: insuf ? 'Alta' : 'Média',
                minutos: insuf ? cfg.interjornadaMin - gap : null,
                descricao: `Pausa de ${D(gap)} entre ${DT(j.periodos[k - 1].fim)} e ${DT(j.periodos[k].ini)} dentro da mesma jornada (${DT(j.inicio)}→${DT(j.fim)}).` + (insuf ? ` Se foi repouso, a interjornada ficou ${D(cfg.interjornadaMin - gap)} abaixo de ${D(cfg.interjornadaMin)}.` : ''),
              }));
            }
          }
        }

        // --- Intrajornada
        if (trab === null) {
          chk.intrajornada = 'nv';
        } else {
          const ref = U.nz(j.refeicao) + (cfg.considerarDescansoComoIntervalo ? U.nz(j.descanso) : 0);
          const pausas = U.nz(j.refeicao) + U.nz(j.descanso);
          if (trab > 360) {
            if (!j.refeicao) {
              const rjRef = g && g.rj && g.rj.refeicao;
              newOc(ctx, 'SEM_REFEICAO', mot, Object.assign({}, base, {
                minutos: cfg.intrajornadaAcima6h,
                descricao: `Jornada de ${D(trab)} (${DT(j.inicio)}→${DT(j.fim)}) sem registro de refeição no ${src}.` + (src === 'MaxTrack' ? (rjRef ? ` O RasterJor registra ${D(rjRef)} de refeição — conferir origem do lançamento.` : ' Também não há refeição no RasterJor.') : '') + ' Verificar se a macro não foi enviada ou se o intervalo foi suprimido.',
              }));
              chk.intrajornada = 'falha';
            } else if (ref < cfg.intrajornadaAcima6h) {
              newOc(ctx, 'INTRAJORNADA', mot, Object.assign({}, base, {
                minutos: cfg.intrajornadaAcima6h - ref,
                descricao: `Jornada de ${D(trab)} com intervalo de refeição de ${D(ref)} (mínimo ${D(cfg.intrajornadaAcima6h)}). Tempo suprimido: ${D(cfg.intrajornadaAcima6h - ref)}.`,
              }));
              chk.intrajornada = 'falha';
            } else chk.intrajornada = 'ok';
          } else if (trab > 240) {
            if (pausas < cfg.intrajornada4a6h) {
              newOc(ctx, 'INTRAJORNADA', mot, Object.assign({}, base, {
                gravidade: 'Média',
                minutos: cfg.intrajornada4a6h - pausas,
                descricao: `Jornada de ${D(trab)} (entre 4h e 6h) com pausa de ${D(pausas)} (mínimo ${D(cfg.intrajornada4a6h)}).`,
              }));
              chk.intrajornada = 'falha';
            } else chk.intrajornada = 'ok';
          } else chk.intrajornada = 'ok';
          if (cfg.validarTempoAteRefeicao && j.ateRefeicao !== null && j.ateRefeicao !== undefined && j.ateRefeicao > cfg.tempoMaxAteRefeicao) {
            newOc(ctx, 'TEMPO_ATE_REFEICAO', mot, Object.assign({}, base, { minutos: j.ateRefeicao - cfg.tempoMaxAteRefeicao, descricao: `Refeição após ${D(j.ateRefeicao)} de trabalho (parâmetro ${D(cfg.tempoMaxAteRefeicao)}).` }));
          }
        }

        // --- Direção
        if (j.dirContinua === undefined || src !== 'MaxTrack') {
          chk.direcao = 'nv';
        } else if (j.dirContinua !== null && j.dirContinua > cfg.direcaoContinuaMax) {
          newOc(ctx, 'DIRECAO_CONTINUA', mot, Object.assign({}, base, {
            minutos: j.dirContinua - cfg.direcaoContinuaMax,
            descricao: `Maior período de direção contínua: ${D(j.dirContinua)} (limite ${D(cfg.direcaoContinuaMax)}; excesso ${D(j.dirContinua - cfg.direcaoContinuaMax)}). Jornada ${DT(j.inicio)}→${DT(j.fim)}, direção total ${D(j.direcao)}. O relatório do MaxTrack não informa o horário exato do trecho — consultar o relatório de macros.`,
          }));
          chk.direcao = 'falha';
        } else chk.direcao = 'ok';
        if (src === 'MaxTrack' && cfg.validarDirecaoDiaria && j.direcao !== null && j.direcao > cfg.direcaoDiariaMax) {
          newOc(ctx, 'DIRECAO_DIARIA', mot, Object.assign({}, base, { minutos: j.direcao - cfg.direcaoDiariaMax, descricao: `Direção total na jornada: ${D(j.direcao)} (parâmetro ${D(cfg.direcaoDiariaMax)}).` }));
        }
        if (src === 'MaxTrack' && trab && trab > 60 && !j.direcao) {
          newOc(ctx, 'SEM_DIRECAO', mot, Object.assign({}, base, { descricao: `Jornada de ${D(trab)} sem tempo de direção registrado (em posição ${D(j.posicao)}, espera ${D(j.espera)}). Placa: ${j.placa || '—'}.` }));
        }

        // --- Excesso de jornada
        if (trab === null) chk.excesso = 'nv';
        else {
          const lim = cfg.jornadaBaseLegal + cfg.heMaxDiaria;
          if (trab > lim) {
            newOc(ctx, 'EXCESSO_JORNADA', mot, Object.assign({}, base, {
              minutos: trab - lim,
              descricao: `Trabalho de ${D(trab)} na jornada ${DT(j.inicio)}→${DT(j.fim)} — limite ${D(lim)} (${D(cfg.jornadaBaseLegal)} + ${D(cfg.heMaxDiaria)} extras). Excesso: ${D(trab - lim)}.` + (j.extraExcedente ? ` MaxTrack apurou ${D(j.extraExcedente)} como "Extra Excedente".` : ''),
            }));
            chk.excesso = 'falha';
          } else chk.excesso = 'ok';
        }

        // --- Interjornada (com a jornada anterior)
        if (i === 0) {
          const ant = j.interjornadaAnterior;
          if (src === 'MaxTrack' && ant !== null && ant !== undefined && ant < cfg.interjornadaMin) {
            interOc(ctx, mot, cfg, base, ant, null, j, g, 'Jornada anterior fora do período do relatório; valor do Interstício informado pelo MaxTrack.');
            chk.interjornada = 'falha';
          } else chk.interjornada = ant !== null && ant !== undefined ? 'ok' : 'nv';
        } else {
          const prev = refs[i - 1].j;
          if (prev.fim === null || j.inicio === null) chk.interjornada = 'nv';
          else {
            const rest = j.inicio - prev.fim;
            if (rest < cfg.interjornadaMin) {
              interOc(ctx, mot, cfg, base, rest, prev, j, g);
              chk.interjornada = 'falha';
            } else chk.interjornada = 'ok';
          }
        }
      }

      // --- Dias consecutivos sem DSR (contados pelo espelho do RasterJor)
      let run = null;
      const runs = [];
      const days = [...new Set(mot.jornadasRJ.filter((j) => j.inicio !== null).map((j) => j.dataLinha || j.date))].sort();
      for (const d of days) {
        if (run && U.keyToMin(d) - U.keyToMin(run.fim) === 1440) {
          run.fim = d;
          run.n++;
        } else {
          if (run) runs.push(run);
          run = { ini: d, fim: d, n: 1 };
        }
      }
      if (run) runs.push(run);
      for (const r of runs) {
        if (r.n > cfg.maxDiasConsecutivos) {
          newOc(ctx, 'DIAS_CONSECUTIVOS', mot, {
            date: r.fim,
            chave: r.ini,
            minutos: null,
            sistema: 'RasterJor',
            descricao: `${r.n} dias consecutivos com jornada no RasterJor sem descanso semanal (limite ${cfg.maxDiasConsecutivos}): ${U.fmtDate(r.ini)} a ${U.fmtDate(r.fim)}. Dias anteriores ao início do relatório não são considerados.`,
          });
        }
      }

      // --- Limite semanal
      if (cfg.validarSemanal) {
        const sem = {};
        for (const { j } of refs) {
          if (j.trabalho === null || j.inicio === null) continue;
          const k = U.isoWeekKey(j.inicio);
          sem[k] = (sem[k] || 0) + j.trabalho;
        }
        for (const [k, tot] of Object.entries(sem)) {
          if (tot > cfg.limiteSemanal) {
            newOc(ctx, 'LIMITE_SEMANAL', mot, {
              date: k,
              chave: 'sem' + k,
              minutos: tot - cfg.limiteSemanal,
              descricao: `Semana iniciada em ${U.fmtDate(k)}: ${D(tot)} de trabalho (parâmetro ${D(cfg.limiteSemanal)}; excesso ${D(tot - cfg.limiteSemanal)}). Considera apenas os dias presentes no relatório.`,
            });
          }
        }
      }
    }
  }

  function interOc(ctx, mot, cfg, base, rest, prev, j, g, nota) {
    const falta = cfg.interjornadaMin - rest;
    let rjInfo = '';
    if (g && g.rjJ && g.rjJ.length) {
      const fr = g.rjJ.map((r) => r.faltaRepouso).filter((x) => x);
      rjInfo = fr.length ? ` RasterJor apurou falta de repouso de ${D(fr.reduce((a, b) => a + b, 0))}.` : ' RasterJor não apurou "Hora Falta Repouso" para esta jornada.';
    }
    const fracionavel = cfg.permitirFracionamentoInterjornada && rest >= cfg.interjornadaPrimeiroPeriodo;
    newOc(ctx, fracionavel ? 'INTERJORNADA_FRACIONADA' : 'INTERJORNADA', mot, Object.assign({}, base, {
      minutos: falta,
      descricao:
        (prev ? `Saída ${DT(prev.fim)} → retorno ${DT(j.inicio)}: ` : `Retorno ${DT(j.inicio)}: `) +
        `descanso de ${D(rest)} (mínimo ${D(cfg.interjornadaMin)}; faltaram ${D(falta)}).` +
        (nota ? ' ' + nota : '') +
        rjInfo,
    }));
  }

  // ------------------------------------------------------------------
  function run(rec, cfg) {
    const ctx = { out: [], porGrupo: {}, checks: {} };
    integrationRules(ctx, rec, cfg);
    legalRules(ctx, rec, cfg);
    const diarias = AJ.diarias ? AJ.diarias.compute(rec, cfg, (tipo, mot, extra) => newOc(ctx, tipo, mot, extra)) : { linhas: [], resumo: {} };
    // IDs únicos
    const seen = {};
    for (const o of ctx.out) {
      if (seen[o.id]) o.id = o.id + '-' + ++seen[o.id];
      else seen[o.id] = 1;
    }
    // Ignorados (cadastros fora do escopo: ex. usuários de manutenção)
    const ign = new Set((cfg.ignorarCpfs || []).map(U.normCpf));
    const ocorrencias = ctx.out.filter((o) => !ign.has(o.cpf));
    diarias.linhas = diarias.linhas.filter((l) => !ign.has(l.cpf));
    diarias.resumo = AJ.diarias ? AJ.diarias.resumo(diarias.linhas) : {};
    return { ocorrencias, porGrupo: ctx.porGrupo, checks: ctx.checks, diarias };
  }

  AJ.rules = { run, BASE_LEGAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
