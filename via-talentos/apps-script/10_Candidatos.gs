/**
 * FASE 2 — Base centralizada de candidatos (sem duplicidade), currículos e LGPD.
 */

var CAMPOS_CANDIDATO = ['Nome', 'CPF', 'Email', 'Telefone', 'Cidade', 'UF', 'CargoInteresse', 'Origem',
  'Formacao', 'Experiencia', 'Pretensao', 'Disponibilidade', 'Analista', 'ConsentimentoLGPD'];

function digits_(v) { return Util.str(v).replace(/\D/g, ''); }
function phoneKey_(v) { var d = digits_(v); if (d.length > 11 && d.indexOf('55') === 0) d = d.substr(2); return d.length >= 10 ? d.slice(-10) : ''; }

function cpfValido_(cpf) {
  var c = digits_(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (var t = 9; t < 11; t++) {
    var sum = 0;
    for (var i = 0; i < t; i++) sum += +c.charAt(i) * (t + 1 - i);
    var dv = (sum * 10) % 11 % 10;
    if (dv !== +c.charAt(t)) return false;
  }
  return true;
}

/** Procura candidato já cadastrado por CPF, e-mail ou telefone. */
function findDuplicateCandidato_(c, ignoreId) {
  var cpf = digits_(c.CPF), email = Util.str(c.Email).toLowerCase(), tel = phoneKey_(c.Telefone);
  var list = Db.all('Candidatos');
  for (var i = 0; i < list.length; i++) {
    var x = list[i];
    if (x.ID === ignoreId || x.Anonimizado === 'Sim') continue;
    if (cpf && digits_(x.CPF) === cpf) return { candidato: x, campo: 'CPF' };
    if (email && Util.str(x.Email).toLowerCase() === email) return { candidato: x, campo: 'e-mail' };
    if (tel && phoneKey_(x.Telefone) === tel) return { candidato: x, campo: 'telefone' };
  }
  return null;
}

function proximoCodigoCandidato_() {
  var max = 0;
  Db.all('Candidatos').forEach(function (c) { var m = /^CAN-(\d+)$/.exec(c.Codigo || ''); if (m) max = Math.max(max, +m[1]); });
  return 'CAN-' + ('00000' + (max + 1)).slice(-6);
}

function validarCandidato_(c) {
  var erros = [];
  if (!Util.str(c.Nome) || Util.str(c.Nome).split(/\s+/).length < 2) erros.push('Informe o nome completo.');
  if (!c.Email && !c.Telefone) erros.push('Informe e-mail ou telefone para contato.');
  if (c.Email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.Email)) erros.push('E-mail inválido.');
  if (c.Telefone && digits_(c.Telefone).length < 10) erros.push('Telefone deve ter DDD + número.');
  if (c.CPF && !cpfValido_(c.CPF)) erros.push('CPF inválido.');
  if (c.UF && !/^[A-Z]{2}$/.test(c.UF)) erros.push('UF deve ter 2 letras.');
  if (c.Origem && VT.ORIGENS_CANDIDATURA.indexOf(c.Origem) < 0) erros.push('Origem inválida.');
  if (erros.length) throw UserError(erros.join('\n'));
}

/** Gestor só vê candidatos encaminhados às suas vagas; demais perfis veem a base toda. */
function candidaturasVisiveis_() {
  var u = Auth.user();
  var cands = Db.all('Candidaturas');
  if (u.perfil !== 'Gestor') return cands;
  var vagas = {};
  Db.all('Vagas').forEach(function (v) { if (Auth.canSeeVaga(v)) vagas[v.ID] = true; });
  var idxGestor = VT.ETAPAS_KANBAN.indexOf('Entrevista gestor');
  var maxMap = maxEtapaMap_();
  var comEntrevista = {};
  Db.all('Entrevistas').forEach(function (e) { if (e.Tipo === 'Gestor') comEntrevista[e.CandidaturaID] = true; });
  return cands.filter(function (c) {
    return vagas[c.VagaID] && (maxMap[c.ID] >= idxGestor || comEntrevista[c.ID]);
  });
}

function canSeeCandidato_(id) {
  if (!Auth.is('Gestor')) return true;
  return candidaturasVisiveis_().some(function (c) { return c.CandidatoID === id; });
}

function podeVerRestrito_() { return Auth.is('Administrador RH', 'Analista RH'); }

function publicCandidato_(c) {
  var out = clean_(c);
  if (!podeVerRestrito_()) { delete out.CPF; delete out.Pretensao; }
  out.temCurriculo = !!c.CurriculoId;
  delete out.CurriculoUrl;
  return out;
}

function listCandidatos(f) {
  f = f || {};
  var q = Util.norm(f.busca), qd = digits_(f.busca);
  var vagas = {};
  Db.all('Vagas').forEach(function (v) { vagas[v.ID] = v; });
  var porCand = {};
  candidaturasVisiveis_().forEach(function (c) { (porCand[c.CandidatoID] = porCand[c.CandidatoID] || []).push(c); });
  var gestor = Auth.is('Gestor');
  return Db.all('Candidatos').filter(function (c) {
    if (gestor && !porCand[c.ID]) return false;
    if (q) {
      var hay = Util.norm([c.Codigo, c.Nome, c.Email, c.CargoInteresse, c.Cidade].join(' '));
      if (hay.indexOf(q) < 0 && !(qd.length >= 4 && (digits_(c.CPF).indexOf(qd) >= 0 || digits_(c.Telefone).indexOf(qd) >= 0))) return false;
    }
    if (f.Origem && c.Origem !== f.Origem) return false;
    if (f.CargoInteresse && Util.norm(c.CargoInteresse) !== Util.norm(f.CargoInteresse)) return false;
    return true;
  }).map(function (c) {
    var out = publicCandidato_(c);
    var proc = (porCand[c.ID] || []).sort(function (a, b) { return (b.DataCandidatura || '').localeCompare(a.DataCandidatura || ''); });
    out.processos = proc.length;
    out.ultimoProcesso = proc[0] ? { Etapa: proc[0].Etapa, Status: proc[0].Status, Vaga: (vagas[proc[0].VagaID] || {}).Cargo, Codigo: (vagas[proc[0].VagaID] || {}).Codigo } : null;
    return out;
  }).sort(function (a, b) { return (b.CriadoEm || '').localeCompare(a.CriadoEm || ''); });
}

function getCandidato(id) {
  var c = Db.find('Candidatos', id);
  if (!c) throw UserError('Candidato não encontrado.');
  if (!canSeeCandidato_(c.ID)) throw UserError('Você não tem acesso a este candidato.');
  var out = publicCandidato_(c);
  var vagas = {};
  Db.all('Vagas').forEach(function (v) { vagas[v.ID] = v; });
  var visiveis = {};
  candidaturasVisiveis_().forEach(function (x) { visiveis[x.ID] = true; });
  var procs = Db.all('Candidaturas').filter(function (x) { return x.CandidatoID === c.ID && visiveis[x.ID]; });
  var ids = {};
  procs.forEach(function (p) { ids[p.ID] = p; });
  out.candidaturas = procs.map(function (p) {
    var v = vagas[p.VagaID] || {};
    var o = publicCandidatura_(p);
    o.vagaCodigo = v.Codigo; o.vagaCargo = v.Cargo; o.vagaStatus = v.Status; o.vagaUnidade = v.Unidade;
    return o;
  }).sort(function (a, b) { return (b.DataCandidatura || '').localeCompare(a.DataCandidatura || ''); });
  out.entrevistas = Db.all('Entrevistas').filter(function (e) { return ids[e.CandidaturaID]; }).map(function (e) {
    var o = clean_(e); var v = vagas[ids[e.CandidaturaID].VagaID] || {};
    o.vagaCodigo = v.Codigo; o.vagaCargo = v.Cargo; return o;
  }).sort(function (a, b) { return (b.Agendamento || '').localeCompare(a.Agendamento || ''); });
  out.indicacoes = Db.all('Indicacoes').filter(function (i) { return i.CandidatoID === c.ID; }).map(clean_);
  out.historico = Db.all('Historico').filter(function (h) { return h.ReferenciaID === c.ID || ids[h.ReferenciaID]; })
    .map(clean_).sort(function (a, b) { return b.DataHora.localeCompare(a.DataHora); });
  return out;
}

function saveCandidato(input) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var id = saveCandidatoCore_(input);
    return getCandidato(id);
  });
}

/** Cria/atualiza candidato sem lock. Retorna o ID. */
function saveCandidatoCore_(input) {
  var c = {};
  CAMPOS_CANDIDATO.forEach(function (k) { c[k] = Util.str(input[k]); });
  c.Email = c.Email.toLowerCase();
  c.UF = c.UF.toUpperCase();
  if (c.CPF) c.CPF = digits_(c.CPF).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  c.ConsentimentoLGPD = Util.isYes(c.ConsentimentoLGPD) ? 'Sim' : 'Não';
  validarCandidato_(c);
  var dup = findDuplicateCandidato_(c, input.ID);
  if (dup) {
    var e = UserError('Candidato já cadastrado (mesmo ' + dup.campo + '): ' + dup.candidato.Nome + ' — ' + (dup.candidato.Codigo || dup.candidato.ID) + '. Use o cadastro existente.');
    e.duplicadoId = dup.candidato.ID;
    throw e;
  }
  if (input.ID) {
    var atual = Db.find('Candidatos', input.ID);
    if (!atual) throw UserError('Candidato não encontrado.');
    if (atual.Anonimizado === 'Sim') throw UserError('Cadastro anonimizado (LGPD) não pode ser editado.');
    var alterados = CAMPOS_CANDIDATO.filter(function (k) { return Util.str(atual[k]) !== c[k]; });
    Db.update('Candidatos', atual.ID, Object.assign(c, { AtualizadoEm: Util.now() }));
    if (alterados.length) logHistory_('Candidato', atual.ID, '', '', 'Cadastro atualizado: ' + alterados.join(', '));
    return atual.ID;
  }
  var meses = Util.int(Db.config('RETENCAO_MESES'), 24);
  var d = Util.parse(Util.today());
  d.setUTCMonth(d.getUTCMonth() + meses);
  c.ID = Util.id('CAN');
  c.Codigo = proximoCodigoCandidato_();
  c.CriadoEm = Util.now();
  c.CriadoPor = Auth.email();
  c.AtualizadoEm = c.CriadoEm;
  c.ExcluirApos = Util.fmt(d);
  c.Anonimizado = 'Não';
  Db.insert('Candidatos', c);
  logHistory_('Candidato', c.ID, '', '', 'Cadastro ' + c.Codigo + ' criado');
  return c.ID;
}

/* ------------------------------ currículos (Drive) ------------------------------ */

function pastaCurriculos_() {
  var id = Db.config('CURRICULOS_PASTA_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recria abaixo */ } }
  var folder = DriveApp.createFolder('Via Talentos — Currículos (acesso restrito)');
  var row = Db.find('Config', 'CURRICULOS_PASTA_ID');
  if (row) Db.update('Config', 'CURRICULOS_PASTA_ID', { Valor: folder.getId() });
  else Db.insert('Config', { Chave: 'CURRICULOS_PASTA_ID', Valor: folder.getId() });
  return folder;
}

var TIPOS_CURRICULO = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

function uploadCurriculo(id, arquivo) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var c = Db.find('Candidatos', id);
    if (!c) throw UserError('Candidato não encontrado.');
    if (!arquivo || !arquivo.base64) throw UserError('Selecione o arquivo do currículo.');
    if (TIPOS_CURRICULO.indexOf(arquivo.tipo) < 0) throw UserError('Formato não aceito. Envie PDF, Word, JPG ou PNG.');
    var bytes = Utilities.base64Decode(arquivo.base64);
    if (bytes.length > 8 * 1024 * 1024) throw UserError('Arquivo acima de 8 MB.');
    var nome = (c.Codigo || c.ID) + ' - ' + c.Nome + ' - ' + Util.today() + (/\.\w+$/.exec(arquivo.nome || '') || [''])[0];
    var file = pastaCurriculos_().createFile(Utilities.newBlob(bytes, arquivo.tipo, nome));
    if (c.CurriculoId) { try { DriveApp.getFileById(c.CurriculoId).setTrashed(true); } catch (e) { /* já removido */ } }
    Db.update('Candidatos', c.ID, { CurriculoId: file.getId(), CurriculoUrl: '', AtualizadoEm: Util.now() });
    logHistory_('Candidato', c.ID, '', '', 'Currículo anexado: ' + nome);
    return getCandidato(c.ID);
  });
}

/** Devolve o currículo em base64 (o arquivo no Drive não é compartilhado). */
function downloadCurriculo(id) {
  var c = Db.find('Candidatos', id);
  if (!c || !c.CurriculoId) throw UserError('Currículo não encontrado.');
  if (!canSeeCandidato_(c.ID)) throw UserError('Você não tem acesso a este currículo.');
  var blob = DriveApp.getFileById(c.CurriculoId).getBlob();
  logHistory_('Candidato', c.ID, '', '', 'Currículo consultado');
  return { nome: blob.getName(), tipo: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

/** LGPD: remove dados pessoais mantendo os registros estatísticos. */
function anonimizarCandidato(id, justificativa) {
  Auth.require('Administrador RH');
  return Db.withLock(function () {
    var c = Db.find('Candidatos', id);
    if (!c) throw UserError('Candidato não encontrado.');
    if (!Util.str(justificativa)) throw UserError('Justificativa obrigatória.');
    if (c.CurriculoId) { try { DriveApp.getFileById(c.CurriculoId).setTrashed(true); } catch (e) { /* ok */ } }
    Db.update('Candidatos', c.ID, {
      Nome: 'Candidato anonimizado ' + (c.Codigo || ''), CPF: '', Email: '', Telefone: '', Formacao: '', Experiencia: '',
      Pretensao: '', Disponibilidade: '', CurriculoId: '', CurriculoUrl: '', Anonimizado: 'Sim', AtualizadoEm: Util.now()
    });
    Db.all('Candidaturas').filter(function (x) { return x.CandidatoID === c.ID; }).forEach(function (x) { Db.update('Candidaturas', x.ID, { Observacoes: '' }); });
    logHistory_('Candidato', c.ID, '', 'Anonimizado', 'LGPD: ' + justificativa);
    return true;
  });
}
