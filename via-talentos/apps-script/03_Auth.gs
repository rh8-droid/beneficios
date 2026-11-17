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
