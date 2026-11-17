/**
 * FASE 3 — Importação das planilhas antigas de controle (ex.: abas "RECRUTAMENTO" e "Página6").
 * Lê o cabeçalho (inclusive mesclado em duas linhas), pré-visualiza e importa sem duplicar
 * (cada linha recebe uma chave ImportKey = aba + linha).
 */
function listAbasPlanilha() {
  Auth.require('Administrador RH');
  var nossas = Object.keys(SCHEMA);
  return Db.spreadsheet().getSheets().map(function (s) { return s.getName(); }).filter(function (n) { return nossas.indexOf(n) < 0; });
}

function normCab_(s) { return Util.norm(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }

var IMPORT_COLS = {
  abertura: ['abertura da vaga', 'data de abertura', 'abertura'],
  analista: ['analista responsavel', 'analista'],
  funcao: ['funcao', 'cargo'],
  setor: ['setor', 'departamento'],
  vagas: ['vagas', 'posicoes', 'quantidade'],
  status: ['status do processo', 'status'],
  fechadas: ['vagas fechadas'],
  dataAprovacao: ['data aprovacao'],
  candidato: ['candidato aprovado'],
  contratado: ['nome contratado', 'pessoa contratada'],
  dataContratacao: ['data de contratacao'],
  finalizacao: ['data de finalizacao'],
  substituido: ['pessoa substituida'],
  tipo: ['tipo da vaga'],
  indicacao: ['indicacao'],
  obs: ['observacoes']
};

/** Localiza a linha de cabeçalho e monta o mapa coluna→campo. */
function lerPlanilhaAntiga_(aba) {
  var sheet = Db.spreadsheet().getSheetByName(aba);
  if (!sheet) throw UserError('Aba não encontrada: ' + aba);
  var values = sheet.getDataRange().getValues();
  var hr = -1, r, row;
  for (r = 0; r < Math.min(values.length, 10) && hr < 0; r++) {
    if (values[r].map(normCab_).indexOf('status do processo') >= 0) hr = r;
  }
  for (r = 0; r < Math.min(values.length, 10) && hr < 0; r++) {
    row = values[r].map(normCab_);
    if (row.indexOf('funcao') >= 0 && row.some(function (c) { return c.indexOf('abertura') >= 0; })) hr = r;
  }
  if (hr < 0) throw UserError('Cabeçalho não reconhecido na aba "' + aba + '". É preciso ter as colunas FUNÇÃO, ABERTURA DA VAGA e STATUS DO PROCESSO.');
  // cabeçalho em duas linhas (células mescladas): usa a linha de cima quando a de baixo está vazia
  var cab = values[hr].map(function (c, j) {
    var v = normCab_(c);
    return v || (hr > 0 ? normCab_(values[hr - 1][j]) : '');
  });
  var mapa = {};
  Object.keys(IMPORT_COLS).forEach(function (campo) {
    for (var i = 0; i < IMPORT_COLS[campo].length && mapa[campo] === undefined; i++) {
      var j = cab.indexOf(IMPORT_COLS[campo][i]);
      if (j >= 0) mapa[campo] = j;
    }
  });
  ['abertura', 'funcao', 'status'].forEach(function (k) { if (mapa[k] === undefined) throw UserError('Coluna obrigatória não encontrada: ' + IMPORT_COLS[k][0].toUpperCase()); });
  return { values: values, inicio: hr + 1, mapa: mapa };
}

function mapearStatus_(txt) {
  var s = Util.norm(txt);
  if (!s) return null;
  if (s.indexOf('cancel') >= 0) return VT.STATUS_CANCELADA;
  if (s.indexOf('finaliz') >= 0 || s.indexOf('conclu') >= 0 || s.indexOf('contratad') >= 0 || s.indexOf('fechad') >= 0) return VT.STATUS_CONCLUIDA;
  if (s.indexOf('suspen') >= 0 || s.indexOf('congel') >= 0 || s.indexOf('pausad') >= 0 || s.indexOf('stand') >= 0) return VT.STATUS_SUSPENSA;
  if (s.indexOf('admiss') >= 0) return 'Processo admissional';
  if (s.indexOf('proposta') >= 0) return 'Proposta enviada';
  if (s.indexOf('dire') >= 0) return 'Entrevistas com direção';
  if (s.indexOf('gestor') >= 0) return 'Entrevistas com gestor';
  if (s.indexOf('rh') >= 0 || s.indexOf('entrevista') >= 0) return 'Entrevistas com RH';
  if (s.indexOf('triagem') >= 0) return 'Triagem de currículos';
  if (s.indexOf('aguard') >= 0 || s.indexOf('retorno') >= 0) return 'Aguardando retorno';
  return 'Aberta / recebendo candidaturas';
}

/** Converte as linhas em vagas. Retorna {novas, ignoradas, invalidas}. */
function prepararImportacao_(aba, empresa, desde) {
  desde = Util.toIsoDate(desde);
  var p = lerPlanilhaAntiga_(aba);
  var m = p.mapa;
  var jaImportadas = {};
  Db.all('Vagas').forEach(function (v) { if (v.ImportKey) jaImportadas[v.ImportKey] = true; });
  function cel(row, k) { return m[k] === undefined ? '' : row[m[k]]; }
  var novas = [], ignoradas = 0, invalidas = [], foraPeriodo = 0;
  for (var r = p.inicio; r < p.values.length; r++) {
    var row = p.values[r];
    var funcao = Util.str(cel(row, 'funcao'));
    var abertura = Util.toIsoDate(cel(row, 'abertura'));
    var statusTxt = Util.str(cel(row, 'status'));
    if (!funcao && !abertura) continue;
    var key = aba + '!' + (r + 1);
    if (desde && abertura && abertura < desde) {
      var fechTmp = Util.toIsoDate(cel(row, 'dataAprovacao')) || Util.toIsoDate(cel(row, 'finalizacao')) || Util.toIsoDate(cel(row, 'dataContratacao'));
      if (!fechTmp || fechTmp < desde) { foraPeriodo++; continue; }
    }
    if (jaImportadas[key]) { ignoradas++; continue; }
    if (!funcao || !abertura || !statusTxt) { invalidas.push({ linha: r + 1, motivo: !funcao ? 'sem função' : (!abertura ? 'data de abertura inválida' : 'sem status') }); continue; }
    var status = mapearStatus_(statusTxt);
    var qtd = Math.max(1, Util.int(cel(row, 'vagas'), 1));
    var fechadas = Math.min(qtd, Math.max(0, Util.int(cel(row, 'fechadas'), status === VT.STATUS_CONCLUIDA ? qtd : 0)));
    var dataFech = Util.toIsoDate(cel(row, 'dataAprovacao')) || Util.toIsoDate(cel(row, 'finalizacao')) || Util.toIsoDate(cel(row, 'dataContratacao'));
    if (dataFech && dataFech < abertura) dataFech = abertura;
    var nome = Util.str(cel(row, 'contratado')) || Util.str(cel(row, 'candidato'));
    if (/cancel/i.test(nome)) nome = '';
    if (status === VT.STATUS_CONCLUIDA && !dataFech) { invalidas.push({ linha: r + 1, motivo: 'finalizada sem data de aprovação/contratação' }); continue; }
    novas.push({
      linha: r + 1, key: key, empresa: empresa, cargo: funcao, departamento: Util.str(cel(row, 'setor')) || 'Não informado',
      analista: Util.str(cel(row, 'analista')) || 'Não informado', qtd: qtd, abertura: abertura, status: status, statusOriginal: statusTxt,
      fechadas: status === VT.STATUS_CANCELADA ? 0 : fechadas, dataFech: dataFech, nome: nome,
      substituido: Util.str(cel(row, 'substituido')), tipo: Util.str(cel(row, 'tipo')),
      obs: [Util.str(cel(row, 'obs')), Util.str(cel(row, 'indicacao')) ? 'Indicação: ' + Util.str(cel(row, 'indicacao')) : ''].filter(Boolean).join(' · ')
    });
  }
  return { novas: novas, ignoradas: ignoradas, invalidas: invalidas, foraPeriodo: foraPeriodo, colunas: Object.keys(m) };
}

function previewImportacao(aba, empresa, desde) {
  Auth.require('Administrador RH');
  var r = prepararImportacao_(aba, empresa || 'Via Dupla', desde);
  var porStatus = Util.groupCount(r.novas, function (n) { return n.status; });
  return {
    aba: aba, novas: r.novas.length, ignoradas: r.ignoradas, invalidas: r.invalidas, foraPeriodo: r.foraPeriodo, desde: Util.toIsoDate(desde), colunasReconhecidas: r.colunas,
    jaImportadasTotal: Db.all('Vagas').filter(function (v) { return v.ImportKey && v.ImportKey.indexOf(aba + '!') === 0; }).length,
    porStatus: toSeries_(porStatus),
    amostra: r.novas.slice(0, 15).map(function (n) { return { linha: n.linha, abertura: n.abertura, cargo: n.cargo, analista: n.analista, qtd: n.qtd, statusOriginal: n.statusOriginal, status: n.status, fechadas: n.fechadas, fechamento: n.dataFech, contratado: n.nome }; })
  };
}

/** Importa em lote (gravações agrupadas por aba para caber no tempo de execução). */
function executarImportacao(aba, empresa, desde) {
  Auth.require('Administrador RH');
  empresa = empresa || 'Via Dupla';
  if (!Db.all('Empresas').some(function (e) { return Util.norm(e.Nome) === Util.norm(empresa); })) throw UserError('Empresa não cadastrada: ' + empresa);
  return Db.withLock(function () {
    var r = prepararImportacao_(aba, empresa, desde);
    if (!r.novas.length) return { importadas: 0, ignoradas: r.ignoradas, invalidas: r.invalidas.length };
    var emp = Db.all('Empresas').filter(function (e) { return Util.norm(e.Nome) === Util.norm(empresa); })[0];
    var seq = {};
    Db.all('Vagas').forEach(function (v) {
      var mm = /^(.+-\d{4})-(\d+)$/.exec(v.Codigo || '');
      if (mm) seq[mm[1]] = Math.max(seq[mm[1]] || 0, +mm[2]);
    });
    var agora = Util.now(), usuario = Auth.email();
    var vagas = [], posicoes = [], hist = [];
    r.novas.forEach(function (n) {
      var pref = (emp.Sigla || 'VD') + '-' + n.abertura.substr(0, 4);
      seq[pref] = (seq[pref] || 0) + 1;
      var id = Util.id('VAG');
      var final = VT.STATUS_FINAIS.indexOf(n.status) >= 0;
      var fechamento = n.status === VT.STATUS_CONCLUIDA ? n.dataFech : (n.status === VT.STATUS_CANCELADA ? (n.dataFech || n.abertura) : '');
      vagas.push({
        ID: id, Codigo: pref + '-' + ('000' + seq[pref]).slice(-4), Empresa: empresa, Unidade: 'Não informada', Cargo: n.cargo, Departamento: n.departamento,
        Gestor: 'Não informado', Analista: n.analista, QtdPosicoes: String(n.qtd), DataAbertura: n.abertura, DataAprovacao: n.abertura,
        MotivoAbertura: n.substituido ? 'Substituição' : 'Outra necessidade', ColaboradorSubstituido: n.substituido, TipoContrato: 'CLT',
        SalarioACombinar: 'Sim', Prioridade: 'Média', Status: n.status, DataFechamento: fechamento, Reaberturas: '0',
        Observacoes: 'Importado da aba ' + aba + ', linha ' + n.linha + ' (status original: ' + n.statusOriginal + ')' + (n.obs ? ' · ' + n.obs : ''),
        CriadoEm: agora, CriadoPor: usuario, AtualizadoEm: agora, AtualizadoPor: usuario, ImportKey: n.key
      });
      for (var i = 1; i <= n.qtd; i++) {
        var preenchida = i <= n.fechadas && n.dataFech;
        posicoes.push({
          ID: Util.id('POS'), VagaID: id, Numero: String(i),
          Status: preenchida ? 'Preenchida' : (final ? 'Cancelada' : 'Aberta'),
          DataFechamento: preenchida ? n.dataFech : (final ? fechamento : ''),
          NomeContratado: preenchida && i === 1 ? n.nome : '', CandidatoID: '', Reaberturas: '0'
        });
      }
      hist.push({ ID: Util.id('HIS'), Tipo: 'Vaga', ReferenciaID: id, De: '', Para: n.status, DataHora: n.abertura + ' 08:00:00', Usuario: usuario, Nota: 'Importação da planilha (aba ' + aba + ', linha ' + n.linha + ')' });
    });
    Db.insertMany('Vagas', vagas);
    Db.insertMany('Posicoes', posicoes);
    Db.insertMany('Historico', hist);
    logHistory_('Config', 'Importacao', '', aba, vagas.length + ' vaga(s) importada(s) da aba ' + aba + (desde ? ' (movimentação a partir de ' + br_(Util.toIsoDate(desde)) + ')' : ''));
    return { importadas: vagas.length, ignoradas: r.ignoradas, invalidas: r.invalidas.length };
  });
}

/**
 * Desfaz a importação de uma aba: remove as vagas importadas (e suas posições e histórico).
 * Vagas importadas que já receberam candidatos ou artes são mantidas.
 */
function desfazerImportacao(aba) {
  Auth.require('Administrador RH');
  return Db.withLock(function () {
    var prefixo = aba + '!';
    var usadas = {};
    Db.all('Candidaturas').forEach(function (c) { usadas[c.VagaID] = true; });
    Db.all('Artes').forEach(function (a) { usadas[a.VagaID] = true; });
    var alvo = {}, mantidas = 0;
    Db.all('Vagas').forEach(function (v) {
      if (!v.ImportKey || v.ImportKey.indexOf(prefixo) !== 0) return;
      if (usadas[v.ID]) mantidas++; else alvo[v.ID] = true;
    });
    var posIds = {};
    Db.all('Posicoes').forEach(function (p) { if (alvo[p.VagaID]) posIds[p.ID] = true; });
    var removidas = Db.removeWhere('Vagas', function (v) { return alvo[v.ID]; });
    Db.removeWhere('Posicoes', function (p) { return alvo[p.VagaID]; });
    Db.removeWhere('Historico', function (h) { return alvo[h.ReferenciaID] || posIds[h.ReferenciaID]; });
    Db.removeWhere('Suspensoes', function (x) { return alvo[x.VagaID]; });
    Db.removeWhere('ExcecoesSLA', function (x) { return alvo[x.VagaID]; });
    logHistory_('Config', 'Importacao', aba, '', 'Importação desfeita: ' + removidas + ' vaga(s) removida(s)' + (mantidas ? ', ' + mantidas + ' mantida(s) por já terem candidatos/artes' : ''));
    return { removidas: removidas, mantidas: mantidas };
  });
}
