/*
 * Conciliação de diárias (coluna "Diária" do RasterJor) × dias com jornada.
 *
 * Para cada motorista e dia do período comum:
 *  - Diária gerada + jornada iniciada no dia (MaxTrack)         → OK
 *  - Diária gerada + jornada só no RasterJor                    → conferir (DIARIA_SO_RJ)
 *  - Diária gerada + nenhuma jornada iniciada, mas uma jornada
 *    do dia anterior atravessa o dia (viagem/pernoite)          → conferir (DIARIA_CONTINUACAO)
 *  - Diária gerada + nenhuma jornada em nenhum sistema          → indevida (DIARIA_SEM_JORNADA)
 *  - Jornada iniciada no dia (MaxTrack) e sem diária            → não gerada (DIARIA_NAO_GERADA)
 *
 * Observação: o RasterJor não informa a regra de concessão (inteira × meia);
 * a ferramenta confere presença/ausência e mostra o tipo para análise.
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const U = AJ.util;

  const RESULT = {
    OK: 'Correta (dia com jornada no RasterJor)',
    SO_RJ: 'Jornada só no RasterJor',
    CONTINUACAO: 'Sem início de jornada no dia (continuação/viagem)',
    SEM_JORNADA: 'Indevida – dia de folga (sem jornada)',
    NAO_GERADA: 'Não gerada – dia com jornada no RasterJor',
  };

  function touches(j, dayMin) {
    if (j.inicio === null) return false;
    const fim = j.fim !== null ? j.fim : j.inicio;
    return j.inicio < dayMin + 1440 && fim >= dayMin;
  }

  function compute(rec, cfg, newOc) {
    const linhas = [];
    if (cfg.conciliarDiarias === false) return { linhas, resumo: resumo(linhas) };
    const ini = rec.comumIni;
    const fim = rec.comumFim;
    if (!ini || !fim) return { linhas, resumo: resumo(linhas) };
    const gruposById = {};
    for (const g of rec.grupos) gruposById[g.id] = g;

    for (const mot of rec.motoristas) {
      const temRJ = !!mot.rjKey;
      // Diária do RasterJor por data (linha do espelho)
      const diaria = {};
      const rotulo = {};
      for (const j of mot.jornadasRJ) {
        const k = j.dataLinha || j.date;
        if (j.diaria) diaria[k] = j.diaria;
        if (j.rotuloDia) rotulo[k] = j.rotuloDia;
      }
      for (const d of mot.diasRJ) {
        if (d.comJornada) continue;
        if (d.diaria && !diaria[d.date]) diaria[d.date] = d.diaria;
        if (d.rotulo && d.rotulo !== 'Sem jornada' && !rotulo[d.date]) rotulo[d.date] = d.rotulo;
      }
      const temRegistroRJ = new Set([...mot.jornadasRJ.map((j) => j.dataLinha || j.date), ...mot.diasRJ.map((d) => d.date)]);

      for (let t = U.keyToMin(ini); t <= U.keyToMin(fim); t += 1440) {
        const k = U.dayKey(t);
        const d = diaria[k] || '';
        const mtIni = mot.jornadasMT.filter((j) => j.date === k);
        const rjIni = mot.jornadasRJ.filter((j) => (j.dataLinha || j.date) === k && j.inicio !== null);
        const mtTouch = mot.jornadasMT.filter((j) => touches(j, t));
        const rjTouch = mot.jornadasRJ.filter((j) => touches(j, t));
        // Conferência pelo espelho do RasterJor (sistema que gera a diária)
        let res = null;
        if (d) {
          if (rjIni.length) res = 'OK';
          else if (rjTouch.length) res = 'CONTINUACAO'; // jornada do dia anterior atravessa a meia-noite
          else res = 'SEM_JORNADA'; // diária em dia sem jornada no RasterJor (folga)
        } else if (rjIni.length && cfg.diariaEmTodoDiaTrabalhado !== false) {
          res = 'NAO_GERADA';
        }
        if (!res) continue;
        const jRef = rjIni[0] || rjTouch[0] || mtIni[0] || null;
        const linha = {
          motorista: mot.key,
          nome: mot.nome,
          cpf: mot.cpf || mot.cpfRJ,
          matricula: mot.matriculaMT || mot.matriculaRJ,
          empresa: mot.empresa,
          date: k,
          diaria: d,
          rotuloDia: rotulo[k] || '',
          resultado: res,
          resultadoTxt: RESULT[res],
          jornadaMT: mtIni.length ? `${U.fmtDateTime(mtIni[0].inicio)} → ${U.fmtDateTime(mtIni[0].fim)}` : mtTouch.length ? `(continua) ${U.fmtDateTime(mtTouch[0].inicio)} → ${U.fmtDateTime(mtTouch[0].fim)}` : '',
          jornadaRJ: rjIni.length ? `${U.fmtDateTime(rjIni[0].inicio)} → ${U.fmtDateTime(rjIni[0].fim)}` : rjTouch.length ? `(continua) ${U.fmtDateTime(rjTouch[0].inicio)} → ${U.fmtDateTime(rjTouch[0].fim)}` : '',
          trabalhoMT: mtIni.reduce((a, j) => a + U.nz(j.trabalho), 0) || null,
          trabalhoRJ: rjIni.reduce((a, j) => a + U.nz(j.trabalho), 0) || null,
          grupo: jRef ? jRef.grupo : null,
          motoristaNoRJ: temRJ,
          linhaNoRJ: temRegistroRJ.has(k),
        };
        linhas.push(linha);

        if (!newOc || res === 'OK') continue;
        const rot = linha.rotuloDia ? ` (dia marcado como "${linha.rotuloDia.split(':')[0]}" no RasterJor)` : '';
        if (res === 'SEM_JORNADA') {
          newOc('DIARIA_SEM_JORNADA', mot, {
            date: k, chave: 'd' + k, sistema: 'RasterJor', minutos: null,
            descricao: `Diária "${d}" gerada em dia de folga: ${U.fmtDate(k, true)}${rot}, sem jornada no espelho do RasterJor.` + (mtIni.length ? ` Atenção: o MaxTrack registra jornada nesse dia (${linha.jornadaMT}) que não foi integrada ao RasterJor.` : ' Verificar se o motorista estava em viagem (pernoite fora da base); caso contrário, diária indevida.'),
          });
        } else if (res === 'CONTINUACAO') {
          const j = rjTouch[0];
          newOc('DIARIA_CONTINUACAO', mot, {
            date: k, chave: 'd' + k, grupo: j.grupo, sistema: 'RasterJor',
            descricao: `Diária "${d}" em ${U.fmtDate(k, true)}${rot}: nenhuma jornada iniciada no dia, mas a jornada ${U.fmtDateTime(j.inicio)} → ${U.fmtDateTime(j.fim)} atravessa este dia. Conferir a regra de diária para viagens que passam da meia-noite.`,
          });
        } else if (res === 'SO_RJ') {
          newOc('DIARIA_SO_RJ', mot, {
            date: k, chave: 'd' + k, grupo: rjIni[0].grupo, sistema: 'RasterJor',
            descricao: `Diária "${d}" em ${U.fmtDate(k, true)} vinculada a jornada que existe apenas no RasterJor (${linha.jornadaRJ}). Confirmar a jornada antes de pagar a diária.`,
          });
        } else if (res === 'NAO_GERADA') {
          newOc('DIARIA_NAO_GERADA', mot, {
            date: k, chave: 'd' + k, grupo: rjIni[0].grupo, sistema: 'RasterJor', minutos: null,
            descricao: `Jornada ${linha.jornadaRJ} no espelho do RasterJor em ${U.fmtDate(k, true)}${rot} sem diária gerada.`,
          });
        }
      }
    }
    linhas.sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : a.date < b.date ? -1 : 1));
    return { linhas, resumo: resumo(linhas) };
  }

  function resumo(linhas) {
    const c = (r) => linhas.filter((l) => l.resultado === r).length;
    const geradas = linhas.filter((l) => l.diaria);
    return {
      geradas: geradas.length,
      inteiras: geradas.filter((l) => /inteira/i.test(l.diaria)).length,
      meias: geradas.filter((l) => /meia/i.test(l.diaria)).length,
      ok: c('OK'),
      soRJ: c('SO_RJ'),
      continuacao: c('CONTINUACAO'),
      semJornada: c('SEM_JORNADA'),
      naoGeradas: c('NAO_GERADA'),
    };
  }

  /** Valores para simulação (R$). */
  function valor(l, cfg) {
    if (!l.diaria && l.resultado !== 'NAO_GERADA') return 0;
    if (l.resultado === 'NAO_GERADA') return Number(cfg.valorDiaria) || 0;
    return /meia/i.test(l.diaria) ? Number(cfg.valorMeiaDiaria) || 0 : Number(cfg.valorDiaria) || 0;
  }

  AJ.diarias = { compute, resumo, valor, RESULT };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
