/* Tela: conciliação de diárias. */
(function (root) {
  'use strict';
  const AJ = root.AJ;
  const U = AJ.util;
  const ui = AJ.ui;
  const esc = ui.esc;
  const V = AJ.views;
  const S = () => AJ.state;

  const RES_CLS = { OK: 'ok', SO_RJ: 'warn', CONTINUACAO: 'warn', SEM_JORNADA: 'bad', NAO_GERADA: 'bad' };
  const RES_CRIT = { SEM_JORNADA: 'Crítica', NAO_GERADA: 'Crítica', SO_RJ: 'Média', CONTINUACAO: 'Média' };

  function filteredDiarias(resFiltro) {
    const a = S().audit;
    if (!a || !a.diarias) return [];
    const f = S().filters;
    const mm = AJ.app.motMap();
    const ign = new Set((S().cfg.ignorarCpfs || []).map(U.normCpf));
    return a.diarias.linhas.filter((l) => {
      const m = mm[l.motorista] || {};
      if (ign.has(l.cpf)) return false;
      if (f.ini && l.date < f.ini) return false;
      if (f.fim && l.date > f.fim) return false;
      if (f.empresa && l.empresa !== f.empresa) return false;
      if (f.matricula && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaMT) && U.normMatricula(f.matricula) !== U.normMatricula(m.matriculaRJ)) return false;
      if (f.q) {
        const q = U.normName(f.q);
        const d = U.onlyDigits(f.q);
        if (!((q && U.normName(l.nome).includes(q)) || (d.length >= 3 && String(l.cpf).includes(d)))) return false;
      }
      if (f.gravidade === 'SEM_AJUSTE' && l.resultado !== 'OK') return false;
      if (f.gravidade && f.gravidade !== 'SEM_AJUSTE' && RES_CRIT[l.resultado] !== f.gravidade) return false;
      if (resFiltro && l.resultado !== resFiltro) return false;
      return true;
    });
  }
  V.filteredDiarias = filteredDiarias;

  let resFiltro = '';
  V.diarias = function (c) {
    const a = S().audit;
    if (!a) return V.painel(c);
    if (!a.diarias) {
      c.innerHTML = '<div class="alert warn">Esta auditoria foi executada antes da conciliação de diárias. Vá em <b>Histórico de auditorias</b> e clique em <b>Reprocessar</b> para gerar as diárias.</div>';
      return;
    }
    V.filterBar(c, ['periodo', 'q', 'matricula', 'empresa', 'gravidade', 'semAjuste'], () => draw(true));
    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:18px';
    c.appendChild(body);
    draw();

    function draw(reset) {
      const all = filteredDiarias('');
      const r = AJ.diarias.resumo(all);
      const cfg = S().cfg;
      const vd = Number(cfg.valorDiaria) || 0;
      const soma = (res) => all.filter((l) => l.resultado === res).reduce((acc, l) => acc + AJ.diarias.valor(l, cfg), 0);
      const tile = (res, label, v, sub, cls) => `<div class="kpi ${cls} clickable ${resFiltro === res ? 'sel' : ''}" data-res="${res}" style="${resFiltro === res ? 'outline:2px solid var(--brand-2)' : ''}"><div class="k-label">${label}</div><div class="k-value">${ui.num(v)}</div><div class="k-sub">${sub}</div></div>`;
      body.innerHTML = `
        <div class="alert info">Compara a coluna <b>Diária</b> do RasterJor com os dias em que o motorista teve jornada no MaxTrack. <b>Indevida</b>: diária em dia sem jornada em nenhum sistema. <b>Não gerada</b>: dia com jornada sem diária. Diárias em dias de viagem que passam da meia-noite ficam para conferência. O RasterJor não informa a regra de inteira × meia; confira o tipo na tabela.</div>
        <div class="kpis">
          ${tile('', 'Diárias geradas (RasterJor)', r.geradas, `${ui.num(r.inteiras)} inteiras · ${ui.num(r.meias)} meias`, 'info')}
          ${tile('OK', 'Corretas', r.ok, 'diária em dia com jornada', 'ok')}
          ${tile('SEM_JORNADA', 'Indevidas – dia sem jornada', r.semJornada, vd ? 'simulação ' + ui.money(soma('SEM_JORNADA')) : 'possível pagamento indevido', 'bad')}
          ${tile('NAO_GERADA', 'Não geradas – dia com jornada', r.naoGeradas, (vd ? 'simulação ' + ui.money(soma('NAO_GERADA')) + ' · ' : '') + `${ui.num(all.filter((l) => l.resultado === 'NAO_GERADA' && !l.motoristaNoRJ).length)} de motoristas sem cadastro no RasterJor`, 'bad')}
          ${tile('CONTINUACAO', 'Para conferência – viagem/continuação', r.continuacao, 'jornada do dia anterior atravessa o dia', 'warn')}
          ${r.soRJ ? tile('SO_RJ', 'Jornada só no RasterJor', r.soRJ, 'confirmar jornada antes de pagar', 'warn') : ''}
        </div>
        <div class="card"><div class="card-head"><div><h3>Diárias por motorista e dia${resFiltro ? ' – ' + esc(AJ.diarias.RESULT[resFiltro]) : ''}</h3><p>Clique nos indicadores acima para filtrar. Clique na linha para ver a jornada.</p></div>${resFiltro ? '<button class="btn" id="clrRes">Mostrar todas</button>' : ''}</div><div id="tbl"></div></div>`;
      body.querySelectorAll('[data-res]').forEach((el) =>
        el.addEventListener('click', () => {
          resFiltro = el.dataset.res;
          draw(true);
        })
      );
      if (body.querySelector('#clrRes'))
        body.querySelector('#clrRes').onclick = () => {
          resFiltro = '';
          draw(true);
        };
      const rows = resFiltro ? all.filter((l) => l.resultado === resFiltro) : all;
      S().lastRows = { view: 'diarias', rows };
      ui.table(body.querySelector('#tbl'), {
        id: 'diarias',
        rows,
        resetPage: reset,
        defaultSort: 'crit',
        columns: [
          { key: 'crit', label: 'Criticidade', sort: (l) => -(AJ.config.GRAV_ORDEM[RES_CRIT[l.resultado]] || 0), render: (l) => (RES_CRIT[l.resultado] ? `<span class="sev ${RES_CRIT[l.resultado]}">${RES_CRIT[l.resultado]}</span>` : '<span class="small muted">—</span>') },
          { key: 'resultado', label: 'Resultado', render: (l) => `<span class="badge ${RES_CLS[l.resultado]}"><span class="dot"></span>${esc(AJ.diarias.RESULT[l.resultado])}</span>` },
          { key: 'nome', label: 'Motorista', render: (l) => `<b>${esc(l.nome)}</b><div class="small muted">${esc(l.matricula || '')}</div>` },
          { key: 'date', label: 'Data', render: (l) => U.fmtDate(l.date, true) + (l.rotuloDia ? `<div class="small muted">${esc(l.rotuloDia.split(':')[0])}</div>` : ''), cls: 'nowrap' },
          { key: 'diaria', label: 'Diária (RasterJor)', render: (l) => (l.diaria ? `<b>${esc(l.diaria)}</b>` : '<span class="muted">não gerada</span>') },
          { key: 'jornadaMT', label: 'Jornada MaxTrack', render: (l) => esc(l.jornadaMT || '—'), cls: 'mono' },
          { key: 'jornadaRJ', label: 'Jornada RasterJor', render: (l) => esc(l.jornadaRJ || '—'), cls: 'mono' },
          { key: 'trabalhoMT', label: 'Trab. MT', num: true, render: (l) => U.fmtDur(l.trabalhoMT) },
          { key: 'obs', label: 'Observação', cls: 'wrap', render: (l) => `<span class="small">${!l.motoristaNoRJ ? 'Motorista não encontrado no RasterJor' : l.resultado === 'NAO_GERADA' && !l.linhaNoRJ ? 'Dia ausente no espelho do RasterJor' : ''}</span>` },
        ],
        onRowClick: (l) => (l.grupo ? V.grupoDetail(l.grupo) : V.motoristaDetail(l.motorista)),
      });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
