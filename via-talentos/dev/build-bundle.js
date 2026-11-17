/**
 * Gera a versão "copiar e colar" em dist/: apenas Codigo.gs + Index.html.
 * Uso: node dev/build-bundle.js
 */
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'apps-script');
const out = path.join(__dirname, '..', 'dist');
fs.mkdirSync(out, { recursive: true });

const gs = fs.readdirSync(src).filter(f => f.endsWith('.gs')).sort()
  .map(f => `/* ===================== ${f} ===================== */\n` + fs.readFileSync(path.join(src, f), 'utf8'))
  .join('\n\n');
fs.writeFileSync(path.join(out, 'Codigo.gs'),
  '/**\n * VIA TALENTOS — arquivo único gerado a partir de apps-script/ (não editar aqui).\n */\n\n' + gs);

let html = fs.readFileSync(path.join(src, 'Index.html'), 'utf8');
html = html.replace(/<\?!= include\('(\w+)'\); \?>/g, (_, f) => fs.readFileSync(path.join(src, f + '.html'), 'utf8'));
fs.writeFileSync(path.join(out, 'Index.html'), html);
fs.copyFileSync(path.join(src, 'appsscript.json'), path.join(out, 'appsscript.json'));
console.log('dist/Codigo.gs, dist/Index.html e dist/appsscript.json gerados.');
