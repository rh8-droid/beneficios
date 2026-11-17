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
