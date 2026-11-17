/**
 * VIA TALENTOS — arquivo único gerado a partir de apps-script/ (não editar aqui).
 */

/* ===================== 00_Config.gs ===================== */
/**
 * VIA TALENTOS — Configuração central e listas oficiais.
 */
var VT = {
  APP_NAME: 'Via Talentos',
  TZ: 'America/Sao_Paulo',
  // Deixe vazio quando o script estiver vinculado à planilha.
  // Caso contrário, defina a propriedade de script SPREADSHEET_ID.
  SPREADSHEET_ID_PROPERTY: 'SPREADSHEET_ID',

  PERFIS: ['Administrador RH', 'Analista RH', 'Gestor', 'Direção'],

  EMPRESAS_PADRAO: [
    { Nome: 'Via Dupla', Sigla: 'VD' },
    { Nome: 'Via Avant', Sigla: 'VA' }
  ],

  STATUS_VAGA: [
    'Aguardando aprovação',
    'Aprovada / aguardando divulgação',
    'Aberta / recebendo candidaturas',
    'Triagem de currículos',
    'Entrevistas com RH',
    'Entrevistas com gestor',
    'Entrevistas com direção',
    'Etapa de testes ou avaliações',
    'Aguardando retorno',
    'Proposta enviada',
    'Processo admissional',
    'Concluída / contratada',
    'Suspensa',
    'Cancelada'
  ],
  STATUS_FINAIS: ['Concluída / contratada', 'Cancelada'],
  STATUS_SUSPENSA: 'Suspensa',
  STATUS_AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  STATUS_CONCLUIDA: 'Concluída / contratada',
  STATUS_CANCELADA: 'Cancelada',

  // Responsável típico pela próxima ação em cada status (análise de gargalos).
  RESPONSAVEL_STATUS: {
    'Aguardando aprovação': 'Direção',
    'Aprovada / aguardando divulgação': 'RH',
    'Aberta / recebendo candidaturas': 'RH',
    'Triagem de currículos': 'RH',
    'Entrevistas com RH': 'RH',
    'Entrevistas com gestor': 'Gestor',
    'Entrevistas com direção': 'Direção',
    'Etapa de testes ou avaliações': 'RH',
    'Aguardando retorno': 'Gestor',
    'Proposta enviada': 'Candidato',
    'Processo admissional': 'RH / DP',
    'Suspensa': 'Gestor'
  },

  MOTIVOS_ABERTURA: ['Substituição', 'Aumento de quadro', 'Nova função', 'Outra necessidade'],
  TIPOS_CONTRATO: ['CLT', 'PJ', 'Estágio', 'Aprendizagem'],
  MODALIDADES: ['Presencial', 'Híbrido', 'Remoto'],
  PRIORIDADES: ['Baixa', 'Média', 'Alta', 'Crítica'],

  ETAPAS_KANBAN: [
    'Candidatura recebida',
    'Triagem de currículo',
    'Contato inicial',
    'Entrevista RH',
    'Entrevista gestor',
    'Entrevista direção',
    'Testes / avaliações',
    'Aguardando decisão',
    'Aprovado',
    'Processo admissional',
    'Contratado',
    'Reprovado / desistente'
  ],

  MOTIVOS_REPROVACAO: [
    'Experiência incompatível com a função',
    'Conhecimento técnico insuficiente',
    'Perfil profissional desalinhado',
    'Pretensão salarial incompatível',
    'Disponibilidade de horário incompatível',
    'Localização ou deslocamento',
    'Não atende aos requisitos obrigatórios',
    'Reprovado em teste técnico',
    'Reprovado na entrevista com gestor',
    'Reprovado na entrevista com direção',
    'Candidato desistiu',
    'Não compareceu à entrevista',
    'Não respondeu aos contatos',
    'Vaga preenchida por outro candidato',
    'Outro motivo'
  ],

  ORIGENS_CANDIDATURA: ['Site', 'LinkedIn', 'Indeed', 'Instagram', 'WhatsApp', 'Indicação', 'Banco de talentos', 'Agência', 'Outro'],

  CONFIG_PADRAO: {
    SLA_DIAS_UTEIS: '15',
    SLA_SUSPENSAO_PAUSA: 'Sim',
    ALERTA_DIAS_RESTANTES: '3',
    SEM_MOVIMENTACAO_DIAS: '3',
    SITE_CANDIDATURA: 'https://www.viadupla.com',
    LOGO_DRIVE_ID: '',
    FOTO_DRIVE_ID: '',
    RETENCAO_MESES: '24',
    PRAZO_ACAO_DIAS: '2',
    CURRICULOS_PASTA_ID: ''
  },

  TIPOS_ENTREVISTA: ['RH', 'Gestor', 'Direção'],
  RESULTADOS_ENTREVISTA: ['Pendente', 'Aprovado', 'Reprovado'],
  ETAPA_DA_ENTREVISTA: { 'RH': 'Entrevista RH', 'Gestor': 'Entrevista gestor', 'Direção': 'Entrevista direção' },
  // Responsável padrão pela próxima ação em cada etapa do candidato
  RESPONSAVEL_ETAPA: {
    'Candidatura recebida': 'RH', 'Triagem de currículo': 'RH', 'Contato inicial': 'RH', 'Entrevista RH': 'RH',
    'Entrevista gestor': 'Gestor', 'Entrevista direção': 'Direção', 'Testes / avaliações': 'RH',
    'Aguardando decisão': 'Gestor', 'Aprovado': 'RH', 'Processo admissional': 'RH / DP'
  }
};

/**
 * Esquema das abas. Colunas faltantes são acrescentadas automaticamente
 * ao final (as existentes nunca são reordenadas ou removidas).
 */
var SCHEMA = {
  Vagas: ['ID', 'Codigo', 'Empresa', 'Unidade', 'Cargo', 'Departamento', 'Gestor', 'Analista',
    'QtdPosicoes', 'DataAbertura', 'DataAprovacao', 'MotivoAbertura', 'ColaboradorSubstituido',
    'TipoContrato', 'Modalidade', 'Horario', 'Salario', 'SalarioACombinar', 'Requisitos',
    'Atribuicoes', 'Beneficios', 'Observacoes', 'Prioridade', 'Status', 'DataFechamento',
    'Reaberturas', 'ReaberturaDe', 'Etapas', 'CriadoEm', 'CriadoPor', 'AtualizadoEm', 'AtualizadoPor'],
  Posicoes: ['ID', 'VagaID', 'Numero', 'Status', 'DataFechamento', 'CandidatoID', 'NomeContratado', 'Reaberturas'],
  Suspensoes: ['ID', 'VagaID', 'Inicio', 'Fim', 'Justificativa', 'PausaSLA', 'Usuario', 'CriadoEm'],
  ExcecoesSLA: ['ID', 'VagaID', 'DiasAdicionais', 'Justificativa', 'Usuario', 'CriadoEm'],
  Historico: ['ID', 'Tipo', 'ReferenciaID', 'De', 'Para', 'DataHora', 'Usuario', 'Nota'],

  Empresas: ['ID', 'Nome', 'Sigla', 'Ativo'],
  Unidades: ['ID', 'Empresa', 'Nome', 'Cidade', 'UF', 'Ativo'],
  Departamentos: ['ID', 'Nome', 'Ativo'],
  Cargos: ['ID', 'Nome', 'Departamento', 'Ativo'],
  Gestores: ['ID', 'Nome', 'Email', 'Empresa', 'Departamento', 'Ativo'],
  Analistas: ['ID', 'Nome', 'Email', 'Ativo'],
  Feriados: ['Data', 'Unidade', 'Descricao', 'ID'],
  Usuarios: ['Email', 'Nome', 'Perfil', 'Ativo'],
  Config: ['Chave', 'Valor'],

  // Fase 2 — estrutura criada desde já para que o dashboard leia dados reais.
  Candidatos: ['ID', 'Codigo', 'Nome', 'CPF', 'Email', 'Telefone', 'Cidade', 'UF', 'CargoInteresse',
    'Origem', 'Formacao', 'Experiencia', 'Pretensao', 'Disponibilidade', 'CurriculoId', 'CurriculoUrl',
    'Analista', 'ConsentimentoLGPD', 'ExcluirApos', 'CriadoEm', 'CriadoPor', 'AtualizadoEm', 'Anonimizado'],
  Candidaturas: ['ID', 'VagaID', 'CandidatoID', 'Origem', 'Indicador', 'DataCandidatura', 'Etapa',
    'EntradaEtapa', 'Responsavel', 'ProximaAcao', 'PrazoAcao', 'Status', 'MotivoReprovacao',
    'Observacoes', 'DataConclusao', 'CriadoEm', 'CriadoPor'],
  Entrevistas: ['ID', 'CandidaturaID', 'Tipo', 'Agendamento', 'Realizacao', 'Entrevistador',
    'Resultado', 'Parecer', 'MotivoReprovacao', 'ProximaEtapa', 'RetornoPrevisto', 'CriadoEm', 'CriadoPor'],
  EtapasCandidatura: ['ID', 'CandidaturaID', 'Etapa', 'Entrada', 'Saida', 'Responsavel', 'MotivoAtraso', 'Usuario'],
  Indicacoes: ['ID', 'CandidatoID', 'CandidaturaID', 'Indicador', 'EmpresaIndicador',
    'DepartamentoIndicador', 'DataIndicacao', 'Resultado', 'DataContratacao', 'CargoPretendido',
    'Observacoes', 'CriadoEm', 'CriadoPor']
};

/** Chave usada para localizar registros em cada aba. */
var SCHEMA_KEY = {
  Usuarios: 'Email',
  Config: 'Chave'
};


/* ===================== 01_Util.gs ===================== */
/**
 * Utilitários de data, texto e identificadores.
 * Datas de negócio são tratadas como strings ISO 'aaaa-mm-dd' e calculadas em UTC
 * para não sofrer com fuso horário/horário de verão.
 */
var Util = (function () {
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function now() {
    return Utilities.formatDate(new Date(), VT.TZ, 'yyyy-MM-dd HH:mm:ss');
  }

  function today() {
    return Utilities.formatDate(new Date(), VT.TZ, 'yyyy-MM-dd');
  }

  /** Converte Date, 'dd/mm/aaaa', 'aaaa-mm-dd' (com ou sem hora) em 'aaaa-mm-dd'. */
  function toIsoDate(value) {
    if (value === null || value === undefined || value === '') return '';
    if (Object.prototype.toString.call(value) === '[object Date]') {
      if (isNaN(value.getTime())) return '';
      return Utilities.formatDate(value, VT.TZ, 'yyyy-MM-dd');
    }
    var s = String(value).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]);
    return '';
  }

  function isIsoDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    var d = parse(s);
    return d && fmt(d) === s;
  }

  /** 'aaaa-mm-dd' → Date UTC (meia-noite). */
  function parse(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  /** Date UTC → 'aaaa-mm-dd'. */
  function fmt(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function addDays(iso, n) {
    var d = parse(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return fmt(d);
  }

  function monthKey(iso) { return iso ? String(iso).substr(0, 7) : ''; }

  function id(prefix) {
    var hex = Utilities.getUuid().replace(/-/g, '').substr(0, 8).toUpperCase();
    return prefix + '-' + hex;
  }

  function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }

  function norm(v) {
    return str(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  }

  function int(v, def) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (def === undefined ? 0 : def) : n;
  }

  function isYes(v) { return ['sim', 's', 'true', '1', 'yes', 'ativo'].indexOf(norm(v)) >= 0; }

  function round(n, d) {
    var f = Math.pow(10, d || 0);
    return Math.round(n * f) / f;
  }

  function avg(list) {
    if (!list.length) return null;
    return list.reduce(function (a, b) { return a + b; }, 0) / list.length;
  }

  function groupCount(list, keyFn) {
    var out = {};
    list.forEach(function (item) {
      var k = keyFn(item);
      if (k === null || k === undefined || k === '') return;
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  return {
    now: now, today: today, toIsoDate: toIsoDate, isIsoDate: isIsoDate, parse: parse, fmt: fmt,
    addDays: addDays, monthKey: monthKey, id: id, str: str, norm: norm, int: int, isYes: isYes,
    round: round, avg: avg, groupCount: groupCount
  };
})();

/** Erro de validação exibido ao usuário sem stack trace. */
function UserError(message) {
  var e = new Error(message);
  e.userError = true;
  return e;
}


/* ===================== 02_Db.gs ===================== */
/**
 * Camada de dados: cada aba da planilha é uma tabela; cada linha um objeto.
 * Trocar este arquivo é o único passo necessário para migrar para outro banco.
 */
var Db = (function () {
  var cache = {};
  var ensured = {};
  var ss = null;

  function spreadsheet() {
    if (ss) return ss;
    var id = PropertiesService.getScriptProperties().getProperty(VT.SPREADSHEET_ID_PROPERTY);
    ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Planilha não encontrada. Defina a propriedade de script SPREADSHEET_ID.');
    return ss;
  }

  function keyOf(name) {
    return Object.prototype.hasOwnProperty.call(SCHEMA_KEY, name) ? SCHEMA_KEY[name] : 'ID';
  }

  /** Garante que a aba exista e tenha todas as colunas do esquema. Retorna a aba. */
  function ensure(name) {
    var book = spreadsheet();
    var sheet = book.getSheetByName(name);
    var wanted = SCHEMA[name];
    if (!wanted) throw new Error('Tabela desconhecida: ' + name);
    if (!sheet) {
      sheet = book.insertSheet(name);
    }
    if (ensured[name]) return sheet;

    var lastCol = sheet.getLastColumn();
    var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(Util.str) : [];
    var missing = wanted.filter(function (h) { return headers.indexOf(h) < 0; });
    if (missing.length) {
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      sheet.getRange(1, 1, 1, headers.length + missing.length)
        .setFontWeight('bold').setBackground('#1f1f1f').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    ensured[name] = true;

    // Registros antigos sem ID recebem um identificador (ex.: feriados digitados à mão).
    if (keyOf(name) === 'ID') backfillIds_(name, sheet);
    return sheet;
  }

  function backfillIds_(name, sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    var headers = headersOf(sheet);
    var col = headers.indexOf('ID');
    var range = sheet.getRange(2, col + 1, lastRow - 1, 1);
    var values = range.getValues();
    var changed = false;
    var prefix = name.substr(0, 3).toUpperCase();
    values.forEach(function (r) {
      if (!Util.str(r[0])) { r[0] = Util.id(prefix); changed = true; }
    });
    if (changed) range.setValues(values);
  }

  function headersOf(sheet) {
    var lastCol = sheet.getLastColumn();
    return lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(Util.str) : [];
  }

  function cellToString(v) {
    if (v === null || v === undefined) return '';
    if (Object.prototype.toString.call(v) === '[object Date]') {
      if (isNaN(v.getTime())) return '';
      var full = Utilities.formatDate(v, VT.TZ, 'yyyy-MM-dd HH:mm:ss');
      return /00:00:00$/.test(full) ? full.substr(0, 10) : full;
    }
    return String(v).trim();
  }

  /** Todas as linhas como objetos ({_row} guarda a linha física). */
  function all(name) {
    if (cache[name]) return cache[name];
    var sheet = ensure(name);
    var lastRow = sheet.getLastRow();
    var headers = headersOf(sheet);
    var rows = [];
    if (lastRow >= 2) {
      var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
      values.forEach(function (r, i) {
        var empty = r.every(function (c) { return c === '' || c === null; });
        if (empty) return;
        var obj = { _row: i + 2 };
        headers.forEach(function (h, j) { if (h) obj[h] = cellToString(r[j]); });
        rows.push(obj);
      });
    }
    cache[name] = rows;
    return rows;
  }

  function find(name, key) {
    var k = keyOf(name);
    var target = Util.norm(key);
    for (var i = 0, list = all(name); i < list.length; i++) {
      if (Util.norm(list[i][k]) === target) return list[i];
    }
    return null;
  }

  function rowValues_(headers, obj) {
    return headers.map(function (h) {
      var v = obj[h];
      return v === null || v === undefined ? '' : String(v);
    });
  }

  function insert(name, obj) {
    return insertMany(name, [obj])[0];
  }

  function insertMany(name, list) {
    if (!list.length) return [];
    var sheet = ensure(name);
    var headers = headersOf(sheet);
    var k = keyOf(name);
    var start = sheet.getLastRow() + 1;
    var saved = list.map(function (obj, i) {
      var copy = {};
      Object.keys(obj).forEach(function (key) { if (key !== '_row') copy[key] = obj[key]; });
      if (k === 'ID' && !copy.ID) copy.ID = Util.id(name.substr(0, 3).toUpperCase());
      copy._row = start + i;
      return copy;
    });
    var range = sheet.getRange(start, 1, saved.length, headers.length);
    range.setNumberFormat('@');
    range.setValues(saved.map(function (o) { return rowValues_(headers, o); }));
    if (cache[name]) saved.forEach(function (o) { cache[name].push(o); });
    return saved;
  }

  function update(name, key, patch) {
    var current = find(name, key);
    if (!current) throw UserError('Registro não encontrado em ' + name + ': ' + key);
    var sheet = ensure(name);
    var headers = headersOf(sheet);
    Object.keys(patch).forEach(function (h) {
      if (h !== '_row' && h !== keyOf(name)) current[h] = patch[h];
    });
    var range = sheet.getRange(current._row, 1, 1, headers.length);
    range.setNumberFormat('@');
    range.setValues([rowValues_(headers, current)]);
    return current;
  }

  function remove(name, key) {
    var current = find(name, key);
    if (!current) throw UserError('Registro não encontrado em ' + name + ': ' + key);
    ensure(name).deleteRow(current._row);
    delete cache[name];
    return true;
  }

  function config(key) {
    var row = find('Config', key);
    var v = row ? Util.str(row.Valor) : '';
    if (v === '' && Object.prototype.hasOwnProperty.call(VT.CONFIG_PADRAO, key)) return VT.CONFIG_PADRAO[key];
    return v;
  }

  /** Executa fn com o lock do script (evita códigos/duplicidades em gravações simultâneas). */
  function withLock(fn) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw UserError('Sistema ocupado. Tente novamente em alguns segundos.');
    try {
      cache = {}; // relê dados frescos dentro do lock
      return fn();
    } finally {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
  }

  function reset() { cache = {}; ensured = {}; ss = null; }

  return {
    spreadsheet: spreadsheet, ensure: ensure, all: all, find: find, insert: insert,
    insertMany: insertMany, update: update, remove: remove, config: config,
    withLock: withLock, reset: reset
  };
})();

/** Registra uma linha na trilha de auditoria. */
function logHistory_(tipo, refId, de, para, nota) {
  Db.insert('Historico', {
    ID: Util.id('HIS'), Tipo: tipo, ReferenciaID: refId, De: de || '', Para: para || '',
    DataHora: Util.now(), Usuario: Auth.email(), Nota: nota || ''
  });
}


/* ===================== 03_Auth.gs ===================== */
/**
 * Perfis de acesso. O usuário precisa estar ativo na aba "Usuarios".
 * Se a aba estiver vazia, o primeiro acesso cria um Administrador RH (bootstrap).
 */
var Auth = (function () {
  var current = null;

  function email() {
    var e = '';
    try { e = Session.getActiveUser().getEmail(); } catch (err) { e = ''; }
    if (!e) { try { e = Session.getEffectiveUser().getEmail(); } catch (err2) { e = ''; } }
    return Util.str(e).toLowerCase();
  }

  function user() {
    if (current) return current;
    var mail = email();
    if (!mail) throw UserError('Não foi possível identificar seu e-mail Google. Acesse com a conta corporativa.');
    var users = Db.all('Usuarios');
    if (!users.length) {
      Db.insert('Usuarios', { Email: mail, Nome: mail.split('@')[0], Perfil: 'Administrador RH', Ativo: 'Sim' });
      users = Db.all('Usuarios');
    }
    var row = Db.find('Usuarios', mail);
    if (!row || !Util.isYes(row.Ativo)) {
      throw UserError('Acesso não autorizado para ' + mail + '. Solicite liberação ao Administrador RH.');
    }
    if (VT.PERFIS.indexOf(row.Perfil) < 0) throw UserError('Perfil inválido para ' + mail + ': ' + row.Perfil);
    current = { email: mail, nome: row.Nome || mail, perfil: row.Perfil };
    return current;
  }

  function is() {
    var p = user().perfil;
    for (var i = 0; i < arguments.length; i++) if (arguments[i] === p) return true;
    return false;
  }

  function require() {
    var p = user().perfil;
    for (var i = 0; i < arguments.length; i++) if (arguments[i] === p) return;
    throw UserError('Seu perfil (' + p + ') não permite esta ação.');
  }

  /** Vaga visível ao usuário atual? */
  function canSeeVaga(vaga) {
    var u = user();
    if (u.perfil === 'Gestor') return sameName_(vaga.Gestor, u) ;
    return true;
  }

  /** Pode editar a vaga? Admin: todas. Analista: as suas ou sem analista. */
  function canEditVaga(vaga) {
    var u = user();
    if (u.perfil === 'Administrador RH') return true;
    if (u.perfil === 'Analista RH') return !vaga.Analista || sameName_(vaga.Analista, u);
    return false;
  }

  function sameName_(name, u) {
    var n = Util.norm(name);
    if (!n) return false;
    if (n === Util.norm(u.nome) || n === Util.norm(u.email)) return true;
    // Gestor/analista cadastrado com e-mail: compara pelo cadastro.
    var tables = ['Gestores', 'Analistas'];
    for (var t = 0; t < tables.length; t++) {
      var rows = Db.all(tables[t]);
      for (var i = 0; i < rows.length; i++) {
        if (Util.norm(rows[i].Nome) === n && Util.norm(rows[i].Email) === Util.norm(u.email)) return true;
      }
    }
    return false;
  }

  function reset() { current = null; }

  return { email: email, user: user, is: is, require: require, canSeeVaga: canSeeVaga, canEditVaga: canEditVaga, reset: reset };
})();


/* ===================== 04_Sla.gs ===================== */
/**
 * Motor de dias úteis e SLA (funções puras — sem acesso à planilha).
 *
 * Convenções:
 *  - Dia útil: segunda a sexta, exceto feriados (Set de 'aaaa-mm-dd').
 *  - Dias decorridos = dias úteis d com início < d <= referência (o dia da aprovação é o dia 0).
 *  - Prazo = N-ésimo dia útil após o início.
 *  - Suspensão autorizada pausa os dias úteis no intervalo [Inicio, Fim) (aberta: até a referência).
 */
var Sla = (function () {

  function isBusinessDay(iso, holidays) {
    var dow = Util.parse(iso).getUTCDay();
    if (dow === 0 || dow === 6) return false;
    return !(holidays && holidays.has(iso));
  }

  /** Dias úteis em (a, b]. */
  function businessDaysBetween(a, b, holidays) {
    if (!a || !b || b <= a) return 0;
    var count = 0;
    var d = Util.parse(a);
    var end = Util.parse(b).getTime();
    d.setUTCDate(d.getUTCDate() + 1);
    while (d.getTime() <= end) {
      var iso = Util.fmt(d);
      if (isBusinessDay(iso, holidays)) count++;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return count;
  }

  /** N-ésimo dia útil depois de 'a'. */
  function addBusinessDays(a, n, holidays) {
    var d = Util.parse(a);
    var added = 0;
    if (n <= 0) return a;
    while (added < n) {
      d.setUTCDate(d.getUTCDate() + 1);
      if (isBusinessDay(Util.fmt(d), holidays)) added++;
    }
    return Util.fmt(d);
  }

  /** Dias úteis pausados até a referência. */
  function pausedDays(suspensions, start, ref, holidays) {
    var total = 0;
    (suspensions || []).forEach(function (s) {
      if (!s.pausa || !s.inicio) return;
      var ini = s.inicio < start ? start : s.inicio;
      var fimExclusivo = s.fim ? s.fim : Util.addDays(ref, 1);
      if (fimExclusivo > Util.addDays(ref, 1)) fimExclusivo = Util.addDays(ref, 1);
      if (fimExclusivo <= ini) return;
      // dias úteis em [ini, fimExclusivo) = (ini-1, fimExclusivo-1]
      total += businessDaysBetween(Util.addDays(ini, -1), Util.addDays(fimExclusivo, -1), holidays);
    });
    return total;
  }

  /** Cor do semáforo a partir dos dias restantes (regra 9/12/15 para SLA de 15). */
  function level(remaining) {
    if (remaining < 0) return 'vermelho';
    if (remaining <= 2) return 'laranja';
    if (remaining <= 5) return 'amarelo';
    return 'verde';
  }

  /**
   * Calcula o SLA de um intervalo.
   * @param {Object} p {inicio, referencia, fechado (bool), slaDias, extras, holidays, suspensions}
   */
  function compute(p) {
    var limiteBase = p.slaDias;
    var decorridos = businessDaysBetween(p.inicio, p.referencia, p.holidays);
    var pausados = pausedDays(p.suspensions, p.inicio, p.referencia, p.holidays);
    var efetivos = Math.max(0, decorridos - pausados);
    var limite = limiteBase + (p.extras || 0);
    var restantes = limite - efetivos;
    return {
      iniciado: true,
      inicio: p.inicio,
      referencia: p.referencia,
      fechado: !!p.fechado,
      diasDecorridos: decorridos,
      diasPausados: pausados,
      diasEfetivos: efetivos,
      diasAdicionais: p.extras || 0,
      limite: limite,
      diasRestantes: restantes,
      atraso: Math.max(0, -restantes),
      percentual: limite ? Util.round(efetivos / limite * 100, 0) : 0,
      prazoOriginal: addBusinessDays(p.inicio, limiteBase, p.holidays),
      prazoAjustado: addBusinessDays(p.inicio, limite + pausados, p.holidays),
      nivel: level(restantes),
      cumprido: p.fechado ? restantes >= 0 : null
    };
  }

  /** Contexto com feriados por unidade, suspensões e exceções agrupadas por vaga. */
  function buildContext(data, today) {
    var feriados = data.feriados || [];
    var geral = [];
    var porUnidade = {};
    feriados.forEach(function (f) {
      var d = Util.toIsoDate(f.Data);
      if (!d) return;
      var u = Util.norm(f.Unidade);
      if (!u || u === 'todas') geral.push(d);
      else (porUnidade[u] = porUnidade[u] || []).push(d);
    });
    var holidayCache = {};
    function holidaysFor(unidade) {
      var u = Util.norm(unidade);
      if (!holidayCache[u]) holidayCache[u] = new Set(geral.concat(porUnidade[u] || []));
      return holidayCache[u];
    }

    var pausaGlobal = Util.isYes(data.config.SLA_SUSPENSAO_PAUSA);
    var susp = {};
    (data.suspensoes || []).forEach(function (s) {
      (susp[s.VagaID] = susp[s.VagaID] || []).push({
        inicio: Util.toIsoDate(s.Inicio), fim: Util.toIsoDate(s.Fim),
        pausa: pausaGlobal && s.PausaSLA !== 'Não'
      });
    });
    var extras = {};
    (data.excecoes || []).forEach(function (e) {
      extras[e.VagaID] = (extras[e.VagaID] || 0) + Util.int(e.DiasAdicionais);
    });

    return {
      today: today,
      slaDias: Util.int(data.config.SLA_DIAS_UTEIS, 15) || 15,
      holidaysFor: holidaysFor,
      suspensoes: susp,
      extras: extras
    };
  }

  /**
   * SLA de uma vaga e de cada posição.
   * Retorna {iniciado, nivel, ..., posicoes:[{ID, ...sla}], cumprido}
   */
  function forVaga(vaga, posicoes, ctx) {
    var inicio = Util.toIsoDate(vaga.DataAprovacao);
    if (!inicio || vaga.Status === VT.STATUS_AGUARDANDO_APROVACAO) {
      return { iniciado: false, nivel: 'neutro', posicoes: [] };
    }
    var holidays = ctx.holidaysFor(vaga.Unidade);
    var base = {
      inicio: inicio, slaDias: ctx.slaDias, extras: ctx.extras[vaga.ID] || 0,
      holidays: holidays, suspensions: ctx.suspensoes[vaga.ID] || []
    };
    var finalizada = VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0;
    var fechamentoVaga = Util.toIsoDate(vaga.DataFechamento) || ctx.today;

    var posSla = posicoes.map(function (p) {
      var preenchida = p.Status === 'Preenchida' && Util.toIsoDate(p.DataFechamento);
      var ref = preenchida ? Util.toIsoDate(p.DataFechamento) : (finalizada ? fechamentoVaga : ctx.today);
      var r = compute(Object.assign({}, base, { referencia: ref, fechado: !!preenchida }));
      r.posicaoId = p.ID;
      r.numero = p.Numero;
      r.status = p.Status;
      return r;
    });

    var ref = finalizada ? fechamentoVaga : ctx.today;
    var abertas = posicoes.filter(function (p) { return p.Status === 'Aberta'; }).length;
    var geral = compute(Object.assign({}, base, {
      referencia: ref, fechado: vaga.Status === VT.STATUS_CONCLUIDA
    }));
    var preenchidas = posSla.filter(function (s) { return s.fechado; });
    geral.posicoes = posSla;
    geral.posicoesAbertas = abertas;
    geral.cancelada = vaga.Status === VT.STATUS_CANCELADA;
    geral.suspensa = vaga.Status === VT.STATUS_SUSPENSA;
    if (vaga.Status === VT.STATUS_CONCLUIDA) {
      geral.cumprido = preenchidas.length ? preenchidas.every(function (s) { return s.cumprido; }) : geral.diasRestantes >= 0;
    }
    if (geral.cancelada) { geral.nivel = 'neutro'; geral.cumprido = null; }
    if (geral.fechado && !geral.cancelada) geral.nivel = geral.cumprido ? 'verde' : 'vermelho';
    return geral;
  }

  return {
    isBusinessDay: isBusinessDay, businessDaysBetween: businessDaysBetween,
    addBusinessDays: addBusinessDays, pausedDays: pausedDays, level: level,
    compute: compute, buildContext: buildContext, forVaga: forVaga
  };
})();


/* ===================== 05_Vagas.gs ===================== */
/**
 * Abertura e gestão de vagas, posições, suspensões e exceções de SLA.
 */

function configMap_() {
  var map = {};
  Object.keys(VT.CONFIG_PADRAO).forEach(function (k) { map[k] = VT.CONFIG_PADRAO[k]; });
  Db.all('Config').forEach(function (r) {
    if (r.Chave && Util.str(r.Valor) !== '') map[r.Chave] = Util.str(r.Valor);
  });
  return map;
}

function loadCore_() {
  return {
    vagas: Db.all('Vagas'),
    posicoes: Db.all('Posicoes'),
    suspensoes: Db.all('Suspensoes'),
    excecoes: Db.all('ExcecoesSLA'),
    feriados: Db.all('Feriados'),
    config: configMap_()
  };
}

function groupBy_(list, key) {
  var out = {};
  list.forEach(function (r) { (out[r[key]] = out[r[key]] || []).push(r); });
  return out;
}

function clean_(obj) {
  var out = {};
  Object.keys(obj).forEach(function (k) { if (k.charAt(0) !== '_') out[k] = obj[k]; });
  return out;
}

/** Vagas visíveis + SLA calculado. */
function vagasComSla_(data, today) {
  var ctx = Sla.buildContext(data, today || Util.today());
  var posByVaga = groupBy_(data.posicoes, 'VagaID');
  return data.vagas.filter(Auth.canSeeVaga).map(function (v) {
    var pos = (posByVaga[v.ID] || []).sort(function (a, b) { return Util.int(a.Numero) - Util.int(b.Numero); });
    var out = clean_(v);
    out.sla = Sla.forVaga(v, pos, ctx);
    out.posicoesAbertas = pos.filter(function (p) { return p.Status === 'Aberta'; }).length;
    out.posicoesPreenchidas = pos.filter(function (p) { return p.Status === 'Preenchida'; }).length;
    out.posicoesTotal = pos.length;
    out.responsavelAcao = VT.RESPONSAVEL_STATUS[v.Status] || '';
    out.podeEditar = Auth.canEditVaga(v);
    return out;
  });
}

function filtrarVagas_(list, f) {
  f = f || {};
  var q = Util.norm(f.busca);
  return list.filter(function (v) {
    if (q) {
      var hay = Util.norm([v.Codigo, v.ID, v.Cargo, v.Gestor, v.Analista, v.Unidade, v.Departamento].join(' '));
      if (hay.indexOf(q) < 0) return false;
    }
    var eq = ['Empresa', 'Unidade', 'Cargo', 'Gestor', 'Analista', 'Status', 'Departamento', 'Prioridade'];
    for (var i = 0; i < eq.length; i++) {
      var val = f[eq[i]];
      if (val && Util.norm(v[eq[i]]) !== Util.norm(val)) return false;
    }
    var d = Util.toIsoDate(v.DataAbertura);
    if (f.de && (!d || d < f.de)) return false;
    if (f.ate && (!d || d > f.ate)) return false;
    if (f.nivel && v.sla.nivel !== f.nivel) return false;
    if (f.situacao === 'ativas' && VT.STATUS_FINAIS.indexOf(v.Status) >= 0) return false;
    return true;
  });
}

function listVagas(filtros) {
  var list = filtrarVagas_(vagasComSla_(loadCore_()), filtros);
  list.sort(function (a, b) { return (b.DataAbertura || '').localeCompare(a.DataAbertura || '') || (b.Codigo || '').localeCompare(a.Codigo || ''); });
  return list;
}

function getVaga(id) {
  var data = loadCore_();
  var vaga = Db.find('Vagas', id);
  if (!vaga) throw UserError('Vaga não encontrada.');
  if (!Auth.canSeeVaga(vaga)) throw UserError('Você não tem acesso a esta vaga.');
  var full = vagasComSla_({
    vagas: [vaga], posicoes: data.posicoes, suspensoes: data.suspensoes,
    excecoes: data.excecoes, feriados: data.feriados, config: data.config
  })[0];
  full.posicoes = data.posicoes.filter(function (p) { return p.VagaID === vaga.ID; })
    .sort(function (a, b) { return Util.int(a.Numero) - Util.int(b.Numero); }).map(clean_);
  var posIds = full.posicoes.map(function (p) { return p.ID; });
  full.historico = Db.all('Historico').filter(function (h) {
    return h.ReferenciaID === vaga.ID || posIds.indexOf(h.ReferenciaID) >= 0;
  }).map(clean_).sort(function (a, b) { return b.DataHora.localeCompare(a.DataHora); });
  full.suspensoes = data.suspensoes.filter(function (s) { return s.VagaID === vaga.ID; }).map(clean_);
  full.excecoes = data.excecoes.filter(function (s) { return s.VagaID === vaga.ID; }).map(clean_);
  full.candidatos = resumoCandidatosVaga_(vaga.ID);
  var pessoas = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var ctxV = Sla.buildContext(data, Util.today());
  full.candidaturas = candidaturasVisiveis_().filter(function (c) { return c.VagaID === vaga.ID; }).map(function (c) {
    return cardCandidatura_(c, vaga, pessoas[c.CandidatoID], ctxV, Util.today());
  });
  return full;
}

/* ------------------------------ validação ------------------------------ */

var CAMPOS_VAGA = ['Empresa', 'Unidade', 'Cargo', 'Departamento', 'Gestor', 'Analista', 'QtdPosicoes',
  'DataAbertura', 'DataAprovacao', 'MotivoAbertura', 'ColaboradorSubstituido', 'TipoContrato', 'Modalidade',
  'Horario', 'Salario', 'SalarioACombinar', 'Requisitos', 'Atribuicoes', 'Beneficios', 'Observacoes',
  'Prioridade', 'Etapas', 'ReaberturaDe'];

function validarVaga_(v) {
  var erros = [];
  var obrig = { Empresa: 'Empresa', Unidade: 'Unidade', Cargo: 'Cargo', Departamento: 'Departamento',
    Gestor: 'Gestor solicitante', Analista: 'Analista responsável', DataAbertura: 'Data de abertura',
    MotivoAbertura: 'Motivo da abertura', TipoContrato: 'Tipo de contrato', Prioridade: 'Prioridade' };
  Object.keys(obrig).forEach(function (k) { if (!Util.str(v[k])) erros.push(obrig[k] + ' é obrigatório.'); });
  var qtd = Util.int(v.QtdPosicoes, 0);
  if (qtd < 1 || qtd > 200) erros.push('Quantidade de posições deve ser entre 1 e 200.');
  if (v.DataAbertura && !Util.isIsoDate(v.DataAbertura)) erros.push('Data de abertura inválida.');
  if (v.DataAprovacao && !Util.isIsoDate(v.DataAprovacao)) erros.push('Data de aprovação inválida.');
  if (v.DataAprovacao && v.DataAbertura && v.DataAprovacao < v.DataAbertura) erros.push('A aprovação não pode ser anterior à abertura.');
  if (v.MotivoAbertura === 'Substituição' && !Util.str(v.ColaboradorSubstituido)) erros.push('Informe o colaborador substituído.');
  if (!Util.isYes(v.SalarioACombinar) && !Util.str(v.Salario)) erros.push('Informe a faixa salarial ou marque "A combinar".');
  if (v.Empresa && !Db.all('Empresas').some(function (e) { return Util.norm(e.Nome) === Util.norm(v.Empresa); })) erros.push('Empresa não cadastrada.');
  if (v.MotivoAbertura && VT.MOTIVOS_ABERTURA.indexOf(v.MotivoAbertura) < 0) erros.push('Motivo de abertura inválido.');
  if (v.TipoContrato && VT.TIPOS_CONTRATO.indexOf(v.TipoContrato) < 0) erros.push('Tipo de contrato inválido.');
  if (v.Prioridade && VT.PRIORIDADES.indexOf(v.Prioridade) < 0) erros.push('Prioridade inválida.');
  if (erros.length) throw UserError(erros.join('\n'));
}

function proximoCodigo_(empresa, dataAbertura) {
  var emp = Db.all('Empresas').filter(function (e) { return Util.norm(e.Nome) === Util.norm(empresa); })[0];
  var sigla = (emp && emp.Sigla) || Util.str(empresa).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  var ano = (dataAbertura || Util.today()).substr(0, 4);
  var prefix = sigla + '-' + ano + '-';
  var max = 0;
  Db.all('Vagas').forEach(function (v) {
    if (v.Codigo && v.Codigo.indexOf(prefix) === 0) max = Math.max(max, Util.int(v.Codigo.substr(prefix.length)));
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

/* ------------------------------ gravação ------------------------------ */

function saveVaga(input) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var v = {};
    CAMPOS_VAGA.forEach(function (k) { v[k] = Util.str(input[k]); });
    v.DataAbertura = Util.toIsoDate(v.DataAbertura);
    v.DataAprovacao = Util.toIsoDate(v.DataAprovacao);
    v.SalarioACombinar = Util.isYes(v.SalarioACombinar) ? 'Sim' : 'Não';
    if (v.SalarioACombinar === 'Sim') v.Salario = '';
    if (v.MotivoAbertura !== 'Substituição') v.ColaboradorSubstituido = '';
    validarVaga_(v);
    var u = Auth.user();
    var qtd = Util.int(v.QtdPosicoes);

    if (!input.ID) {
      v.ID = Util.id('VAG');
      v.Codigo = proximoCodigo_(v.Empresa, v.DataAbertura);
      v.Status = v.DataAprovacao ? 'Aprovada / aguardando divulgação' : VT.STATUS_AGUARDANDO_APROVACAO;
      v.Reaberturas = '0';
      v.CriadoEm = Util.now();
      v.CriadoPor = u.email;
      v.AtualizadoEm = v.CriadoEm;
      v.AtualizadoPor = u.email;
      Db.insert('Vagas', v);
      var posicoes = [];
      for (var i = 1; i <= qtd; i++) {
        posicoes.push({ ID: Util.id('POS'), VagaID: v.ID, Numero: String(i), Status: 'Aberta', Reaberturas: '0' });
      }
      Db.insertMany('Posicoes', posicoes);
      logHistory_('Vaga', v.ID, '', v.Status, 'Abertura da vaga ' + v.Codigo + (v.ReaberturaDe ? ' (reabertura de ' + v.ReaberturaDe + ')' : ''));
      return getVaga(v.ID);
    }

    var atual = Db.find('Vagas', input.ID);
    if (!atual) throw UserError('Vaga não encontrada.');
    if (!Auth.canEditVaga(atual)) throw UserError('Você só pode editar as vagas sob sua responsabilidade.');
    if (VT.STATUS_FINAIS.indexOf(atual.Status) >= 0) throw UserError('Vaga ' + atual.Status.toLowerCase() + ' não pode ser editada. Reabra a vaga primeiro.');

    // Data de aprovação só muda pelo fluxo de status (preserva o início oficial do SLA)
    if (atual.DataAprovacao && v.DataAprovacao !== atual.DataAprovacao) {
      if (!Auth.is('Administrador RH')) throw UserError('Somente o Administrador RH pode alterar a data oficial de aprovação.');
      if (!Util.str(input.Justificativa)) throw UserError('Justifique a alteração da data de aprovação.');
    }
    var alterados = [];
    CAMPOS_VAGA.forEach(function (k) { if (Util.str(atual[k]) !== v[k]) alterados.push(k); });
    ajustarPosicoes_(atual, qtd);
    var patch = Object.assign({}, v, { AtualizadoEm: Util.now(), AtualizadoPor: u.email });
    if (atual.Status === VT.STATUS_AGUARDANDO_APROVACAO && v.DataAprovacao) {
      patch.Status = 'Aprovada / aguardando divulgação';
      logHistory_('Vaga', atual.ID, atual.Status, patch.Status, 'Aprovação registrada na edição');
    }
    Db.update('Vagas', atual.ID, patch);
    if (alterados.length) {
      logHistory_('Vaga', atual.ID, '', '', 'Edição: ' + alterados.join(', ') + (input.Justificativa ? ' — ' + input.Justificativa : ''));
    }
    return getVaga(atual.ID);
  });
}

function ajustarPosicoes_(vaga, qtd) {
  var pos = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID; });
  var ativas = pos.filter(function (p) { return p.Status !== 'Cancelada'; });
  if (qtd > ativas.length) {
    var maxNum = pos.reduce(function (m, p) { return Math.max(m, Util.int(p.Numero)); }, 0);
    var novas = [];
    for (var i = 1; i <= qtd - ativas.length; i++) {
      novas.push({ ID: Util.id('POS'), VagaID: vaga.ID, Numero: String(maxNum + i), Status: 'Aberta', Reaberturas: '0' });
    }
    Db.insertMany('Posicoes', novas);
    logHistory_('Vaga', vaga.ID, ativas.length, qtd, 'Posições acrescentadas');
  } else if (qtd < ativas.length) {
    var remover = ativas.length - qtd;
    var abertas = ativas.filter(function (p) { return p.Status === 'Aberta'; })
      .sort(function (a, b) { return Util.int(b.Numero) - Util.int(a.Numero); });
    if (abertas.length < remover) throw UserError('Não é possível reduzir: há posições já preenchidas.');
    abertas.slice(0, remover).forEach(function (p) {
      Db.update('Posicoes', p.ID, { Status: 'Cancelada', DataFechamento: Util.today() });
      logHistory_('Posicao', p.ID, 'Aberta', 'Cancelada', 'Redução da quantidade de posições');
    });
  }
}

/**
 * Altera o status com histórico.
 * opts: {justificativa, data (aaaa-mm-dd), pausaSLA ('Sim'/'Não')}
 */
function changeVagaStatus(id, novo, opts) {
  opts = opts || {};
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var vaga = Db.find('Vagas', id);
    if (!vaga) throw UserError('Vaga não encontrada.');
    if (!Auth.canEditVaga(vaga)) throw UserError('Você só pode movimentar as vagas sob sua responsabilidade.');
    if (VT.STATUS_VAGA.indexOf(novo) < 0) throw UserError('Status inválido.');
    if (novo === vaga.Status) throw UserError('A vaga já está neste status.');
    var just = Util.str(opts.justificativa);
    var data = Util.toIsoDate(opts.data) || Util.today();
    if (opts.data && !Util.isIsoDate(data)) throw UserError('Data inválida.');
    if (data > Util.today()) throw UserError('A data não pode ser futura.');
    var anterior = vaga.Status;
    var eraFinal = VT.STATUS_FINAIS.indexOf(anterior) >= 0;
    var patch = { Status: novo, AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() };
    var posicoes = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID; });

    if ((novo === VT.STATUS_SUSPENSA || novo === VT.STATUS_CANCELADA || eraFinal) && !just) {
      throw UserError('Justificativa obrigatória para ' + (eraFinal ? 'reabrir a vaga' : novo.toLowerCase()) + '.');
    }

    // Validações antes de qualquer gravação
    if (novo === VT.STATUS_CONCLUIDA) {
      var abertas = posicoes.filter(function (p) { return p.Status === 'Aberta'; });
      if (abertas.length) throw UserError('Ainda há ' + abertas.length + ' posição(ões) em aberto. Registre o preenchimento de cada posição antes de concluir.');
      if (!posicoes.some(function (p) { return p.Status === 'Preenchida'; })) throw UserError('Nenhuma posição preenchida. Para encerrar sem contratação, cancele a vaga.');
    }
    if (eraFinal && VT.STATUS_FINAIS.indexOf(novo) < 0 && !posicoes.some(function (p) { return p.Status === 'Aberta'; })) {
      throw UserError('Nenhuma posição em aberto. Reabra uma posição específica (ela reabrirá a vaga automaticamente).');
    }
    if (anterior === VT.STATUS_SUSPENSA) {
      Db.all('Suspensoes').forEach(function (s) {
        if (s.VagaID === vaga.ID && !s.Fim && data < s.Inicio) throw UserError('A retomada não pode ser anterior ao início da suspensão (' + s.Inicio + ').');
      });
    }
    if (anterior === VT.STATUS_AGUARDANDO_APROVACAO && novo !== VT.STATUS_CANCELADA && !vaga.DataAprovacao && data < Util.toIsoDate(vaga.DataAbertura)) {
      throw UserError('A aprovação não pode ser anterior à abertura.');
    }

    // Aprovação: define o início oficial do SLA
    if (anterior === VT.STATUS_AGUARDANDO_APROVACAO && novo !== VT.STATUS_CANCELADA) {
      if (!vaga.DataAprovacao) patch.DataAprovacao = data;
    }

    // Saindo de suspensão: encerra a suspensão aberta
    if (anterior === VT.STATUS_SUSPENSA) {
      Db.all('Suspensoes').filter(function (s) { return s.VagaID === vaga.ID && !s.Fim; }).forEach(function (s) {
        Db.update('Suspensoes', s.ID, { Fim: data });
      });
    }
    if (novo === VT.STATUS_SUSPENSA) {
      Db.insert('Suspensoes', {
        ID: Util.id('SUS'), VagaID: vaga.ID, Inicio: data, Fim: '', Justificativa: just,
        PausaSLA: opts.pausaSLA === 'Não' ? 'Não' : 'Sim', Usuario: Auth.email(), CriadoEm: Util.now()
      });
    }

    if (novo === VT.STATUS_CONCLUIDA) {
      var datas = posicoes.filter(function (p) { return p.Status === 'Preenchida'; }).map(function (p) { return p.DataFechamento; }).sort();
      patch.DataFechamento = datas[datas.length - 1];
    }
    if (novo === VT.STATUS_CANCELADA) {
      posicoes.filter(function (p) { return p.Status === 'Aberta'; }).forEach(function (p) {
        Db.update('Posicoes', p.ID, { Status: 'Cancelada', DataFechamento: data });
      });
      patch.DataFechamento = data;
    }
    if (eraFinal && VT.STATUS_FINAIS.indexOf(novo) < 0) {
      patch.DataFechamento = '';
      patch.Reaberturas = String(Util.int(vaga.Reaberturas) + 1);
    }
    Db.update('Vagas', vaga.ID, patch);
    logHistory_('Vaga', vaga.ID, anterior, novo, just + (opts.data ? ' [data: ' + data + ']' : ''));
    return getVaga(vaga.ID);
  });
}

/** Registra o preenchimento de uma posição. Conclui a vaga quando não restarem posições abertas. */
function fillPosition(posId, info) {
  info = info || {};
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var pos = Db.find('Posicoes', posId);
    if (!pos) throw UserError('Posição não encontrada.');
    var vaga = Db.find('Vagas', pos.VagaID);
    if (!Auth.canEditVaga(vaga)) throw UserError('Sem permissão para esta vaga.');
    fillPositionCore_(pos, vaga, info);
    return getVaga(vaga.ID);
  });
}

/** Preenche a posição (sem lock — chamado dentro de Db.withLock). */
function fillPositionCore_(pos, vaga, info) {
  if (pos.Status !== 'Aberta') throw UserError('A posição não está aberta.');
  if (!vaga.DataAprovacao) throw UserError('A vaga ainda não foi aprovada.');
  if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0 || vaga.Status === VT.STATUS_SUSPENSA) throw UserError('A vaga está ' + vaga.Status.toLowerCase() + '.');
  var data = Util.toIsoDate(info.data) || Util.today();
  if (!Util.isIsoDate(data)) throw UserError('Data inválida.');
  if (data < vaga.DataAprovacao) throw UserError('O fechamento não pode ser anterior à aprovação (' + vaga.DataAprovacao + ').');
  if (data > Util.today()) throw UserError('A data de fechamento não pode ser futura.');
  var nome = Util.str(info.nome);
  if (!nome) throw UserError('Informe o nome do contratado.');
  Db.update('Posicoes', pos.ID, { Status: 'Preenchida', DataFechamento: data, NomeContratado: nome, CandidatoID: Util.str(info.candidatoId) });
  logHistory_('Posicao', pos.ID, 'Aberta', 'Preenchida', 'Posição ' + pos.Numero + ' preenchida por ' + nome + ' em ' + data);

  var restantes = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID && p.Status === 'Aberta'; });
  if (!restantes.length) {
    var datas = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID && p.Status === 'Preenchida'; })
      .map(function (p) { return p.DataFechamento; }).sort();
    var anterior = vaga.Status;
    Db.update('Vagas', vaga.ID, { Status: VT.STATUS_CONCLUIDA, DataFechamento: datas[datas.length - 1], AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() });
    logHistory_('Vaga', vaga.ID, anterior, VT.STATUS_CONCLUIDA, 'Conclusão automática: todas as posições preenchidas');
  }
  return data;
}

/** Reabre uma posição preenchida/cancelada (conta como reabertura da requisição). */
function reopenPosition(posId, justificativa) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var pos = Db.find('Posicoes', posId);
    if (!pos) throw UserError('Posição não encontrada.');
    var vaga = Db.find('Vagas', pos.VagaID);
    if (!Auth.canEditVaga(vaga)) throw UserError('Sem permissão para esta vaga.');
    if (pos.Status === 'Aberta') throw UserError('A posição já está aberta.');
    if (!Util.str(justificativa)) throw UserError('Justificativa obrigatória para reabrir.');
    var anteriorPos = pos.Status;
    Db.update('Posicoes', pos.ID, { Status: 'Aberta', DataFechamento: '', NomeContratado: '', CandidatoID: '', Reaberturas: String(Util.int(pos.Reaberturas) + 1) });
    logHistory_('Posicao', pos.ID, anteriorPos, 'Aberta', 'Reabertura da posição ' + pos.Numero + ': ' + justificativa);
    var patch = { Reaberturas: String(Util.int(vaga.Reaberturas) + 1), AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() };
    if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0) {
      patch.Status = 'Aberta / recebendo candidaturas';
      patch.DataFechamento = '';
      logHistory_('Vaga', vaga.ID, vaga.Status, patch.Status, 'Reaberta pela posição ' + pos.Numero + ': ' + justificativa);
    }
    Db.update('Vagas', vaga.ID, patch);
    return getVaga(vaga.ID);
  });
}

function cancelPosition(posId, justificativa) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var pos = Db.find('Posicoes', posId);
    if (!pos) throw UserError('Posição não encontrada.');
    var vaga = Db.find('Vagas', pos.VagaID);
    if (!Auth.canEditVaga(vaga)) throw UserError('Sem permissão para esta vaga.');
    if (pos.Status !== 'Aberta') throw UserError('Somente posições abertas podem ser canceladas.');
    if (!Util.str(justificativa)) throw UserError('Justificativa obrigatória.');
    Db.update('Posicoes', pos.ID, { Status: 'Cancelada', DataFechamento: Util.today() });
    logHistory_('Posicao', pos.ID, 'Aberta', 'Cancelada', 'Posição ' + pos.Numero + ': ' + justificativa);
    var todas = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID; });
    if (!todas.some(function (p) { return p.Status === 'Aberta'; })) {
      var preenchidas = todas.filter(function (p) { return p.Status === 'Preenchida'; }).map(function (p) { return p.DataFechamento; }).sort();
      var novo = preenchidas.length ? VT.STATUS_CONCLUIDA : VT.STATUS_CANCELADA;
      Db.update('Vagas', vaga.ID, { Status: novo, DataFechamento: preenchidas.length ? preenchidas[preenchidas.length - 1] : Util.today(), AtualizadoEm: Util.now(), AtualizadoPor: Auth.email() });
      logHistory_('Vaga', vaga.ID, vaga.Status, novo, 'Encerramento automático: nenhuma posição em aberto');
    }
    return getVaga(vaga.ID);
  });
}

/** Exceção justificada: amplia o prazo sem alterar o prazo original. */
function addSlaException(vagaId, dias, justificativa) {
  Auth.require('Administrador RH');
  return Db.withLock(function () {
    var vaga = Db.find('Vagas', vagaId);
    if (!vaga) throw UserError('Vaga não encontrada.');
    var n = Util.int(dias, 0);
    if (n < 1 || n > 60) throw UserError('Dias adicionais devem estar entre 1 e 60.');
    if (!Util.str(justificativa)) throw UserError('Justificativa obrigatória.');
    Db.insert('ExcecoesSLA', { ID: Util.id('EXC'), VagaID: vaga.ID, DiasAdicionais: String(n), Justificativa: justificativa, Usuario: Auth.email(), CriadoEm: Util.now() });
    logHistory_('Vaga', vaga.ID, '', '', 'Exceção de SLA: +' + n + ' dia(s) útil(eis) — ' + justificativa);
    return getVaga(vaga.ID);
  });
}

/** Contagem de candidatos da vaga por etapa alcançada (cabeçalho da página da vaga). */
function resumoCandidatosVaga_(vagaId) {
  var etapas = VT.ETAPAS_KANBAN;
  var idxReprov = etapas.indexOf('Reprovado / desistente');
  var cands = Db.all('Candidaturas').filter(function (c) { return c.VagaID === vagaId; });
  var ids = {};
  cands.forEach(function (c) { ids[c.ID] = true; });
  var max = {};
  cands.forEach(function (c) { var i = etapas.indexOf(c.Etapa); max[c.ID] = i >= 0 && i !== idxReprov ? i : 0; });
  Db.all('EtapasCandidatura').forEach(function (e) {
    if (!ids[e.CandidaturaID]) return;
    var i = etapas.indexOf(e.Etapa);
    if (i >= 0 && i !== idxReprov) max[e.CandidaturaID] = Math.max(max[e.CandidaturaID], i);
  });
  var entrevistados = {};
  Db.all('Entrevistas').forEach(function (e) { if (ids[e.CandidaturaID] && e.Realizacao) entrevistados[e.CandidaturaID] = true; });
  function alcancou(nome) { var n = etapas.indexOf(nome); return cands.filter(function (c) { return max[c.ID] >= n; }).length; }
  return {
    total: cands.length,
    triados: alcancou('Triagem de currículo'),
    entrevistados: Math.max(Object.keys(entrevistados).length, alcancou('Entrevista RH')),
    encaminhados: alcancou('Entrevista gestor'),
    aprovados: alcancou('Aprovado'),
    admissao: alcancou('Processo admissional'),
    contratados: alcancou('Contratado'),
    reprovados: cands.filter(function (c) { return etapas.indexOf(c.Etapa) === idxReprov; }).length
  };
}


/* ===================== 06_Cadastros.gs ===================== */
/**
 * Cadastros de apoio: empresas, unidades, departamentos, cargos, gestores,
 * analistas, feriados, usuários e parâmetros.
 */
var CADASTROS = {
  Empresas: { obrig: ['Nome', 'Sigla'], unico: ['Nome'], soft: true },
  Unidades: { obrig: ['Empresa', 'Nome'], unico: ['Empresa', 'Nome'], soft: true },
  Departamentos: { obrig: ['Nome'], unico: ['Nome'], soft: true },
  Cargos: { obrig: ['Nome'], unico: ['Nome'], soft: true },
  Gestores: { obrig: ['Nome'], unico: ['Nome'], soft: true },
  Analistas: { obrig: ['Nome'], unico: ['Nome'], soft: true },
  Feriados: { obrig: ['Data', 'Descricao'], unico: ['Data', 'Unidade'], soft: false },
  Usuarios: { obrig: ['Email', 'Nome', 'Perfil'], unico: ['Email'], soft: true },
  Config: { obrig: ['Chave'], unico: ['Chave'], soft: false }
};

function cleanList_(rows) { return rows.map(clean_); }

/** Listas usadas nos formulários e filtros (todos os perfis). */
function getLookups() {
  function ativos(t) { return Db.all(t).filter(function (r) { return r.Ativo === '' || Util.isYes(r.Ativo); }).map(clean_); }
  return {
    empresas: ativos('Empresas'),
    unidades: ativos('Unidades'),
    departamentos: ativos('Departamentos'),
    cargos: ativos('Cargos'),
    gestores: ativos('Gestores'),
    analistas: ativos('Analistas'),
    statusVaga: VT.STATUS_VAGA,
    motivosAbertura: VT.MOTIVOS_ABERTURA,
    tiposContrato: VT.TIPOS_CONTRATO,
    modalidades: VT.MODALIDADES,
    prioridades: VT.PRIORIDADES,
    etapasKanban: VT.ETAPAS_KANBAN,
    motivosReprovacao: VT.MOTIVOS_REPROVACAO,
    origens: VT.ORIGENS_CANDIDATURA,
    tiposEntrevista: VT.TIPOS_ENTREVISTA,
    resultadosEntrevista: VT.RESULTADOS_ENTREVISTA,
    perfis: VT.PERFIS,
    config: configMap_()
  };
}

function listCadastro(tabela) {
  if (!CADASTROS[tabela]) throw UserError('Cadastro inválido.');
  if (tabela === 'Usuarios' || tabela === 'Config') Auth.require('Administrador RH');
  var rows = cleanList_(Db.all(tabela));
  if (tabela === 'Feriados') rows.sort(function (a, b) { return b.Data.localeCompare(a.Data); });
  else rows.sort(function (a, b) { return Util.norm(a.Nome || a.Email || a.Chave).localeCompare(Util.norm(b.Nome || b.Email || b.Chave)); });
  return rows;
}

function saveCadastro(tabela, input) {
  Auth.require('Administrador RH');
  var def = CADASTROS[tabela];
  if (!def) throw UserError('Cadastro inválido.');
  return Db.withLock(function () {
    var row = {};
    SCHEMA[tabela].forEach(function (h) { if (input[h] !== undefined) row[h] = Util.str(input[h]); });
    if (tabela === 'Feriados') {
      row.Data = Util.toIsoDate(row.Data);
      if (!Util.isIsoDate(row.Data)) throw UserError('Data do feriado inválida.');
    }
    if (tabela === 'Usuarios') {
      row.Email = Util.str(row.Email).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.Email)) throw UserError('E-mail inválido.');
      if (VT.PERFIS.indexOf(row.Perfil) < 0) throw UserError('Perfil inválido.');
    }
    if (tabela === 'Gestores' || tabela === 'Analistas') {
      row.Email = Util.str(row.Email).toLowerCase();
      if (row.Email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.Email)) throw UserError('E-mail inválido.');
    }
    if (tabela === 'Empresas') row.Sigla = Util.str(row.Sigla).toUpperCase();
    if (tabela === 'Config' && row.Chave === 'SLA_DIAS_UTEIS') {
      var n = Util.int(row.Valor, 0);
      if (n < 1 || n > 120) throw UserError('SLA deve ser entre 1 e 120 dias úteis.');
    }
    var faltando = def.obrig.filter(function (k) { return !Util.str(row[k]); });
    if (faltando.length) throw UserError('Campos obrigatórios: ' + faltando.join(', ') + '.');
    if (def.soft && row.Ativo === undefined) row.Ativo = 'Sim';

    var keyField = SCHEMA_KEY[tabela] || 'ID';
    var editingKey = input._key || (keyField === 'ID' ? input.ID : '');
    var dup = Db.all(tabela).filter(function (r) {
      if (editingKey && Util.norm(r[keyField]) === Util.norm(editingKey)) return false;
      return def.unico.every(function (k) { return Util.norm(r[k]) === Util.norm(row[k]); });
    });
    if (dup.length) throw UserError('Já existe um registro com ' + def.unico.join(' + ') + ' igual.');

    if (editingKey) {
      var atual = Db.find(tabela, editingKey);
      if (!atual) throw UserError('Registro não encontrado.');
      if (keyField !== 'ID' && Util.norm(row[keyField]) !== Util.norm(editingKey)) throw UserError(keyField + ' não pode ser alterado.');
      if (tabela === 'Usuarios' && atual.Email === Auth.email() && (row.Perfil !== 'Administrador RH' || !Util.isYes(row.Ativo))) {
        throw UserError('Você não pode remover seu próprio acesso de administrador.');
      }
      Db.update(tabela, editingKey, row);
      logHistory_('Config', tabela + ':' + editingKey, '', '', 'Cadastro atualizado');
    } else {
      if (keyField === 'ID') row.ID = Util.id(tabela.substr(0, 3).toUpperCase());
      Db.insert(tabela, row);
      logHistory_('Config', tabela + ':' + (row[keyField] || ''), '', '', 'Cadastro incluído');
    }
    return listCadastro(tabela);
  });
}

function deleteCadastro(tabela, key) {
  Auth.require('Administrador RH');
  var def = CADASTROS[tabela];
  if (!def) throw UserError('Cadastro inválido.');
  return Db.withLock(function () {
    if (def.soft) {
      Db.update(tabela, key, { Ativo: 'Não' });
      logHistory_('Config', tabela + ':' + key, 'Ativo', 'Inativo', 'Cadastro inativado');
    } else {
      Db.remove(tabela, key);
      logHistory_('Config', tabela + ':' + key, '', '', 'Cadastro excluído');
    }
    return listCadastro(tabela);
  });
}


/* ===================== 07_Dashboard.gs ===================== */
/**
 * Indicadores gerenciais — sempre calculados a partir dos registros.
 */
function getDashboard(filtros) {
  filtros = filtros || {};
  var today = Util.today();
  var core = loadCore_();
  var todas = vagasComSla_(core, today);
  var vagas = filtrarVagas_(todas, filtros);
  var ids = {};
  vagas.forEach(function (v) { ids[v.ID] = v; });
  var cfg = core.config;
  var alertaDias = Util.int(cfg.ALERTA_DIAS_RESTANTES, 3);
  var semMovDias = Util.int(cfg.SEM_MOVIMENTACAO_DIAS, 3);
  var mes = today.substr(0, 7);

  var ativas = vagas.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0 && v.Status !== VT.STATUS_SUSPENSA; });
  var suspensas = vagas.filter(function (v) { return v.Status === VT.STATUS_SUSPENSA; });
  var concluidas = vagas.filter(function (v) { return v.Status === VT.STATUS_CONCLUIDA; });
  var concluidasNoSla = concluidas.filter(function (v) { return v.sla.cumprido === true; });
  var concluidasForaSla = concluidas.filter(function (v) { return v.sla.cumprido === false; });
  var abertasVencidas = ativas.filter(function (v) { return v.sla.iniciado && v.sla.diasRestantes < 0; });
  var proximas = ativas.filter(function (v) { return v.sla.iniciado && v.sla.diasRestantes >= 0 && v.sla.diasRestantes <= alertaDias; });

  // Posições preenchidas (base do tempo médio e da taxa de SLA)
  var preenchidas = [];
  vagas.forEach(function (v) {
    (v.sla.posicoes || []).forEach(function (p) {
      if (p.status === 'Preenchida' && p.fechado) preenchidas.push({ vaga: v, sla: p });
    });
  });
  var tempoMedio = Util.avg(preenchidas.map(function (p) { return p.sla.diasEfetivos; }));
  var noPrazo = preenchidas.filter(function (p) { return p.sla.cumprido; }).length;

  // Candidaturas (Fase 2) — ligadas às vagas filtradas
  var cands = Db.all('Candidaturas').filter(function (c) { return ids[c.VagaID]; });
  var etapas = VT.ETAPAS_KANBAN;
  var idxReprov = etapas.indexOf('Reprovado / desistente');
  var idxAprov = etapas.indexOf('Aprovado');
  var idxContr = etapas.indexOf('Contratado');
  function idx(e) { return etapas.indexOf(e); }

  var cards = {
    vagasAbertas: ativas.length,
    vagasSuspensas: suspensas.length,
    posicoesDisponiveis: ativas.reduce(function (s, v) { return s + v.posicoesAbertas; }, 0),
    abertasNoMes: vagas.filter(function (v) { return Util.monthKey(v.DataAbertura) === mes; }).length,
    encerradasNoMes: vagas.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) >= 0 && Util.monthKey(v.DataFechamento) === mes; }).length,
    concluidasNoSla: concluidasNoSla.length,
    foraDoSla: concluidasForaSla.length + abertasVencidas.length,
    foraDoSlaAbertas: abertasVencidas.length,
    foraDoSlaConcluidas: concluidasForaSla.length,
    proximasVencimento: proximas.length,
    candidaturas: cands.length,
    emProcesso: cands.filter(function (c) { var i = idx(c.Etapa); return i >= 0 && i < idxAprov; }).length,
    aprovados: cands.filter(function (c) { var i = idx(c.Etapa); return i >= idxAprov && i <= idxContr; }).length,
    reprovados: cands.filter(function (c) { return idx(c.Etapa) === idxReprov; }).length,
    contratacoes: preenchidas.length,
    tempoMedioFechamento: tempoMedio === null ? null : Util.round(tempoMedio, 1),
    taxaSla: preenchidas.length ? Util.round(noPrazo / preenchidas.length * 100, 0) : null,
    posicoesPreenchidas: preenchidas.length
  };

  // 1. Abertas x fechadas por mês (últimos 12 meses ou período filtrado)
  var meses = monthRange_(filtros.de, filtros.ate, today);
  var abertasMes = Util.groupCount(vagas, function (v) { return Util.monthKey(v.DataAbertura); });
  var fechadasMes = Util.groupCount(concluidas, function (v) { return Util.monthKey(v.DataFechamento); });
  var canceladasMes = Util.groupCount(vagas.filter(function (v) { return v.Status === VT.STATUS_CANCELADA; }), function (v) { return Util.monthKey(v.DataFechamento); });

  // 2. Tempo médio de fechamento por cargo
  var porCargo = {};
  preenchidas.forEach(function (p) { (porCargo[p.vaga.Cargo] = porCargo[p.vaga.Cargo] || []).push(p.sla.diasEfetivos); });
  var tempoCargo = Object.keys(porCargo).map(function (k) {
    return { label: k, valor: Util.round(Util.avg(porCargo[k]), 1), n: porCargo[k].length };
  }).sort(function (a, b) { return b.valor - a.valor; }).slice(0, 12);

  // 3. Tempo médio em cada etapa (status) da vaga — a partir do histórico
  var tempoEtapa = tempoPorStatus_(vagas, core, today);

  var etapasCand = tempoEtapasCandidato_(ids, core, today);

  // 4/7. Funil e conversão por etapa
  var maxEtapa = {};
  cands.forEach(function (c) { var i = idx(c.Etapa); if (i >= 0 && i !== idxReprov) maxEtapa[c.ID] = i; });
  var candById = {};
  cands.forEach(function (c) { candById[c.ID] = c; });
  Db.all('EtapasCandidatura').forEach(function (e) {
    var c = candById[e.CandidaturaID];
    if (!c) return;
    var i = idx(e.Etapa);
    if (i >= 0 && i !== idxReprov) maxEtapa[c.ID] = Math.max(maxEtapa[c.ID] === undefined ? -1 : maxEtapa[c.ID], i);
  });
  cands.forEach(function (c) { if (maxEtapa[c.ID] === undefined) maxEtapa[c.ID] = 0; });
  var funil = etapas.slice(0, idxReprov).map(function (e, i) {
    var n = cands.filter(function (c) { return maxEtapa[c.ID] >= i; }).length;
    return { label: e, valor: n };
  });
  var conversao = funil.slice(1).map(function (f, i) {
    var prev = funil[i].valor;
    return { label: f.label, valor: prev ? Util.round(f.valor / prev * 100, 0) : null };
  });

  // 5. Motivos de reprovação
  var motivos = toSeries_(Util.groupCount(cands, function (c) { return c.MotivoReprovacao; }));

  // 6. Vagas por analista
  var analistas = {};
  vagas.forEach(function (v) {
    var a = v.Analista || 'Sem analista';
    analistas[a] = analistas[a] || { label: a, ativas: 0, concluidas: 0, outras: 0 };
    if (VT.STATUS_FINAIS.indexOf(v.Status) < 0) analistas[a].ativas++;
    else if (v.Status === VT.STATUS_CONCLUIDA) analistas[a].concluidas++;
    else analistas[a].outras++;
  });

  // 8. Reaberturas por cargo
  var reab = {};
  vagas.forEach(function (v) {
    var n = Util.int(v.Reaberturas) + (v.ReaberturaDe ? 1 : 0);
    if (n) reab[v.Cargo] = (reab[v.Cargo] || 0) + n;
  });

  // 9. Contratações por origem
  var origens = toSeries_(Util.groupCount(cands.filter(function (c) { return c.Etapa === 'Contratado'; }), function (c) { return c.Origem || 'Não informada'; }));

  // 10. Dentro x fora do SLA
  var slaDist = { verde: 0, amarelo: 0, laranja: 0, vermelho: 0 };
  ativas.forEach(function (v) { if (v.sla.iniciado && slaDist[v.sla.nivel] !== undefined) slaDist[v.sla.nivel]++; });

  // Alertas de SLA / gargalos
  var ultimaMov = ultimaMovimentacao_(core);
  var ctxAlertas = Sla.buildContext(core, today);
  var alertas = vagas.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0; }).map(function (v) {
    var mov = ultimaMov[v.ID] || { data: Util.toIsoDate(v.CriadoEm) || v.DataAbertura, status: v.Status };
    var holidays = ctxAlertas.holidaysFor(v.Unidade);
    var parado = Sla.businessDaysBetween(Util.toIsoDate(mov.data), today, holidays);
    return {
      ID: v.ID, Codigo: v.Codigo || v.ID, Cargo: v.Cargo, Unidade: v.Unidade, Analista: v.Analista, Gestor: v.Gestor,
      Status: v.Status, responsavel: v.responsavelAcao, diasNaEtapa: parado,
      semMovimentacao: parado > semMovDias, sla: {
        iniciado: v.sla.iniciado, diasEfetivos: v.sla.diasEfetivos, diasRestantes: v.sla.diasRestantes,
        nivel: v.sla.nivel, prazoAjustado: v.sla.prazoAjustado, percentual: v.sla.percentual,
        limite: v.sla.limite, atraso: v.sla.atraso, fechado: false, suspensa: v.sla.suspensa
      }
    };
  }).filter(function (a) {
    return a.semMovimentacao || (a.sla.iniciado && a.sla.diasRestantes <= alertaDias) || !a.sla.iniciado;
  }).sort(function (a, b) {
    var ra = a.sla.iniciado ? a.sla.diasRestantes : 999, rb = b.sla.iniciado ? b.sla.diasRestantes : 999;
    return ra - rb || b.diasNaEtapa - a.diasNaEtapa;
  }).slice(0, 30);

  return {
    atualizadoEm: Util.now(),
    referencia: today,
    cards: cards,
    graficos: {
      mensal: meses.map(function (m) { return { label: m, abertas: abertasMes[m] || 0, fechadas: fechadasMes[m] || 0, canceladas: canceladasMes[m] || 0 }; }),
      tempoCargo: tempoCargo,
      tempoEtapa: tempoEtapa,
      tempoEtapaCandidato: etapasCand.tempos,
      pendencias: etapasCand.pendencias,
      funil: funil,
      conversao: conversao,
      motivos: motivos,
      analistas: Object.keys(analistas).map(function (k) { return analistas[k]; }).sort(function (a, b) { return (b.ativas + b.concluidas) - (a.ativas + a.concluidas); }),
      reaberturas: toSeries_(reab),
      origens: origens,
      sla: slaDist,
      slaConcluidas: { noPrazo: concluidasNoSla.length, atrasadas: concluidasForaSla.length }
    },
    alertas: alertas,
    prazos: vagas.filter(function (v) { return VT.STATUS_FINAIS.indexOf(v.Status) < 0; }).map(function (v) {
      return {
        ID: v.ID, Codigo: v.Codigo || v.ID, Cargo: v.Cargo, Analista: v.Analista, Departamento: v.Departamento,
        Unidade: v.Unidade, Status: v.Status, DataAbertura: v.DataAbertura, posicoesAbertas: v.posicoesAbertas,
        posicoesTotal: v.posicoesTotal, sla: {
          iniciado: v.sla.iniciado, nivel: v.sla.nivel, diasEfetivos: v.sla.diasEfetivos, diasRestantes: v.sla.diasRestantes,
          atraso: v.sla.atraso, limite: v.sla.limite, prazoAjustado: v.sla.prazoAjustado, percentual: v.sla.percentual,
          suspensa: v.sla.suspensa, fechado: false
        }
      };
    })
  };
}

function toSeries_(obj) {
  return Object.keys(obj).map(function (k) { return { label: k, valor: obj[k] }; })
    .sort(function (a, b) { return b.valor - a.valor; });
}

function monthRange_(de, ate, today) {
  var end = (ate || today).substr(0, 7);
  var start = de ? de.substr(0, 7) : null;
  var out = [];
  var y = +end.substr(0, 4), m = +end.substr(5, 2);
  for (var i = 0; i < 36; i++) {
    var key = y + '-' + (m < 10 ? '0' : '') + m;
    out.unshift(key);
    if (start ? key <= start : out.length >= 12) break;
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}

/** Última mudança de status por vaga. */
function ultimaMovimentacao_(core) {
  var out = {};
  var posVaga = {};
  core.posicoes.forEach(function (p) { posVaga[p.ID] = p.VagaID; });
  Db.all('Historico').forEach(function (h) {
    if (h.Tipo !== 'Vaga' && h.Tipo !== 'Posicao') return;
    var vagaId = h.Tipo === 'Posicao' ? posVaga[h.ReferenciaID] : h.ReferenciaID;
    if (!vagaId) return;
    if (!out[vagaId] || h.DataHora > out[vagaId].dataHora) out[vagaId] = { data: h.DataHora.substr(0, 10), dataHora: h.DataHora };
  });
  return out;
}

/** Tempo médio (dias úteis) em cada status, a partir do histórico de transições. */
function tempoPorStatus_(vagas, core, today) {
  var ctx = Sla.buildContext(core, today);
  var hist = {};
  Db.all('Historico').forEach(function (h) {
    if (h.Tipo === 'Vaga' && h.Para && VT.STATUS_VAGA.indexOf(h.Para) >= 0) (hist[h.ReferenciaID] = hist[h.ReferenciaID] || []).push(h);
  });
  var acc = {};
  vagas.forEach(function (v) {
    var list = (hist[v.ID] || []).sort(function (a, b) { return a.DataHora.localeCompare(b.DataHora); });
    var holidays = ctx.holidaysFor(v.Unidade);
    list.forEach(function (h, i) {
      var status = h.Para;
      if (VT.STATUS_FINAIS.indexOf(status) >= 0) return;
      var ini = h.DataHora.substr(0, 10);
      var fim = list[i + 1] ? list[i + 1].DataHora.substr(0, 10) : (VT.STATUS_FINAIS.indexOf(v.Status) >= 0 ? null : today);
      if (!fim) return;
      (acc[status] = acc[status] || []).push(Sla.businessDaysBetween(ini, fim, holidays));
    });
  });
  return VT.STATUS_VAGA.filter(function (s) { return acc[s]; }).map(function (s) {
    return { label: s, valor: Util.round(Util.avg(acc[s]), 1), n: acc[s].length, responsavel: VT.RESPONSAVEL_STATUS[s] || '' };
  });
}


/* ===================== 08_Api.gs ===================== */
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
  deleteCadastro: function (p) { return deleteCadastro(p.tabela, p.key); },
  // Fase 2
  listCandidatos: function (p) { return listCandidatos(p); },
  getCandidato: function (p) { return getCandidato(p.id); },
  saveCandidato: function (p) { return saveCandidato(p); },
  uploadCurriculo: function (p) { return uploadCurriculo(p.id, p.arquivo); },
  downloadCurriculo: function (p) { return downloadCurriculo(p.id); },
  anonimizarCandidato: function (p) { return anonimizarCandidato(p.id, p.justificativa); },
  addCandidatura: function (p) { return addCandidatura(p); },
  moveCandidatura: function (p) { return moveCandidatura(p.id, p.etapa, p); },
  updateCandidaturaAcao: function (p) { return updateCandidaturaAcao(p.id, p); },
  getCandidatura: function (p) { return getCandidatura(p.id); },
  kanban: function (p) { return getKanban(p); },
  saveEntrevista: function (p) { return saveEntrevista(p); },
  listEntrevistas: function (p) { return listEntrevistas(p); },
  saveIndicacao: function (p) { return saveIndicacao(p); },
  listIndicacoes: function (p) { return listIndicacoes(p); }
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
    return JSON.stringify({ ok: false, error: e.userError ? e.message : 'Erro inesperado: ' + (e && e.message ? e.message : e), duplicadoId: e && e.duplicadoId ? e.duplicadoId : undefined });
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


/* ===================== 09_Setup.gs ===================== */
/**
 * Execute "setup" uma vez pelo editor do Apps Script (menu Executar).
 * Cria/atualiza as abas, a lista de empresas e os parâmetros padrão.
 * Pode ser executado novamente sem duplicar dados.
 */
function setup() {
  Object.keys(SCHEMA).forEach(function (name) { Db.ensure(name); });
  Db.withLock(function () {
    var empresas = Db.all('Empresas');
    VT.EMPRESAS_PADRAO.forEach(function (e) {
      if (!empresas.some(function (x) { return Util.norm(x.Nome) === Util.norm(e.Nome); })) {
        Db.insert('Empresas', { ID: Util.id('EMP'), Nome: e.Nome, Sigla: e.Sigla, Ativo: 'Sim' });
      }
    });
    Object.keys(VT.CONFIG_PADRAO).forEach(function (k) {
      if (!Db.find('Config', k)) Db.insert('Config', { Chave: k, Valor: VT.CONFIG_PADRAO[k] });
    });
    // Vagas antigas sem código recebem código sequencial
    Db.all('Vagas').filter(function (v) { return !v.Codigo && v.Empresa; }).forEach(function (v) {
      Db.update('Vagas', v.ID, { Codigo: proximoCodigo_(v.Empresa, Util.toIsoDate(v.DataAbertura)) });
    });
    // Vagas antigas sem DataAprovacao, já em andamento: usa a data de abertura como início do SLA
    Db.all('Vagas').filter(function (v) {
      return !v.DataAprovacao && v.Status && v.Status !== VT.STATUS_AGUARDANDO_APROVACAO && v.DataAbertura;
    }).forEach(function (v) {
      Db.update('Vagas', v.ID, { DataAprovacao: Util.toIsoDate(v.DataAbertura) });
    });
  });
  return 'Via Talentos: estrutura atualizada.';
}

/** Feriados nacionais fixos e móveis de um ano (opcional; feriados locais devem ser cadastrados por unidade). */
function cadastrarFeriadosNacionais(ano) {
  ano = ano || new Date().getFullYear();
  var pascoa = easter_(ano);
  var lista = [
    [ano + '-01-01', 'Confraternização Universal'],
    [Util.addDays(pascoa, -48), 'Carnaval (segunda)'],
    [Util.addDays(pascoa, -47), 'Carnaval (terça)'],
    [Util.addDays(pascoa, -2), 'Sexta-feira Santa'],
    [ano + '-04-21', 'Tiradentes'],
    [ano + '-05-01', 'Dia do Trabalho'],
    [Util.addDays(pascoa, 60), 'Corpus Christi'],
    [ano + '-09-07', 'Independência do Brasil'],
    [ano + '-10-12', 'Nossa Senhora Aparecida'],
    [ano + '-11-02', 'Finados'],
    [ano + '-11-15', 'Proclamação da República'],
    [ano + '-11-20', 'Dia Nacional de Zumbi e da Consciência Negra'],
    [ano + '-12-25', 'Natal']
  ];
  Db.withLock(function () {
    var existentes = Db.all('Feriados');
    lista.forEach(function (f) {
      if (!existentes.some(function (e) { return Util.toIsoDate(e.Data) === f[0] && !Util.str(e.Unidade); })) {
        Db.insert('Feriados', { ID: Util.id('FER'), Data: f[0], Unidade: '', Descricao: f[1] });
      }
    });
  });
}

function easter_(y) {
  var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return y + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
}


/* ===================== 10_Candidatos.gs ===================== */
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


/* ===================== 11_Processo.gs ===================== */
/**
 * FASE 2 — Candidaturas, Kanban, entrevistas, reprovações, indicações e tempo por etapa.
 */
var ETAPAS_OBRIGATORIAS = ['Candidatura recebida', 'Aprovado', 'Contratado', 'Reprovado / desistente'];
var MOTIVOS_DESISTENCIA = ['Candidato desistiu', 'Não compareceu à entrevista', 'Não respondeu aos contatos'];

function etapasDaVaga_(vaga) {
  var sel = Util.str(vaga.Etapas).split(';').map(Util.str).filter(Boolean);
  return VT.ETAPAS_KANBAN.filter(function (e) { return !sel.length || sel.indexOf(e) >= 0 || ETAPAS_OBRIGATORIAS.indexOf(e) >= 0; });
}

function responsavelPadrao_(etapa, vaga) {
  var papel = VT.RESPONSAVEL_ETAPA[etapa] || '';
  if (papel === 'RH') return vaga.Analista || 'RH';
  if (papel === 'Gestor') return vaga.Gestor || 'Gestor';
  return papel;
}

function publicCandidatura_(c) {
  var o = clean_(c);
  if (!podeVerRestrito_()) delete o.Observacoes;
  return o;
}

/** Maior etapa alcançada por candidatura (uma leitura do histórico). */
function maxEtapaMap_() {
  var etapas = VT.ETAPAS_KANBAN, rep = etapas.indexOf('Reprovado / desistente');
  var out = {};
  Db.all('Candidaturas').forEach(function (c) { var i = etapas.indexOf(c.Etapa); out[c.ID] = i >= 0 && i !== rep ? i : 0; });
  Db.all('EtapasCandidatura').forEach(function (e) {
    var i = etapas.indexOf(e.Etapa);
    if (i >= 0 && i !== rep && out[e.CandidaturaID] !== undefined && i > out[e.CandidaturaID]) out[e.CandidaturaID] = i;
  });
  return out;
}
function maxEtapaIdx_(c) { return maxEtapaMap_()[c.ID] || 0; }

function exigirEdicaoCandidatura_(cand) {
  var vaga = Db.find('Vagas', cand.VagaID);
  if (!vaga) throw UserError('Vaga da candidatura não encontrada.');
  Auth.require('Administrador RH', 'Analista RH');
  if (!Auth.canEditVaga(vaga)) throw UserError('Você só pode movimentar candidatos das vagas sob sua responsabilidade.');
  return vaga;
}

/* ------------------------------ candidaturas ------------------------------ */

/**
 * Inscreve um candidato numa vaga. input: {vagaId, candidatoId | candidato:{...}, Origem, Indicador,
 * EmpresaIndicador, DepartamentoIndicador, Observacoes}
 */
function addCandidatura(input) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    var id = addCandidaturaCore_(input);
    return getCandidatura(id);
  });
}

function addCandidaturaCore_(input) {
  var vaga = Db.find('Vagas', input.vagaId);
  if (!vaga) throw UserError('Selecione a vaga.');
  if (!Auth.canEditVaga(vaga)) throw UserError('Você só pode incluir candidatos nas vagas sob sua responsabilidade.');
  if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0) throw UserError('A vaga está ' + vaga.Status.toLowerCase() + '.');
  var candId = input.candidatoId;
  if (!candId) {
    if (!input.candidato) throw UserError('Selecione ou cadastre o candidato.');
    var dados = Object.assign({}, input.candidato);
    if (!dados.Origem) dados.Origem = input.Origem;
    if (!dados.CargoInteresse) dados.CargoInteresse = vaga.Cargo;
    if (!dados.Analista) dados.Analista = vaga.Analista;
    candId = saveCandidatoCore_(dados);
  }
  var cand = Db.find('Candidatos', candId);
  if (!cand) throw UserError('Candidato não encontrado.');
  if (cand.Anonimizado === 'Sim') throw UserError('Cadastro anonimizado (LGPD).');
  var existente = Db.all('Candidaturas').filter(function (x) { return x.VagaID === vaga.ID && x.CandidatoID === cand.ID; })[0];
  if (existente) throw UserError(cand.Nome + ' já participa desta vaga (etapa: ' + existente.Etapa + ').');
  var origem = Util.str(input.Origem) || cand.Origem || 'Outro';
  if (VT.ORIGENS_CANDIDATURA.indexOf(origem) < 0) throw UserError('Origem inválida.');
  if (origem === 'Indicação' && !Util.str(input.Indicador)) throw UserError('Informe o colaborador que indicou.');
  var agora = Util.now();
  var etapa = 'Candidatura recebida';
  var c = {
    ID: Util.id('CDT'), VagaID: vaga.ID, CandidatoID: cand.ID, Origem: origem, Indicador: Util.str(input.Indicador),
    DataCandidatura: Util.toIsoDate(input.DataCandidatura) || Util.today(), Etapa: etapa, EntradaEtapa: agora,
    Responsavel: responsavelPadrao_(etapa, vaga), ProximaAcao: 'Triagem do currículo',
    PrazoAcao: Sla.addBusinessDays(Util.today(), Util.int(Db.config('PRAZO_ACAO_DIAS'), 2) || 2, Sla.buildContext(loadCore_(), Util.today()).holidaysFor(vaga.Unidade)),
    Status: 'Em andamento', MotivoReprovacao: '', Observacoes: Util.str(input.Observacoes), DataConclusao: '',
    CriadoEm: agora, CriadoPor: Auth.email()
  };
  Db.insert('Candidaturas', c);
  Db.insert('EtapasCandidatura', { ID: Util.id('ETP'), CandidaturaID: c.ID, Etapa: etapa, Entrada: agora, Saida: '', Responsavel: c.Responsavel, MotivoAtraso: '', Usuario: Auth.email() });
  if (origem === 'Indicação') {
    var ind = Db.all('Indicacoes').filter(function (i) { return i.CandidatoID === cand.ID && !i.CandidaturaID; })[0];
    if (ind) Db.update('Indicacoes', ind.ID, { CandidaturaID: c.ID });
    else Db.insert('Indicacoes', {
      ID: Util.id('IND'), CandidatoID: cand.ID, CandidaturaID: c.ID, Indicador: c.Indicador,
      EmpresaIndicador: Util.str(input.EmpresaIndicador), DepartamentoIndicador: Util.str(input.DepartamentoIndicador),
      DataIndicacao: c.DataCandidatura, CargoPretendido: vaga.Cargo, Resultado: 'Em andamento', CriadoEm: agora, CriadoPor: Auth.email()
    });
  }
  logHistory_('Candidatura', c.ID, '', etapa, cand.Nome + ' inscrito(a) na vaga ' + (vaga.Codigo || vaga.ID) + ' — origem: ' + origem);
  return c.ID;
}

/**
 * Move o candidato de etapa. opts: {motivoReprovacao, observacao, proximaAcao, responsavel, prazoAcao, motivoAtraso, data}
 */
function moveCandidatura(id, etapa, opts) {
  return Db.withLock(function () {
    var cand = Db.find('Candidaturas', id);
    if (!cand) throw UserError('Candidatura não encontrada.');
    var vaga = exigirEdicaoCandidatura_(cand);
    moveCore_(cand, vaga, etapa, opts || {});
    return getCandidatura(cand.ID);
  });
}

function moveCore_(cand, vaga, etapa, opts) {
  if (VT.ETAPAS_KANBAN.indexOf(etapa) < 0) throw UserError('Etapa inválida.');
  if (etapa === cand.Etapa) throw UserError('O candidato já está nesta etapa.');
  if (etapasDaVaga_(vaga).indexOf(etapa) < 0) throw UserError('A etapa "' + etapa + '" não está habilitada para esta vaga.');
  if (cand.Etapa === 'Contratado') throw UserError('Candidato já contratado. Para desfazer, reabra a posição na vaga.');
  var reprov = etapa === 'Reprovado / desistente';
  if (VT.STATUS_FINAIS.indexOf(vaga.Status) >= 0 && !reprov) throw UserError('A vaga está ' + vaga.Status.toLowerCase() + '. Só é possível encerrar candidaturas.');
  var pessoa = Db.find('Candidatos', cand.CandidatoID) || {};
  var agora = Util.now();
  var hoje = Util.today();
  var patch = { Etapa: etapa, EntradaEtapa: agora };
  var nota = '';

  if (reprov) {
    var motivo = Util.str(opts.motivoReprovacao);
    if (VT.MOTIVOS_REPROVACAO.indexOf(motivo) < 0) throw UserError('Selecione o motivo da reprovação/desistência.');
    if (motivo === 'Outro motivo' && !Util.str(opts.observacao)) throw UserError('Descreva o motivo em observações.');
    patch.Status = MOTIVOS_DESISTENCIA.indexOf(motivo) >= 0 ? 'Desistente' : 'Reprovado';
    patch.MotivoReprovacao = motivo;
    patch.DataConclusao = hoje;
    patch.ProximaAcao = 'Dar retorno ao candidato';
    nota = 'Motivo: ' + motivo;
  } else if (etapa === 'Contratado') {
    var pos = Db.all('Posicoes').filter(function (p) { return p.VagaID === vaga.ID && p.Status === 'Aberta'; })
      .sort(function (a, b) { return Util.int(a.Numero) - Util.int(b.Numero); })[0];
    if (!pos) throw UserError('Não há posição aberta nesta vaga para registrar a contratação.');
    var data = fillPositionCore_(pos, vaga, { data: opts.data, nome: pessoa.Nome, candidatoId: pessoa.ID });
    patch.Status = 'Contratado';
    patch.DataConclusao = data;
    patch.ProximaAcao = '';
    patch.PrazoAcao = '';
    nota = 'Posição ' + pos.Numero + ' preenchida em ' + data;
    Db.all('Indicacoes').filter(function (i) { return i.CandidaturaID === cand.ID; }).forEach(function (i) {
      Db.update('Indicacoes', i.ID, { Resultado: 'Contratado', DataContratacao: data });
    });
  } else {
    patch.Status = 'Em andamento';
    patch.MotivoReprovacao = '';
    patch.DataConclusao = '';
  }
  if (reprov) {
    Db.all('Indicacoes').filter(function (i) { return i.CandidaturaID === cand.ID; }).forEach(function (i) { Db.update('Indicacoes', i.ID, { Resultado: patch.Status }); });
  } else if (etapa !== 'Contratado') {
    Db.all('Indicacoes').filter(function (i) { return i.CandidaturaID === cand.ID && i.Resultado !== 'Em andamento'; }).forEach(function (i) { Db.update('Indicacoes', i.ID, { Resultado: 'Em andamento' }); });
  }
  if (etapa !== 'Contratado') {
    patch.Responsavel = Util.str(opts.responsavel) || (reprov ? (vaga.Analista || 'RH') : responsavelPadrao_(etapa, vaga));
    if (!reprov) patch.ProximaAcao = Util.str(opts.proximaAcao) || proximaAcaoPadrao_(etapa);
    var prazo = Util.toIsoDate(opts.prazoAcao);
    if (opts.prazoAcao && !Util.isIsoDate(prazo)) throw UserError('Prazo da próxima ação inválido.');
    patch.PrazoAcao = prazo || Sla.addBusinessDays(hoje, Util.int(Db.config('PRAZO_ACAO_DIAS'), 2) || 2, Sla.buildContext(loadCore_(), hoje).holidaysFor(vaga.Unidade));
  }
  if (opts.observacao) patch.Observacoes = Util.str(cand.Observacoes ? cand.Observacoes + '\n' : '') + Util.today().split('-').reverse().join('/') + ': ' + Util.str(opts.observacao);

  Db.all('EtapasCandidatura').filter(function (e) { return e.CandidaturaID === cand.ID && !e.Saida; }).forEach(function (e) {
    Db.update('EtapasCandidatura', e.ID, { Saida: agora, MotivoAtraso: Util.str(opts.motivoAtraso) });
  });
  Db.insert('EtapasCandidatura', { ID: Util.id('ETP'), CandidaturaID: cand.ID, Etapa: etapa, Entrada: agora, Saida: (reprov || etapa === 'Contratado') ? agora : '', Responsavel: patch.Responsavel || '', MotivoAtraso: '', Usuario: Auth.email() });
  var anterior = cand.Etapa;
  Db.update('Candidaturas', cand.ID, patch);
  logHistory_('Candidatura', cand.ID, anterior, etapa, (pessoa.Nome || '') + (nota ? ' — ' + nota : '') + (opts.motivoAtraso ? ' — atraso: ' + opts.motivoAtraso : ''));
}

function proximaAcaoPadrao_(etapa) {
  return {
    'Candidatura recebida': 'Triagem do currículo', 'Triagem de currículo': 'Analisar currículo', 'Contato inicial': 'Contatar candidato',
    'Entrevista RH': 'Realizar entrevista com RH', 'Entrevista gestor': 'Realizar entrevista com gestor',
    'Entrevista direção': 'Realizar entrevista com direção', 'Testes / avaliações': 'Aplicar/corrigir testes',
    'Aguardando decisão': 'Decisão do gestor', 'Aprovado': 'Enviar proposta', 'Processo admissional': 'Concluir admissão'
  }[etapa] || '';
}

/** Atualiza próxima ação, responsável, prazo e observações. */
function updateCandidaturaAcao(id, opts) {
  return Db.withLock(function () {
    var cand = Db.find('Candidaturas', id);
    if (!cand) throw UserError('Candidatura não encontrada.');
    exigirEdicaoCandidatura_(cand);
    var prazo = Util.toIsoDate(opts.prazoAcao);
    if (opts.prazoAcao && !Util.isIsoDate(prazo)) throw UserError('Prazo inválido.');
    var patch = { ProximaAcao: Util.str(opts.proximaAcao), Responsavel: Util.str(opts.responsavel), PrazoAcao: prazo };
    if (Util.str(opts.observacao)) patch.Observacoes = Util.str(cand.Observacoes ? cand.Observacoes + '\n' : '') + Util.today().split('-').reverse().join('/') + ': ' + Util.str(opts.observacao);
    Db.update('Candidaturas', cand.ID, patch);
    logHistory_('Candidatura', cand.ID, '', '', 'Próxima ação: ' + patch.ProximaAcao + ' · ' + patch.Responsavel + ' · prazo ' + prazo);
    return getCandidatura(cand.ID);
  });
}

function cardCandidatura_(c, vaga, pessoa, ctx, hoje) {
  var o = publicCandidatura_(c);
  var holidays = ctx.holidaysFor(vaga.Unidade);
  var final = c.Etapa === 'Contratado' || c.Etapa === 'Reprovado / desistente';
  o.nome = pessoa ? pessoa.Nome : '—';
  o.candidatoCodigo = pessoa ? pessoa.Codigo : '';
  o.vagaCodigo = vaga.Codigo || vaga.ID;
  o.vagaCargo = vaga.Cargo;
  o.analista = vaga.Analista;
  o.gestor = vaga.Gestor;
  o.diasNaEtapa = final ? null : Sla.businessDaysBetween(Util.toIsoDate(c.EntradaEtapa), hoje, holidays);
  o.acaoAtrasada = !final && !!c.PrazoAcao && c.PrazoAcao < hoje;
  o.podeEditar = Auth.canEditVaga(vaga);
  return o;
}

/** Quadro Kanban. f: {vagaId, Analista, busca} */
function getKanban(f) {
  f = f || {};
  var core = loadCore_();
  var hoje = Util.today();
  var ctx = Sla.buildContext(core, hoje);
  var vagas = {};
  core.vagas.forEach(function (v) { if (Auth.canSeeVaga(v)) vagas[v.ID] = v; });
  var pessoas = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var vaga = f.vagaId ? vagas[f.vagaId] : null;
  if (f.vagaId && !vaga) throw UserError('Vaga não encontrada.');
  var q = Util.norm(f.busca);
  var cards = candidaturasVisiveis_().filter(function (c) {
    var v = vagas[c.VagaID];
    if (!v) return false;
    if (vaga && c.VagaID !== vaga.ID) return false;
    if (!vaga && VT.STATUS_FINAIS.indexOf(v.Status) >= 0) return false;
    if (f.Analista && Util.norm(v.Analista) !== Util.norm(f.Analista)) return false;
    if (q && Util.norm((pessoas[c.CandidatoID] || {}).Nome + ' ' + v.Cargo + ' ' + v.Codigo).indexOf(q) < 0) return false;
    return true;
  }).map(function (c) { return cardCandidatura_(c, vagas[c.VagaID], pessoas[c.CandidatoID], ctx, hoje); });
  var colunas = vaga ? etapasDaVaga_(vaga) : VT.ETAPAS_KANBAN;
  return {
    colunas: colunas,
    cards: cards,
    vaga: vaga ? { ID: vaga.ID, Codigo: vaga.Codigo, Cargo: vaga.Cargo, Status: vaga.Status, podeEditar: Auth.canEditVaga(vaga) } : null,
    vagasAtivas: core.vagas.filter(function (v) { return vagas[v.ID] && VT.STATUS_FINAIS.indexOf(v.Status) < 0; })
      .map(function (v) { return { ID: v.ID, Codigo: v.Codigo || v.ID, Cargo: v.Cargo, Unidade: v.Unidade }; })
  };
}

function getCandidatura(id) {
  var c = Db.find('Candidaturas', id);
  if (!c) throw UserError('Candidatura não encontrada.');
  if (!candidaturasVisiveis_().some(function (x) { return x.ID === c.ID; })) throw UserError('Você não tem acesso a esta candidatura.');
  var vaga = Db.find('Vagas', c.VagaID);
  var pessoa = Db.find('Candidatos', c.CandidatoID);
  var hoje = Util.today();
  var ctx = Sla.buildContext(loadCore_(), hoje);
  var o = cardCandidatura_(c, vaga, pessoa, ctx, hoje);
  o.candidato = pessoa ? publicCandidato_(pessoa) : null;
  o.etapasVaga = etapasDaVaga_(vaga);
  o.outrosProcessos = Db.all('Candidaturas').filter(function (x) { return x.CandidatoID === c.CandidatoID && x.ID !== c.ID; }).length;
  o.entrevistas = Db.all('Entrevistas').filter(function (e) { return e.CandidaturaID === c.ID; }).map(clean_)
    .sort(function (a, b) { return (b.Agendamento || '').localeCompare(a.Agendamento || ''); });
  var holidays = ctx.holidaysFor(vaga.Unidade);
  o.etapas = Db.all('EtapasCandidatura').filter(function (e) { return e.CandidaturaID === c.ID; }).map(function (e) {
    var x = clean_(e);
    var fim = e.Saida ? Util.toIsoDate(e.Saida) : hoje;
    x.dias = Sla.businessDaysBetween(Util.toIsoDate(e.Entrada), fim, holidays);
    return x;
  }).sort(function (a, b) { return a.Entrada.localeCompare(b.Entrada); });
  o.historico = Db.all('Historico').filter(function (h) { return h.ReferenciaID === c.ID; }).map(clean_)
    .sort(function (a, b) { return b.DataHora.localeCompare(a.DataHora); });
  return o;
}

/* ------------------------------ entrevistas ------------------------------ */

function saveEntrevista(input) {
  return Db.withLock(function () {
    var cand = Db.find('Candidaturas', input.CandidaturaID);
    if (!cand) throw UserError('Candidatura não encontrada.');
    var vaga = Db.find('Vagas', cand.VagaID);
    var u = Auth.user();
    var tipo = Util.str(input.Tipo);
    if (VT.TIPOS_ENTREVISTA.indexOf(tipo) < 0) throw UserError('Tipo de entrevista inválido.');
    var permitido = Auth.canEditVaga(vaga) ||
      (u.perfil === 'Gestor' && tipo === 'Gestor' && Auth.canSeeVaga(vaga)) ||
      (u.perfil === 'Direção' && tipo === 'Direção');
    if (!permitido) throw UserError('Seu perfil não permite registrar esta entrevista.');

    var ag = Util.str(input.Agendamento).replace('T', ' ').substr(0, 16);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(ag)) throw UserError('Informe data e horário do agendamento.');
    var resultado = Util.str(input.Resultado) || 'Pendente';
    if (VT.RESULTADOS_ENTREVISTA.indexOf(resultado) < 0) throw UserError('Resultado inválido.');
    var realizacao = Util.toIsoDate(input.Realizacao);
    if (resultado !== 'Pendente' && !realizacao) realizacao = Util.today();
    if (realizacao && realizacao > Util.today()) throw UserError('A data de realização não pode ser futura.');
    if (!Util.str(input.Entrevistador)) throw UserError('Informe o entrevistador.');
    var motivo = Util.str(input.MotivoReprovacao);
    if (resultado === 'Reprovado' && VT.MOTIVOS_REPROVACAO.indexOf(motivo) < 0) throw UserError('Selecione o motivo da reprovação.');
    var proxima = Util.str(input.ProximaEtapa);
    if (proxima && VT.ETAPAS_KANBAN.indexOf(proxima) < 0) throw UserError('Próxima etapa inválida.');
    var retorno = Util.toIsoDate(input.RetornoPrevisto);

    var row = {
      CandidaturaID: cand.ID, Tipo: tipo, Agendamento: ag, Realizacao: realizacao, Entrevistador: Util.str(input.Entrevistador),
      Resultado: resultado, Parecer: Util.str(input.Parecer), MotivoReprovacao: resultado === 'Reprovado' ? motivo : '',
      ProximaEtapa: resultado === 'Aprovado' ? proxima : '', RetornoPrevisto: retorno
    };
    var antes = null;
    if (input.ID) {
      antes = Db.find('Entrevistas', input.ID);
      if (!antes) throw UserError('Entrevista não encontrada.');
      Db.update('Entrevistas', antes.ID, row);
    } else {
      row.ID = Util.id('ENT');
      row.CriadoEm = Util.now();
      row.CriadoPor = u.email;
      Db.insert('Entrevistas', row);
    }
    var pessoa = Db.find('Candidatos', cand.CandidatoID) || {};
    logHistory_('Candidatura', cand.ID, antes ? antes.Resultado : '', 'Entrevista ' + tipo + ': ' + resultado,
      (pessoa.Nome || '') + ' · ' + ag + ' · ' + row.Entrevistador + (row.Parecer && podeVerRestrito_() ? ' — ' + row.Parecer : ''));

    // Movimentação automática do candidato conforme a entrevista
    var etapaEntrevista = VT.ETAPA_DA_ENTREVISTA[tipo];
    var etapas = VT.ETAPAS_KANBAN;
    var finalCand = cand.Etapa === 'Contratado' || cand.Etapa === 'Reprovado / desistente';
    var podeMover = !finalCand && VT.STATUS_FINAIS.indexOf(vaga.Status) < 0;
    if (podeMover && resultado === 'Pendente' && etapas.indexOf(cand.Etapa) < etapas.indexOf(etapaEntrevista) && etapasDaVaga_(vaga).indexOf(etapaEntrevista) >= 0) {
      moveCore_(cand, vaga, etapaEntrevista, { proximaAcao: 'Entrevista ' + tipo + ' em ' + ag.substr(8, 2) + '/' + ag.substr(5, 2) + ' ' + ag.substr(11), prazoAcao: ag.substr(0, 10) });
    } else if (!finalCand && resultado === 'Reprovado') {
      moveCore_(Db.find('Candidaturas', cand.ID), vaga, 'Reprovado / desistente', { motivoReprovacao: motivo });
    } else if (podeMover && resultado === 'Aprovado' && proxima && proxima !== cand.Etapa && etapasDaVaga_(vaga).indexOf(proxima) >= 0) {
      moveCore_(Db.find('Candidaturas', cand.ID), vaga, proxima, { prazoAcao: retorno });
    } else if (podeMover && retorno) {
      Db.update('Candidaturas', cand.ID, { PrazoAcao: retorno, ProximaAcao: 'Retorno após entrevista ' + tipo });
    }
    return getCandidatura(cand.ID);
  });
}

/** f: {de, ate, Tipo, situacao: 'agendadas'|'pendentes'|'realizadas', busca} */
function listEntrevistas(f) {
  f = f || {};
  var vis = {};
  candidaturasVisiveis_().forEach(function (c) { vis[c.ID] = c; });
  var u = Auth.user();
  var vagas = {}, pessoas = {};
  Db.all('Vagas').forEach(function (v) { vagas[v.ID] = v; });
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  var agora = Util.now().substr(0, 16);
  var q = Util.norm(f.busca);
  return Db.all('Entrevistas').filter(function (e) {
    var c = vis[e.CandidaturaID];
    if (!c && !(u.perfil === 'Direção' && e.Tipo === 'Direção')) return false;
    if (!c) c = Db.find('Candidaturas', e.CandidaturaID);
    if (!c) return false;
    var d = (e.Agendamento || '').substr(0, 10);
    if (f.de && d < f.de) return false;
    if (f.ate && d > f.ate) return false;
    if (f.Tipo && e.Tipo !== f.Tipo) return false;
    if (f.situacao === 'agendadas' && !(e.Resultado === 'Pendente' && e.Agendamento >= agora)) return false;
    if (f.situacao === 'pendentes' && !(e.Resultado === 'Pendente' && e.Agendamento < agora)) return false;
    if (f.situacao === 'realizadas' && e.Resultado === 'Pendente') return false;
    if (q && Util.norm((pessoas[c.CandidatoID] || {}).Nome + ' ' + e.Entrevistador + ' ' + (vagas[c.VagaID] || {}).Cargo).indexOf(q) < 0) return false;
    e._cand = c;
    return true;
  }).map(function (e) {
    var c = e._cand, v = vagas[c.VagaID] || {}, p = pessoas[c.CandidatoID] || {};
    var o = clean_(e);
    if (!podeVerRestrito_() && !(u.perfil === 'Gestor' && e.Tipo === 'Gestor') && !(u.perfil === 'Direção' && e.Tipo === 'Direção')) o.Parecer = '';
    o.nome = p.Nome; o.vagaCodigo = v.Codigo; o.vagaCargo = v.Cargo; o.etapaAtual = c.Etapa;
    o.atrasada = e.Resultado === 'Pendente' && e.Agendamento < agora;
    return o;
  }).sort(function (a, b) { return (a.Agendamento || '').localeCompare(b.Agendamento || ''); });
}

/* ------------------------------ indicações ------------------------------ */

function saveIndicacao(input) {
  Auth.require('Administrador RH', 'Analista RH');
  return Db.withLock(function () {
    if (!Util.str(input.Indicador)) throw UserError('Informe o colaborador que indicou.');
    var candId = input.candidatoId;
    var jaExistia = false;
    if (!candId) {
      var dados = { Nome: input.Nome, Email: input.Email, Telefone: input.Telefone, CPF: input.CPF, Cidade: input.Cidade, UF: input.UF, CargoInteresse: input.CargoPretendido, Origem: 'Indicação', ConsentimentoLGPD: input.ConsentimentoLGPD };
      var dup = findDuplicateCandidato_({ CPF: dados.CPF, Email: Util.str(dados.Email).toLowerCase(), Telefone: dados.Telefone });
      if (dup) { candId = dup.candidato.ID; jaExistia = true; }
      else candId = saveCandidatoCore_(dados);
    }
    var cand = Db.find('Candidatos', candId);
    if (!cand) throw UserError('Candidato não encontrado.');
    var ind = {
      ID: Util.id('IND'), CandidatoID: cand.ID, CandidaturaID: '', Indicador: Util.str(input.Indicador),
      EmpresaIndicador: Util.str(input.EmpresaIndicador), DepartamentoIndicador: Util.str(input.DepartamentoIndicador),
      DataIndicacao: Util.toIsoDate(input.DataIndicacao) || Util.today(), Resultado: 'Sem processo',
      DataContratacao: '', CargoPretendido: Util.str(input.CargoPretendido) || cand.CargoInteresse,
      Observacoes: Util.str(input.Observacoes), CriadoEm: Util.now(), CriadoPor: Auth.email()
    };
    Db.insert('Indicacoes', ind);
    logHistory_('Candidato', cand.ID, '', 'Indicação', 'Indicado(a) por ' + ind.Indicador + (jaExistia ? ' (candidato já cadastrado)' : ''));
    if (input.vagaId) {
      var cdt = addCandidaturaCore_({ vagaId: input.vagaId, candidatoId: cand.ID, Origem: 'Indicação', Indicador: ind.Indicador, EmpresaIndicador: ind.EmpresaIndicador, DepartamentoIndicador: ind.DepartamentoIndicador });
      Db.update('Indicacoes', ind.ID, { CandidaturaID: cdt, Resultado: 'Em andamento' });
    }
    return { indicacaoId: ind.ID, candidatoId: cand.ID, jaExistia: jaExistia };
  });
}

function listIndicacoes(f) {
  f = f || {};
  if (Auth.is('Gestor')) throw UserError('Seu perfil não acessa o controle de indicações.');
  var pessoas = {}, vagas = {}, cands = {};
  Db.all('Candidatos').forEach(function (p) { pessoas[p.ID] = p; });
  Db.all('Vagas').forEach(function (v) { vagas[v.ID] = v; });
  Db.all('Candidaturas').forEach(function (c) { cands[c.ID] = c; });
  var procPorCand = Util.groupCount(Db.all('Candidaturas'), function (c) { return c.CandidatoID; });
  var rows = Db.all('Indicacoes').map(function (i) {
    var o = clean_(i), p = pessoas[i.CandidatoID] || {}, c = cands[i.CandidaturaID], v = c ? vagas[c.VagaID] || {} : {};
    o.nome = p.Nome; o.candidatoCodigo = p.Codigo;
    o.etapa = c ? c.Etapa : '';
    o.status = c ? c.Status : 'Sem processo';
    o.vagaCodigo = v.Codigo; o.vagaCargo = v.Cargo;
    o.cargo = i.CargoPretendido || v.Cargo || p.CargoInteresse || '';
    o.processosAnteriores = Math.max(0, (procPorCand[i.CandidatoID] || 0) - (c ? 1 : 0));
    if (c && c.Status === 'Contratado') { o.Resultado = 'Contratado'; o.DataContratacao = o.DataContratacao || c.DataConclusao; }
    else if (c) o.Resultado = c.Status;
    return o;
  }).filter(function (o) {
    if (f.de && o.DataIndicacao < f.de) return false;
    if (f.ate && o.DataIndicacao > f.ate) return false;
    if (f.busca && Util.norm(o.nome + ' ' + o.Indicador + ' ' + o.cargo).indexOf(Util.norm(f.busca)) < 0) return false;
    return true;
  }).sort(function (a, b) { return (b.DataIndicacao || '').localeCompare(a.DataIndicacao || ''); });
  var contratados = rows.filter(function (r) { return r.Resultado === 'Contratado'; }).length;
  var origens = Util.groupCount(Db.all('Candidaturas').filter(function (c) { return c.Status === 'Contratado'; }), function (c) { return c.Origem || 'Não informada'; });
  return {
    linhas: rows,
    indicadores: {
      total: rows.length,
      contratados: contratados,
      emAndamento: rows.filter(function (r) { return r.Resultado === 'Em andamento'; }).length,
      taxa: rows.length ? Util.round(contratados / rows.length * 100, 0) : null,
      cargos: toSeries_(Util.groupCount(rows, function (r) { return r.cargo; })).slice(0, 10),
      indicadores: toSeries_(Util.groupCount(rows, function (r) { return r.Indicador; })).slice(0, 10),
      origens: toSeries_(origens)
    }
  };
}

/* ------------------------------ tempo por etapa (candidatos) ------------------------------ */

/** Tempo médio aguardando em cada etapa do candidato + pendências por responsável. */
function tempoEtapasCandidato_(vagaIds, core, hoje) {
  var ctx = Sla.buildContext(core, hoje);
  var vagas = {};
  core.vagas.forEach(function (v) { vagas[v.ID] = v; });
  var cands = {};
  Db.all('Candidaturas').forEach(function (c) { if (vagaIds[c.VagaID]) cands[c.ID] = c; });
  var acc = {};
  Db.all('EtapasCandidatura').forEach(function (e) {
    var c = cands[e.CandidaturaID];
    if (!c || e.Etapa === 'Contratado' || e.Etapa === 'Reprovado / desistente') return;
    var fim = e.Saida ? Util.toIsoDate(e.Saida) : hoje;
    var d = Sla.businessDaysBetween(Util.toIsoDate(e.Entrada), fim, ctx.holidaysFor(vagas[c.VagaID].Unidade));
    (acc[e.Etapa] = acc[e.Etapa] || []).push(d);
  });
  var tempos = VT.ETAPAS_KANBAN.filter(function (e) { return acc[e]; }).map(function (e) {
    return { label: e, valor: Util.round(Util.avg(acc[e]), 1), n: acc[e].length, responsavel: VT.RESPONSAVEL_ETAPA[e] || '' };
  });
  var pend = {};
  Object.keys(cands).forEach(function (id) {
    var c = cands[id];
    if (c.Status !== 'Em andamento' || !c.PrazoAcao || c.PrazoAcao >= hoje) return;
    var r = c.Responsavel || 'Não definido';
    pend[r] = pend[r] || { label: r, valor: 0, maisAntigo: c.PrazoAcao };
    pend[r].valor++;
    if (c.PrazoAcao < pend[r].maisAntigo) pend[r].maisAntigo = c.PrazoAcao;
  });
  return {
    tempos: tempos,
    pendencias: Object.keys(pend).map(function (k) { return pend[k]; }).sort(function (a, b) { return b.valor - a.valor; })
  };
}
