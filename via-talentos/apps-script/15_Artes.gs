/**
 * FASE 4 — Gerador de Artes: identidade visual (arquivos oficiais no Drive),
 * versões das artes por vaga, aprovação manual e histórico de publicações.
 * A imagem é desenhada no navegador (canvas) com os arquivos oficiais e salva aqui.
 */
var ARTE_STATUS = { PENDENTE: 'Aguardando aprovação', APROVADA: 'Aprovada', REPROVADA: 'Reprovada', PUBLICADA: 'Publicada' };
var ARTE_FORMATOS = {
  PNG: { nome: 'PNG alta qualidade', w: 2160, h: 2700 },
  Instagram: { nome: 'Instagram (feed 4:5)', w: 1080, h: 1350 },
  LinkedIn: { nome: 'LinkedIn (1:1)', w: 1200, h: 1200 },
  WhatsApp: { nome: 'WhatsApp (status 9:16)', w: 1080, h: 1920 },
  PDF: { nome: 'PDF (A4)', w: 1240, h: 1754 }
};
var ARTE_MODELOS = { institucional: 'Institucional (foto da sede)', amarelo: 'Destaque amarelo', compacto: 'Compacto (sem atribuições)' };
var ASSETS = { logo: 'LOGO_DRIVE_ID', foto: 'FOTO_DRIVE_ID', gptw: 'GPTW_DRIVE_ID' };

function pastaConfig_(chave, nome) {
  var id = Db.config(chave);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recria */ } }
  var folder = DriveApp.createFolder(nome);
  if (Db.find('Config', chave)) Db.update('Config', chave, { Valor: folder.getId() });
  else Db.insert('Config', { Chave: chave, Valor: folder.getId() });
  return folder;
}

function setConfig_(chave, valor) {
  if (Db.find('Config', chave)) Db.update('Config', chave, { Valor: valor });
  else Db.insert('Config', { Chave: chave, Valor: valor });
}

function dataUrl_(fileId) {
  if (!fileId) return '';
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) { return ''; }
}

function gptwVigente_() {
  var ate = Util.toIsoDate(Db.config('GPTW_VIGENTE_ATE'));
  return !!Db.config('GPTW_DRIVE_ID') && !!ate && ate >= Util.today();
}

/** Arquivos oficiais (data URL) e textos institucionais para o gerador. */
function getAssetsArte() {
  return {
    logo: dataUrl_(Db.config('LOGO_DRIVE_ID')),
    foto: dataUrl_(Db.config('FOTO_DRIVE_ID')),
    gptw: gptwVigente_() ? dataUrl_(Db.config('GPTW_DRIVE_ID')) : '',
    gptwVigente: gptwVigente_(),
    gptwAte: Db.config('GPTW_VIGENTE_ATE'),
    temGptw: !!Db.config('GPTW_DRIVE_ID'),
    cultura: Db.config('CODIGO_CULTURA'),
    site: Db.config('SITE_CANDIDATURA'),
    beneficiosPadrao: Util.str(Db.config('BENEFICIOS_PADRAO')).split(/;|\n/).map(Util.str).filter(Boolean),
    formatos: ARTE_FORMATOS,
    modelos: ARTE_MODELOS
  };
}

/** Envia logo, foto da sede ou selo GPTW (somente Administrador RH). */
function uploadAsset(tipo, arquivo) {
  Auth.require('Administrador RH');
  if (!ASSETS[tipo]) throw UserError('Tipo de arquivo inválido.');
  if (!arquivo || !arquivo.base64) throw UserError('Selecione o arquivo.');
  if (['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].indexOf(arquivo.tipo) < 0) throw UserError('Envie uma imagem PNG, JPG, WEBP ou SVG.');
  var bytes = Utilities.base64Decode(arquivo.base64);
  if (bytes.length > 10 * 1024 * 1024) throw UserError('Imagem acima de 10 MB.');
  return Db.withLock(function () {
    var nomes = { logo: 'Logotipo oficial', foto: 'Foto da sede', gptw: 'Selo GPTW' };
    var file = pastaConfig_('IDENTIDADE_PASTA_ID', 'Via Talentos — Identidade visual').createFile(Utilities.newBlob(bytes, arquivo.tipo, nomes[tipo] + ' - ' + (arquivo.nome || Util.today())));
    var anterior = Db.config(ASSETS[tipo]);
    setConfig_(ASSETS[tipo], file.getId());
    logHistory_('Config', 'Identidade', anterior, file.getId(), nomes[tipo] + ' atualizado (arquivo anterior mantido no Drive)');
    return getAssetsArte();
  });
}

/** Dados da vaga para preencher a arte + histórico de artes. */
function getDadosArte(vagaId) {
  var vaga = Db.find('Vagas', vagaId);
  if (!vaga) throw UserError('Vaga não encontrada.');
  if (!Auth.canSeeVaga(vaga)) throw UserError('Sem acesso a esta vaga.');
  var un = Db.all('Unidades').filter(function (u) { return Util.norm(u.Nome) === Util.norm(vaga.Unidade); })[0] || {};
  var local = un.Cidade ? un.Cidade + (un.UF ? ' - ' + un.UF : '') : Util.str(vaga.Unidade).replace('/', ' - ');
  return {
    vaga: { ID: vaga.ID, Codigo: vaga.Codigo, Cargo: vaga.Cargo, Empresa: vaga.Empresa, Unidade: vaga.Unidade, Status: vaga.Status, AtualizadoEm: vaga.AtualizadoEm, aprovada: !!vaga.DataAprovacao && vaga.Status !== VT.STATUS_AGUARDANDO_APROVACAO },
    dados: {
      titulo: vaga.Cargo, local: local, atribuicoes: vaga.Atribuicoes, requisitos: vaga.Requisitos,
      beneficios: Util.str(vaga.Beneficios).split(/\n|;/).map(Util.str).filter(Boolean),
      salario: vaga.SalarioACombinar === 'Sim' ? 'A combinar' : vaga.Salario, horario: vaga.Horario,
      contrato: vaga.TipoContrato, modalidade: vaga.Modalidade, site: Db.config('SITE_CANDIDATURA'),
      cultura: Db.config('CODIGO_CULTURA'), codigo: vaga.Codigo
    },
    artes: listArtes(vaga.ID),
    podeEditar: Auth.canEditVaga(vaga)
  };
}

function listArtes(vagaId) {
  var vagas = {}, ultimaEdicao = {};
  Db.all('Vagas').forEach(function (v) { vagas[v.ID] = v; });
  Db.all('Historico').forEach(function (h) {
    if (h.Tipo === 'Vaga' && /^Edição:/.test(h.Nota || '') && (!ultimaEdicao[h.ReferenciaID] || h.DataHora > ultimaEdicao[h.ReferenciaID])) ultimaEdicao[h.ReferenciaID] = h.DataHora;
  });
  return Db.all('Artes').filter(function (a) {
    var v = vagas[a.VagaID];
    return v && Auth.canSeeVaga(v) && (!vagaId || a.VagaID === vagaId);
  }).map(function (a) {
    var o = clean_(a), v = vagas[a.VagaID];
    delete o.Dados;
    o.vagaCodigo = v.Codigo; o.vagaCargo = v.Cargo;
    o.desatualizada = !!ultimaEdicao[a.VagaID] && ultimaEdicao[a.VagaID] > a.CriadoEm && a.Status !== ARTE_STATUS.REPROVADA;
    return o;
  }).sort(function (a, b) { return b.CriadoEm.localeCompare(a.CriadoEm); });
}

/** Salva uma versão gerada no navegador (PNG ou PDF em base64). */
function saveArte(input) {
  return Db.withLock(function () {
    var vaga = Db.find('Vagas', input.vagaId);
    if (!vaga) throw UserError('Vaga não encontrada.');
    Auth.require('Administrador RH', 'Analista RH');
    if (!Auth.canEditVaga(vaga)) throw UserError('Você só pode gerar artes das vagas sob sua responsabilidade.');
    if (!vaga.DataAprovacao || vaga.Status === VT.STATUS_AGUARDANDO_APROVACAO) throw UserError('A arte só pode ser gerada para vagas aprovadas.');
    if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0) throw UserError('A vaga está ' + vaga.Status.toLowerCase() + '.');
    var fmt = ARTE_FORMATOS[input.formato];
    if (!fmt) throw UserError('Formato inválido.');
    if (!ARTE_MODELOS[input.modelo]) throw UserError('Modelo inválido.');
    var mime = input.formato === 'PDF' ? 'application/pdf' : 'image/png';
    var bytes = Utilities.base64Decode(Util.str(input.base64));
    if (bytes.length < 100) throw UserError('Arquivo da arte inválido.');
    if (bytes.length > 25 * 1024 * 1024) throw UserError('Arquivo acima de 25 MB.');
    var versao = Db.all('Artes').filter(function (a) { return a.VagaID === vaga.ID && a.Formato === input.formato; }).length + 1;
    var nome = (vaga.Codigo || vaga.ID) + ' - ' + vaga.Cargo + ' - ' + input.formato + ' v' + versao + (mime === 'application/pdf' ? '.pdf' : '.png');
    var file = pastaConfig_('ARTES_PASTA_ID', 'Via Talentos — Artes de vagas').createFile(Utilities.newBlob(bytes, mime, nome));
    var arte = {
      ID: Util.id('ART'), VagaID: vaga.ID, Modelo: input.modelo, Formato: input.formato, ArquivoId: file.getId(), Versao: String(versao),
      Status: ARTE_STATUS.PENDENTE, AprovadoPor: '', CriadoEm: Util.now(), CriadoPor: Auth.email(), AprovadoEm: '', PublicadoEm: '', Canal: '',
      Dados: JSON.stringify(input.dados || {}).substr(0, 45000), Largura: String(fmt.w), Altura: String(fmt.h), Observacao: ''
    };
    Db.insert('Artes', arte);
    logHistory_('Vaga', vaga.ID, '', '', 'Arte gerada: ' + input.formato + ' v' + versao + ' (' + ARTE_MODELOS[input.modelo] + ') — aguardando aprovação');
    return { id: arte.ID, versao: versao, artes: listArtes(vaga.ID) };
  });
}

/** Arquivo da arte. finalidade 'divulgar' exige arte aprovada. */
function getArteArquivo(id, finalidade) {
  var a = Db.find('Artes', id);
  if (!a) throw UserError('Arte não encontrada.');
  var vaga = Db.find('Vagas', a.VagaID);
  if (!vaga || !Auth.canSeeVaga(vaga)) throw UserError('Sem acesso a esta arte.');
  if (finalidade === 'divulgar' && a.Status !== ARTE_STATUS.APROVADA && a.Status !== ARTE_STATUS.PUBLICADA) {
    throw UserError('A arte precisa ser aprovada antes da divulgação.');
  }
  var blob = DriveApp.getFileById(a.ArquivoId).getBlob();
  return { nome: blob.getName(), tipo: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()), status: a.Status };
}

function getArteDados(id) {
  var a = Db.find('Artes', id);
  if (!a) throw UserError('Arte não encontrada.');
  var vaga = Db.find('Vagas', a.VagaID);
  if (!vaga || !Auth.canSeeVaga(vaga)) throw UserError('Sem acesso a esta arte.');
  var d = {};
  try { d = JSON.parse(a.Dados || '{}'); } catch (e) { d = {}; }
  return { modelo: a.Modelo, formato: a.Formato, dados: d, vagaId: a.VagaID };
}

/** Aprovação manual (Administrador RH ou Direção). */
function aprovarArte(id, aprovar, observacao) {
  Auth.require('Administrador RH', 'Direção');
  return Db.withLock(function () {
    var a = Db.find('Artes', id);
    if (!a) throw UserError('Arte não encontrada.');
    if (a.Status !== ARTE_STATUS.PENDENTE) throw UserError('Esta arte já foi ' + a.Status.toLowerCase() + '.');
    if (!aprovar && !Util.str(observacao)) throw UserError('Informe o motivo da reprovação.');
    var novo = aprovar ? ARTE_STATUS.APROVADA : ARTE_STATUS.REPROVADA;
    Db.update('Artes', a.ID, { Status: novo, AprovadoPor: Auth.email(), AprovadoEm: Util.now(), Observacao: Util.str(observacao) });
    logHistory_('Vaga', a.VagaID, a.Status, 'Arte ' + novo.toLowerCase(), a.Formato + ' v' + a.Versao + (observacao ? ' — ' + observacao : ''));
    return listArtes(a.VagaID);
  });
}

/** Registra a publicação (canal e data). */
function publicarArte(id, canal) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var a = Db.find('Artes', id);
    if (!a) throw UserError('Arte não encontrada.');
    if (a.Status !== ARTE_STATUS.APROVADA && a.Status !== ARTE_STATUS.PUBLICADA) throw UserError('Somente artes aprovadas podem ser publicadas.');
    if (!Util.str(canal)) throw UserError('Informe o canal de divulgação.');
    var canais = Util.str(a.Canal) ? a.Canal + '; ' + canal : canal;
    Db.update('Artes', a.ID, { Status: ARTE_STATUS.PUBLICADA, PublicadoEm: a.PublicadoEm || Util.now(), Canal: canais });
    logHistory_('Vaga', a.VagaID, '', 'Arte publicada', a.Formato + ' v' + a.Versao + ' em ' + canal);
    var vaga = Db.find('Vagas', a.VagaID);
    if (vaga.Status === 'Aprovada / aguardando divulgação') {
      Db.update('Vagas', vaga.ID, { Status: 'Aberta / recebendo candidaturas', AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() });
      logHistory_('Vaga', vaga.ID, vaga.Status, 'Aberta / recebendo candidaturas', 'Divulgação registrada (' + canal + ')');
    }
    return listArtes(a.VagaID);
  });
}
