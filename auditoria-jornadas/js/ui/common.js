/* Componentes de interface reutilizáveis. */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const U = AJ.util;

  const esc = (v) =>
    String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const STATUS = {
    conciliado: { cls: 'ok', label: 'Conciliado', ico: '✓' },
    conferencia: { cls: 'warn', label: 'Necessita conferência', ico: '!' },
    divergente: { cls: 'bad', label: 'Divergente / inconforme', ico: '✕' },
    nao_validado: { cls: 'nv', label: 'Não validado', ico: '?' },
  };

  function badge(status, text) {
    const s = STATUS[status] || STATUS.nao_validado;
    return `<span class="badge ${s.cls}" title="${esc(s.label)}"><span class="dot"></span>${esc(text || s.label)}</span>`;
  }

  const TRAT_STATUS = ['Pendente de análise', 'Em análise', 'Aguardando correção', 'Corrigido', 'Justificado', 'Encerrado'];
  const TRAT_CLS = { 'Pendente de análise': 'bad', 'Em análise': 'warn', 'Aguardando correção': 'warn', Corrigido: 'ok', Justificado: 'ok', Encerrado: 'nv' };
  function tratBadge(st) {
    return `<span class="badge ${TRAT_CLS[st] || 'plain'}"><span class="dot"></span>${esc(st)}</span>`;
  }

  function chk(v, label) {
    if (v === 'ok') return `<span class="chk ok" title="${esc(label)}: conforme">✓</span>`;
    if (v === 'falha') return `<span class="chk falha" title="${esc(label)}: inconformidade">✕</span>`;
    return `<span class="chk nv" title="${esc(label)}: não foi possível validar">?</span>`;
  }

  const dur = (m, o) => U.fmtDur(m, o);
  const diffCell = (m) => {
    if (m === null || m === undefined || Math.abs(m) < 1) return `<td class="num">${m === null || m === undefined ? '—' : '0'}</td>`;
    return `<td class="num ${m > 0 ? 'pos' : 'neg'}">${dur(m, { sign: true })}</td>`;
  };
  const pct = (v) => (v === null || v === undefined ? '—' : (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%');
  const money = (v) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR'));

  // ---------------- Tabela com ordenação e paginação ----------------
  const tableState = {};
  function table(container, opts) {
    const id = opts.id;
    const st = (tableState[id] = tableState[id] || { sort: opts.defaultSort || null, asc: opts.defaultAsc !== false, page: 0 });
    if (opts.resetPage) st.page = 0;
    const size = opts.pageSize || 100;
    let rows = opts.rows.slice();
    if (st.sort) {
      const col = opts.columns.find((c) => c.key === st.sort);
      if (col) {
        const val = col.sort || ((r) => r[col.key]);
        rows.sort((a, b) => {
          const x = val(a);
          const y = val(b);
          if (x === y) return 0;
          if (x === null || x === undefined || x === '') return 1;
          if (y === null || y === undefined || y === '') return -1;
          return (x < y ? -1 : 1) * (st.asc ? 1 : -1);
        });
      }
    }
    const pages = Math.max(1, Math.ceil(rows.length / size));
    if (st.page >= pages) st.page = pages - 1;
    const pageRows = rows.slice(st.page * size, st.page * size + size);
    const head = opts.columns
      .map((c) => `<th data-k="${c.key}" class="${c.num ? 'num' : ''} ${st.sort === c.key ? 'sorted' + (st.asc ? ' asc' : '') : ''}" ${c.title ? `title="${esc(c.title)}"` : ''}>${esc(c.label)}</th>`)
      .join('');
    const body = pageRows
      .map((r, i) => {
        const tds = opts.columns
          .map((c) => {
            if (c.cell) return c.cell(r);
            const v = c.render ? c.render(r) : esc(r[c.key]);
            return `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${v}</td>`;
          })
          .join('');
        return `<tr data-i="${i}" class="${opts.onRowClick ? 'clickable' : ''}">${tds}</tr>`;
      })
      .join('');
    container.innerHTML = `
      <div class="table-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${opts.columns.length}" class="empty">Nenhum registro para os filtros selecionados.</td></tr>`}</tbody></table></div>
      <div class="table-foot"><span>${num(rows.length)} registro(s)${opts.footNote ? ' · ' + opts.footNote : ''}</span>
        <span class="pager">${pages > 1 ? `<button class="btn" data-pg="prev" ${st.page === 0 ? 'disabled' : ''}>‹</button> Página ${st.page + 1} de ${pages} <button class="btn" data-pg="next" ${st.page >= pages - 1 ? 'disabled' : ''}>›</button>` : ''}</span></div>`;
    container.querySelectorAll('th').forEach((th) =>
      th.addEventListener('click', () => {
        const k = th.dataset.k;
        if (st.sort === k) st.asc = !st.asc;
        else {
          st.sort = k;
          st.asc = true;
        }
        table(container, Object.assign({}, opts, { resetPage: false }));
      })
    );
    container.querySelectorAll('[data-pg]').forEach((b) =>
      b.addEventListener('click', () => {
        st.page += b.dataset.pg === 'next' ? 1 : -1;
        table(container, Object.assign({}, opts, { resetPage: false }));
      })
    );
    if (opts.onRowClick) {
      container.querySelectorAll('tbody tr[data-i]').forEach((tr) =>
        tr.addEventListener('click', (ev) => {
          if (ev.target.closest('input,select,button,textarea,a')) return;
          opts.onRowClick(pageRows[+tr.dataset.i]);
        })
      );
    }
    if (opts.after) opts.after(container, pageRows);
    return rows;
  }

  // ---------------- Tooltip ----------------
  function bindTooltips(scope) {
    const tip = document.getElementById('tooltip');
    scope.querySelectorAll('[data-tip]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        tip.innerHTML = el.dataset.tip;
        tip.classList.remove('hidden');
      });
      el.addEventListener('mousemove', (e) => {
        const w = tip.offsetWidth;
        const x = Math.min(e.clientX + 14, window.innerWidth - w - 8);
        tip.style.left = x + 'px';
        tip.style.top = e.clientY + 14 + 'px';
      });
      el.addEventListener('mouseleave', () => tip.classList.add('hidden'));
    });
  }

  // ---------------- Toast / modal / drawer ----------------
  let toastTimer = null;
  function toast(msg, ms) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), ms || 3500);
  }

  function drawer(html, onMount) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="drawer" role="dialog" aria-modal="true">${html}</div>`;
    const close = () => {
      ov.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => e.key === 'Escape' && close();
    ov.addEventListener('click', (e) => e.target === ov && close());
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    if (onMount) onMount(ov.querySelector('.drawer'), close);
    return close;
  }

  function modal(html, onMount) {
    const ov = document.createElement('div');
    ov.className = 'overlay center';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    const close = () => ov.remove();
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    if (onMount) onMount(ov.querySelector('.modal'), close);
    return close;
  }

  function confirmDlg(msg) {
    return new Promise((resolve) => {
      modal(`<h3>Confirmação</h3><p>${esc(msg)}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" data-no>Cancelar</button><button class="btn primary" data-yes>Confirmar</button></div>`, (m, close) => {
        m.querySelector('[data-no]').onclick = () => (close(), resolve(false));
        m.querySelector('[data-yes]').onclick = () => (close(), resolve(true));
      });
    });
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  AJ.ui = { esc, STATUS, badge, TRAT_STATUS, tratBadge, chk, dur, diffCell, pct, money, num, table, tableState, bindTooltips, toast, drawer, modal, confirmDlg, download };
})(typeof globalThis !== 'undefined' ? globalThis : this);
