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
