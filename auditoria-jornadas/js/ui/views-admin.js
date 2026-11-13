/* Telas: motoristas, ocorrências, folha, histórico, parâmetros, metodologia. */
(function (root) {
  'use strict';
  const AJ = root.AJ;
  const U = AJ.util;
  const ui = AJ.ui;
  const esc = ui.esc;
  const D = (m) => U.fmtDur(m);
  const DT = (m) => U.fmtDateTime(m);
  const V = AJ.views;
  const S = () => AJ.state;
  const cpfFmt = (c) => U.fmtCpf(c, S().cfg.mascararCpf);

  function needAudit(c) {
    if (S().audit) return false;
    c.innerHTML = `<div class="card empty"><div class="big">📂</div><h3>Nenhuma auditoria carregada</h3><p>Importe os relatórios e execute a auditoria, ou abra uma auditoria do histórico.</p><button class="btn primary" onclick="AJ.app.go('importar')">Ir para importação</button></div>`;
    return true;
  }

  const VINC = { CPF: 'Vinculado por CPF', NOME: 'Vinculado pelo nome (CPF diverge)', SO_MT: 'Somente no MaxTrack', SO_RJ: 'Somente no RasterJor' };

  // =====================================================================
  // MOTORISTAS
  // =====================================================================
  V.motoristas = function (c) {
    if (needAudit(c)) return;
    V.filterBar(c, ['periodo', 'q', 'matricula', 'empresa', 'gravidade', 'status', 'tipo'], () => draw(true));
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-head"><div><h3>Motoristas</h3><p>Clique em um motorista para ver o relatório individual com o histórico do período.</p></div></div><div id="tbl"></div>`;
    c.appendChild(card);
    draw();
    function draw(reset) {
      const rows = AJ.app.filteredMotoristas();
      S().lastRows = { view: 'motoristas', rows };
      ui.table(card.querySelector('#tbl'), {
        id: 'mot',
        rows,
        resetPage: reset,
        defaultSort: 'nome',
        columns: [
          { key: 'statusAuditoria', label: 'Status', render: (m) => ui.badge(m.statusAuditoria) },
          { key: 'nome', label: 'Motorista', render: (m) => `<b>${esc(m.nome)}</b><div class="small muted">${cpfFmt(m.cpf || m.cpfRJ)}</div>` },
          { key: 'matriculaMT', label: 'Matr. MT / RJ', render: (m) => `${esc(m.matriculaMT || '—')} / ${esc(U.clean(m.matriculaRJ) || '—')}` },
          { key: 'empresa', label: 'Empresa', render: (m) => `<span class="small">${esc(m.empresa.replace(/ - [\d./-]+$/, ''))}</span>` },
          { key: 'vinculo', label: 'Vínculo', render: (m) => `<span class="badge ${m.vinculo === 'CPF' ? 'plain' : 'warn'}">${VINC[m.vinculo]}</span>` },
          { key: 'qtdJornadas', label: 'Jornadas', num: true },
          { key: 'qtdConciliadas', label: 'Conciliadas', num: true },
          { key: 'qtdDivergentes', label: 'Diverg.', num: true },
          { key: 'qtdOcorrencias', label: 'Ocorr.', num: true },
          { key: 'qtdInfracoes', label: 'Infrações', num: true },
          { key: 'horasMT', label: 'Horas MT', num: true, render: (m) => D(m.horasMT) },
          { key: 'horasRJ', label: 'Horas RJ', num: true, render: (m) => D(m.horasRJ) },
          { key: 'dH', label: 'Δ Horas', num: true, sort: (m) => m.horasMT - m.horasRJ, cell: (m) => ui.diffCell(m.horasMT - m.horasRJ) },
          { key: 'dHE', label: 'Δ HE (50+100)', num: true, sort: (m) => m.he50MT + m.he100MT - m.he50RJ - m.he100RJ, cell: (m) => ui.diffCell(m.he50MT + m.he100MT - m.he50RJ - m.he100RJ) },
        ],
        onRowClick: (m) => V.motoristaDetail(m.key),
      });
    }
  };

  V.motoristaDetail = function (key) {
    const a = S().audit;
    const mot = a.motoristas.find((m) => m.key === key);
    if (!mot) return;
    const f = S().filters;
    const gs = a.grupos.filter((g) => g.motorista === key && (!f.ini || g.date >= f.ini) && (!f.fim || g.date <= f.fim));
    const os = a.ocorrencias.filter((o) => o.motorista === key && (!f.ini || !o.date || o.date >= f.ini) && (!f.fim || !o.date || o.date <= f.fim));
    const sum = (side, k) => gs.reduce((acc, g) => acc + U.nz(g[side] && g[side][k]), 0);
    // Linha do tempo diária
    const ini = f.ini || a.periodo.ini;
    const fim = f.fim || a.periodo.fim;
    const dias = [];
    for (let t = U.keyToMin(ini); t <= U.keyToMin(fim); t += 1440) {
      const k = U.dayKey(t);
      const g = gs.filter((x) => x.date === k);
      const dm = (mot.diasMT || []).find((x) => x.date === k);
      const dr = (mot.diasRJ || []).find((x) => x.date === k && !x.comJornada) || (mot.diasRJ || []).find((x) => x.date === k);
      dias.push({ k, g, dm, dr });
    }
    const dLin = {};
    for (const l of (a.diarias && a.diarias.linhas) || []) if (l.motorista === key) dLin[l.date] = l;
    const diariaCell = (k) => {
      const l = dLin[k];
      if (!l) return '<span class="small muted">—</span>';
      const cls = { OK: 'ok', SEM_JORNADA: 'bad', NAO_GERADA: 'bad' }[l.resultado] || 'warn';
      return `<span class="badge ${cls}" title="${esc(AJ.diarias.RESULT[l.resultado])}"><span class="dot"></span>${esc(l.diaria || 'Não gerada')}</span>`;
    };
    const dayRows = dias
      .map(({ k, g, dm, dr }) => {
        if (!g.length) {
          return `<tr><td class="nowrap">${U.fmtDate(k, true)}</td><td colspan="2" class="muted">${esc(dm ? dm.rotulo : 'Sem registro')}</td><td colspan="2" class="muted">${esc(dr ? dr.rotulo || 'Sem jornada' : 'Sem registro')}</td><td></td><td>${diariaCell(k)}</td><td colspan="4"></td><td></td></tr>`;
        }
        return g
          .map((x) => {
            const ck = x.checks || {};
            return `<tr class="clickable" data-g="${x.id}"><td class="nowrap">${U.fmtDate(k, true)}${dr && dr.rotulo && dr.situacao !== 'NORMAL' ? `<div class="small muted">${esc(dr.rotulo.split(':')[0])}</div>` : ''}</td>
            <td class="mono nowrap">${x.mt ? DT(x.mt.inicio) + ' → ' + U.fmtDateTime(x.mt.fim, { timeOnly: 1 }) : '<span class="muted">—</span>'}</td><td class="num">${x.mt ? D(x.mt.trabalho) + '<div class="small muted">HE ' + D(U.nz(x.mt.he50) + U.nz(x.mt.he100)) + '</div>' : ''}</td>
            <td class="mono nowrap">${x.rj ? DT(x.rj.inicio) + ' → ' + U.fmtDateTime(x.rj.fim, { timeOnly: 1 }) : '<span class="muted">—</span>'}</td><td class="num">${x.rj ? D(x.rj.trabalho) + '<div class="small muted">HE ' + D(U.nz(x.rj.he50) + U.nz(x.rj.he100)) + '</div>' : ''}</td>
            ${ui.diffCell(U.nz(x.mt && x.mt.trabalho) - U.nz(x.rj && x.rj.trabalho))}
            <td>${diariaCell(k)}</td>
            <td>${ui.chk(ck.interjornada, 'Interjornada')}</td><td>${ui.chk(ck.intrajornada, 'Intrajornada')}</td><td>${ui.chk(ck.direcao, 'Direção contínua')}</td><td>${ui.chk(ck.excesso, 'Limite diário')}</td>
            <td>${ui.badge(x.statusAuditoria)}${x.ocorrencias.length ? `<div class="small muted">${x.ocorrencias.length} ocorrência(s)</div>` : ''}</td></tr>`;
          })
          .join('');
      })
      .join('');
    const html = `
      <div class="drawer-head"><div><div class="muted small">Relatório individual do motorista</div><h2>${esc(mot.nome)}</h2><div style="margin-top:6px">${ui.badge(mot.statusAuditoria)} <span class="badge plain">${VINC[mot.vinculo]}</span></div></div>
        <div style="display:flex;gap:8px"><button class="btn" id="mPdf">⬇ PDF</button><button class="btn" id="mXls">⬇ Excel</button><button class="btn" data-close>Fechar ✕</button></div></div>
      <div class="drawer-body">
        <div class="card"><div class="card-head"><h3>Dados cadastrais</h3></div><div class="kv">
          <div><span>CPF MaxTrack</span><b>${cpfFmt(mot.cpf)}</b></div>
          <div><span>CPF RasterJor</span><b>${cpfFmt(mot.cpfRJ)}</b></div>
          <div><span>Matrícula MaxTrack</span><b>${esc(mot.matriculaMT || '—')}</b></div>
          <div><span>Nº Registro da Folha (RasterJor)</span><b>${esc(U.clean(mot.matriculaRJ) || '—')}</b></div>
          <div><span>Empresa</span><b>${esc(mot.empresa)}</b></div>
          <div><span>Cargo</span><b>${esc(mot.cargo || '—')}</b></div>
          <div><span>Admissão</span><b>${esc(mot.admissao || '—')}</b></div>
          <div><span>Nome no MaxTrack</span><b>${esc(mot.nomeMT || '—')}</b></div>
        </div></div>
        <div class="kpis">
          <div class="kpi info"><div class="k-label">Jornadas</div><div class="k-value">${gs.length}</div><div class="k-sub">${gs.filter((g) => g.statusAuditoria === 'conciliado').length} conciliadas</div></div>
          <div class="kpi"><div class="k-label">Horas MaxTrack × RasterJor</div><div class="k-value" style="font-size:20px">${D(sum('mt', 'trabalho'))} × ${D(sum('rj', 'trabalho'))}</div><div class="k-sub">Δ ${D(sum('mt', 'trabalho') - sum('rj', 'trabalho'), { sign: true })}</div></div>
          <div class="kpi warn"><div class="k-label">HE 50% MT × RJ</div><div class="k-value" style="font-size:20px">${D(sum('mt', 'he50'))} × ${D(sum('rj', 'he50'))}</div><div class="k-sub">Δ ${D(sum('mt', 'he50') - sum('rj', 'he50'), { sign: true })}</div></div>
          <div class="kpi warn"><div class="k-label">HE 100% MT × RJ</div><div class="k-value" style="font-size:20px">${D(sum('mt', 'he100'))} × ${D(sum('rj', 'he100'))}</div><div class="k-sub">Δ ${D(sum('mt', 'he100') - sum('rj', 'he100'), { sign: true })}</div></div>
          <div class="kpi bad"><div class="k-label">Ocorrências</div><div class="k-value">${os.length}</div><div class="k-sub">${os.filter((o) => o.catKey === 'INFRACAO').length} infrações · ${os.filter((o) => o.catKey === 'INTEGRACAO').length} integração</div></div>
        </div>
        <div class="card"><div class="card-head"><div><h3>Jornada diária — MaxTrack × RasterJor</h3><p>Validações: interjornada · intrajornada · direção contínua · limite diário. Clique na linha para o comparativo completo.</p></div></div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Data</th><th>MaxTrack</th><th class="num">Trab.</th><th>RasterJor</th><th class="num">Trab.</th><th class="num">Δ</th><th>Diária</th><th title="Interjornada">Inter</th><th title="Intrajornada">Intra</th><th title="Direção contínua">Dir.</th><th title="Limite diário">Lim.</th><th>Status</th></tr></thead><tbody>${dayRows}</tbody></table></div>
        </div>
        <div class="card"><div class="card-head"><h3>Inconformidades e divergências (${os.length})</h3></div><div id="ocs"></div></div>
      </div>`;
    ui.drawer(html, (dr) => {
      V.ocorrenciasMini(dr.querySelector('#ocs'), os);
      dr.querySelectorAll('tr[data-g]').forEach((tr) => tr.addEventListener('click', () => V.grupoDetail(tr.dataset.g)));
      dr.querySelector('#mPdf').onclick = () => AJ.exporter.motoristaPdf(mot, gs, os, dias);
      dr.querySelector('#mXls').onclick = () => AJ.exporter.motoristaExcel(mot, gs, os);
    });
  };

  // =====================================================================
  // OCORRÊNCIAS (gestão / tratativa)
  // =====================================================================
  V.tratadas = function (c) {
    V.ocorrencias(c, { tratadas: true });
  };

  V.ocorrencias = function (c, opts) {
    if (needAudit(c)) return;
    const tratadas = !!(opts && opts.tratadas);
    const permitidos = tratadas ? AJ.app.TRAT_FECHADOS : AJ.app.TRAT_ABERTOS;
    if (S().filters.trat && !permitidos.includes(S().filters.trat)) S().filters.trat = '';
    V.filterBar(c, ['periodo', 'q', 'matricula', 'empresa', 'categoria', 'tipo', 'gravidade', 'trat', tratadas ? 'tratFechadas' : 'tratAbertas'], () => draw(true));
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-head"><div>${tratadas
      ? `<h3>Ocorrências tratadas</h3><p>Ocorrências com status <b>Corrigido</b>, <b>Justificado</b> ou <b>Encerrado</b>. Para reabrir, mude o status para "Em análise" (ela volta para a Gestão de ocorrências).</p>`
      : `<h3>Ocorrências em aberto</h3><p>Ao marcar uma ocorrência como <b>Corrigido</b>, <b>Justificado</b> ou <b>Encerrado</b>, ela sai desta lista e vai para <a href="#" id="goTrat">Ocorrências tratadas</a>.</p><p>Distinção: <b>infração trabalhista</b> (regra legal) · <b>inconformidade operacional</b> (parâmetro interno) · <b>falha de integração</b> (MaxTrack → RasterJor) · <b>divergência de apuração</b> · <b>registro</b> · <b>cadastro</b>.</p>`}</div></div>
      <div class="filters" style="box-shadow:none;margin-bottom:12px">
        <span class="small"><b id="selCount">0</b> selecionada(s)</span>
        <button class="btn" id="selAll">Selecionar todas do filtro</button><button class="btn ghost" id="selNone">Limpar seleção</button>
        <label class="field">Novo status<select id="bulkStatus"><option value="">—</option>${ui.TRAT_STATUS.map((s) => `<option>${s}</option>`).join('')}</select></label>
        <label class="field">Responsável<input type="text" id="bulkResp" placeholder="Nome"></label>
        <label class="field grow">Observação<input type="text" id="bulkObs" placeholder="Justificativa / providência"></label>
        <button class="btn primary" id="bulkApply">Aplicar às selecionadas</button>
      </div><div id="tbl"></div>`;
    c.appendChild(card);
    if (card.querySelector('#goTrat'))
      card.querySelector('#goTrat').onclick = (e) => {
        e.preventDefault();
        AJ.app.go('tratadas');
      };
    const sel = new Set();
    let current = [];
    const updSel = () => (card.querySelector('#selCount').textContent = sel.size);
    card.querySelector('#selAll').onclick = () => {
      current.forEach((o) => sel.add(o.id));
      draw();
    };
    card.querySelector('#selNone').onclick = () => {
      sel.clear();
      draw();
    };
    card.querySelector('#bulkApply').onclick = async () => {
      if (!sel.size) return ui.toast('Selecione ao menos uma ocorrência.');
      const ch = {};
      const st = card.querySelector('#bulkStatus').value;
      const rp = card.querySelector('#bulkResp').value.trim();
      const ob = card.querySelector('#bulkObs').value.trim();
      if (st) ch.status = st;
      if (rp) ch.responsavel = rp;
      if (!st && !rp && !ob) return ui.toast('Informe status, responsável ou observação.');
      for (const id of sel) await AJ.app.saveTrat(id, ch, ob || null);
      const mov = st && (AJ.app.TRAT_FECHADOS.includes(st) !== tratadas);
      ui.toast(`${sel.size} ocorrência(s) atualizada(s)` + (mov ? (tratadas ? ' e devolvida(s) para a Gestão de ocorrências.' : ' e movida(s) para Ocorrências tratadas.') : '.'), 5000);
      sel.clear();
      draw();
    };
    draw();
    function draw(reset) {
      current = AJ.app.filteredOcorrencias().filter((o) => AJ.app.TRAT_FECHADOS.includes(AJ.app.tratOf(o.id).status) === tratadas);
      S().lastRows = { view: tratadas ? 'tratadas' : 'ocorrencias', rows: current };
      updSel();
      ui.table(card.querySelector('#tbl'), {
        id: 'ocs',
        rows: current,
        resetPage: reset,
        columns: [
          { key: 'sel', label: '✓', sort: (o) => (sel.has(o.id) ? 0 : 1), render: (o) => `<input type="checkbox" data-sel="${o.id}" ${sel.has(o.id) ? 'checked' : ''} aria-label="Selecionar">` },
          { key: 'gravidade', label: 'Criticidade', sort: (o) => -AJ.config.GRAV_ORDEM[o.gravidade], render: (o) => `<span class="sev ${o.gravidade}">${o.gravidade}</span>` },
          { key: 'nomeTipo', label: 'Ocorrência', render: (o) => `<b>${esc(o.nomeTipo)}</b><div class="small muted">${esc(o.categoria)}</div>` },
          { key: 'nome', label: 'Motorista', render: (o) => `${esc(o.nome)}<div class="small muted">${esc(o.matricula || '')}</div>` },
          { key: 'date', label: 'Data', render: (o) => (o.date ? U.fmtDate(o.date) : '—'), cls: 'nowrap' },
          { key: 'sistema', label: 'Origem' },
          { key: 'descricao', label: 'Descrição', cls: 'wrap', render: (o) => `<div class="desc small">${esc(o.descricao)}</div>` },
          { key: 'trat', label: 'Tratativa', sort: (o) => AJ.app.tratOf(o.id).status, render: (o) => ui.tratBadge(AJ.app.tratOf(o.id).status) },
          { key: 'resp', label: 'Responsável', sort: (o) => AJ.app.tratOf(o.id).responsavel, render: (o) => esc(AJ.app.tratOf(o.id).responsavel || '—') },
          ...(tratadas
            ? [
                { key: 'dres', label: 'Resolvida em', sort: (o) => AJ.app.tratOf(o.id).dataResolucao, render: (o) => (AJ.app.tratOf(o.id).dataResolucao ? U.fmtDate(AJ.app.tratOf(o.id).dataResolucao) : '—'), cls: 'nowrap' },
                { key: 'obs', label: 'Justificativa', sort: (o) => AJ.app.tratOf(o.id).observacoes, cls: 'wrap', render: (o) => `<div class="desc small">${esc(AJ.app.tratOf(o.id).observacoes || '—')}</div>` },
              ]
            : []),
        ],
        onRowClick: (o) => V.ocorrenciaDetail(o.id, () => draw()),
        after: (el) => {
          el.querySelectorAll('[data-sel]').forEach((cb) =>
            cb.addEventListener('change', () => {
              if (cb.checked) sel.add(cb.dataset.sel);
              else sel.delete(cb.dataset.sel);
              updSel();
            })
          );
        },
      });
    }
  };

  V.ocorrenciaDetail = function (id, onSave) {
    const a = S().audit;
    const o = a.ocorrencias.find((x) => x.id === id);
    if (!o) return;
    const t = AJ.app.tratOf(id);
    const fechadaAntes = AJ.app.TRAT_FECHADOS.includes(t.status);
    const LBL = { status: 'Status', responsavel: 'Responsável', observacoes: 'Observações', dataResolucao: 'Data da resolução', nota: 'Anotação' };
    const html = `
      <div class="drawer-head"><div><div class="muted small">${esc(o.categoria)} · criticidade <span class="sev ${o.gravidade}">${o.gravidade}</span> · ID ${esc(o.id)}</div><h2>${esc(o.nomeTipo)}</h2><div class="small" style="margin-top:4px">${esc(o.nome)} · matrícula ${esc(o.matricula || '—')} · ${o.date ? U.fmtDate(o.date, true) : 'período'} · origem: ${esc(o.sistema)}</div></div><button class="btn" data-close>Fechar ✕</button></div>
      <div class="drawer-body">
        <div class="card"><h3>Descrição</h3><p style="line-height:1.55">${esc(o.descricao)}</p>${o.baseLegal ? `<p class="small muted"><b>Referência:</b> ${esc(o.baseLegal)}</p>` : ''}${o.grupo ? `<button class="btn" id="verJ">Ver comparativo da jornada</button>` : ''} <button class="btn" id="verM">Ver relatório do motorista</button></div>
        <div class="card"><div class="card-head"><h3>Tratativa</h3>${ui.tratBadge(t.status)}</div>
          <div class="grid c2">
            <label class="field">Status<select id="tStatus">${ui.TRAT_STATUS.map((s) => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
            <label class="field">Responsável pela análise<input type="text" id="tResp" value="${esc(t.responsavel)}"></label>
            <label class="field">Data da resolução<input type="date" id="tData" value="${esc(t.dataResolucao)}"></label>
          </div>
          <label class="field" style="margin-top:10px">Observações / justificativa<textarea id="tObs">${esc(t.observacoes)}</textarea></label>
          <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn primary" id="tSave">Salvar tratativa</button></div>
        </div>
        <div class="card"><h3>Histórico de alterações</h3>
          ${t.historico && t.historico.length ? `<div class="timeline" style="margin-top:10px">${t.historico.slice().reverse().map((h) => `<div class="ev"><b>${esc(h.por)}</b> · ${new Date(h.em).toLocaleString('pt-BR')}<br>${esc(LBL[h.campo] || h.campo)}: ${h.de ? `<s class="muted">${esc(h.de)}</s> → ` : ''}${esc(h.para)}</div>`).join('')}</div>` : '<p class="muted small">Sem alterações registradas.</p>'}
        </div>
      </div>`;
    ui.drawer(html, (dr, close) => {
      if (dr.querySelector('#verJ')) dr.querySelector('#verJ').onclick = () => V.grupoDetail(o.grupo);
      dr.querySelector('#verM').onclick = () => V.motoristaDetail(o.motorista);
      dr.querySelector('#tSave').onclick = async () => {
        await AJ.app.saveTrat(id, {
          status: dr.querySelector('#tStatus').value,
          responsavel: dr.querySelector('#tResp').value.trim(),
          dataResolucao: dr.querySelector('#tData').value,
          observacoes: dr.querySelector('#tObs').value.trim(),
        });
        const fechada = AJ.app.TRAT_FECHADOS.includes(dr.querySelector('#tStatus').value);
        ui.toast(fechada !== fechadaAntes ? (fechada ? 'Tratativa salva. A ocorrência foi movida para "Ocorrências tratadas".' : 'Tratativa salva. A ocorrência voltou para a "Gestão de ocorrências".') : 'Tratativa salva.', 5000);
        close();
        if (onSave) onSave();
        else if (S().view === 'ocorrencias' || S().view === 'tratadas') AJ.app.refresh();
      };
    });
  };

  // =====================================================================
  // IMPACTO NA FOLHA
  // =====================================================================
  V.folha = function (c) {
    if (needAudit(c)) return;
    V.filterBar(c, ['periodo', 'q', 'matricula', 'empresa', 'gravidade', 'status'], () => draw());
    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:18px';
    c.appendChild(body);
    draw();
    function draw() {
      const a = S().audit;
      const cfg = S().cfg;
      const gs = AJ.app.filteredGrupos();
      const os = AJ.app.filteredOcorrencias();
      const F = AJ.payroll.compute({ motoristas: a.motoristas, grupos: gs }, os, cfg);
      const T = F.totais;
      const tile = (l, v, s, cls) => `<div class="kpi ${cls}"><div class="k-label">${l}</div><div class="k-value">${v}</div><div class="k-sub">${s}</div></div>`;
      const hasV = Number(cfg.valorHoraPadrao) > 0 || Object.keys(cfg.valoresHora || {}).length;
      body.innerHTML = `
        <div class="alert warn"><b>Atenção:</b> esta área apenas <b>aponta</b> diferenças entre o registrado (MaxTrack) e o apurado para pagamento (RasterJor). Nenhum ajuste é feito na folha — todos os valores precisam ser validados pelo RH/DP antes de qualquer lançamento.</div>
        <div class="kpis">
          ${tile('HE 50% não computadas', D(T.he50NaoComputada), 'registradas no MaxTrack e não apuradas no RasterJor', 'bad')}
          ${tile('HE 100% não computadas', D(T.he100NaoComputada), 'registradas no MaxTrack e não apuradas no RasterJor', 'bad')}
          ${tile('HE 50% computadas a maior', D(T.he50Indevida), 'apuradas no RasterJor acima do MaxTrack', 'warn')}
          ${tile('HE 100% computadas a maior', D(T.he100Indevida), 'apuradas no RasterJor acima do MaxTrack', 'warn')}
          ${tile('Horas normais não apuradas', D(T.normalNaoApurada), 'jornadas ausentes no RasterJor (risco de falta indevida)', 'bad')}
          ${tile('Horas pendentes de validação', D(T.horasPendentes), 'soma das diferenças de jornadas não conciliadas', 'nv')}
          ${tile('Intervalo intrajornada suprimido', D(T.intrajornadaSuprimida), 'possível indenização (CLT art. 71 §4º)', 'warn')}
          ${tile('Interjornada não usufruída', D(T.interjornadaFaltante), 'possível pagamento como extra (OJ 355)', 'warn')}
          ${(() => {
            const dl = AJ.views.filteredDiarias ? AJ.views.filteredDiarias('') : [];
            const ind = dl.filter((l) => l.resultado === 'SEM_JORNADA');
            const ng = dl.filter((l) => l.resultado === 'NAO_GERADA');
            const v = (ls) => ls.reduce((s2, l) => s2 + AJ.diarias.valor(l, cfg), 0);
            const temV = Number(cfg.valorDiaria) > 0;
            return tile('Diárias indevidas (dia sem jornada)', ui.num(ind.length), temV ? 'simulação ' + ui.money(v(ind)) : 'informe o valor da diária em Parâmetros', 'bad') + tile('Diárias não geradas (dia com jornada)', ui.num(ng.length), temV ? 'simulação ' + ui.money(v(ng)) : 'possível pagamento a menor', 'bad');
          })()}
          ${hasV ? tile('Simulação: valor não computado', ui.money(T.valorNaoComputado), 'HE não apuradas × valor hora × adicional', 'bad') : ''}
          ${hasV ? tile('Simulação: valor computado a maior', ui.money(T.valorIndevido), 'HE apuradas a maior × valor hora × adicional', 'warn') : ''}
          ${hasV ? tile('Simulação: indenizações potenciais', ui.money(T.valorIndenizacoes), 'intrajornada + interjornada', 'warn') : ''}
        </div>
        <div class="card"><div class="card-head"><div><h3>Simulação financeira</h3><p>Informe o valor da hora padrão (ou por motorista na tabela abaixo) para estimar o impacto. Os valores ficam salvos apenas neste navegador.</p></div></div>
          <div class="filters" style="box-shadow:none">
            <label class="field">Valor hora padrão (R$)<input type="number" step="0.01" min="0" id="vh" value="${cfg.valorHoraPadrao || ''}" style="width:120px"></label>
            <label class="field">Adicional HE 50% (%)<input type="number" id="a50" value="${cfg.adicionalHE50}" style="width:90px"></label>
            <label class="field">Adicional HE 100% (%)<input type="number" id="a100" value="${cfg.adicionalHE100}" style="width:90px"></label>
            <button class="btn primary" id="saveVh">Aplicar</button>
          </div></div>
        <div class="card"><div class="card-head"><div><h3>Impacto por motorista</h3><p>Ordenado por HE não computada. Edite o valor hora individual se necessário.</p></div></div><div id="tRes"></div></div>
        <div class="card"><div class="card-head"><div><h3>Jornadas com impacto potencial</h3><p>Diferença = MaxTrack − RasterJor</p></div></div><div id="tLin"></div></div>`;
      body.querySelector('#saveVh').onclick = async () => {
        cfg.valorHoraPadrao = Number(body.querySelector('#vh').value) || 0;
        cfg.adicionalHE50 = Number(body.querySelector('#a50').value) || 0;
        cfg.adicionalHE100 = Number(body.querySelector('#a100').value) || 0;
        await AJ.store.put('settings', 'cfg', cfg);
        draw();
      };
      S().lastRows = { view: 'folha', rows: F.resumo, linhas: F.linhas, totais: T };
      ui.table(body.querySelector('#tRes'), {
        id: 'folhaRes',
        rows: F.resumo,
        columns: [
          { key: 'nome', label: 'Motorista', render: (p) => `<b>${esc(p.nome)}</b><div class="small muted">${esc(p.matricula || '')} · ${esc((p.empresa || '').replace(/ - [\d./-]+$/, ''))}</div>` },
          { key: 'jornadasAfetadas', label: 'Jornadas', num: true },
          { key: 'he50NaoComputada', label: 'HE50 não comp.', num: true, render: (p) => D(p.he50NaoComputada) },
          { key: 'he100NaoComputada', label: 'HE100 não comp.', num: true, render: (p) => D(p.he100NaoComputada) },
          { key: 'he50Indevida', label: 'HE50 a maior', num: true, render: (p) => D(p.he50Indevida) },
          { key: 'he100Indevida', label: 'HE100 a maior', num: true, render: (p) => D(p.he100Indevida) },
          { key: 'normalNaoApurada', label: 'Normais não apur.', num: true, render: (p) => D(p.normalNaoApurada) },
          { key: 'intrajornadaSuprimida', label: 'Intra suprim.', num: true, render: (p) => D(p.intrajornadaSuprimida) },
          { key: 'interjornadaFaltante', label: 'Inter faltante', num: true, render: (p) => D(p.interjornadaFaltante) },
          { key: 'valorHora', label: 'Valor hora', num: true, render: (p) => `<input type="number" step="0.01" min="0" data-vh="${esc(p.cpf)}" value="${cfg.valoresHora && cfg.valoresHora[p.cpf] !== undefined ? cfg.valoresHora[p.cpf] : ''}" placeholder="${cfg.valorHoraPadrao || ''}" style="width:85px">` },
          { key: 'valorNaoComputado', label: 'R$ não comp.', num: true, render: (p) => ui.money(p.valorNaoComputado) },
          { key: 'valorIndevido', label: 'R$ a maior', num: true, render: (p) => ui.money(p.valorIndevido) },
        ],
        after: (el) =>
          el.querySelectorAll('[data-vh]').forEach((inp) =>
            inp.addEventListener('change', async () => {
              cfg.valoresHora = cfg.valoresHora || {};
              if (inp.value === '') delete cfg.valoresHora[inp.dataset.vh];
              else cfg.valoresHora[inp.dataset.vh] = Number(inp.value);
              await AJ.store.put('settings', 'cfg', cfg);
              draw();
            })
          ),
      });
      ui.table(body.querySelector('#tLin'), {
        id: 'folhaLin',
        rows: F.linhas,
        columns: [
          { key: 'nome', label: 'Motorista', render: (l) => esc(l.nome) },
          { key: 'date', label: 'Data', render: (l) => U.fmtDate(l.date), cls: 'nowrap' },
          { key: 'tipo', label: 'Situação', render: (l) => ({ AUSENTE_RJ: '<span class="badge bad"><span class="dot"></span>Ausente no RasterJor</span>', AUSENTE_MT: '<span class="badge warn"><span class="dot"></span>Ausente no MaxTrack</span>', ABERTA: '<span class="badge nv"><span class="dot"></span>Jornada em aberto</span>', RECLASSIFICADO: '<span class="badge warn"><span class="dot"></span>Feriado/DSR</span>' }[l.tipo] || '<span class="badge plain">Diferença de apuração</span>') },
          { key: 'mtTrab', label: 'Trab. MT/RJ', num: true, render: (l) => `${D(l.mtTrab)}<br><span class="muted">${D(l.rjTrab)}</span>` },
          { key: 'dTrab', label: 'Δ Trab.', num: true, cell: (l) => ui.diffCell(l.dTrab) },
          { key: 'd50', label: 'Δ HE50', num: true, cell: (l) => ui.diffCell(l.d50) },
          { key: 'd100', label: 'Δ HE100', num: true, cell: (l) => ui.diffCell(l.d100) },
          { key: 'causa', label: 'Causa provável', cls: 'wrap', render: (l) => `<div class="desc small">${esc(l.causa)}</div>` },
        ],
        onRowClick: (l) => V.grupoDetail(l.grupo),
      });
    }
  };

  // =====================================================================
  // HISTÓRICO
  // =====================================================================
  V.historico = function (c) {
    const st = S();
    c.innerHTML = `
      <div class="card"><div class="card-head"><div><h3>Auditorias executadas</h3><p>Cada execução fica registrada com usuário, data/hora, arquivos (com hash SHA-256) e parâmetros. Novas importações não apagam auditorias anteriores.</p></div>
        <div style="display:flex;gap:8px"><button class="btn" id="bkExp">⬇ Backup (JSON)</button><button class="btn" id="bkImp">⇪ Restaurar backup</button><input type="file" id="bkFile" accept=".json" hidden></div></div>
        <div id="tbl"></div></div>
      <div class="alert info">Os dados ficam no armazenamento local deste navegador (${AJ.store.persistent ? 'IndexedDB ativo' : '<b>armazenamento indisponível – dados apenas em memória</b>'}). Faça backups periódicos e guarde-os em local seguro da empresa: o arquivo contém dados pessoais de motoristas (LGPD).</div>`;
    ui.table(c.querySelector('#tbl'), {
      id: 'hist',
      rows: st.index,
      defaultSort: 'criadoEm',
      defaultAsc: false,
      columns: [
        { key: 'criadoEm', label: 'Executada em', render: (x) => `${new Date(x.criadoEm).toLocaleString('pt-BR')}${st.audit && st.audit.id === x.id ? ' <span class="badge brand">aberta</span>' : ''}` },
        { key: 'usuario', label: 'Usuário' },
        { key: 'periodo', label: 'Período', sort: (x) => x.periodo.ini, render: (x) => `${U.fmtDate(x.periodo.ini)} a ${U.fmtDate(x.periodo.fim)}` },
        { key: 'arquivos', label: 'Arquivos', render: (x) => (x.arquivos || []).map((f) => `<div class="small"><b>${esc(f.sistema)}:</b> ${esc(f.nome)}<span class="muted" title="SHA-256 ${esc(f.hash || '')}"> #${esc((f.hash || '').slice(0, 8))}</span></div>`).join('') + (x.origem ? `<div class="small muted">${esc(x.origem)}</div>` : '') },
        { key: 'jornadas', label: 'Jornadas', num: true, sort: (x) => x.kpis.jornadas, render: (x) => ui.num(x.kpis.jornadas) },
        { key: 'div', label: 'Divergentes', num: true, sort: (x) => x.kpis.divergentes, render: (x) => ui.num(x.kpis.divergentes) },
        { key: 'oc', label: 'Ocorrências', num: true, sort: (x) => x.kpis.ocorrencias, render: (x) => ui.num(x.kpis.ocorrencias) },
        { key: 'conf', label: 'Conformidade', num: true, sort: (x) => x.kpis.percConformidade, render: (x) => ui.pct(x.kpis.percConformidade) },
        { key: 'acoes', label: 'Ações', render: (x) => `<button class="btn" data-open="${x.id}">Abrir</button> <button class="btn" data-rep="${x.id}" title="Reexecutar com os parâmetros atuais">Reprocessar</button> <button class="btn ghost danger" data-del="${x.id}">Excluir</button>` },
      ],
      after: (el) => {
        el.querySelectorAll('[data-open]').forEach((b) => (b.onclick = async () => (await AJ.app.loadAudit(b.dataset.open), AJ.app.go('painel'))));
        el.querySelectorAll('[data-rep]').forEach((b) => (b.onclick = () => reprocess(b.dataset.rep)));
        el.querySelectorAll('[data-del]').forEach(
          (b) =>
            (b.onclick = async () => {
              if (!(await ui.confirmDlg('Excluir esta auditoria do histórico? As tratativas das ocorrências são mantidas.'))) return;
              await AJ.app.deleteAudit(b.dataset.del);
              V.historico(c);
            })
        );
      },
    });
    c.querySelector('#bkExp').onclick = async () => {
      const data = await AJ.store.exportBackup();
      ui.download(`backup-auditoria-jornadas-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(data)], { type: 'application/json' }));
    };
    c.querySelector('#bkImp').onclick = () => c.querySelector('#bkFile').click();
    c.querySelector('#bkFile').onchange = async (e) => {
      try {
        const txt = await e.target.files[0].text();
        const n = await AJ.store.importBackup(JSON.parse(txt));
        ui.toast(`Backup restaurado (${n} registros). Recarregando...`);
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        ui.toast('Erro ao restaurar: ' + err.message, 6000);
      }
    };
  };

  async function reprocess(id) {
    const inputs = await AJ.store.get('inputs', id);
    if (!inputs) return ui.toast('Dados de entrada desta auditoria não estão disponíveis (backup restaurado sem entradas). Importe os arquivos novamente.', 6000);
    const old = S().index.find((x) => x.id === id);
    const a = await AJ.app.executeAudit(inputs.mt, inputs.rj, { arquivos: old && old.arquivos, origem: `Reprocessada a partir da auditoria de ${old ? new Date(old.criadoEm).toLocaleString('pt-BR') : id}` });
    ui.toast(`Auditoria reprocessada com os parâmetros atuais: ${a.ocorrencias.length} ocorrências.`);
    AJ.app.go('painel');
  }
  V.reprocess = reprocess;

  // =====================================================================
  // PARÂMETROS
  // =====================================================================
  const PARAMS = [
    ['Conciliação', [
      ['toleranciaMarcacao', 'min', 'Tolerância por marcação', 'Diferença de início/fim que não exige ajuste manual (padrão da empresa: 2 min; CLT art. 58 §1º admite até 5).'],
      ['toleranciaDiaria', 'min', 'Tolerância diária de horas', 'Diferença de horas/HE no dia que não exige ajuste manual (padrão: 2 min).'],
      ['limiteCritico', 'min', 'Diferença considerada crítica', 'Diferenças de horas/HE a partir deste valor recebem criticidade "Crítica".'],
      ['limiteConferencia', 'min', 'Limite para "necessita conferência"', 'Acima da tolerância e até este valor = amarelo; acima = divergente.'],
    ]],
    ['Jornada', [
      ['jornadaBaseLegal', 'hhmm', 'Jornada diária base', 'CLT art. 235-C: 8 horas.'],
      ['heMaxDiaria', 'hhmm', 'Horas extras máximas por dia', '2h pela CLT; até 4h quando previsto em CCT/ACT (art. 235-C). O MaxTrack da empresa está com 04:00.'],
      ['validarSemanal', 'bool', 'Validar limite semanal', 'Gera inconformidade operacional quando o total semanal passa do parâmetro.'],
      ['limiteSemanal', 'hhmm', 'Limite semanal de trabalho', 'Ex.: 44h + 12h extras = 56h. MaxTrack configurado com 54:00.'],
      ['maxDiasConsecutivos', 'int', 'Máximo de dias consecutivos', 'DSR (CLT art. 67): máximo de 6 dias trabalhados seguidos.'],
    ]],
    ['Descansos e direção', [
      ['interjornadaMin', 'hhmm', 'Descanso mínimo entre jornadas', 'CLT art. 66 / 235-C §3º: 11h.'],
      ['permitirFracionamentoInterjornada', 'bool', 'Permitir fracionamento da interjornada', 'Desligado por padrão: o STF (ADI 5322) declarou inconstitucional o fracionamento previsto na Lei 13.103/2015.'],
      ['interjornadaPrimeiroPeriodo', 'hhmm', '1º período mínimo (se fracionado)', 'Usado apenas se o fracionamento estiver habilitado: 8h.'],
      ['intrajornadaAcima6h', 'hhmm', 'Intervalo mínimo (jornada > 6h)', 'CLT art. 71: 1 hora.'],
      ['intrajornada4a6h', 'min', 'Intervalo mínimo (jornada de 4 a 6h)', 'CLT art. 71 §1º: 15 minutos.'],
      ['considerarDescansoComoIntervalo', 'bool', 'Somar "descanso" ao intervalo de refeição', 'Use se a CCT permitir intervalo fracionado/coincidente com paradas.'],
      ['direcaoContinuaMax', 'hhmm', 'Direção contínua máxima', 'CTB art. 67-C: 5h30.'],
      ['validarDirecaoDiaria', 'bool', 'Validar direção diária total', 'Regra operacional (MaxTrack configurado com 10:00).'],
      ['direcaoDiariaMax', 'hhmm', 'Direção diária máxima', ''],
      ['pausaInternaLonga', 'hhmm', 'Pausa interna longa', 'Pausas dentro da mesma jornada a partir deste tempo são sinalizadas (podem ser repouso não encerrado).'],
      ['validarTempoAteRefeicao', 'bool', 'Validar tempo até a refeição', 'Regra operacional (MaxTrack: 05:30).'],
      ['tempoMaxAteRefeicao', 'hhmm', 'Tempo máximo até a refeição', ''],
    ]],
    ['Diárias', [
      ['conciliarDiarias', 'bool', 'Conciliar diárias', 'Compara a coluna "Diária" do RasterJor com os dias trabalhados.'],
      ['diariaEmTodoDiaTrabalhado', 'bool', 'Toda jornada iniciada gera diária', 'Se desligado, não aponta "dia com jornada sem diária".'],
      ['valorDiaria', 'num', 'Valor da diária inteira (R$)', 'Usado apenas na simulação financeira (0 = não simula).'],
      ['valorMeiaDiaria', 'num', 'Valor da meia diária (R$)', ''],
    ]],
    ['Escopo', [['ignorarSomenteMaxTrack', 'bool', 'Ignorar motoristas que estão somente no MaxTrack', 'Agregados não são apurados no RasterJor: ficam fora da auditoria (jornadas, diárias, folha e ocorrências).']]],
    ['Privacidade', [['mascararCpf', 'bool', 'Mascarar CPF nas telas', 'Exibe ***.123.456-** nas telas e relatórios.']]],
  ];

  V.parametros = function (c) {
    const st = S();
    const cfg = st.cfg;
    const val = (k, t) => (t === 'hhmm' ? U.fmtDur(cfg[k]) : cfg[k]);
    const mtParams = st.audit && st.audit.meta.mt.parametros;
    c.innerHTML = `
      <div class="alert info">Os parâmetros valem para as próximas execuções. Para aplicar a uma auditoria já feita, salve e use <b>Reprocessar auditoria aberta</b>. Ajuste conforme a convenção coletiva (CCT/ACT) e valide com o jurídico.</div>
      ${PARAMS.map(([title, items]) => `<div class="card"><div class="card-head"><h3>${title}</h3></div><div class="params">${items
        .map(([k, t, label, help]) => `<div class="p"><label for="p_${k}">${label}</label>${t === 'bool' ? `<label class="switch"><input type="checkbox" id="p_${k}" data-k="${k}" data-t="${t}" ${cfg[k] ? 'checked' : ''}> ${cfg[k] ? 'Ativado' : 'Desativado'}</label>` : `<div class="row"><input type="text" id="p_${k}" data-k="${k}" data-t="${t}" value="${val(k, t)}"> <span class="small muted">${t === 'hhmm' ? 'hh:mm' : t === 'min' ? 'minutos' : ''}</span></div>`}<small>${help}</small></div>`)
        .join('')}</div></div>`).join('')}
      <div class="grid c2">
        <div class="card"><div class="card-head"><div><h3>Feriados adicionais</h3><p>Um por linha (dd/mm/aaaa). Os feriados marcados no RasterJor são detectados automaticamente.</p></div></div><textarea id="pFer" rows="5">${(cfg.feriados || []).map((d) => U.fmtDate(d)).join('\n')}</textarea>
          ${st.audit ? `<p class="small muted">Feriados considerados na auditoria aberta: ${(st.audit.feriados || []).map((d) => U.fmtDate(d)).join(', ') || 'nenhum'}</p>` : ''}</div>
        <div class="card"><div class="card-head"><div><h3>Cadastros ignorados</h3><p>CPFs (um por linha) fora do escopo – ex.: usuários de manutenção logados no MaxTrack.</p></div></div><textarea id="pIgn" rows="5">${(cfg.ignorarCpfs || []).join('\n')}</textarea>
          ${st.audit ? `<p class="small muted">Sugestões (somente no MaxTrack): ${st.audit.motoristas.filter((m) => m.vinculo === 'SO_MT').map((m) => `${esc(m.nome)} (${m.cpf})`).join('; ') || '—'}</p>` : ''}</div>
      </div>
      ${mtParams && mtParams.length ? `<div class="card"><div class="card-head"><div><h3>Parâmetros configurados no MaxTrack (rodapé do relatório)</h3><p>Use como referência para alinhar as regras dos dois sistemas.</p></div></div><div class="table-wrap" style="max-height:300px"><table class="data">${mtParams.map((p) => `<tr><td>${esc(p.nome)}</td><td>${esc(p.valor)}</td></tr>`).join('')}</table></div></div>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="pSave">Salvar parâmetros</button><button class="btn" id="pRep" ${st.audit ? '' : 'disabled'}>Salvar e reprocessar auditoria aberta</button><button class="btn ghost" id="pReset">Restaurar padrões</button><button class="btn ghost" id="pUser">Alterar usuário</button></div>`;
    c.querySelectorAll('input[type=checkbox][data-k]').forEach((cb) => cb.addEventListener('change', () => (cb.parentElement.lastChild.textContent = cb.checked ? ' Ativado' : ' Desativado')));
    async function save() {
      for (const inp of c.querySelectorAll('[data-k]')) {
        const k = inp.dataset.k;
        const t = inp.dataset.t;
        if (t === 'bool') cfg[k] = inp.checked;
        else if (t === 'hhmm') {
          const v = U.parseDuration(inp.value);
          if (v === null) throw new Error(`Valor inválido em "${k}": use hh:mm.`);
          cfg[k] = v;
        } else {
          const v = Number(inp.value);
          if (!isFinite(v)) throw new Error(`Valor inválido em "${k}".`);
          cfg[k] = v;
        }
      }
      cfg.feriados = c.querySelector('#pFer').value.split(/\n/).map((s) => U.parseDateTime(s.trim())).filter((x) => x !== null).map(U.dayKey);
      cfg.ignorarCpfs = c.querySelector('#pIgn').value.split(/\n/).map(U.normCpf).filter(Boolean);
      await AJ.store.put('settings', 'cfg', cfg);
    }
    c.querySelector('#pSave').onclick = async () => {
      try {
        await save();
        ui.toast('Parâmetros salvos.');
      } catch (e) {
        ui.toast(e.message, 5000);
      }
    };
    c.querySelector('#pRep').onclick = async () => {
      try {
        await save();
        await reprocess(st.audit.id);
      } catch (e) {
        ui.toast(e.message, 5000);
      }
    };
    c.querySelector('#pReset').onclick = async () => {
      if (!(await ui.confirmDlg('Restaurar todos os parâmetros para os valores padrão?'))) return;
      st.cfg = AJ.config.clone(AJ.config.DEFAULTS);
      await AJ.store.put('settings', 'cfg', st.cfg);
      V.parametros(c);
    };
    c.querySelector('#pUser').onclick = () => AJ.app.askUser(true);
  };

  // =====================================================================
  // METODOLOGIA
  // =====================================================================
  V.metodologia = function (c) {
    c.innerHTML = `<div class="card doc">${AJ.METODOLOGIA_HTML || ''}</div>`;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
