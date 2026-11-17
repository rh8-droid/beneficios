/**
 * FASE 3 — Alertas automáticos (painel e e-mail).
 */
function calcularAlertas_() {
  var hoje = Util.today();
  var core = loadCore_();
  var cfg = core.config;
  var alertaDias = Util.int(cfg.ALERTA_DIAS_RESTANTES, 3);
  var semMov = Util.int(cfg.SEM_MOVIMENTACAO_DIAS, 3);
  var ctx = Sla.buildContext(core, hoje);
  var vagas = vagasComSla_(core, hoje).filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0; });
  var vagaMap = {};
  vagas.forEach(function (v) { vagaMap[v.ID] = v; });
  var mov = ultimaMovimentacao_(core);
  var out = [];

  vagas.forEach(function (v) {
    var hol = ctx.holidaysFor(v.Unidade);
    var desde = (mov[v.ID] || {}).data || Util.toIsoDate(v.CriadoEm) || v.DataAbertura;
    var parado = Sla.businessDaysBetween(Util.toIsoDate(desde), hoje, hol);
    var base = { vagaId: v.ID, vaga: (v.Codigo || v.ID) + ' · ' + v.Cargo, analista: v.Analista, gestor: v.Gestor, responsavel: v.responsavelAcao };
    var texto = 'Vaga: ' + v.Cargo + ' (' + (v.Codigo || v.ID) + ')\n' +
      (v.sla.iniciado ? 'Aberta há ' + v.sla.diasEfetivos + ' dias úteis.\n' : '') +
      'Etapa crítica: ' + v.Status + '.\nTempo de espera: ' + parado + ' dias úteis.\n' +
      'Responsável pela próxima ação: ' + (v.responsavelAcao || '—') + '.' +
      (v.sla.iniciado ? '\nSLA restante: ' + v.sla.diasRestantes + ' dias úteis.' : '');
    if (v.Status === VT.STATUS_AGUARDANDO_APROVACAO) {
      var esperando = Sla.businessDaysBetween(Util.toIsoDate(v.DataAbertura), hoje, hol);
      if (esperando >= 2) out.push(Object.assign({ tipo: 'aprovacao', nivel: 'amarelo', titulo: 'Vaga aguardando aprovação há ' + esperando + ' d.u.', texto: texto }, base));
      return;
    }
    if (v.Status === VT.STATUS_SUSPENSA) return;
    if (v.sla.iniciado && v.sla.diasRestantes < 0) out.push(Object.assign({ tipo: 'vencida', nivel: 'vermelho', titulo: 'Vaga fora do prazo (' + v.sla.atraso + ' d.u. de atraso)', texto: texto }, base));
    else if (v.sla.iniciado && v.sla.diasRestantes <= alertaDias) out.push(Object.assign({ tipo: 'vencendo', nivel: 'laranja', titulo: 'Vaga próxima do vencimento (resta(m) ' + v.sla.diasRestantes + ' d.u.)', texto: texto }, base));
    if (parado > semMov) out.push(Object.assign({ tipo: 'semMovimentacao', nivel: 'amarelo', titulo: 'Vaga sem movimentação há ' + parado + ' d.u.', texto: texto }, base));
  });

  var pessoas = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var candMap = {};
  candidaturasVisiveis_().forEach(function (c) {
    var v = vagaMap[c.VagaID];
    if (!v || c.Status !== 'Em andamento') return;
    candMap[c.ID] = c;
    var nome = (pessoas[c.CandidatoID] || {}).Nome || '';
    var dias = Sla.businessDaysBetween(Util.toIsoDate(c.EntradaEtapa), hoje, ctx.holidaysFor(v.Unidade));
    var base = { vagaId: v.ID, candidaturaId: c.ID, vaga: (v.Codigo || v.ID) + ' · ' + v.Cargo, analista: v.Analista, gestor: v.Gestor, responsavel: c.Responsavel };
    var txt = 'Candidato: ' + nome + '\nVaga: ' + v.Cargo + ' (' + (v.Codigo || v.ID) + ')\nEtapa: ' + c.Etapa + ' há ' + dias + ' dias úteis.\nPróxima ação: ' + (c.ProximaAcao || '—') + ' · ' + (c.Responsavel || '—') + (c.PrazoAcao ? ' · prazo ' + br_(c.PrazoAcao) : '');
    if ((c.Etapa === 'Entrevista gestor' || c.Etapa === 'Aguardando decisão') && dias > semMov) {
      out.push(Object.assign({ tipo: 'decisaoGestor', nivel: 'laranja', titulo: 'Decisão pendente do gestor — ' + nome, texto: txt }, base, { responsavel: v.Gestor }));
    } else if (c.Etapa === 'Aprovado' || c.Etapa === 'Processo admissional') {
      out.push(Object.assign({ tipo: 'admissao', nivel: dias > semMov ? 'laranja' : 'info', titulo: 'Aprovado aguardando admissão — ' + nome, texto: txt }, base));
    } else if (c.PrazoAcao && c.PrazoAcao < hoje) {
      out.push(Object.assign({ tipo: 'retorno', nivel: 'amarelo', titulo: 'Candidato aguardando retorno — ' + nome, texto: txt }, base));
    }
  });

  var amanha = Sla.addBusinessDays(hoje, 1);
  Db.all('Entrevistas').forEach(function (e) {
    var c = candMap[e.CandidaturaID];
    if (!c || e.Resultado !== 'Pendente') return;
    var d = (e.Agendamento || '').substr(0, 10);
    if (d !== hoje && d !== amanha) return;
    var v = vagaMap[c.VagaID], nome = (pessoas[c.CandidatoID] || {}).Nome || '';
    out.push({ tipo: 'entrevista', nivel: 'info', titulo: 'Entrevista ' + e.Tipo + (d === hoje ? ' hoje' : ' amanhã') + ' às ' + e.Agendamento.substr(11, 5) + ' — ' + nome,
      texto: 'Candidato: ' + nome + '\nVaga: ' + v.Cargo + ' (' + (v.Codigo || v.ID) + ')\nEntrevistador: ' + e.Entrevistador,
      vagaId: v.ID, candidaturaId: c.ID, vaga: (v.Codigo || v.ID) + ' · ' + v.Cargo, analista: v.Analista, gestor: v.Gestor, responsavel: e.Entrevistador, entrevistaTipo: e.Tipo });
  });

  var ordem = { vermelho: 0, laranja: 1, amarelo: 2, info: 3 };
  return out.sort(function (a, b) { return ordem[a.nivel] - ordem[b.nivel]; });
}

function getAlertas() {
  var u = Auth.user();
  var list = calcularAlertas_();
  list.forEach(function (a) { a.meu = alertaDoUsuario_(a, u); });
  return { alertas: list, total: list.length, meus: list.filter(function (a) { return a.meu; }).length };
}

function alertaDoUsuario_(a, u) {
  var nome = Util.norm(u.nome);
  var cad = function (tabela, n) {
    return Util.norm(n) === nome || Db.all(tabela).some(function (r) { return Util.norm(r.Nome) === Util.norm(n) && Util.norm(r.Email) === Util.norm(u.email); });
  };
  if (u.perfil === 'Administrador RH') return true;
  if (u.perfil === 'Analista RH') return cad('Analistas', a.analista);
  if (u.perfil === 'Gestor') return cad('Gestores', a.gestor) && a.tipo !== 'aprovacao';
  if (u.perfil === 'Direção') return a.nivel === 'vermelho' || a.tipo === 'aprovacao' || a.entrevistaTipo === 'Direção';
  return false;
}

/* ------------------------------ e-mail ------------------------------ */
function htmlEmailAlertas_(nome, lista) {
  var cor = { vermelho: '#d93b40', laranja: '#e57a12', amarelo: '#d9a800', info: '#2b6cb0' };
  var e = function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>'); };
  return '<div style="font-family:Arial,sans-serif;max-width:640px"><div style="background:#111;color:#fff;padding:14px 18px;border-bottom:4px solid #f2c200">' +
    '<b style="letter-spacing:2px">VIA <span style="color:#f2c200">TALENTOS</span></b><br><span style="font-size:12px;color:#ccc">Alertas de ' + br_(Util.today()) + '</span></div>' +
    '<p>Olá, ' + e(nome) + '. Há <b>' + lista.length + '</b> ponto(s) de atenção no recrutamento:</p>' +
    lista.map(function (a) { return '<div style="border-left:4px solid ' + cor[a.nivel] + ';background:#f7f7f5;padding:10px 12px;margin:8px 0"><b>' + e(a.titulo) + '</b><br><span style="font-size:13px;color:#333">' + e(a.texto) + '</span></div>'; }).join('') +
    '<p style="font-size:12px;color:#777">Mensagem automática do Via Talentos. Os alertas consideram apenas registros do sistema.</p></div>';
}

/** Envia os alertas por e-mail a cada usuário ativo (conforme o perfil). manual=true ignora o controle diário. */
function enviarAlertasEmail(manual) {
  if (!manual && !Util.isYes(Db.config('ALERTAS_EMAIL'))) return 'Envio por e-mail desativado.';
  var hoje = Util.today();
  if (!manual && Db.config('ULTIMO_ENVIO_ALERTAS') === hoje) return 'Alertas já enviados hoje.';
  var alertas = calcularAlertas_();
  var enviados = 0;
  Db.all('Usuarios').filter(function (u) { return Util.isYes(u.Ativo) && u.Email; }).forEach(function (row) {
    var u = { email: Util.str(row.Email).toLowerCase(), nome: row.Nome, perfil: row.Perfil };
    var meus = alertas.filter(function (a) { return a.nivel !== 'info' || a.tipo === 'entrevista' ? alertaDoUsuario_(a, u) : false; });
    if (!meus.length) return;
    if (MailApp.getRemainingDailyQuota() < 1) return;
    MailApp.sendEmail({ to: u.email, name: 'Via Talentos', subject: 'Via Talentos — ' + meus.length + ' alerta(s) em ' + br_(hoje), htmlBody: htmlEmailAlertas_(u.nome, meus) });
    enviados++;
  });
  Db.withLock(function () {
    if (Db.find('Config', 'ULTIMO_ENVIO_ALERTAS')) Db.update('Config', 'ULTIMO_ENVIO_ALERTAS', { Valor: hoje });
    else Db.insert('Config', { Chave: 'ULTIMO_ENVIO_ALERTAS', Valor: hoje });
    logHistory_('Config', 'Alertas', '', '', 'Alertas enviados por e-mail para ' + enviados + ' usuário(s)');
  });
  return enviados + ' e-mail(s) enviado(s).';
}

/** Função chamada pelo gatilho diário (dias úteis). */
function enviarAlertasEmailAgendado() {
  Db.reset();
  Auth.asSystem();
  var hoje = Util.today();
  var ctx = Sla.buildContext(loadCore_(), hoje);
  if (!Sla.isBusinessDay(hoje, ctx.holidaysFor(''))) return 'Dia não útil.';
  return enviarAlertasEmail(false);
}

function enviarAlertasAgora() {
  Auth.require('Administrador RH');
  return enviarAlertasEmail(true);
}

/** Liga/desliga o envio diário. hora: 0–23 (fuso do projeto). */
function configurarAlertasEmail(ativar, hora) {
  Auth.require('Administrador RH');
  var h = Util.int(hora, 7);
  if (h < 0 || h > 23) throw UserError('Hora inválida.');
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'enviarAlertasEmailAgendado') ScriptApp.deleteTrigger(t);
  });
  if (ativar) ScriptApp.newTrigger('enviarAlertasEmailAgendado').timeBased().everyDays(1).atHour(h).create();
  Db.withLock(function () {
    [['ALERTAS_EMAIL', ativar ? 'Sim' : 'Não'], ['ALERTAS_HORA', String(h)]].forEach(function (kv) {
      if (Db.find('Config', kv[0])) Db.update('Config', kv[0], { Valor: kv[1] }); else Db.insert('Config', { Chave: kv[0], Valor: kv[1] });
    });
    logHistory_('Config', 'Alertas', '', ativar ? 'Ativado' : 'Desativado', 'Envio diário de alertas por e-mail' + (ativar ? ' às ' + h + 'h' : ''));
  });
  return { ativo: !!ativar, hora: h };
}
