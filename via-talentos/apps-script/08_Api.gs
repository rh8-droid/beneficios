/**
 * Ponto de entrada do Web App e roteador único das chamadas do navegador.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Via Talentos — Recrutamento e Seleção')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

var API_ROUTES = {
  bootstrap: function () { return bootstrap_(); },
  dashboard: function (p) { return getDashboard(p); },
  listVagas: function (p) { return listVagas(p); },
  getVaga: function (p) { return getVaga(p.id); },
  saveVaga: function (p) { return saveVaga(p); },
  changeVagaStatus: function (p) { return changeVagaStatus(p.id, p.status, p); },
  fillPosition: function (p) { return fillPosition(p.id, p); },
  reopenPosition: function (p) { return reopenPosition(p.id, p.justificativa); },
  cancelPosition: function (p) { return cancelPosition(p.id, p.justificativa); },
  addSlaException: function (p) { return addSlaException(p.id, p.dias, p.justificativa); },
  lookups: function () { return getLookups(); },
  listCadastro: function (p) { return listCadastro(p.tabela); },
  saveCadastro: function (p) { return saveCadastro(p.tabela, p.registro); },
  deleteCadastro: function (p) { return deleteCadastro(p.tabela, p.key); }
};

/** Chamado pelo navegador: google.script.run.api(acao, dados). */
function api(action, payload) {
  try {
    Auth.reset();
    var route = API_ROUTES[action];
    if (!route) throw UserError('Ação desconhecida: ' + action);
    Auth.user(); // exige usuário ativo para qualquer ação
    // Ida e volta em JSON garante objetos simples para o google.script.run
    return JSON.stringify({ ok: true, data: route(payload || {}) });
  } catch (e) {
    if (!e.userError) console.error(action, e && e.stack ? e.stack : e);
    return JSON.stringify({ ok: false, error: e.userError ? e.message : 'Erro inesperado: ' + (e && e.message ? e.message : e) });
  }
}

function bootstrap_() {
  return {
    usuario: Auth.user(),
    lookups: getLookups(),
    marca: branding_()
  };
}

/** Logo e foto institucional armazenados no Drive (Config: LOGO_DRIVE_ID / FOTO_DRIVE_ID). */
function branding_() {
  var cache = CacheService.getScriptCache();
  var out = {};
  ['LOGO_DRIVE_ID', 'FOTO_DRIVE_ID'].forEach(function (key) {
    var id = Db.config(key);
    if (!id) return;
    var cacheKey = 'img:' + id;
    var hit = cache.get(cacheKey);
    if (hit) { out[key] = hit; return; }
    try {
      var blob = DriveApp.getFileById(id).getBlob();
      var url = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
      if (url.length < 95000) cache.put(cacheKey, url, 21600);
      out[key] = url;
    } catch (e) {
      console.warn('Imagem ' + key + ' indisponível: ' + e.message);
    }
  });
  return out;
}
