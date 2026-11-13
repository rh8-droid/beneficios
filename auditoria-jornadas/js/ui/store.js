/*
 * Persistência local (IndexedDB) — histórico de auditorias, entradas
 * processadas (para reprocessar com novos parâmetros), tratativas das
 * ocorrências e configurações. Se o IndexedDB não estiver disponível
 * (ex.: navegação privada), funciona em memória e avisa o usuário.
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  const DB_NAME = 'auditoria-jornadas';
  const DB_VER = 1;
  const STORES = ['audits', 'inputs', 'tratativas', 'settings'];
  let db = null;
  const mem = { audits: new Map(), inputs: new Map(), tratativas: new Map(), settings: new Map() };

  function open() {
    return new Promise((resolve) => {
      if (!root.indexedDB) return resolve(false);
      let req;
      try {
        req = root.indexedDB.open(DB_NAME, DB_VER);
      } catch (e) {
        return resolve(false);
      }
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
      };
      req.onsuccess = () => {
        db = req.result;
        resolve(true);
      };
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);
    });
  }

  function tx(store, mode, fn) {
    if (!db) return Promise.resolve(fn(null));
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => (result = r.result);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  const api = {
    persistent: false,
    async init() {
      api.persistent = await open();
      return api.persistent;
    },
    async get(store, key) {
      if (!db) return mem[store].get(key);
      return tx(store, 'readonly', (s) => s.get(key));
    },
    async put(store, key, value) {
      if (!db) return mem[store].set(key, value);
      return tx(store, 'readwrite', (s) => s.put(value, key));
    },
    async del(store, key) {
      if (!db) return mem[store].delete(key);
      return tx(store, 'readwrite', (s) => s.delete(key));
    },
    async all(store) {
      if (!db) return [...mem[store].entries()].map(([k, v]) => ({ key: k, value: v }));
      const keys = await tx(store, 'readonly', (s) => s.getAllKeys());
      const vals = await tx(store, 'readonly', (s) => s.getAll());
      return (keys || []).map((k, i) => ({ key: k, value: vals[i] }));
    },
    async clear(store) {
      if (!db) return mem[store].clear();
      return tx(store, 'readwrite', (s) => s.clear());
    },
    /** Backup completo (JSON) – auditorias, tratativas e configurações. */
    async exportBackup() {
      const out = { app: 'auditoria-jornadas', versao: AJ.VERSION, exportadoEm: new Date().toISOString() };
      for (const s of ['audits', 'tratativas', 'settings']) out[s] = await api.all(s);
      return out;
    },
    async importBackup(data) {
      if (!data || data.app !== 'auditoria-jornadas') throw new Error('Arquivo de backup inválido.');
      let n = 0;
      for (const s of ['audits', 'tratativas', 'settings']) {
        for (const { key, value } of data[s] || []) {
          if (s === 'tratativas') {
            // Mescla históricos para não perder tratativas locais
            const cur = await api.get(s, key);
            if (cur && cur.historico && value.historico) {
              const ids = new Set(cur.historico.map((h) => h.em + h.campo));
              value.historico = cur.historico.concat(value.historico.filter((h) => !ids.has(h.em + h.campo))).sort((a, b) => (a.em < b.em ? -1 : 1));
              if (cur.atualizadoEm > value.atualizadoEm) Object.assign(value, cur, { historico: value.historico });
            }
          }
          await api.put(s, key, value);
          n++;
        }
      }
      return n;
    },
  };

  AJ.store = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
