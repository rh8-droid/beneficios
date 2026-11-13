/* Exportação para Excel (SheetJS) e PDF (jsPDF + AutoTable). Respeita os filtros ativos. */
(function (root) {
  'use strict';
  const AJ = root.AJ;
  const U = AJ.util;
  const ui = AJ.ui;
  const S = () => AJ.state;
  const D = (m) => (m === null || m === undefined ? '' : U.fmtDur(m));
  const DS = (m) => (m === null || m === undefined ? '' : U.fmtDur(m, { sign: true }));
  const DT = (m) => (m === null || m === undefined ? '' : U.fmtDateTime(m, { withYear: true }));
  const cpf = (c) => U.fmtCpf(c, S().cfg.mascararCpf);
  const STL = { conciliado: 'Conciliado', conferencia: 'Necessita conferência', divergente: 'Divergente / inconforme', nao_validado: 'Não validado' };
  const diff = (g, k) => (g.mt || g.rj ? U.nz(g.mt && g.mt[k]) - U.nz(g.rj && g.rj[k]) : null);

  function stamp() {
    const d = new Date();
    return d.toISOString().slice(0, 16).replace(/[-:T]/g, '');
  }

  function filtrosTexto() {
    const f = S().filters;
    const parts = [];
    if (f.ini || f.fim) parts.push(`Período ${f.ini ? U.fmtDate(f.ini) : 'início'} a ${f.fim ? U.fmtDate(f.fim) : 'fim'}`);
    if (f.q) parts.push(`Motorista: ${f.q}`);
    if (f.matricula) parts.push(`Matrícula: ${f.matricula}`);
    if (f.empresa) parts.push(`Empresa: ${f.empresa}`);
    if (f.status) parts.push(`Status: ${STL[f.status]}`);
    if (f.categoria) parts.push(`Categoria: ${AJ.config.CATEGORIAS[f.categoria]}`);
    if (f.tipo) parts.push(`Tipo: ${AJ.config.TIPOS[f.tipo].nome}`);
    if (f.gravidade) parts.push(`Criticidade: ${f.gravidade === 'SEM_AJUSTE' ? 'Sem ajuste' : f.gravidade}`);
    if (f.trat) parts.push(`Tratativa: ${f.trat}`);
    return parts.join(' · ') || 'Sem filtros';
  }

  // ---------------- linhas ----------------
  function rowsConciliacao(gs) {
    const mm = AJ.app.motMap();
    return gs.map((g) => {
      const m = mm[g.motorista];
      return {
        Status: STL[g.statusAuditoria],
        'Status conciliação': STL[g.status],
        Motorista: g.nome,
        CPF: cpf(m.cpf || m.cpfRJ),
        'Matrícula MT': m.matriculaMT,
        'Registro RJ': U.clean(m.matriculaRJ),
        Empresa: m.empresa,
        Data: U.fmtDate(g.date),
        'Início MT': DT(g.mt && g.mt.inicio),
        'Início RJ': DT(g.rj && g.rj.inicio),
        'Fim MT': DT(g.mt && g.mt.fim),
        'Fim RJ': DT(g.rj && g.rj.fim),
        'Trabalho MT': D(g.mt && g.mt.trabalho),
        'Trabalho RJ': D(g.rj && g.rj.trabalho),
        'Dif. trabalho': DS(diff(g, 'trabalho')),
        'HE50 MT': D(g.mt && g.mt.he50),
        'HE50 RJ': D(g.rj && g.rj.he50),
        'Dif. HE50': DS(diff(g, 'he50')),
        'HE100 MT': D(g.mt && g.mt.he100),
        'HE100 RJ': D(g.rj && g.rj.he100),
        'Dif. HE100': DS(diff(g, 'he100')),
        'Refeição MT': D(g.mt && g.mt.refeicao),
        'Refeição RJ': D(g.rj && g.rj.refeicao),
        Interjornada: (g.checks && g.checks.interjornada) || 'nv',
        Intrajornada: (g.checks && g.checks.intrajornada) || 'nv',
        'Direção contínua': (g.checks && g.checks.direcao) || 'nv',
        'Limite diário': (g.checks && g.checks.excesso) || 'nv',
        Ocorrências: g.ocorrencias.length,
        Motivos: g.motivos.join('; '),
        'Origem MT': (g.mtJ || []).map((j) => j.origem).join(', '),
        'Origem RJ': (g.rjJ || []).map((j) => j.origem).join(', '),
      };
    });
  }

  function rowsOcorrencias(os) {
    return os.map((o) => {
      const t = AJ.app.tratOf(o.id);
      return {
        ID: o.id,
        Criticidade: o.gravidade,
        Natureza: AJ.config.NATUREZA_LABEL[AJ.config.natureza(o)],
        Categoria: o.categoria,
        Ocorrência: o.nomeTipo,
        Motorista: o.nome,
        CPF: cpf(o.cpf),
        Matrícula: o.matricula,
        Empresa: o.empresa,
        Data: o.date ? U.fmtDate(o.date) : '',
        'Sistema de origem': o.sistema,
        Descrição: o.descricao,
        'Minutos (impacto)': o.minutos || '',
        'Base legal / referência': o.baseLegal,
        'Status da tratativa': t.status,
        Responsável: t.responsavel,
        Observações: t.observacoes,
        'Data da tratativa': t.dataResolucao ? U.fmtDate(t.dataResolucao) : '',
        'Última alteração': t.atualizadoEm ? new Date(t.atualizadoEm).toLocaleString('pt-BR') : '',
        Histórico: (t.historico || []).map((h) => `${new Date(h.em).toLocaleString('pt-BR')} ${h.por}: ${h.campo} ${h.de ? h.de + ' -> ' : ''}${h.para}`).join(' | '),
      };
    });
  }

  const DCRIT = { SEM_JORNADA: 'Crítica', NAO_GERADA: 'Crítica', SO_RJ: 'Média', CONTINUACAO: 'Média' };
  function rowsDiarias() {
    const ls = AJ.views.filteredDiarias ? AJ.views.filteredDiarias('') : [];
    return ls.map((l) => ({
      Criticidade: DCRIT[l.resultado] || '',
      Resultado: AJ.diarias.RESULT[l.resultado],
      Motorista: l.nome,
      CPF: cpf(l.cpf),
      Matrícula: l.matricula,
      Empresa: l.empresa,
      Data: U.fmtDate(l.date),
      'Situação do dia (RasterJor)': (l.rotuloDia || '').split(':')[0],
      'Diária (RasterJor)': l.diaria || 'Não gerada',
      'Jornada MaxTrack': l.jornadaMT,
      'Jornada RasterJor': l.jornadaRJ,
      'Trabalho MT': D(l.trabalhoMT),
      'Valor simulado (R$)': AJ.diarias.valor(l, S().cfg) || '',
    }));
  }

  function rowsMotoristas(ms) {
    return ms.map((m) => ({
      Status: STL[m.statusAuditoria],
      Motorista: m.nome,
      'CPF MT': cpf(m.cpf),
      'CPF RJ': cpf(m.cpfRJ),
      'Matrícula MT': m.matriculaMT,
      'Registro RJ': U.clean(m.matriculaRJ),
      Empresa: m.empresa,
      Vínculo: m.vinculo,
      Jornadas: m.qtdJornadas,
      Conciliadas: m.qtdConciliadas,
      Conferência: m.qtdConferencia,
      Divergentes: m.qtdDivergentes,
      Ocorrências: m.qtdOcorrencias,
      Infrações: m.qtdInfracoes,
      'Horas MT': D(m.horasMT),
      'Horas RJ': D(m.horasRJ),
      'Dif. horas': DS(m.horasMT - m.horasRJ),
      'HE50 MT': D(m.he50MT),
      'HE50 RJ': D(m.he50RJ),
      'HE100 MT': D(m.he100MT),
      'HE100 RJ': D(m.he100RJ),
    }));
  }

  function rowsFolha(F) {
    return F.resumo.map((p) => ({
      Motorista: p.nome,
      CPF: cpf(p.cpf),
      Matrícula: p.matricula,
      Empresa: p.empresa,
      'Jornadas afetadas': p.jornadasAfetadas,
      'HE50 não computada': D(p.he50NaoComputada),
      'HE100 não computada': D(p.he100NaoComputada),
      'HE50 computada a maior': D(p.he50Indevida),
      'HE100 computada a maior': D(p.he100Indevida),
      'Horas normais não apuradas': D(p.normalNaoApurada),
      'Horas pendentes de validação': D(p.horasPendentes),
      'Intrajornada suprimida': D(p.intrajornadaSuprimida),
      'Interjornada faltante': D(p.interjornadaFaltante),
      'Valor hora (R$)': p.valorHora || '',
      'Valor não computado (R$)': p.valorNaoComputado !== null ? Math.round(p.valorNaoComputado * 100) / 100 : '',
      'Valor a maior (R$)': p.valorIndevido !== null ? Math.round(p.valorIndevido * 100) / 100 : '',
      'Indenizações potenciais (R$)': p.valorIndenizacoes !== null ? Math.round(p.valorIndenizacoes * 100) / 100 : '',
    }));
  }

  function rowsFolhaLinhas(F) {
    return F.linhas.map((l) => ({
      Motorista: l.nome,
      CPF: cpf(l.cpf),
      Data: U.fmtDate(l.date),
      Situação: l.tipo,
      'Trabalho MT': D(l.mtTrab),
      'Trabalho RJ': D(l.rjTrab),
      'Dif. trabalho': DS(l.dTrab),
      'Dif. HE50': DS(l.d50),
      'Dif. HE100': DS(l.d100),
      'Causa provável': l.causa,
    }));
  }

  function resumoRows(k, a) {
    return [
      ['Auditoria de Jornadas – MaxTrack × RasterJor'],
      ['Executada em', new Date(a.criadoEm).toLocaleString('pt-BR')],
      ['Usuário', a.usuario],
      ['Período dos relatórios', `${U.fmtDate(a.periodo.ini)} a ${U.fmtDate(a.periodo.fim)}`],
      ['Arquivos', (a.arquivos || []).map((f) => `${f.sistema}: ${f.nome} (SHA-256 ${f.hash || '-'})`).join(' | ')],
      ['Filtros aplicados', filtrosTexto()],
      ['Exportado em', new Date().toLocaleString('pt-BR') + ' por ' + (S().user || '-')],
      [],
      ['Indicador', 'Valor'],
      ['Motoristas auditados', k.motoristas],
      ['Jornadas analisadas', k.jornadas],
      ['Jornadas presentes nos dois sistemas', k.pares],
      ['Jornadas conciliadas', k.conciliadas],
      ['Jornadas para conferência', k.conferencia],
      ['Jornadas divergentes', k.divergentes],
      ['Jornadas do MaxTrack ausentes no RasterJor', k.ausentesRJ],
      ['Jornadas do RasterJor ausentes no MaxTrack', k.ausentesMT],
      ['Horas divergentes', D(k.horasDivergentes)],
      ['HE 50% divergentes', D(k.he50Divergentes)],
      ['HE 100% divergentes', D(k.he100Divergentes)],
      ['Falhas de integração', k.falhasIntegracao],
      ['Divergências de apuração', k.divergenciasApuracao],
      ['Infrações trabalhistas', k.infracoes],
      ['Inconformidades operacionais', k.operacionais],
      ['Divergências de diárias', k.diarias],
      ['Ocorrências críticas', k.criticas],
      ['Falhas de registro', k.registros],
      ['Divergências cadastrais', k.cadastro],
      ['% conciliação', k.percConciliacao !== null ? ui.pct(k.percConciliacao) : ''],
      ['% conformidade', k.percConformidade !== null ? ui.pct(k.percConformidade) : ''],
    ];
  }

  function current() {
    const a = S().audit;
    const gs = AJ.app.filteredGrupos();
    const os = AJ.app.filteredOcorrencias();
    const ms = AJ.app.filteredMotoristas();
    const F = AJ.payroll.compute({ motoristas: a.motoristas, grupos: gs }, os, S().cfg);
    const k = AJ.audit.computeKpis(gs, os, ms.filter((m) => m.qtdJornadas > 0), F);
    return { a, gs, os, ms, F, k };
  }

  function sheet(rows, widths) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Aviso: 'Nenhum registro para os filtros' }]);
    if (rows.length) ws['!cols'] = Object.keys(rows[0]).map((k) => ({ wch: (widths && widths[k]) || Math.min(60, Math.max(10, k.length + 2)) }));
    ws['!autofilter'] = { ref: ws['!ref'] };
    return ws;
  }

  // ---------------- Excel ----------------
  function excel() {
    if (!S().audit) return ui.toast('Nenhuma auditoria carregada.');
    const { a, gs, os, ms, F, k } = current();
    const wb = XLSX.utils.book_new();
    const r = XLSX.utils.aoa_to_sheet(resumoRows(k, a));
    r['!cols'] = [{ wch: 44 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, r, 'Resumo');
    XLSX.utils.book_append_sheet(wb, sheet(rowsConciliacao(gs), { Motivos: 80, Motorista: 32, Empresa: 30 }), 'Conciliação');
    const fech = (o) => AJ.app.TRAT_FECHADOS.includes(AJ.app.tratOf(o.id).status);
    const wOc = { Descrição: 90, Motorista: 32, 'Base legal / referência': 50, Histórico: 60, Ocorrência: 40, Observações: 50 };
    const nat = (o) => AJ.config.natureza(o);
    XLSX.utils.book_append_sheet(wb, sheet(rowsOcorrencias(os.filter((o) => !fech(o) && nat(o) === 'ajuste')), wOc), 'Divergências sistemas');
    XLSX.utils.book_append_sheet(wb, sheet(rowsOcorrencias(os.filter((o) => !fech(o) && nat(o) === 'jornada')), wOc), 'Inconformidades jornada');
    XLSX.utils.book_append_sheet(wb, sheet(rowsOcorrencias(os.filter(fech)), wOc), 'Ocorrências tratadas');
    XLSX.utils.book_append_sheet(wb, sheet(rowsFolha(F), { Motorista: 32, Empresa: 30 }), 'Impacto folha');
    XLSX.utils.book_append_sheet(wb, sheet(rowsFolhaLinhas(F), { 'Causa provável': 90, Motorista: 32 }), 'Impacto folha - jornadas');
    XLSX.utils.book_append_sheet(wb, sheet(rowsDiarias(), { Motorista: 32, Resultado: 40, 'Jornada MaxTrack': 30, 'Jornada RasterJor': 30 }), 'Diárias');
    XLSX.utils.book_append_sheet(wb, sheet(rowsMotoristas(ms), { Motorista: 32, Empresa: 30 }), 'Motoristas');
    XLSX.writeFile(wb, `auditoria-jornadas-${a.periodo.ini}_${a.periodo.fim}-${stamp()}.xlsx`, { compression: true });
  }

  function motoristaExcel(mot, gs, os) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet(rowsConciliacao(gs), { Motivos: 80 }), 'Jornadas');
    XLSX.utils.book_append_sheet(wb, sheet(rowsOcorrencias(os), { Descrição: 90 }), 'Ocorrências');
    XLSX.writeFile(wb, `auditoria-${U.normName(mot.nome).replace(/ /g, '_')}-${stamp()}.xlsx`, { compression: true });
  }

  // ---------------- PDF ----------------
  const pdfTxt = (s) =>
    String(s === null || s === undefined ? '' : s)
      .replace(/→/g, '->')
      .replace(/[—–]/g, '-')
      .replace(/Δ/g, 'Dif.')
      .replace(/≠/g, '<>')
      .replace(/[✓✕]/g, '')
      .replace(/[^\x00-\xFF]/g, '');

  function newDoc(title, sub) {
    const { jsPDF } = root.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(pdfTxt(title), 36, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(doc.splitTextToSize(pdfTxt(sub), 770), 36, 56);
    doc.setTextColor(0);
    return doc;
  }

  function footer(doc) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text(pdfTxt(`Documento confidencial – contém dados pessoais (LGPD). Gerado em ${new Date().toLocaleString('pt-BR')} por ${S().user || '-'} · Auditoria de Jornadas v${AJ.VERSION}`), 36, 580);
      doc.text(`${i}/${n}`, 800, 580, { align: 'right' });
    }
  }

  const tblOpts = (y, head, body, extra) =>
    Object.assign(
      {
        startY: y,
        head: [head.map(pdfTxt)],
        body: body.map((r) => r.map(pdfTxt)),
        styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [31, 78, 140], textColor: 255, fontSize: 7.5 },
        alternateRowStyles: { fillColor: [246, 247, 250] },
        margin: { left: 36, right: 36, bottom: 30 },
      },
      extra || {}
    );

  function pdf(view) {
    if (!S().audit) return ui.toast('Nenhuma auditoria carregada.');
    const { a, gs, os, ms, F, k } = current();
    const doc = newDoc('Relatório de Auditoria de Jornadas – MaxTrack × RasterJor', `Período ${U.fmtDate(a.periodo.ini)} a ${U.fmtDate(a.periodo.fim)} · auditoria executada em ${new Date(a.criadoEm).toLocaleString('pt-BR')} por ${a.usuario} · Filtros: ${filtrosTexto()}`);
    const res = resumoRows(k, a).slice(9);
    doc.autoTable(tblOpts(80, ['Indicador', 'Valor', 'Indicador', 'Valor'], pairUp(res), { columnStyles: { 0: { cellWidth: 230 }, 2: { cellWidth: 230 } } }));
    let y = doc.lastAutoTable.finalY + 18;
    const title = (t) => {
      if (y > 520) {
        doc.addPage();
        y = 40;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(pdfTxt(t), 36, y);
      doc.setFont('helvetica', 'normal');
      y += 8;
    };
    if (view === 'conciliacao') {
      title('Jornadas não conciliadas');
      const rows = gs.filter((g) => g.status !== 'conciliado');
      doc.autoTable(tblOpts(y, ['Status', 'Motorista', 'Data', 'Início MT / RJ', 'Fim MT / RJ', 'Trab. MT', 'Trab. RJ', 'Dif.', 'Dif. HE50', 'Dif. HE100', 'Motivos'], rows.map((g) => [STL[g.status], g.nome, U.fmtDate(g.date), `${U.fmtDateTime(g.mt && g.mt.inicio)} / ${U.fmtDateTime(g.rj && g.rj.inicio)}`, `${U.fmtDateTime(g.mt && g.mt.fim)} / ${U.fmtDateTime(g.rj && g.rj.fim)}`, D(g.mt && g.mt.trabalho), D(g.rj && g.rj.trabalho), DS(diff(g, 'trabalho')), DS(diff(g, 'he50')), DS(diff(g, 'he100')), g.motivos.join('; ')]), { columnStyles: { 10: { cellWidth: 230 } } }));
    } else if (view === 'diarias') {
      title('Conciliação de diárias – divergências');
      const rows = rowsDiarias().filter((r) => r.Criticidade);
      doc.autoTable(tblOpts(y, ['Criticidade', 'Resultado', 'Motorista', 'Data', 'Situação do dia', 'Diária', 'Jornada MaxTrack', 'Jornada RasterJor'], rows.map((r) => [r.Criticidade, r.Resultado, r.Motorista, r.Data, r['Situação do dia (RasterJor)'], r['Diária (RasterJor)'], r['Jornada MaxTrack'], r['Jornada RasterJor']])));
    } else if (view === 'motoristas') {
      title('Motoristas');
      doc.autoTable(tblOpts(y, ['Status', 'Motorista', 'Matr. MT/RJ', 'Jornadas', 'Concil.', 'Diverg.', 'Ocorr.', 'Infr.', 'Horas MT', 'Horas RJ', 'Dif.'], ms.map((m) => [STL[m.statusAuditoria], m.nome, `${m.matriculaMT || '-'} / ${U.clean(m.matriculaRJ) || '-'}`, m.qtdJornadas, m.qtdConciliadas, m.qtdDivergentes, m.qtdOcorrencias, m.qtdInfracoes, D(m.horasMT), D(m.horasRJ), DS(m.horasMT - m.horasRJ)])));
    } else if (view === 'folha') {
      title('Impacto potencial na folha por motorista (MaxTrack − RasterJor)');
      doc.autoTable(tblOpts(y, ['Motorista', 'Jorn.', 'HE50 não comp.', 'HE100 não comp.', 'HE50 a maior', 'HE100 a maior', 'Normais não apur.', 'Intra suprim.', 'Inter faltante', 'R$ não comp.', 'R$ a maior'], F.resumo.map((p) => [p.nome, p.jornadasAfetadas, D(p.he50NaoComputada), D(p.he100NaoComputada), D(p.he50Indevida), D(p.he100Indevida), D(p.normalNaoApurada), D(p.intrajornadaSuprimida), D(p.interjornadaFaltante), ui.money(p.valorNaoComputado), ui.money(p.valorIndevido)])));
      y = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(8);
      doc.text(pdfTxt('Valores apenas indicativos. Nenhum ajuste foi realizado na folha; validar com RH/DP antes de qualquer lançamento.'), 36, y);
    } else {
      const fech = (o) => AJ.app.TRAT_FECHADOS.includes(AJ.app.tratOf(o.id).status);
      const TT = { ocorrencias: 'Ocorrências em aberto', tratadas: 'Ocorrências tratadas', ajustes: 'Divergências entre sistemas – precisam de ajuste', inconformidades: 'Inconformidades na jornada' };
      title(TT[view] || 'Ocorrências críticas e de criticidade alta');
      const rows = (view === 'ajustes' || view === 'inconformidades') && S().lastRows && S().lastRows.view === view ? S().lastRows.rows : view === 'ocorrencias' ? os.filter((o) => !fech(o)) : view === 'tratadas' ? os.filter(fech) : os.filter((o) => o.gravidade === 'Crítica' || o.gravidade === 'Alta');
      if (view === 'tratadas') {
        doc.autoTable(tblOpts(y, ['Criticidade', 'Ocorrência', 'Motorista', 'Data', 'Descrição', 'Status', 'Responsável', 'Data da tratativa', 'Justificativa'], rows.map((o) => { const t = AJ.app.tratOf(o.id); return [o.gravidade, o.nomeTipo, o.nome, o.date ? U.fmtDate(o.date) : '', o.descricao, t.status, t.responsavel, t.dataResolucao ? U.fmtDate(t.dataResolucao) : '', t.observacoes]; }), { columnStyles: { 4: { cellWidth: 220 }, 8: { cellWidth: 140 } } }));
        footer(doc);
        return doc.save(`auditoria-jornadas-tratadas-${stamp()}.pdf`);
      }
      doc.autoTable(tblOpts(y, ['Criticidade', 'Categoria', 'Ocorrência', 'Motorista', 'Data', 'Origem', 'Descrição', 'Tratativa'], rows.map((o) => [o.gravidade, o.categoria, o.nomeTipo, o.nome, o.date ? U.fmtDate(o.date) : '', o.sistema, o.descricao, AJ.app.tratOf(o.id).status]), { columnStyles: { 6: { cellWidth: 300 } } }));
    }
    footer(doc);
    doc.save(`auditoria-jornadas-${view}-${stamp()}.pdf`);
  }

  function pairUp(rows) {
    const out = [];
    const half = Math.ceil(rows.length / 2);
    for (let i = 0; i < half; i++) out.push([...(rows[i] || ['', '']), ...(rows[i + half] || ['', ''])].map((x) => String(x)));
    return out;
  }

  function motoristaPdf(mot, gs, os, dias) {
    const a = S().audit;
    const doc = newDoc(`Relatório individual – ${mot.nome}`, `CPF ${cpf(mot.cpf || mot.cpfRJ)} · Matrícula MaxTrack ${mot.matriculaMT || '-'} · Registro RasterJor ${U.clean(mot.matriculaRJ) || '-'} · ${mot.empresa} · Período ${U.fmtDate(a.periodo.ini)} a ${U.fmtDate(a.periodo.fim)}`);
    const sum = (side, k) => gs.reduce((acc, g) => acc + U.nz(g[side] && g[side][k]), 0);
    doc.autoTable(tblOpts(80, ['', 'MaxTrack', 'RasterJor', 'Diferença'], [
      ['Horas trabalhadas', D(sum('mt', 'trabalho')), D(sum('rj', 'trabalho')), DS(sum('mt', 'trabalho') - sum('rj', 'trabalho'))],
      ['Hora extra 50%', D(sum('mt', 'he50')), D(sum('rj', 'he50')), DS(sum('mt', 'he50') - sum('rj', 'he50'))],
      ['Hora extra 100%', D(sum('mt', 'he100')), D(sum('rj', 'he100')), DS(sum('mt', 'he100') - sum('rj', 'he100'))],
      ['Refeição', D(sum('mt', 'refeicao')), D(sum('rj', 'refeicao')), DS(sum('mt', 'refeicao') - sum('rj', 'refeicao'))],
    ], { tableWidth: 420 }));
    let y = doc.lastAutoTable.finalY + 16;
    const ckL = (v) => (v === 'ok' ? 'OK' : v === 'falha' ? 'FALHA' : 'n/v');
    const rows = [];
    for (const d of dias) {
      if (!d.g.length) rows.push([U.fmtDate(d.k, true), d.dm ? d.dm.rotulo : 'Sem registro', '', d.dr ? d.dr.rotulo || 'Sem jornada' : 'Sem registro', '', '', '', '', '', '', '']);
      for (const g of d.g) {
        const ck = g.checks || {};
        rows.push([U.fmtDate(d.k, true), g.mt ? `${U.fmtDateTime(g.mt.inicio)} - ${U.fmtDateTime(g.mt.fim)}` : '-', g.mt ? D(g.mt.trabalho) : '', g.rj ? `${U.fmtDateTime(g.rj.inicio)} - ${U.fmtDateTime(g.rj.fim)}` : '-', g.rj ? D(g.rj.trabalho) : '', DS(U.nz(g.mt && g.mt.trabalho) - U.nz(g.rj && g.rj.trabalho)), ckL(ck.interjornada), ckL(ck.intrajornada), ckL(ck.direcao), ckL(ck.excesso), STL[g.statusAuditoria]]);
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Jornada diaria', 36, y);
    doc.autoTable(tblOpts(y + 8, ['Data', 'MaxTrack', 'Trab.', 'RasterJor', 'Trab.', 'Dif.', 'Inter', 'Intra', 'Dir.', 'Limite', 'Status'], rows));
    y = doc.lastAutoTable.finalY + 16;
    if (y > 520) {
      doc.addPage();
      y = 40;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(pdfTxt(`Ocorrências (${os.length})`), 36, y);
    doc.autoTable(tblOpts(y + 8, ['Criticidade', 'Ocorrência', 'Data', 'Origem', 'Descrição', 'Tratativa'], os.map((o) => [o.gravidade, o.nomeTipo, o.date ? U.fmtDate(o.date) : '', o.sistema, o.descricao, AJ.app.tratOf(o.id).status]), { columnStyles: { 4: { cellWidth: 380 } } }));
    footer(doc);
    doc.save(`auditoria-${U.normName(mot.nome).replace(/ /g, '_')}-${stamp()}.pdf`);
  }

  AJ.exporter = { excel, pdf, motoristaPdf, motoristaExcel, rowsConciliacao, rowsOcorrencias };
})(typeof globalThis !== 'undefined' ? globalThis : this);
