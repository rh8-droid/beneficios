/* Inicialização, estado global, navegação e filtros. */
(function (root) {
  'use strict';
  const AJ = root.AJ;
  const U = AJ.util;
  const ui = AJ.ui;

  const TITLES = {
    importar: 'Importar e executar',
    painel: 'Painel gerencial',
    conciliacao: 'Conciliação de jornadas',
    motoristas: 'Motoristas',
    ocorrencias: 'Todas as ocorrências em aberto',
    ajustes: 'Divergências entre sistemas',
    inconformidades: 'Inconformidades na jornada',
    tratadas: 'Ocorrências tratadas',
    folha: 'Impacto na folha',
    diarias: 'Conciliação de diárias',
    historico: 'Histórico de auditorias',
    parametros: 'Parâmetros e regras',
    metodologia: 'Metodologia',
  };

  const state = (AJ.state = {
    view: 'importar',
    cfg: AJ.config.clone(AJ.config.DEFAULTS),
    user: '',
    index: [], // resumo das auditorias salvas
    audit: null,
    trat: {}, // tratativas por id de ocorrência
    filters: { ini: '', fim: '', q: '', matricula: '', empresa: '', status: '', categoria: '', tipo: '', gravidade: '', trat: '' },
    pending: { mt: [], rj: [] },
  });

  // ---------------- filtros ----------------
  function textMatch(f, nome, cpf, mat) {
    if (!f) return true;
    const q = U.normName(f);
    const d = U.onlyDigits(f);
    return (q && U.normName(nome).includes(q)) || (d && d.length >= 3 && String(cpf || '').includes(d));
  }

  function filteredGrupos() {
    const a = state.audit;
    if (!a) return [];
    const f = state.filters;
    const motByKey = motMap();
    let tipoSet = null;
    if (f.tipo || f.categoria) {
      tipoSet = new Set(filteredOcorrencias({ ignoreTrat: true }).map((o) => o.grupo).filter(Boolean));
    }
    return a.grupos.filter((g) => {
      const m = motByKey[g.motorista];
      if (f.ini && g.date < f.ini) return false;
      if (f.fim && g.date > f.fim) return false;
      if (f.empresa && m.empresa !== f.empresa) return false;
      if (f.matricula && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaMT) && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaRJ)) return false;
      if (!textMatch(f.q, m.nome, m.cpf || m.cpfRJ)) return false;
      if (f.status && g.statusAuditoria !== f.status) return false;
      if (f.gravidade && g.criticidade !== f.gravidade) return false;
      if (tipoSet && !tipoSet.has(g.id)) return false;
      return true;
    });
  }

  function filteredOcorrencias(opt) {
    const a = state.audit;
    if (!a) return [];
    const f = state.filters;
    const motByKey = motMap();
    const gStatus = {};
    if (f.status) for (const g of a.grupos) gStatus[g.id] = g.statusAuditoria;
    return a.ocorrencias.filter((o) => {
      const m = motByKey[o.motorista] || {};
      if (f.ini && o.date && o.date < f.ini) return false;
      if (f.fim && o.date && o.date > f.fim) return false;
      if (f.empresa && o.empresa !== f.empresa) return false;
      if (f.matricula && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaMT) && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaRJ)) return false;
      if (!textMatch(f.q, o.nome, o.cpf)) return false;
      if (f.categoria && o.catKey !== f.categoria) return false;
      if (f.tipo && o.tipo !== f.tipo) return false;
      if (f.gravidade === 'SEM_AJUSTE') return false;
      if (f.gravidade && o.gravidade !== f.gravidade) return false;
      if (!(opt && opt.ignoreTrat) && f.trat && tratOf(o.id).status !== f.trat) return false;
      if (f.status && o.grupo && gStatus[o.grupo] !== f.status) return false;
      return true;
    });
  }

  function filteredMotoristas() {
    const a = state.audit;
    if (!a) return [];
    const f = state.filters;
    const gs = filteredGrupos();
    const os = filteredOcorrencias();
    const byG = {};
    for (const g of gs) (byG[g.motorista] = byG[g.motorista] || []).push(g);
    const byO = {};
    for (const o of os) (byO[o.motorista] = byO[o.motorista] || []).push(o);
    const anyFilter = f.ini || f.fim || f.status || f.tipo || f.categoria || f.gravidade || f.trat;
    return a.motoristas
      .filter((m) => {
        if (f.empresa && m.empresa !== f.empresa) return false;
        if (f.matricula && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaMT) && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaRJ)) return false;
        if (!textMatch(f.q, m.nome, m.cpf || m.cpfRJ)) return false;
        if (anyFilter && !byG[m.key] && !byO[m.key]) return false;
        return true;
      })
      .map((m) => {
        const g = byG[m.key] || [];
        const o = byO[m.key] || [];
        const s = (side, k) => g.reduce((acc, x) => acc + U.nz(x[side] && x[side][k]), 0);
        return Object.assign({}, m, {
          qtdJornadas: g.length,
          qtdConciliadas: g.filter((x) => x.statusAuditoria === 'conciliado').length,
          qtdConferencia: g.filter((x) => x.statusAuditoria === 'conferencia').length,
          qtdDivergentes: g.filter((x) => x.statusAuditoria === 'divergente').length,
          qtdOcorrencias: o.length,
          qtdInfracoes: o.filter((x) => x.catKey === 'INFRACAO').length,
          qtdIntegracao: o.filter((x) => x.catKey === 'INTEGRACAO').length,
          horasMT: s('mt', 'trabalho'),
          horasRJ: s('rj', 'trabalho'),
          he50MT: s('mt', 'he50'),
          he50RJ: s('rj', 'he50'),
          he100MT: s('mt', 'he100'),
          he100RJ: s('rj', 'he100'),
          statusAuditoria: !g.length && !o.length ? 'nao_validado' : g.some((x) => x.statusAuditoria === 'divergente') || o.some((x) => x.gravidade === 'Alta') ? 'divergente' : g.some((x) => x.statusAuditoria === 'conferencia') || o.length ? 'conferencia' : 'conciliado',
        });
      });
  }

  let _motMapFor = null;
  let _motMap = {};
  function motMap() {
    if (_motMapFor !== state.audit) {
      _motMap = {};
      if (state.audit) for (const m of state.audit.motoristas) _motMap[m.key] = m;
      _motMapFor = state.audit;
    }
    return _motMap;
  }

  // ---------------- tratativas ----------------
  function tratOf(id) {
    return state.trat[id] || { status: 'Pendente de análise', responsavel: '', observacoes: '', dataResolucao: '', historico: [] };
  }

  async function saveTrat(id, changes, nota) {
    const cur = Object.assign({}, tratOf(id));
    cur.historico = (cur.historico || []).slice();
    const em = new Date().toISOString();
    for (const [k, v] of Object.entries(changes)) {
      if ((cur[k] || '') === (v || '')) continue;
      cur.historico.push({ em, por: state.user || 'Não identificado', campo: k, de: cur[k] || '', para: v || '' });
      cur[k] = v;
    }
    if (nota) cur.historico.push({ em, por: state.user || 'Não identificado', campo: 'nota', de: '', para: nota });
    if (['Corrigido', 'Justificado', 'Encerrado'].includes(cur.status) && !cur.dataResolucao) {
      cur.dataResolucao = em.slice(0, 10);
      cur.historico.push({ em, por: state.user || 'Não identificado', campo: 'dataResolucao', de: '', para: cur.dataResolucao });
    }
    cur.atualizadoEm = em;
    state.trat[id] = cur;
    await AJ.store.put('tratativas', id, cur);
    updateNavCount();
    return cur;
  }

  const TRAT_ABERTOS = ['Pendente de análise', 'Em análise', 'Aguardando correção'];
  const TRAT_FECHADOS = ['Corrigido', 'Justificado', 'Encerrado'];

  function updateNavCount() {
    const el = document.getElementById('navCount');
    const el2 = document.getElementById('navCountTrat');
    if (!state.audit) return (el.textContent = el2.textContent = document.getElementById('navCountAj').textContent = '');
    const abertas = state.audit.ocorrencias.filter((o) => TRAT_ABERTOS.includes(tratOf(o.id).status));
    const pend = abertas.length;
    const trat = state.audit.ocorrencias.length - pend;
    const aj = abertas.filter((o) => AJ.config.natureza(o) === 'ajuste').length;
    const elA = document.getElementById('navCountAj');
    elA.textContent = aj ? ui.num(aj) : '';
    el.textContent = pend - aj ? ui.num(pend - aj) : '';
    el.title = pend - aj + ' inconformidade(s) em aberto';
    el2.textContent = trat ? ui.num(trat) : '';
    el2.title = trat + ' ocorrência(s) tratada(s)';
  }

  // ---------------- auditorias ----------------
  async function loadAudit(id) {
    const a = await AJ.store.get('audits', id);
    if (!a) return ui.toast('Auditoria não encontrada.');
    state.audit = a;
    await AJ.store.put('settings', 'ultimaAuditoria', id);
    renderHeader();
    updateNavCount();
  }

  async function saveAudit(audit, inputs) {
    const resumo = {
      id: audit.id,
      criadoEm: audit.criadoEm,
      usuario: audit.usuario,
      arquivos: audit.arquivos,
      periodo: audit.periodo,
      kpis: audit.kpis,
      origem: audit.origem || null,
    };
    await AJ.store.put('audits', audit.id, audit);
    if (inputs) await AJ.store.put('inputs', audit.id, inputs);
    state.index = state.index.filter((x) => x.id !== audit.id).concat([resumo]).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
    await AJ.store.put('settings', 'auditIndex', state.index);
  }

  async function deleteAudit(id) {
    await AJ.store.del('audits', id);
    await AJ.store.del('inputs', id);
    state.index = state.index.filter((x) => x.id !== id);
    await AJ.store.put('settings', 'auditIndex', state.index);
    if (state.audit && state.audit.id === id) state.audit = null;
    renderHeader();
  }

  async function executeAudit(mtList, rjList, extra) {
    const audit = AJ.audit.runAudit({ mt: mtList, rj: rjList, cfg: state.cfg });
    audit.usuario = state.user || 'Não identificado';
    audit.arquivos = (extra && extra.arquivos) || mtList.map((r) => ({ sistema: 'MaxTrack', nome: r.arquivo, hash: r.hash })).concat(rjList.map((r) => ({ sistema: 'RasterJor', nome: r.arquivo, hash: r.hash })));
    if (extra && extra.origem) audit.origem = extra.origem;
    // Compara com a auditoria anterior do mesmo período (ocorrências novas/resolvidas)
    const prev = state.index.find((x) => x.periodo && audit.periodo && x.periodo.ini === audit.periodo.ini);
    if (prev) {
      const pa = await AJ.store.get('audits', prev.id);
      if (pa) {
        const old = new Set(pa.ocorrencias.map((o) => o.id));
        const now = new Set(audit.ocorrencias.map((o) => o.id));
        audit.comparativo = {
          anterior: prev.id,
          anteriorEm: prev.criadoEm,
          novas: audit.ocorrencias.filter((o) => !old.has(o.id)).length,
          recorrentes: audit.ocorrencias.filter((o) => old.has(o.id)).length,
          naoMaisPresentes: pa.ocorrencias.filter((o) => !now.has(o.id)).length,
        };
      }
    }
    await saveAudit(audit, { mt: mtList, rj: rjList });
    state.audit = audit;
    await AJ.store.put('settings', 'ultimaAuditoria', audit.id);
    renderHeader();
    updateNavCount();
    return audit;
  }

  // ---------------- cabeçalho / navegação ----------------
  function renderHeader() {
    const sel = document.getElementById('auditSelect');
    sel.innerHTML = state.index.length
      ? state.index.map((x) => `<option value="${x.id}" ${state.audit && state.audit.id === x.id ? 'selected' : ''}>${ui.esc(fmtAuditLabel(x))}</option>`).join('')
      : '<option value="">Nenhuma auditoria salva</option>';
    const info = document.getElementById('auditInfo');
    if (state.audit) {
      const a = state.audit;
      info.textContent = `Auditoria de ${new Date(a.criadoEm).toLocaleString('pt-BR')} · período ${U.fmtDate(a.periodo.ini)} a ${U.fmtDate(a.periodo.fim)} · por ${a.usuario}`;
    } else info.textContent = 'Nenhuma auditoria carregada';
    document.getElementById('userFoot').textContent = state.user ? 'Usuário: ' + state.user : '';
  }

  function fmtAuditLabel(x) {
    return `${U.fmtDate(x.periodo.ini)}–${U.fmtDate(x.periodo.fim)} · ${new Date(x.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
  }

  function go(view, opts) {
    state.view = view;
    document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    document.getElementById('pageTitle').textContent = TITLES[view] || '';
    document.getElementById('sidebar').classList.remove('open');
    const c = document.getElementById('content');
    c.innerHTML = '';
    window.scrollTo(0, 0);
    try {
      AJ.views[view](c, opts || {});
    } catch (e) {
      console.error(e);
      c.innerHTML = `<div class="alert bad">Erro ao montar a tela: ${ui.esc(e.message)}</div>`;
    }
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
  }

  function refresh() {
    go(state.view);
  }

  async function askUser(force) {
    if (state.user && !force) return;
    return new Promise((resolve) => {
      ui.modal(
        `<h3>Identificação do auditor</h3>
         <p class="muted small">O nome é registrado em cada auditoria e em cada alteração de tratativa (rastreabilidade). Fica salvo apenas neste navegador.</p>
         <label class="field">Nome<input type="text" id="userName" value="${ui.esc(state.user)}" placeholder="Ex.: Maria Souza – DP" /></label>
         <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn primary" id="userOk">Salvar</button></div>`,
        (m, close) => {
          const inp = m.querySelector('#userName');
          inp.focus();
          const ok = async () => {
            state.user = inp.value.trim() || 'Não identificado';
            await AJ.store.put('settings', 'user', state.user);
            renderHeader();
            close();
            resolve();
          };
          m.querySelector('#userOk').onclick = ok;
          inp.addEventListener('keydown', (e) => e.key === 'Enter' && ok());
        }
      );
    });
  }

  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  async function init() {
    const ok = await AJ.store.init();
    const cfg = await AJ.store.get('settings', 'cfg');
    if (cfg) {
      // Migração: versões anteriores usavam tolerância de 5/10 min
      if (!cfg.versaoCfg || cfg.versaoCfg < 2) {
        cfg.toleranciaMarcacao = AJ.config.DEFAULTS.toleranciaMarcacao;
        cfg.toleranciaDiaria = AJ.config.DEFAULTS.toleranciaDiaria;
        cfg.versaoCfg = AJ.config.DEFAULTS.versaoCfg;
      }
      state.cfg = AJ.config.merge(AJ.config.DEFAULTS, cfg);
    }
    state.user = (await AJ.store.get('settings', 'user')) || '';
    state.index = (await AJ.store.get('settings', 'auditIndex')) || [];
    const theme = await AJ.store.get('settings', 'theme');
    applyTheme(theme);
    for (const { key, value } of await AJ.store.all('tratativas')) state.trat[key] = value;
    const last = await AJ.store.get('settings', 'ultimaAuditoria');
    if (last && state.index.some((x) => x.id === last)) await loadAudit(last);
    renderHeader();
    updateNavCount();

    document.querySelectorAll('#nav button').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
    document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('auditSelect').onchange = async (e) => {
      if (!e.target.value) return;
      await loadAudit(e.target.value);
      refresh();
    };
    document.getElementById('btnExcel').onclick = () => AJ.exporter.excel(state.view);
    document.getElementById('btnPdf').onclick = () => AJ.exporter.pdf(state.view);
    document.getElementById('btnTheme').onclick = async () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const dark = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = dark ? 'light' : 'dark';
      applyTheme(next);
      await AJ.store.put('settings', 'theme', next);
    };

    const hv = location.hash.replace('#', '');
    go(TITLES[hv] ? hv : state.audit ? 'painel' : 'importar');
    if (!ok) ui.toast('Atenção: armazenamento local indisponível (navegação privada?). O histórico não será salvo ao fechar a página.', 8000);
    if (!state.user) askUser();
  }

  Object.assign(AJ, {
    app: { TRAT_ABERTOS, TRAT_FECHADOS, go, refresh, filteredGrupos, filteredOcorrencias, filteredMotoristas, motMap, tratOf, saveTrat, loadAudit, saveAudit, deleteAudit, executeAudit, renderHeader, askUser, updateNavCount, TITLES },
  });

  document.addEventListener('DOMContentLoaded', init);
})(typeof globalThis !== 'undefined' ? globalThis : this);
