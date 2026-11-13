/* Telas: importação, painel, conciliação e detalhes de jornada. */
(function (root) {
  'use strict';
  const AJ = root.AJ;
  const U = AJ.util;
  const ui = AJ.ui;
  const esc = ui.esc;
  const D = (m) => U.fmtDur(m);
  const DT = (m) => U.fmtDateTime(m);
  const V = (AJ.views = AJ.views || {});
  const S = () => AJ.state;

  function needAudit(c) {
    if (S().audit) return false;
    c.innerHTML = `<div class="card empty"><div class="big">📂</div><h3>Nenhuma auditoria carregada</h3><p>Importe os relatórios do MaxTrack e do RasterJor e clique em <b>Executar auditoria</b>, ou abra uma auditoria do histórico.</p><button class="btn primary" onclick="AJ.app.go('importar')">Ir para importação</button></div>`;
    return true;
  }

  // =====================================================================
  // Barra de filtros
  // =====================================================================
  function filterBar(c, fields, onChange) {
    const f = S().filters;
    const a = S().audit;
    const empresas = [...new Set(a.motoristas.map((m) => m.empresa))].sort();
    const tipos = Object.entries(AJ.config.TIPOS).filter(([k]) => a.ocorrencias.some((o) => o.tipo === k));
    const parts = [];
    const has = (k) => fields.includes(k);
    if (has('periodo'))
      parts.push(`<label class="field">De<input type="date" data-f="ini" value="${f.ini}" min="${a.periodo.ini}" max="${a.periodo.fim}"></label>
        <label class="field">Até<input type="date" data-f="fim" value="${f.fim}" min="${a.periodo.ini}" max="${a.periodo.fim}"></label>`);
    if (has('q')) parts.push(`<label class="field grow">Motorista (nome ou CPF)<input type="search" data-f="q" value="${esc(f.q)}" placeholder="Buscar..."></label>`);
    if (has('matricula')) parts.push(`<label class="field">Matrícula<input type="text" data-f="matricula" value="${esc(f.matricula)}" style="width:100px"></label>`);
    if (has('empresa')) parts.push(`<label class="field">Filial / empresa<select data-f="empresa"><option value="">Todas</option>${empresas.map((e) => `<option ${f.empresa === e ? 'selected' : ''} value="${esc(e)}">${esc(e.replace(/ - [\d./-]+$/, ''))}</option>`).join('')}</select></label>`);
    if (has('status'))
      parts.push(`<label class="field">Status da auditoria<select data-f="status"><option value="">Todos</option>${Object.entries(ui.STATUS).map(([k, s]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>`);
    if (has('categoria'))
      parts.push(`<label class="field">Categoria<select data-f="categoria"><option value="">Todas</option>${Object.entries(AJ.config.CATEGORIAS).map(([k, v]) => `<option value="${k}" ${f.categoria === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`);
    if (has('tipo')) parts.push(`<label class="field">Tipo de inconformidade<select data-f="tipo" style="max-width:260px"><option value="">Todos</option>${tipos.map(([k, t]) => `<option value="${k}" ${f.tipo === k ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>`);
    if (has('gravidade'))
      parts.push(`<label class="field">Criticidade<select data-f="gravidade"><option value="">Todas</option>${AJ.config.CRITICIDADES.map((g) => `<option ${f.gravidade === g ? 'selected' : ''}>${g}</option>`).join('')}${fields.includes('semAjuste') ? `<option value="SEM_AJUSTE" ${f.gravidade === 'SEM_AJUSTE' ? 'selected' : ''}>Sem ajuste (jornadas 100% corretas)</option>` : ''}</select></label>`);
    const tratOpts = has('tratFechadas') ? AJ.app.TRAT_FECHADOS : has('tratAbertas') ? AJ.app.TRAT_ABERTOS : ui.TRAT_STATUS;
    if (has('trat')) parts.push(`<label class="field">Tratativa<select data-f="trat"><option value="">Todas</option>${tratOpts.map((g) => `<option ${f.trat === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>`);
    const ativos = activeFilters(fields);
    parts.push(`<button class="btn ${ativos.length ? 'primary' : 'ghost'}" data-clear>Limpar filtros</button>`);
    const el = document.createElement('div');
    el.className = 'filters' + (ativos.length ? ' filters-on' : '');
    el.innerHTML = (ativos.length ? `<div class="filter-banner">⚠ <b>Filtro ativo</b> — os números desta tela consideram apenas: ${ativos.map((x) => `<span class="chip">${esc(x)}</span>`).join(' ')}. Clique em <b>Limpar filtros</b> para ver tudo.</div>` : '') + parts.join('');
    c.appendChild(el);
    let t = null;
    el.querySelectorAll('[data-f]').forEach((inp) => {
      const ev = inp.tagName === 'SELECT' || inp.type === 'date' ? 'change' : 'input';
      inp.addEventListener(ev, () => {
        f[inp.dataset.f] = inp.value;
        clearTimeout(t);
        t = setTimeout(onChange, ev === 'input' ? 250 : 0);
      });
    });
    el.querySelector('[data-clear]').onclick = () => {
      for (const k of Object.keys(f)) f[k] = '';
      AJ.app.refresh();
    };
    return el;
  }
  V.filterBar = filterBar;

  function activeFilters(fields) {
    const f = S().filters;
    const has = (k) => fields.includes(k);
    const out = [];
    if (has('periodo') && (f.ini || f.fim)) out.push(`Período ${f.ini ? U.fmtDate(f.ini) : 'início'} a ${f.fim ? U.fmtDate(f.fim) : 'fim'}`);
    if (has('q') && f.q) out.push(`Motorista: ${f.q}`);
    if (has('matricula') && f.matricula) out.push(`Matrícula: ${f.matricula}`);
    if (has('empresa') && f.empresa) out.push(`Empresa: ${f.empresa.replace(/ - [\d./-]+$/, '')}`);
    if (has('status') && f.status) out.push(`Status: ${ui.STATUS[f.status].label}`);
    if (has('categoria') && f.categoria) out.push(`Categoria: ${AJ.config.CATEGORIAS[f.categoria]}`);
    if (has('tipo') && f.tipo) out.push(`Tipo: ${AJ.config.TIPOS[f.tipo].nome}`);
    if (has('gravidade') && f.gravidade) out.push(`Criticidade: ${f.gravidade === 'SEM_AJUSTE' ? 'Sem ajuste (jornadas 100% corretas)' : f.gravidade}`);
    if (has('trat') && f.trat) out.push(`Tratativa: ${f.trat}`);
    return out;
  }

  // =====================================================================
  // IMPORTAÇÃO
  // =====================================================================
  V.importar = function (c) {
    const st = S();
    c.innerHTML = `
      <div class="alert info"><b>Como funciona:</b> 1) importe o relatório <b>Jornadas Completas</b> do MaxTrack (XLS/XLSX/CSV); 2) importe o <b>espelho de jornada</b> do RasterJor (uma aba por motorista); 3) confira o reconhecimento das colunas; 4) clique em <b>Executar auditoria</b>. Use relatórios do <b>mesmo período</b>. Os arquivos são lidos apenas neste navegador.</div>
      <div class="grid c2">
        <div class="card" id="zoneMT"></div>
        <div class="card" id="zoneRJ"></div>
      </div>
      <div class="card"><div class="run-bar">
        <div class="steps" id="steps"></div>
        <div style="flex:1"></div>
        <button class="btn" id="btnClear">Limpar arquivos</button>
        <button class="btn primary big" id="btnRun">▶ Executar auditoria</button>
      </div><div id="runMsg" class="small muted" style="margin-top:8px"></div></div>`;
    zone(c.querySelector('#zoneMT'), 'mt', 'maxtrack', 'MaxTrack', 'Relatório "Jornadas Completas" (rastreamento / macros)');
    zone(c.querySelector('#zoneRJ'), 'rj', 'rasterjor', 'RasterJor', 'Espelho de jornada (apuração para folha)');
    updateRun(c);
    c.querySelector('#btnClear').onclick = () => {
      st.pending = { mt: [], rj: [] };
      V.importar(c);
    };
    c.querySelector('#btnRun').onclick = async () => {
      const btn = c.querySelector('#btnRun');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Processando...';
      await new Promise((r) => setTimeout(r, 30));
      try {
        const mt = st.pending.mt.filter((x) => x.res).map((x) => x.res);
        const rj = st.pending.rj.filter((x) => x.res).map((x) => x.res);
        const t0 = performance.now();
        const arquivosOrig = [...st.pending.mt.filter((x) => x.res).map((x) => ({ sistema: 'maxtrack', name: x.name, buf: x.buf, mapping: x.mapping, hash: x.hash })), ...st.pending.rj.filter((x) => x.res).map((x) => ({ sistema: 'rasterjor', name: x.name, buf: x.buf, mapping: x.mapping, hash: x.hash }))];
        const a = await AJ.app.executeAudit(mt, rj, { files: arquivosOrig });
        ui.toast(`Auditoria concluída em ${((performance.now() - t0) / 1000).toFixed(1)}s: ${a.kpis.jornadas} jornadas, ${a.ocorrencias.length} ocorrências.`);
        AJ.app.go('painel');
      } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.textContent = '▶ Executar auditoria';
        c.querySelector('#runMsg').innerHTML = `<span style="color:var(--bad-text)">Erro: ${esc(e.message)}</span>`;
      }
    };
  };

  function updateRun(c) {
    const st = S();
    const okMT = st.pending.mt.some((x) => x.res && x.res.jornadas.length);
    const okRJ = st.pending.rj.some((x) => x.res && (x.res.jornadas.length || x.res.dias.length));
    const steps = [
      ['Relatório MaxTrack', okMT],
      ['Relatório RasterJor', okRJ],
      ['Colunas reconhecidas', okMT && okRJ && [...st.pending.mt, ...st.pending.rj].every((x) => !x.res || x.res.layout.every((l) => l.reqOk))],
    ];
    c.querySelector('#steps').innerHTML = steps.map(([l, ok], i) => `<span class="step ${ok ? 'done' : ''}"><span class="n">${ok ? '✓' : i + 1}</span>${l}</span>`).join('');
    c.querySelector('#btnRun').disabled = !(okMT && okRJ);
    const msg = c.querySelector('#runMsg');
    if (okMT && okRJ) {
      const pm = st.pending.mt.map((x) => x.res.meta).filter(Boolean)[0];
      const pr = st.pending.rj.map((x) => x.res.meta).filter(Boolean)[0];
      const warn = pm && pr && (pm.periodoIni !== pr.periodoIni || pm.periodoFim !== pr.periodoFim);
      msg.innerHTML = warn
        ? `<span style="color:var(--warn-text)">⚠ Os períodos diferem (MaxTrack ${U.fmtDate(pm.periodoIni)}–${U.fmtDate(pm.periodoFim)} × RasterJor ${U.fmtDate(pr.periodoIni)}–${U.fmtDate(pr.periodoFim)}). Ausências só serão cobradas no período comum.</span>`
        : `Período: ${U.fmtDate(pm.periodoIni)} a ${U.fmtDate(pm.periodoFim)}. Pronto para executar.`;
    } else msg.textContent = 'Importe os dois relatórios para habilitar a auditoria.';
  }

  async function sha256(buf) {
    try {
      const h = await crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return 'fnv-' + U.hash(String(buf.byteLength));
    }
  }

  function zone(el, side, sys, title, sub) {
    const st = S();
    const items = st.pending[side];
    el.innerHTML = `
      <div class="card-head"><div><h3>${title}</h3><p>${sub}</p></div></div>
      <div class="dropzone" tabindex="0" role="button" aria-label="Selecionar arquivos ${title}">
        <div class="dz-ico">📄</div><h3>Arraste o arquivo aqui</h3><div class="muted small">ou clique para selecionar · .xlsx, .xls, .csv (pode adicionar vários)</div>
        <input type="file" multiple accept=".xlsx,.xls,.csv,.txt,.pdf" hidden>
      </div>
      <div class="files"></div>`;
    const dz = el.querySelector('.dropzone');
    const inp = el.querySelector('input');
    dz.onclick = () => inp.click();
    dz.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && inp.click();
    dz.ondragover = (e) => {
      e.preventDefault();
      dz.classList.add('drag');
    };
    dz.ondragleave = () => dz.classList.remove('drag');
    dz.ondrop = (e) => {
      e.preventDefault();
      dz.classList.remove('drag');
      addFiles(e.dataTransfer.files);
    };
    inp.onchange = () => addFiles(inp.files);

    async function addFiles(files) {
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const item = { name: f.name, size: f.size, buf, mapping: {}, hash: await sha256(buf) };
        if (items.some((x) => x.hash === item.hash)) {
          ui.toast(`"${f.name}" já foi importado (mesmo conteúdo).`);
          continue;
        }
        parseItem(item);
        items.push(item);
      }
      renderFiles();
    }

    function parseItem(item) {
      try {
        const mapping = {};
        mapping[sys] = item.mapping;
        item.res = AJ.parsers.parseFile(item.buf, item.name, { forceSystem: sys, mapping });
        item.res.hash = item.hash;
        item.error = null;
      } catch (e) {
        console.error(e);
        item.res = null;
        item.error = e.message;
      }
    }

    function renderFiles() {
      const box = el.querySelector('.files');
      box.innerHTML = items
        .map((it, i) => {
          if (it.error) return `<div class="file-card"><div class="fc-head"><div class="fc-name">${esc(it.name)}</div><button class="btn ghost danger" data-rm="${i}">Remover</button></div><div class="alert bad" style="margin-top:8px">${esc(it.error)}</div></div>`;
          const r = it.res;
          const detWarn = r.detectado && r.detectado !== sys && r.detectado !== 'desconhecido' ? `<div class="alert warn" style="margin-top:8px">Este arquivo parece ser do <b>${r.detectado === 'maxtrack' ? 'MaxTrack' : 'RasterJor'}</b>. Confira se foi colocado no lugar certo.</div>` : '';
          const lay = r.layout[0];
          const reqMiss = lay ? AJ.parsers.FIELDS[sys].filter((f) => f.req && (lay.map[f.k] === undefined || lay.map[f.k] < 0)) : [];
          const motoristas = Object.keys(r.motoristas).length;
          return `<div class="file-card">
            <div class="fc-head"><div><div class="fc-name">${esc(it.name)}</div><div class="small muted">${(it.size / 1024).toFixed(0)} KB · ${r.meta.titulo ? esc(r.meta.titulo) + ' · ' : ''}${r.meta.emitidoEm ? esc(r.meta.emitidoEm) : ''}</div></div><button class="btn ghost danger" data-rm="${i}">Remover</button></div>
            ${detWarn}
            <div class="facts">
              <div class="fact"><b>${motoristas}</b><span>motoristas</span></div>
              <div class="fact"><b>${r.jornadas.length}</b><span>jornadas</span></div>
              <div class="fact"><b>${r.dias.length}</b><span>dias sem jornada / especiais</span></div>
              <div class="fact"><b>${U.fmtDate(r.meta.periodoIni)}</b><span>até ${U.fmtDate(r.meta.periodoFim)}</span></div>
            </div>
            ${reqMiss.length ? `<div class="alert bad" style="margin-top:8px">Colunas obrigatórias não reconhecidas: ${reqMiss.map((f) => f.label).join(', ')}. Ajuste o mapeamento abaixo.</div>` : ''}
            ${r.avisos.length ? `<details><summary>${r.avisos.length} aviso(s) de leitura</summary><ul class="small">${r.avisos.slice(0, 50).map((a) => `<li>${esc(a)}</li>`).join('')}</ul></details>` : ''}
            ${lay ? `<details ${reqMiss.length ? 'open' : ''}><summary>Mapeamento de colunas (aba "${esc(lay.sheet)}", cabeçalho na linha ${lay.headerRow + 1})</summary>
              <div class="mapping">${AJ.parsers.FIELDS[sys]
                .map(
                  (f) => `<label class="${f.req ? 'req' : ''}"><span>${esc(f.label)}</span><select data-map="${f.k}" data-i="${i}"><option value="-1">— não usar —</option>${lay.headers
                    .map((h) => `<option value="${h.idx}" ${lay.map[f.k] === h.idx ? 'selected' : ''}>${esc(String.fromCharCode(65 + (h.idx % 26)))}${h.idx >= 26 ? '+' : ''} · ${esc(h.name)}</option>`)
                    .join('')}</select></label>`
                )
                .join('')}</div></details>` : ''}
            ${r.meta.parametros && r.meta.parametros.length ? `<details><summary>Parâmetros configurados no ${sys === 'maxtrack' ? 'MaxTrack' : 'sistema'} (${r.meta.parametros.length})</summary><table class="data" style="margin-top:6px">${r.meta.parametros.map((p) => `<tr><td>${esc(p.nome)}</td><td>${esc(p.valor)}</td></tr>`).join('')}</table></details>` : ''}
          </div>`;
        })
        .join('');
      box.querySelectorAll('[data-rm]').forEach((b) =>
        b.addEventListener('click', () => {
          items.splice(+b.dataset.rm, 1);
          renderFiles();
        })
      );
      box.querySelectorAll('[data-map]').forEach((s) =>
        s.addEventListener('change', () => {
          const it = items[+s.dataset.i];
          it.mapping[s.dataset.map] = +s.value;
          parseItem(it);
          renderFiles();
        })
      );
      updateRun(el.closest('.content'));
    }
    renderFiles();
  }

  // =====================================================================
  // PAINEL
  // =====================================================================
  V.painel = function (c) {
    if (needAudit(c)) return;
    filterBar(c, ['periodo', 'q', 'matricula', 'empresa', 'gravidade', 'semAjuste', 'tipo', 'status'], () => draw());
    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:18px';
    c.appendChild(body);
    draw();

    function draw() {
      const a = S().audit;
      const gs = AJ.app.filteredGrupos();
      const os = AJ.app.filteredOcorrencias();
      const ms = AJ.app.filteredMotoristas().filter((m) => m.qtdJornadas > 0);
      const folha = AJ.payroll.compute({ motoristas: a.motoristas, grupos: gs }, os, a.cfg);
      const k = AJ.audit.computeKpis(gs, os, ms, folha);
      const osAj = os.filter((o) => AJ.config.natureza(o) === 'ajuste');
      const osJo = os.filter((o) => AJ.config.natureza(o) === 'jornada');
      const integ = k.pares + k.ausentesRJ ? k.pares / (k.pares + k.ausentesRJ) : null;
      const tile = (label, value, sub, cls, nav) => `<div class="kpi ${cls || ''} ${nav ? 'clickable' : ''}" ${nav ? `data-nav='${JSON.stringify(nav)}'` : ''}><div class="k-label">${label}</div><div class="k-value">${value}</div>${sub ? `<div class="k-sub">${sub}</div>` : ''}</div>`;
      const ignMT = '';
      const cmp = a.comparativo && !S().filters.ini ? `<div class="alert info">Comparado com a auditoria anterior do mesmo período (${new Date(a.comparativo.anteriorEm).toLocaleString('pt-BR')}): <b>${a.comparativo.novas}</b> ocorrência(s) nova(s), <b>${a.comparativo.recorrentes}</b> recorrente(s), <b>${a.comparativo.naoMaisPresentes}</b> não aparecem mais (possivelmente corrigidas).</div>` : '';
      body.innerHTML = `${ignMT}${cmp}
        <h3 class="sec-title">Resultado final das jornadas <span class="muted small">— horas conferem entre os sistemas <b>e</b> nenhuma regra de jornada foi descumprida</span></h3>
        <div class="kpis">
          ${tile('Jornadas analisadas', ui.num(k.jornadas), `${ui.num(k.motoristas)} motoristas com jornada no período`, 'info', { view: 'conciliacao' })}
          ${tile('Jornadas 100% corretas', ui.num(k.audConciliado), `${ui.pct(k.percConformidade)} das jornadas · sem nenhum ajuste`, 'ok', { view: 'conciliacao', gravidade: 'SEM_AJUSTE' })}
          ${tile('Jornadas para conferir', ui.num(k.audConferencia), 'pequenas diferenças (3 a 15 min) ou detalhes', 'warn', { view: 'conciliacao', status: 'conferencia' })}
          ${tile('Jornadas com problema', ui.num(k.audDivergente), 'divergência de horas e/ou inconformidade', 'bad', { view: 'conciliacao', status: 'divergente' })}
        </div>
        <h3 class="sec-title">1. Horas: MaxTrack × RasterJor <span class="muted small">— só compara as horas entre os dois sistemas (sem regras legais)</span></h3>
        <div class="kpis">
          ${tile('Horas iguais nos dois sistemas', ui.num(k.conciliadas), `${ui.pct(k.percConciliacao)} das ${ui.num(k.jornadas)} jornadas (dif. ≤ ${a.cfg.toleranciaDiaria} min)`, 'ok', { view: 'conciliacao' })}
          ${tile('Horas com pequena diferença', ui.num(k.conferencia), `entre ${a.cfg.toleranciaDiaria + 1} e ${a.cfg.limiteConferencia} min`, 'warn', { view: 'conciliacao' })}
          ${tile('Horas divergentes', ui.num(k.divergentes), `${ui.num(k.ausentesRJ)} não chegaram ao RasterJor · total ${D(k.horasDivergentes)}`, 'bad', { view: 'conciliacao' })}
          ${tile('HE 50% divergentes', D(k.he50Divergentes), `${D(folha.totais.he50NaoComputada)} não computadas no RasterJor`, 'warn', { view: 'folha' })}
          ${tile('HE 100% divergentes', D(k.he100Divergentes), `${D(folha.totais.he100NaoComputada)} não computadas no RasterJor`, 'warn', { view: 'folha' })}
          ${tile('Integração MaxTrack → RasterJor', ui.pct(integ), `${ui.num(k.pares)} de ${ui.num(k.pares + k.ausentesRJ)} jornadas do MaxTrack chegaram ao RasterJor`, integ > 0.98 ? 'ok' : integ > 0.9 ? 'warn' : 'bad')}
        </div>
        <h3 class="sec-title">2. Divergências entre sistemas <span class="muted small">— MaxTrack × RasterJor diferentes: <b>precisam de ajuste</b></span></h3>
        <div class="kpis">
          ${tile('Divergências para ajustar', ui.num(osAj.length), `${ui.num(osAj.filter((o) => o.catKey === 'INTEGRACAO').length)} integração · ${ui.num(osAj.filter((o) => o.catKey === 'DIVERGENCIA').length)} horas/HE · ${ui.num(osAj.filter((o) => o.catKey === 'DIARIA').length)} diárias · ${ui.num(osAj.filter((o) => o.catKey === 'CADASTRO').length)} cadastro`, 'bad', { view: 'ajustes' })}
          ${tile('Jornadas que não chegaram ao RasterJor', ui.num(k.ausentesRJ), 'registradas só no MaxTrack', 'bad', { view: 'ajustes', tipo: 'JORNADA_AUSENTE_RJ' })}
          ${tile('Diárias divergentes', ui.num(os.filter((o) => o.catKey === 'DIARIA').length), `${ui.num(os.filter((o) => o.tipo === 'DIARIA_SEM_JORNADA').length)} em dia de folga · ${ui.num(os.filter((o) => o.tipo === 'DIARIA_NAO_GERADA').length)} não geradas`, 'bad', { view: 'diarias' })}
        </div>
        <h3 class="sec-title">3. Inconformidades na jornada <span class="muted small">— regras de jornada descumpridas pelo motorista (independe de os sistemas baterem)</span></h3>
        <div class="kpis">
          ${tile('Inconformidades na jornada', ui.num(osJo.length), `${ui.num(k.infracoes)} infrações legais · ${ui.num(osJo.length - k.infracoes)} operacionais/registro`, 'warn', { view: 'inconformidades', chip: '' })}
          ${tile('Interjornada inferior a 11h', ui.num(os.filter((o) => o.tipo === 'INTERJORNADA').length), 'descanso entre jornadas', 'warn', { view: 'inconformidades', chip: 'INTERJORNADA' })}
          ${tile('Refeição menor que 1 hora', ui.num(os.filter((o) => o.tipo === 'INTRAJORNADA' || o.tipo === 'SEM_REFEICAO').length), `${ui.num(os.filter((o) => o.tipo === 'SEM_REFEICAO').length)} sem registro de refeição`, 'warn', { view: 'inconformidades', chip: 'REFEICAO' })}
          ${tile('Jornada acima do limite', ui.num(os.filter((o) => o.tipo === 'EXCESSO_JORNADA').length), `acima de ${D(a.cfg.jornadaBaseLegal + a.cfg.heMaxDiaria)} de trabalho`, 'warn', { view: 'inconformidades', chip: 'EXCESSO_JORNADA' })}
        </div>
        <div class="card"><div class="card-head"><div><h3>Ocorrências por criticidade</h3><p>Crítica = impacto direto no pagamento (jornada/diária não integrada, diferença ≥ ${a.cfg.limiteCritico} min). Diferenças de até ${a.cfg.toleranciaDiaria} min não exigem ajuste. Clique para filtrar.</p></div></div>
          <div class="crit-tiles">${AJ.config.CRITICIDADES.map((c) => `<div class="crit-tile" data-crit="${c}"><span class="sev ${c}">${c}</span><b>${ui.num(os.filter((o) => o.gravidade === c).length)}</b><span class="small">ocorrências</span></div>`).join('')}
          <div class="crit-tile" data-crit="SEM_AJUSTE" data-nav-view="conciliacao"><span class="badge ok"><span class="dot"></span>Sem ajuste</span><b>${ui.num(gs.filter((g) => g.criticidade === 'SEM_AJUSTE').length)}</b><span class="small">jornadas 100% corretas</span></div></div></div>
        <div class="card"><div class="card-head"><div><h3>Resultado final das jornadas</h3><p>Mesmos números dos indicadores "Resultado final" acima</p></div></div><div id="stack"></div></div>
        <div class="grid c2">
          <div class="card"><div class="card-head"><div><h3>Jornadas por dia</h3><p>Quantidade de jornadas por status, pela data de início</p></div></div><div id="perDay"></div></div>
          <div class="card"><div class="card-head"><div><h3>Ocorrências por categoria</h3><p>Clique para abrir a gestão de ocorrências filtrada</p></div></div><div id="perCat"></div></div>
        </div>
        <div class="grid c2">
          <div class="card"><div class="card-head"><div><h3>Principais tipos de ocorrência</h3><p>Quantidade no período filtrado</p></div></div><div id="perTipo"></div></div>
          <div class="card"><div class="card-head"><div><h3>Motoristas com mais ocorrências</h3><p>Clique para abrir o relatório individual</p></div></div><div id="perMot"></div></div>
        </div>`;
      body.querySelectorAll('[data-crit]').forEach((el) =>
        el.addEventListener('click', () => {
          S().filters.gravidade = el.dataset.crit;
          AJ.app.go(el.dataset.navView || 'ocorrencias');
        })
      );
      body.querySelectorAll('[data-nav]').forEach((el) =>
        el.addEventListener('click', () => {
          const n = JSON.parse(el.dataset.nav);
          if (n.categoria !== undefined) S().filters.categoria = n.categoria;
          if (n.status !== undefined) S().filters.status = n.status;
          if (n.gravidade !== undefined) S().filters.gravidade = n.gravidade;
          if (n.tipo !== undefined) S().filters.tipo = n.tipo;
          if (n.chip !== undefined) V.setChip(n.chip);
          AJ.app.go(n.view);
        })
      );
      stackBar(body.querySelector('#stack'), gs);
      perDay(body.querySelector('#perDay'), gs);
      const cats = Object.entries(AJ.config.CATEGORIAS).map(([key, label]) => ({ key, label, v: os.filter((o) => o.catKey === key).length })).filter((x) => x.v);
      hbars(body.querySelector('#perCat'), cats, (x) => {
        S().filters.categoria = x.key;
        AJ.app.go('ocorrencias');
      });
      const tipos = {};
      for (const o of os) tipos[o.tipo] = (tipos[o.tipo] || 0) + 1;
      hbars(
        body.querySelector('#perTipo'),
        Object.entries(tipos).map(([key, v]) => ({ key, label: AJ.config.TIPOS[key].nome, v })).sort((x, y) => y.v - x.v).slice(0, 10),
        (x) => {
          S().filters.tipo = x.key;
          AJ.app.go('ocorrencias');
        }
      );
      const mots = {};
      for (const o of os) mots[o.motorista] = (mots[o.motorista] || 0) + 1;
      const mm = AJ.app.motMap();
      hbars(
        body.querySelector('#perMot'),
        Object.entries(mots).map(([key, v]) => ({ key, label: mm[key].nome, v })).sort((x, y) => y.v - x.v).slice(0, 10),
        (x) => V.motoristaDetail(x.key)
      );
      ui.bindTooltips(body);
    }
  };

  const STATUS_COLORS = { conciliado: 'var(--ok)', conferencia: 'var(--warn)', divergente: 'var(--bad)', nao_validado: 'var(--nv)' };

  function stackBar(el, gs) {
    const tot = gs.length || 1;
    const parts = ['conciliado', 'conferencia', 'divergente', 'nao_validado'].map((s) => ({ s, v: gs.filter((g) => g.statusAuditoria === s).length }));
    el.innerHTML = `<div class="stackbar">${parts
      .filter((p) => p.v)
      .map((p) => `<div style="flex:${p.v};background:${STATUS_COLORS[p.s]}" data-tip="<b>${ui.STATUS[p.s].label}</b><br>${p.v} jornadas (${ui.pct(p.v / tot)})"></div>`)
      .join('')}</div>
      <div class="legend">${parts.map((p) => `<span><i style="background:${STATUS_COLORS[p.s]}"></i>${ui.STATUS[p.s].ico} ${ui.STATUS[p.s].label}: <b>${p.v}</b> (${ui.pct(p.v / tot)})</span>`).join('')}</div>`;
  }

  function perDay(el, gs) {
    const days = {};
    for (const g of gs) {
      const d = (days[g.date] = days[g.date] || { conciliado: 0, conferencia: 0, divergente: 0, nao_validado: 0 });
      d[g.statusAuditoria]++;
    }
    const keys = Object.keys(days).sort();
    if (!keys.length) return (el.innerHTML = '<div class="empty">Sem dados</div>');
    const max = Math.max(...keys.map((k) => Object.values(days[k]).reduce((a, b) => a + b, 0)));
    const order = ['divergente', 'conferencia', 'conciliado', 'nao_validado'];
    el.innerHTML = `<div class="cols">${keys
      .map((k) => {
        const d = days[k];
        const tot = Object.values(d).reduce((a, b) => a + b, 0);
        const tip = `<b>${U.fmtDate(k, true)}</b><br>${order.filter((s) => d[s]).map((s) => `${ui.STATUS[s].label}: ${d[s]}`).join('<br>')}<br>Total: ${tot}`;
        return `<div class="col" data-tip="${esc(tip)}">${order
          .filter((s) => d[s])
          .map((s) => `<div class="seg" style="height:${(d[s] / max) * 100}%;background:${STATUS_COLORS[s]}"></div>`)
          .join('')}</div>`;
      })
      .join('')}</div><div class="cols-x">${keys.map((k) => `<span>${k.slice(8, 10)}/${k.slice(5, 7)}</span>`).join('')}</div>
      <div class="legend">${order.slice(0, 3).map((s) => `<span><i style="background:${STATUS_COLORS[s]}"></i>${ui.STATUS[s].label}</span>`).join('')}</div>`;
  }

  function hbars(el, items, onClick) {
    if (!items.length) return (el.innerHTML = '<div class="empty">Nenhuma ocorrência</div>');
    const max = Math.max(...items.map((x) => x.v));
    el.innerHTML = `<div class="hbars">${items
      .map((x, i) => `<div class="hbar ${onClick ? 'clickable' : ''}" data-i="${i}" data-tip="<b>${esc(x.label)}</b><br>${x.v} ocorrência(s)"><span class="lbl">${esc(x.label)}</span><span class="track"><span class="fill" style="display:block;width:${(x.v / max) * 100}%"></span></span><span class="val">${ui.num(x.v)}</span></div>`)
      .join('')}</div>`;
    if (onClick) el.querySelectorAll('.hbar').forEach((b) => b.addEventListener('click', () => onClick(items[+b.dataset.i])));
  }
  V.hbars = hbars;

  // =====================================================================
  // CONCILIAÇÃO
  // =====================================================================
  V.conciliacao = function (c) {
    if (needAudit(c)) return;
    filterBar(c, ['periodo', 'q', 'matricula', 'empresa', 'gravidade', 'semAjuste', 'status', 'tipo'], () => draw(true));
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-head"><div><h3>Comparativo MaxTrack × RasterJor por jornada</h3><p><b>Sistemas</b>: se as horas do MaxTrack e do RasterJor batem (precisa ajuste?). <b>Jornada do motorista</b>: regras descumpridas (interjornada, refeição...). Diferença = MaxTrack − RasterJor. Positivo (vermelho): registrado e não apurado. Negativo (azul): apurado a maior no RasterJor. Clique na linha para o detalhe.</p></div></div><div id="tbl"></div>`;
    c.appendChild(card);
    const avisoDiaria = document.createElement('div');
    card.parentNode.insertBefore(avisoDiaria, card);
    draw();
    function draw(reset) {
      const dFolga = V.filteredDiarias ? V.filteredDiarias('SEM_JORNADA') : [];
      avisoDiaria.innerHTML = dFolga.length
        ? `<div class="alert bad">⚠ <b>${dFolga.length} diária(s) em dia de folga</b> (sem jornada) — esses dias não aparecem nesta tabela porque não houve jornada. <a href="#" id="verDiarias">Ver em Conciliação de diárias</a>.</div>`
        : '';
      const lk = avisoDiaria.querySelector('#verDiarias');
      if (lk) lk.onclick = (e) => (e.preventDefault(), AJ.app.go('diarias'));
      const mm = AJ.app.motMap();
      const rows = AJ.app.filteredGrupos();
      AJ.state.lastRows = { view: 'conciliacao', rows };
      ui.table(card.querySelector('#tbl'), {
        id: 'conc',
        rows,
        resetPage: reset,
        defaultSort: 'nome',
        columns: [
          { key: 'statusAuditoria', label: 'Status', render: (g) => ui.badge(g.statusAuditoria) },
          { key: 'sist', label: 'Sistemas (MT × RJ)', sort: (g) => g.status, render: (g) => ({ conciliado: '<span class="badge ok"><span class="dot"></span>Iguais</span>', conferencia: '<span class="badge warn"><span class="dot"></span>Conferir</span>', divergente: '<span class="badge bad"><span class="dot"></span>Ajustar</span>', nao_validado: '<span class="badge nv"><span class="dot"></span>Não validado</span>' }[g.status]) },
          { key: 'jorn', label: 'Jornada do motorista', sort: (g) => jornadaProblemas(g).length, cls: 'wrap', render: (g) => { const p = jornadaProblemas(g); return p.length ? p.map((x) => `<span class="badge warn" style="margin:1px 2px 1px 0"><span class="dot"></span>${esc(x)}</span>`).join('') : '<span class="badge ok"><span class="dot"></span>Conforme</span>'; } },
          { key: 'criticidade', label: 'Criticidade', sort: (g) => -(AJ.config.GRAV_ORDEM[g.criticidade] || 0), render: (g) => (g.criticidade === 'SEM_AJUSTE' ? '<span class="small muted">Sem ajuste</span>' : `<span class="sev ${g.criticidade}">${g.criticidade}</span>`) },
          { key: 'nome', label: 'Motorista', render: (g) => `<b>${esc(g.nome)}</b><div class="small muted">${esc(mm[g.motorista].matriculaMT || mm[g.motorista].matriculaRJ || '')}</div>` },
          { key: 'date', label: 'Data', render: (g) => U.fmtDate(g.date, true), cls: 'nowrap' },
          { key: 'ini', label: 'Início MT / RJ', sort: (g) => (g.mt || g.rj).inicio, render: (g) => `${g.mt ? DT(g.mt.inicio) : '—'}<br><span class="muted">${g.rj ? DT(g.rj.inicio) : '—'}</span>`, cls: 'nowrap mono' },
          { key: 'fim', label: 'Fim MT / RJ', sort: (g) => (g.mt || g.rj).fim, render: (g) => `${g.mt ? DT(g.mt.fim) : '—'}<br><span class="muted">${g.rj ? DT(g.rj.fim) : '—'}</span>`, cls: 'nowrap mono' },
          { key: 'tMT', label: 'Trab. MT', num: true, sort: (g) => g.mt && g.mt.trabalho, render: (g) => D(g.mt && g.mt.trabalho) },
          { key: 'tRJ', label: 'Trab. RJ', num: true, sort: (g) => g.rj && g.rj.trabalho, render: (g) => D(g.rj && g.rj.trabalho) },
          { key: 'dT', label: 'Δ Trab.', num: true, sort: (g) => diff(g, 'trabalho'), cell: (g) => ui.diffCell(diff(g, 'trabalho')) },
          { key: 'h50', label: 'HE50 MT/RJ', num: true, sort: (g) => g.mt && g.mt.he50, render: (g) => `${D(g.mt && g.mt.he50)}<br><span class="muted">${D(g.rj && g.rj.he50)}</span>` },
          { key: 'd50', label: 'Δ HE50', num: true, sort: (g) => diff(g, 'he50'), cell: (g) => ui.diffCell(diff(g, 'he50')) },
          { key: 'h100', label: 'HE100 MT/RJ', num: true, sort: (g) => g.mt && g.mt.he100, render: (g) => `${D(g.mt && g.mt.he100)}<br><span class="muted">${D(g.rj && g.rj.he100)}</span>` },
          { key: 'd100', label: 'Δ HE100', num: true, sort: (g) => diff(g, 'he100'), cell: (g) => ui.diffCell(diff(g, 'he100')) },
          { key: 'oc', label: 'Ocorr.', num: true, sort: (g) => g.ocorrencias.length, render: (g) => g.ocorrencias.length || '' },
          { key: 'mot', label: 'Motivos', sort: (g) => g.motivos.length, cls: 'wrap', render: (g) => `<div class="desc small">${esc(g.motivos.join('; ')) || '<span class="muted">—</span>'}</div>` },
        ],
        onRowClick: (g) => V.grupoDetail(g.id),
      });
    }
  };

  const CURTO = { INTERJORNADA: 'Interjornada < 11h', INTRAJORNADA: 'Refeição < 1h', SEM_REFEICAO: 'Sem refeição', EXCESSO_JORNADA: 'Jornada acima do limite', DIRECAO_CONTINUA: 'Direção > 5h30', DIAS_CONSECUTIVOS: 'Sem DSR', PAUSA_INTERNA_LONGA: 'Pausa longa', DIRECAO_DIARIA: 'Direção diária', LIMITE_SEMANAL: 'Limite semanal', SEM_DIRECAO: 'Sem direção', INTERJORNADA_FRACIONADA: 'Interjornada fracionada', JORNADA_ABERTA: 'Sem encerramento', TEMPO_ATE_REFEICAO: 'Refeição tardia', SEQUENCIA_INVALIDA: 'Sequência inválida' };
  let _ocIdx = null;
  let _ocFor = null;
  function jornadaProblemas(g) {
    const a = S().audit;
    if (_ocFor !== a) {
      _ocIdx = {};
      for (const o of a.ocorrencias) _ocIdx[o.id] = o;
      _ocFor = a;
    }
    return [...new Set((g.ocorrencias || []).map((id) => _ocIdx[id]).filter((o) => o && AJ.config.natureza(o) === 'jornada').map((o) => CURTO[o.tipo] || o.nomeTipo))];
  }

  function diff(g, k) {
    if (!g.mt && !g.rj) return null;
    return U.nz(g.mt && g.mt[k]) - U.nz(g.rj && g.rj[k]);
  }

  // =====================================================================
  // DETALHE DA JORNADA
  // =====================================================================
  V.grupoDetail = function (id) {
    const a = S().audit;
    const g = a.grupos.find((x) => x.id === id);
    if (!g) return;
    const mot = AJ.app.motMap()[g.motorista];
    const m = g.mt || {};
    const r = g.rj || {};
    const mtJ = g.mtJ || [];
    const rjJ = g.rjJ || [];
    const sumF = (list, k) => U.sum(...list.map((j) => j[k]));
    const row = (label, vm, vr, isTime, diffV) =>
      `<tr><td>${label}</td><td>${isTime ? DT(vm) : D(vm)}</td><td>${isTime ? DT(vr) : D(vr)}</td>${diffV === undefined ? '<td></td>' : ui.diffCell(diffV)}</tr>`;
    const d = (k) => (g.mt && g.rj ? U.nz(m[k]) - U.nz(r[k]) : undefined);
    const ocs = a.ocorrencias.filter((o) => o.grupo === g.id);
    const ck = g.checks || {};
    const placas = (list) => [...new Set(list.map((j) => j.placa).filter(Boolean))].join(', ') || '—';
    const html = `
      <div class="drawer-head"><div><div class="muted small">${esc(mot.empresa)}</div><h2>${esc(mot.nome)} · ${U.fmtDate(g.date, true)}</h2><div style="margin-top:6px">${ui.badge(g.statusAuditoria)} <span class="badge plain">Conciliação: ${ui.STATUS[g.status].label}</span></div></div><button class="btn" data-close>Fechar ✕</button></div>
      <div class="drawer-body">
        ${g.motivos.length ? `<div class="alert ${g.status === 'divergente' ? 'bad' : g.status === 'conferencia' ? 'warn' : 'info'}"><b>Motivos:</b><ul class="list-reasons">${g.motivos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '<div class="alert info">Jornada conciliada dentro das tolerâncias.</div>'}
        <div class="card"><div class="card-head"><h3>Comparativo</h3>${g.reclassificado ? '<span class="badge warn"><span class="dot"></span>HE do MaxTrack reclassificada para comparação</span>' : ''}</div>
          <table class="compare"><thead><tr><th>Item</th><th>MaxTrack</th><th>RasterJor</th><th>Diferença</th></tr></thead><tbody>
            ${row('Início da jornada', m.inicio, r.inicio, true, g.diffs && g.diffs.inicio !== null ? g.diffs.inicio : undefined)}
            ${row('Término da jornada', m.fim, r.fim, true, g.diffs && g.diffs.fim !== null ? g.diffs.fim : undefined)}
            ${row('Total trabalhado', m.trabalho, r.trabalho, false, d('trabalho'))}
            ${row('Horas normais', m.normal, r.normal, false, d('normal'))}
            ${row('Hora extra 50%', m.he50, r.he50, false, d('he50'))}
            ${row('Hora extra 100%', m.he100, r.he100, false, d('he100'))}
            ${row('Horas noturnas', m.noturno, r.noturno, false, d('noturno'))}
            ${row('Refeição', m.refeicao, r.refeicao, false, d('refeicao'))}
            ${row('Descanso', m.descanso, r.descanso, false, d('descanso'))}
            ${row('Espera', m.espera, r.espera, false, d('espera'))}
            <tr><td>Direção (total / maior contínua)</td><td>${D(sumF(mtJ, 'direcao'))} / ${D(mtJ.length ? Math.max(...mtJ.map((j) => U.nz(j.dirContinua))) : null)}</td><td class="muted">não informado</td><td></td></tr>
            <tr><td>Interjornada antes / falta de repouso</td><td>${D(mtJ[0] && mtJ[0].interjornadaAnterior)}</td><td>Falta: ${D(sumF(rjJ, 'faltaRepouso'))}</td><td></td></tr>
            <tr><td>Placa(s)</td><td>${esc(placas(mtJ))}</td><td>${esc(placas(rjJ))}</td><td></td></tr>
            ${g.mtOriginal ? `<tr><td>HE original do MaxTrack</td><td>HE50 ${D(g.mtOriginal.he50)} / HE100 ${D(g.mtOriginal.he100)}</td><td></td><td></td></tr>` : ''}
          </tbody></table>
        </div>
        <div class="card"><div class="card-head"><h3>Validação das regras de jornada</h3></div>
          <div style="display:flex;gap:18px;flex-wrap:wrap">
            <span>${ui.chk(ck.interjornada, 'Interjornada')} Interjornada (11h)</span>
            <span>${ui.chk(ck.intrajornada, 'Intrajornada')} Intervalo intrajornada</span>
            <span>${ui.chk(ck.direcao, 'Direção contínua')} Direção contínua (5h30)</span>
            <span>${ui.chk(ck.excesso, 'Limite diário')} Limite diário de jornada</span>
          </div><p class="small muted" style="margin-bottom:0">✓ conforme · ✕ inconformidade · ? não foi possível validar (dados insuficientes)</p>
        </div>
        <div class="card"><div class="card-head"><h3>Ocorrências desta jornada (${ocs.length})</h3></div><div id="ocs"></div></div>
        <div class="card"><div class="card-head"><h3>Registros de origem</h3><p>Rastreabilidade: aba e linha de cada relatório</p></div>
          ${mtJ.map((j) => `<div class="small" style="margin-bottom:8px"><b>MaxTrack</b> · ${esc(j.origem)} · ${DT(j.inicio)} → ${DT(j.fim)} · trabalho ${D(j.trabalho)} · direção ${D(j.direcao)} · em posição ${D(j.posicao)} · espera ${D(j.espera)} · dias consecutivos ${j.consecutivas ?? '—'}<br><span class="muted">Períodos: ${(j.periodos || []).map((p) => DT(p.ini) + '–' + U.fmtDateTime(p.fim, { timeOnly: 1 })).join(' · ') || '—'}</span></div>`).join('')}
          ${rjJ.map((j) => `<div class="small" style="margin-bottom:8px"><b>RasterJor</b> · ${esc(j.origem)} · ${DT(j.inicio)} → ${DT(j.fim)} · atividade ${D(j.trabalho)} · HN ${D(j.hn)} · HNN ${D(j.hnn)} · HE50 ${D(j.he50d)} · HE50N ${D(j.he50n)} · HE100 ${D(j.he100d)} · HE100N ${D(j.he100n)} · entre jornada ${D(j.interjornadaPosterior)} · diária ${esc(j.diaria || '—')}${j.rotuloDia ? ' · dia: ' + esc(j.rotuloDia) : ''}</div>`).join('')}
        </div>
      </div>`;
    ui.drawer(html, (dr) => {
      V.ocorrenciasMini(dr.querySelector('#ocs'), ocs);
    });
  };

  V.ocorrenciasMini = function (el, ocs) {
    if (!ocs.length) return (el.innerHTML = '<p class="muted small">Nenhuma ocorrência vinculada.</p>');
    ui.table(el, {
      id: 'mini' + Math.random(),
      rows: ocs,
      pageSize: 50,
      columns: [
        { key: 'gravidade', label: 'Criticidade', sort: (o) => -AJ.config.GRAV_ORDEM[o.gravidade], render: (o) => `<span class="sev ${o.gravidade}">${o.gravidade}</span>` },
        { key: 'date', label: 'Data', render: (o) => (o.date ? U.fmtDate(o.date) : '—'), cls: 'nowrap' },
        { key: 'nomeTipo', label: 'Ocorrência', render: (o) => `<b>${esc(o.nomeTipo)}</b><div class="small muted">${esc(o.categoria)} · ${esc(o.sistema)}</div>` },
        { key: 'descricao', label: 'Descrição', cls: 'wrap', render: (o) => `<div class="desc small">${esc(o.descricao)}</div>` },
        { key: 'trat', label: 'Tratativa', sort: (o) => AJ.app.tratOf(o.id).status, render: (o) => ui.tratBadge(AJ.app.tratOf(o.id).status) },
      ],
      onRowClick: (o) => V.ocorrenciaDetail(o.id),
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
