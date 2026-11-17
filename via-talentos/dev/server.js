/**
 * Servidor de demonstração local do Via Talentos.
 * Executa o back-end REAL (arquivos .gs) sobre uma planilha em memória.
 * Uso:  node server.js [--demo] [--port 8080] [--user email]
 *   --demo  carrega dados de exemplo (somente para testes locais; nunca em produção)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createBackend } = require('../tests/fake-gas');

const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 8080;
const user = args.includes('--user') ? args[args.indexOf('--user') + 1] : 'admin@viadupla.com';
const backend = createBackend({ email: 'admin@viadupla.com' });
backend.run('setup');
if (args.includes('--demo')) require('./seed-demo')(backend);
backend.state.now = null;
backend.setUser(user);

const SRC = path.join(__dirname, '..', 'apps-script');
function render() {
  let html = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
  html = html.replace(/<\?!= include\('(\w+)'\); \?>/g, (_, f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8'));
  html = html.replace('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', '/chart.js');
  html = html.replace('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', '/xlsx.js');
  html = html.replace('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', '/jspdf.js');
  const shim = `<script>
  window.google = { script: { get run() {
    const h = { ok: null, fail: null };
    const api = {
      withSuccessHandler(f) { h.ok = f; return api; },
      withFailureHandler(f) { h.fail = f; return api; },
      api(action, payload) {
        fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) })
          .then(r => r.text()).then(t => h.ok && h.ok(t)).catch(e => h.fail && h.fail(e));
      }
    };
    return api;
  } } };
  </script>`;
  return html.replace('<head>', '<head>' + shim);
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const { action, payload } = JSON.parse(body || '{}');
      backend.ctx.Db.reset();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(backend.ctx.api(action, payload));
    });
    return;
  }
  if (req.url === '/jspdf.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    return fs.createReadStream(path.join(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js')).pipe(res);
  }
  if (req.url === '/xlsx.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    return fs.createReadStream(path.join(__dirname, 'node_modules/xlsx/dist/xlsx.full.min.js')).pipe(res);
  }
  if (req.url === '/chart.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    return fs.createReadStream(path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.js')).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(render());
}).listen(port, () => console.log(`Via Talentos (dev) em http://localhost:${port} — usuário ${user}`));
