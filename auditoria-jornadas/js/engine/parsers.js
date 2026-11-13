/*
 * Leitura dos relatórios.
 *
 * MaxTrack  – "Relatório de Jornadas Completas": 1 aba, 1 linha por motorista/dia,
 *             cabeçalho na linha 4, rodapé com os parâmetros configurados.
 * RasterJor – "Espelho de jornada": 1 aba por motorista, bloco cadastral nas
 *             linhas 1-7, cabeçalho em 2 níveis, 1 linha por dia.
 *
 * A leitura localiza o cabeçalho pelo nome das colunas (não pela posição),
 * aceita várias abas/arquivos por sistema e permite sobrepor o mapeamento.
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const U = AJ.util;

  function norm(s) {
    return U.clean(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/:$/, '')
      .trim();
  }

  // ------------------------------------------------------------------
  // Dicionário de campos: rótulo, aliases de cabeçalho, se é obrigatório
  // ------------------------------------------------------------------
  const FIELDS = {
    maxtrack: [
      { k: 'matricula', label: 'Matrícula', alias: ['matricula', 'registro', 'chapa'], req: false },
      { k: 'nome', label: 'Motorista', alias: ['pessoa', 'motorista', 'nome', 'condutor'], req: true },
      { k: 'cpf', label: 'CPF', alias: ['cpf'], req: true },
      { k: 'intersticio', label: 'Interstício / situação', alias: ['intersticio', 'interjornada'] },
      { k: 'consecutivas', label: 'Dias consecutivos', alias: ['consecutivas', 'dias consecutivos'] },
      { k: 'inicio', label: 'Início', alias: ['inicio', 'inicio jornada', 'data/hora inicio'], req: true },
      { k: 'fim', label: 'Fim', alias: ['fim', 'fim jornada', 'data/hora fim'], req: true },
      { k: 'placa', label: 'Placa', alias: ['placa', 'veiculo'] },
      { k: 'total', label: 'Total (amplitude remunerada)', alias: ['total'] },
      { k: 'trabalho', label: 'Total de Trabalho', alias: ['total de trabalho', 'trabalho'], req: true },
      { k: 'direcao', label: 'Direção', alias: ['direcao'] },
      { k: 'posicao', label: 'Em Posição', alias: ['em posicao', 'posicao'] },
      { k: 'espera', label: 'Espera', alias: ['espera'] },
      { k: 'dirContinua', label: 'Direção contínua (máx.)', alias: ['dir. continua', 'direcao continua'] },
      { k: 'refeicao', label: 'Refeição', alias: ['refeicao'] },
      { k: 'ateRefeicao', label: 'Até refeição', alias: ['ate refeicao'] },
      { k: 'repouso', label: 'Repouso/descanso', alias: ['repouso', 'descanso'] },
      { k: 'diurnas', label: 'Horas diurnas', alias: ['diurnas'] },
      { k: 'noturnas', label: 'Horas noturnas', alias: ['noturnas'] },
      { k: 'extrasDiurnas', label: 'Extras diurnas', alias: ['extras diurnas'] },
      { k: 'extrasNoturnas', label: 'Extras noturnas', alias: ['extras noturnas'] },
      { k: 'extraDomingo', label: 'Extra domingo', alias: ['extra domingo'] },
      { k: 'extraFeriado', label: 'Extra feriado', alias: ['extra feriado'] },
      { k: 'extraNormal', label: 'Extra normal (autorizada)', alias: ['extra normal'] },
      { k: 'extraExcedente', label: 'Extra excedente', alias: ['extra excedente'] },
      { k: 'empresa', label: 'Empresa/Filial', alias: ['empresa', 'filial', 'unidade'] },
    ],
    rasterjor: [
      { k: 'data', label: 'Data', alias: ['data'], req: true },
      { k: 'cpf', label: 'CPF (se em coluna)', alias: ['cpf'] },
      { k: 'nome', label: 'Motorista (se em coluna)', alias: ['nome', 'motorista', 'pessoa'] },
      { k: 'matricula', label: 'Matrícula (se em coluna)', alias: ['matricula', 'n registro da folha', 'no registro da folha'] },
      { k: 'empresa', label: 'Empresa (se em coluna)', alias: ['empresa', 'filial'] },
      { k: 'placa', label: 'Placa', alias: ['placa'] },
      { k: 'inicio', label: 'Data/Hora Início', alias: ['data/hora inicio', 'inicio'], req: true },
      { k: 'fim', label: 'Data/Hora Fim', alias: ['data/hora fim', 'fim'], req: true },
      { k: 'hn', label: 'Hora Normal', alias: ['hora normal'] },
      { k: 'hnn', label: 'Hora Normal Noturna', alias: ['hora normal noturna'] },
      { k: 'he50', label: 'Hora Extra 50%', alias: ['hora extra 50%', 'he 50%'] },
      { k: 'he50n', label: 'Hora Extra 50% Noturna', alias: ['hora extra 50% noturna', 'he 50% noturna'] },
      { k: 'he100', label: 'Hora Extra 100%', alias: ['hora extra 100%', 'he 100%'] },
      { k: 'he100n', label: 'Hora Extra 100% Noturna', alias: ['hora extra 100% noturna', 'he 100% noturna'] },
      { k: 'refIni', label: 'Início Refeição', alias: ['inicio refeicao'] },
      { k: 'refFim', label: 'Fim Refeição', alias: ['fim refeicao'] },
      { k: 'refeicao', label: 'Horas Refeição', alias: ['horas refeicao', 'refeicao'] },
      { k: 'descIni', label: 'Início Descanso', alias: ['inicio descanso'] },
      { k: 'descFim', label: 'Fim Descanso', alias: ['fim descanso'] },
      { k: 'descanso', label: 'Horas Descanso', alias: ['horas descanso', 'descanso'] },
      { k: 'espera', label: 'Saldo Espera', alias: ['saldo espera', 'espera'] },
      { k: 'repIni', label: 'Início Repouso', alias: ['inicio repouso'] },
      { k: 'repFim', label: 'Fim Repouso', alias: ['fim repouso'] },
      { k: 'entreJornada', label: 'Entre Jornada', alias: ['entre jornada', 'interjornada'] },
      { k: 'faltaRepouso', label: 'Hora Falta Repouso', alias: ['hora falta repouso'] },
      { k: 'atividade', label: 'Tempo Atividade', alias: ['tempo atividade', 'total trabalhado'], req: true },
      { k: 'diaria', label: 'Diária', alias: ['diaria'] },
    ],
  };

  const RJ_INFO = {
    nome: ['nome'],
    cpf: ['cpf'],
    cargo: ['cargo'],
    matricula: ['n registro da folha', 'no registro da folha', 'nº registro da folha', 'matricula'],
    admissao: ['data de admissao'],
    empresa: ['empresa'],
  };

  // ------------------------------------------------------------------
  // Helpers de planilha
  // ------------------------------------------------------------------
  function sheetRows(ws) {
    return root.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
  }

  function readWorkbook(data, fileName) {
    const isCsv = /\.(csv|txt)$/i.test(fileName || '');
    if (isCsv) {
      let text = typeof data === 'string' ? data : decodeText(data);
      return root.XLSX.read(text, { type: 'string', raw: true, FS: guessSep(text) });
    }
    // Alguns exportadores gravam o ZIP sem o tamanho descompactado; o SheetJS
    // lê corretamente, mas registra "Bad uncompressed size" no console.
    const ce = root.console && root.console.error;
    if (ce) root.console.error = (...a) => (typeof a[0] === 'string' && a[0].startsWith('Bad uncompressed size') ? null : ce.apply(root.console, a));
    try {
      return root.XLSX.read(data, { type: 'array', cellDates: false });
    } finally {
      if (ce) root.console.error = ce;
    }
  }

  function decodeText(buf) {
    const bytes = new Uint8Array(buf);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      return new TextDecoder('windows-1252').decode(bytes);
    }
  }

  function guessSep(text) {
    const first = text.split(/\r?\n/).slice(0, 10).join('\n');
    const c = { ';': 0, ',': 0, '\t': 0 };
    for (const ch of first) if (ch in c) c[ch]++;
    return Object.keys(c).sort((a, b) => c[b] - c[a])[0];
  }

  /** Procura a linha de cabeçalho com maior número de campos reconhecidos. */
  function findHeader(rows, fields, maxScan) {
    let best = { idx: -1, score: 0, map: {} };
    const lim = Math.min(rows.length, maxScan || 40);
    for (let i = 0; i < lim; i++) {
      const r = rows[i] || [];
      const map = autoMap(r, fields);
      const score = Object.keys(map).length;
      if (score > best.score) best = { idx: i, score, map };
    }
    const reqOk = fields.filter((f) => f.req).every((f) => best.map[f.k] !== undefined);
    return Object.assign(best, { reqOk });
  }

  function autoMap(headerRow, fields) {
    const map = {};
    const used = new Set();
    const cells = (headerRow || []).map(norm);
    // 1ª passada: igualdade exata, na ordem dos aliases
    for (const f of fields) {
      for (const a of f.alias) {
        const idx = cells.findIndex((c, i) => c === a && !used.has(i));
        if (idx >= 0) {
          map[f.k] = idx;
          used.add(idx);
          break;
        }
      }
    }
    return map;
  }

  function headerList(row) {
    return (row || []).map((c, i) => ({ idx: i, name: U.clean(c) || `Coluna ${i + 1}` }));
  }

  function cell(r, map, k) {
    const i = map[k];
    if (i === undefined || i === null || i < 0) return null;
    return r[i];
  }

  // ------------------------------------------------------------------
  // Detecção
  // ------------------------------------------------------------------
  function detect(wb) {
    let mt = 0;
    let rj = 0;
    const names = wb.SheetNames.slice(0, 5);
    for (const n of names) {
      const rows = sheetRows(wb.Sheets[n]).slice(0, 15);
      const flat = rows.map((r) => (r || []).map(norm).join('|')).join('\n');
      if (/intersticio/.test(flat) && /total de trabalho/.test(flat)) mt += 3;
      if (/relatorio de jornadas completas/.test(flat)) mt += 2;
      if (/registro da folha/.test(flat)) rj += 2;
      if (/data\/hora inicio/.test(flat) && /tempo atividade/.test(flat)) rj += 3;
      if (/hora extra 100%/.test(flat)) rj += 1;
    }
    if (mt === 0 && rj === 0) return 'desconhecido';
    return mt >= rj ? 'maxtrack' : 'rasterjor';
  }

  // ------------------------------------------------------------------
  // MaxTrack
  // ------------------------------------------------------------------
  function parseMaxtrack(wb, opts) {
    opts = opts || {};
    const out = newResult('maxtrack');
    for (const sn of wb.SheetNames) {
      const rows = sheetRows(wb.Sheets[sn]);
      const hdr = findHeader(rows, FIELDS.maxtrack);
      if (hdr.idx < 0 || hdr.score < 4) continue;
      const map = Object.assign({}, hdr.map, (opts.mapping && opts.mapping.maxtrack) || {});
      out.layout.push({ sheet: sn, headerRow: hdr.idx, headers: headerList(rows[hdr.idx]), map, reqOk: hdr.reqOk });

      // Metadados (título / emissão)
      let ref = null;
      for (let i = 0; i < hdr.idx; i++) {
        const t = U.clean((rows[i] || [])[0]);
        let m = t.match(/Emitido em:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
        if (m) {
          ref = U.mk(+m[3], +m[2], +m[1]);
          out.meta.emitidoEm = t.replace(/\s*-\s*\(.*$/, '');
          const by = t.match(/ por (.+?) - \(/);
          if (by) out.meta.emitidoPor = by[1];
        }
        m = t.match(/\((\d{2}\/\d{2}[^)]*)\)/);
        if (m && /jornada/i.test(t)) out.meta.periodoTexto = m[1];
        if (/relat/i.test(t)) out.meta.titulo = t;
      }
      if (ref === null) ref = opts.refDate || U.mk(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

      // Colunas de período
      const periodCols = [];
      (rows[hdr.idx] || []).forEach((c, i) => {
        if (/^periodo\s*\d+/.test(norm(c))) periodCols.push(i);
      });

      let i = hdr.idx + 1;
      let blank = 0;
      for (; i < rows.length; i++) {
        const r = rows[i] || [];
        const first = U.clean(r[0]);
        if (/^parametros/i.test(norm(first))) break;
        const cpf = U.normCpf(cell(r, map, 'cpf'));
        const nome = U.clean(cell(r, map, 'nome'));
        if (!cpf && !nome) {
          if (++blank > 3) break;
          continue;
        }
        blank = 0;
        const row = i + 1;
        const matricula = U.clean(cell(r, map, 'matricula'));
        const empresa = U.clean(cell(r, map, 'empresa'));
        registerDriver(out, { cpf, nome, matricula, empresa, origem: `${sn}!L${row}` });

        const inicio = U.parseDateTime(cell(r, map, 'inicio'), ref);
        const fim = U.parseDateTime(cell(r, map, 'fim'), ref);
        if (inicio === null) {
          out.avisos.push(`MaxTrack ${sn} linha ${row}: data de início não reconhecida ("${U.clean(cell(r, map, 'inicio'))}").`);
          continue;
        }
        const interRaw = U.clean(cell(r, map, 'intersticio'));
        const interDur = U.parseDuration(interRaw);
        const date = U.dayKey(inicio);
        const trabalho = U.parseDuration(cell(r, map, 'trabalho'));
        const placa = U.clean(cell(r, map, 'placa'));
        const isWork = trabalho !== null || (interDur !== null && !U.isEmpty(placa));

        if (!isWork) {
          out.dias.push({ sistema: 'MT', cpf, nome, date, situacao: situacaoMT(interRaw), rotulo: interRaw || 'Sem jornada', origem: `${sn}!L${row}` });
          continue;
        }

        const extrasD = U.parseDuration(cell(r, map, 'extrasDiurnas'));
        const extrasN = U.parseDuration(cell(r, map, 'extrasNoturnas'));
        const dom = U.parseDuration(cell(r, map, 'extraDomingo'));
        const fer = U.parseDuration(cell(r, map, 'extraFeriado'));
        const extrasTot = U.sum(extrasD, extrasN);
        const he100 = U.sum(dom, fer);
        const he50 = extrasTot === null ? null : Math.max(0, extrasTot - U.nz(he100));
        const normal = trabalho === null ? null : Math.max(0, trabalho - U.nz(extrasTot));

        // Períodos trabalhados ("07:42 até 11:57")
        const periodos = [];
        let cursor = inicio;
        for (const pc of periodCols) {
          const t = U.clean(r[pc]);
          const m = t.match(/(\d{1,2}:\d{2})\s*(?:at[eé]|a|-)\s*(\d{1,2}:\d{2})/i);
          if (!m) continue;
          const s = nextAt(U.parseClock(m[1]), cursor);
          const e = nextAt(U.parseClock(m[2]), s);
          periodos.push({ ini: s, fim: e });
          cursor = e;
        }

        out.jornadas.push({
          sistema: 'MT',
          cpf,
          nome,
          matricula,
          empresa,
          date,
          inicio,
          fim,
          placa,
          situacao: 'TRABALHO',
          trabalho,
          total: U.parseDuration(cell(r, map, 'total')),
          normal,
          he50,
          he100,
          heDomingo: dom,
          heFeriado: fer,
          extraAutorizada: U.parseDuration(cell(r, map, 'extraNormal')),
          extraExcedente: U.parseDuration(cell(r, map, 'extraExcedente')),
          noturno: U.parseDuration(cell(r, map, 'noturnas')),
          refeicao: U.parseDuration(cell(r, map, 'refeicao')),
          descanso: U.parseDuration(cell(r, map, 'repouso')),
          espera: U.parseDuration(cell(r, map, 'espera')),
          direcao: U.parseDuration(cell(r, map, 'direcao')),
          posicao: U.parseDuration(cell(r, map, 'posicao')),
          dirContinua: U.parseDuration(cell(r, map, 'dirContinua')),
          ateRefeicao: U.parseDuration(cell(r, map, 'ateRefeicao')),
          interjornadaAnterior: interDur,
          consecutivas: numOrNull(cell(r, map, 'consecutivas')),
          periodos,
          origem: `${sn}!L${row}`,
        });
      }

      // Rodapé de parâmetros
      for (; i < rows.length; i++) {
        const r = rows[i] || [];
        const k = U.clean(r[0]).replace(/:\s*$/, '');
        const v = U.clean(r[1]);
        if (k && v && !/^assinatura/i.test(k)) out.meta.parametros.push({ nome: k, valor: v });
        const sig = U.clean(r[0]).match(/Assinatura do documento:\s*(\S+)/i);
        if (sig) out.meta.assinatura = sig[1];
      }
    }
    finalize(out);
    return out;
  }

  function situacaoMT(raw) {
    const n = norm(raw);
    if (!n) return 'SEM_JORNADA';
    if (n === 'dsr') return 'SEM_JORNADA'; // o MaxTrack rotula como "DSR" todo dia sem jornada iniciada
    if (n.startsWith('ferias')) return 'FERIAS';
    if (n.startsWith('feriado')) return 'FERIADO';
    if (n.startsWith('atestado') || n.startsWith('afast')) return 'AFASTAMENTO';
    if (n.startsWith('folga')) return 'FOLGA';
    if (n.startsWith('falta')) return 'FALTA';
    if (n.startsWith('suspens')) return 'SUSPENSAO';
    return 'OUTRO:' + U.clean(raw);
  }

  function nextAt(clock, from) {
    if (clock === null) return from;
    let c = U.dayStart(from) + clock;
    if (c < from) c += 1440;
    return c;
  }

  function numOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  // ------------------------------------------------------------------
  // RasterJor
  // ------------------------------------------------------------------
  function parseRasterjor(wb, opts) {
    opts = opts || {};
    const out = newResult('rasterjor');
    for (const sn of wb.SheetNames) {
      const rows = sheetRows(wb.Sheets[sn]);
      const hdr = findHeader(rows, FIELDS.rasterjor);
      if (hdr.idx < 0 || hdr.score < 5) {
        out.avisos.push(`RasterJor: aba "${sn}" ignorada (cabeçalho não reconhecido).`);
        continue;
      }
      const map = Object.assign({}, hdr.map, (opts.mapping && opts.mapping.rasterjor) || {});
      if (out.layout.length < 1) out.layout.push({ sheet: sn, headerRow: hdr.idx, headers: headerList(rows[hdr.idx]), map, reqOk: hdr.reqOk });

      // Bloco cadastral "Rótulo: | valor"
      const info = {};
      for (let i = 0; i < hdr.idx; i++) {
        const r = rows[i] || [];
        for (let c = 0; c < Math.min(r.length, 6); c++) {
          const label = norm(r[c]);
          if (!label) continue;
          for (const [k, aliases] of Object.entries(RJ_INFO)) {
            if (aliases.includes(label) && info[k] === undefined) {
              let v = null;
              for (let c2 = c + 1; c2 < r.length; c2++) {
                if (!U.isEmpty(r[c2])) {
                  v = r[c2];
                  break;
                }
              }
              info[k] = U.clean(v);
            }
          }
        }
      }
      const sheetCpf = U.normCpf(info.cpf);
      const sheetNome = U.clean(info.nome) || sn;

      for (let i = hdr.idx + 1; i < rows.length; i++) {
        const r = rows[i] || [];
        const rawDate = U.clean(cell(r, map, 'data'));
        if (!rawDate) continue;
        const lines = rawDate.split(/\n/).map((s) => s.trim()).filter(Boolean);
        const dm = lines[0].match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (!dm) continue;
        let y = +dm[3];
        if (y < 100) y += 2000;
        const dayMin = U.mk(y, +dm[2], +dm[1]);
        const date = U.dayKey(dayMin);
        const tag = lines.slice(2).join(' ').trim() || (lines[1] && !/feira|s[aá]bado|domingo/i.test(lines[1]) ? lines[1] : '');
        const row = i + 1;

        const cpf = U.normCpf(cell(r, map, 'cpf')) || sheetCpf;
        const nome = U.clean(cell(r, map, 'nome')) || sheetNome;
        const matricula = U.clean(cell(r, map, 'matricula')) || U.clean(info.matricula);
        const empresa = U.clean(cell(r, map, 'empresa')) || U.clean(info.empresa);
        registerDriver(out, { cpf, nome, matricula, empresa, cargo: info.cargo, admissao: info.admissao, origem: `${sn}` });

        const inicioRaw = U.clean(cell(r, map, 'inicio'));
        const allTag = norm(inicioRaw);
        const inicio = U.parseDateTime(firstLine(inicioRaw), dayMin);
        const fim = U.parseDateTime(lastLine(cell(r, map, 'fim')), dayMin);
        const atividade = U.parseDuration(cell(r, map, 'atividade'));
        const hn = U.parseDuration(cell(r, map, 'hn'));
        const hnn = U.parseDuration(cell(r, map, 'hnn'));
        const he50 = U.parseDuration(cell(r, map, 'he50'));
        const he50n = U.parseDuration(cell(r, map, 'he50n'));
        const he100 = U.parseDuration(cell(r, map, 'he100'));
        const he100n = U.parseDuration(cell(r, map, 'he100n'));
        const anyHours = [atividade, hn, hnn, he50, he50n, he100, he100n].some((v) => v !== null && v > 0);

        let situacao = situacaoRJ(tag, inicio === null ? allTag : '');
        if (inicio === null && !anyHours) {
          out.dias.push({ sistema: 'RJ', cpf, nome, date, situacao, rotulo: tag || (allTag ? inicioRaw : 'Sem jornada'), origem: `${sn}!L${row}` });
          continue;
        }
        const diaDsr = /dia de dsr/i.test(tag);
        out.jornadas.push({
          sistema: 'RJ',
          cpf,
          nome,
          matricula,
          empresa,
          date: inicio !== null ? U.dayKey(inicio) : date,
          dataLinha: date,
          inicio,
          fim,
          placa: U.isEmpty(cell(r, map, 'placa')) ? '' : U.clean(cell(r, map, 'placa')),
          situacao: 'TRABALHO',
          rotuloDia: tag,
          diaDsr,
          trabalho: atividade,
          normal: U.sum(hn, hnn),
          he50: U.sum(he50, he50n),
          he100: U.sum(he100, he100n),
          noturno: U.sum(hnn, he50n, he100n),
          hn,
          hnn,
          he50d: he50,
          he50n,
          he100d: he100,
          he100n,
          refeicao: U.parseDuration(cell(r, map, 'refeicao')),
          refeicaoIni: multiDT(cell(r, map, 'refIni'), dayMin),
          refeicaoFim: multiDT(cell(r, map, 'refFim'), dayMin),
          descanso: U.parseDuration(cell(r, map, 'descanso')),
          espera: U.parseDuration(cell(r, map, 'espera')),
          interjornadaPosterior: U.parseDuration(cell(r, map, 'entreJornada')),
          repousoIni: multiDT(cell(r, map, 'repIni'), dayMin),
          repousoFim: multiDT(cell(r, map, 'repFim'), dayMin),
          faltaRepouso: U.parseDuration(cell(r, map, 'faltaRepouso')),
          diaria: U.clean(cell(r, map, 'diaria')),
          origem: `${sn}!L${row}`,
        });
        if (situacao !== 'NORMAL') {
          out.dias.push({ sistema: 'RJ', cpf, nome, date, situacao: diaDsr ? 'DSR_TRABALHADO' : situacao, rotulo: tag, comJornada: true, origem: `${sn}!L${row}` });
        }
      }
    }
    finalize(out);
    return out;
  }

  function situacaoRJ(tag, cellTag) {
    const n = norm(tag) || cellTag;
    if (!n || n === '—' || n === '-') return 'NORMAL';
    if (n.startsWith('dia de dsr')) return 'DSR';
    if (n.startsWith('dsr')) return 'DSR';
    if (n.startsWith('feriado')) return 'FERIADO';
    if (n.startsWith('ferias')) return 'FERIAS';
    if (n.startsWith('suspens')) return 'SUSPENSAO';
    if (n.startsWith('atestado') || n.startsWith('afast') || n.startsWith('licen')) return 'AFASTAMENTO';
    if (n.startsWith('falta')) return 'FALTA';
    if (n.startsWith('folga')) return 'FOLGA';
    return 'OUTRO:' + U.clean(tag);
  }

  function firstLine(v) {
    return U.clean(v).split(/\n/)[0];
  }
  function lastLine(v) {
    const l = U.clean(v).split(/\n/);
    return l[l.length - 1];
  }
  function multiDT(v, ref) {
    const s = U.clean(v);
    if (U.isEmpty(s)) return [];
    return s
      .split(/\n/)
      .map((x) => U.parseDateTime(x.trim(), ref))
      .filter((x) => x !== null);
  }

  // ------------------------------------------------------------------
  function newResult(sistema) {
    return { sistema, motoristas: {}, jornadas: [], dias: [], avisos: [], layout: [], meta: { parametros: [] } };
  }

  function registerDriver(out, d) {
    const key = d.cpf || 'NOME:' + U.normName(d.nome);
    const cur = out.motoristas[key];
    if (!cur) {
      out.motoristas[key] = { cpf: d.cpf, nome: d.nome, matricula: d.matricula, empresa: d.empresa || '', cargo: d.cargo || '', admissao: d.admissao || '', origem: d.origem };
    } else {
      if (d.matricula && cur.matricula && U.normMatricula(d.matricula) !== U.normMatricula(cur.matricula) && !cur.matriculaAlt) {
        cur.matriculaAlt = d.matricula;
      }
      if (!cur.empresa && d.empresa) cur.empresa = d.empresa;
    }
  }

  function finalize(out) {
    out.jornadas.sort((a, b) => (a.cpf < b.cpf ? -1 : a.cpf > b.cpf ? 1 : U.nz(a.inicio) - U.nz(b.inicio)));
    const dates = out.jornadas.map((j) => j.date).concat(out.dias.map((d) => d.date)).sort();
    out.meta.periodoIni = dates[0] || null;
    out.meta.periodoFim = dates[dates.length - 1] || null;
    out.meta.totalLinhas = out.jornadas.length + out.dias.length;
    if (!out.jornadas.length && !out.dias.length) out.avisos.push('Nenhum registro reconhecido. Verifique o mapeamento das colunas.');
  }

  /** Junta vários resultados do mesmo sistema (várias abas/arquivos). */
  function mergeResults(list, sistema) {
    const out = newResult(sistema);
    for (const r of list) {
      Object.assign(out.motoristas, r.motoristas);
      out.jornadas.push(...r.jornadas);
      out.dias.push(...r.dias);
      out.avisos.push(...r.avisos);
      out.layout.push(...r.layout);
      if (r.meta.parametros.length && !out.meta.parametros.length) out.meta.parametros = r.meta.parametros;
      for (const k of ['emitidoEm', 'emitidoPor', 'periodoTexto', 'titulo', 'assinatura']) if (r.meta[k] && !out.meta[k]) out.meta[k] = r.meta[k];
    }
    // Duplicidades exatas (mesmo motorista e mesmo início) – mantém a 1ª e sinaliza
    const seen = new Map();
    out.duplicados = [];
    out.jornadas = out.jornadas.filter((j) => {
      if (j.inicio === null) return true;
      const k = j.cpf + '|' + j.inicio;
      if (seen.has(k)) {
        out.duplicados.push({ original: seen.get(k), duplicado: j });
        return false;
      }
      seen.set(k, j);
      return true;
    });
    finalize(out);
    return out;
  }

  /** Lê um arquivo (ArrayBuffer) e devolve { sistema detectado, resultado }. */
  function parseFile(data, fileName, opts) {
    opts = opts || {};
    if (/\.pdf$/i.test(fileName)) {
      throw new Error('Arquivos PDF não possuem estrutura de tabela confiável. Exporte o relatório em Excel (XLS/XLSX) ou CSV no sistema de origem.');
    }
    const wb = readWorkbook(data, fileName);
    const detected = detect(wb);
    const sistema = opts.forceSystem || detected;
    if (sistema === 'desconhecido') {
      throw new Error('Não foi possível identificar se o arquivo é do MaxTrack ou do RasterJor. Selecione o sistema manualmente.');
    }
    const res = sistema === 'maxtrack' ? parseMaxtrack(wb, opts) : parseRasterjor(wb, opts);
    res.arquivo = fileName;
    res.detectado = detected;
    return res;
  }

  AJ.parsers = { FIELDS, parseFile, parseMaxtrack, parseRasterjor, readWorkbook, detect, mergeResults, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
