const test = require('node:test');
const assert = require('node:assert');
const { createBackend } = require('./fake-gas');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(300, 1)]).toString('base64');

function setup() {
  const b = createBackend({ now: '2026-11-17T13:00:00Z', email: 'admin@viadupla.com' });
  b.run('setup');
  const cad = (tabela, registro) => b.ok('saveCadastro', { tabela, registro });
  cad('Unidades', { Empresa: 'Via Dupla', Nome: 'Araucária/PR', Cidade: 'Araucária', UF: 'PR' });
  cad('Departamentos', { Nome: 'Gestão de Pessoas' });
  cad('Cargos', { Nome: 'Analista de Gestão de Pessoas' });
  cad('Gestores', { Nome: 'Gestora' });
  cad('Analistas', { Nome: 'Analista Um', Email: 'ana1@viadupla.com' });
  cad('Usuarios', { Email: 'ana1@viadupla.com', Nome: 'Analista Um', Perfil: 'Analista RH' });
  cad('Usuarios', { Email: 'dir@viadupla.com', Nome: 'Diretor', Perfil: 'Direção' });
  const base = { Empresa: 'Via Dupla', Unidade: 'Araucária/PR', Cargo: 'Analista de Gestão de Pessoas', Departamento: 'Gestão de Pessoas', Gestor: 'Gestora', Analista: 'Analista Um',
    QtdPosicoes: 1, DataAbertura: '2026-11-10', MotivoAbertura: 'Aumento de quadro', TipoContrato: 'CLT', Salario: 'R$ 3.500', Horario: '08h às 18h',
    Atribuicoes: 'Rotinas de DP', Requisitos: 'Superior completo', Beneficios: 'Vale-refeição\nPlano de saúde', Prioridade: 'Alta' };
  return { b, base };
}

test('identidade visual: upload de logo/foto/selo e vigência do GPTW', () => {
  const { b } = setup();
  assert.strictEqual(b.call('uploadAsset', { tipo: 'logo', arquivo: { nome: 'x.exe', tipo: 'application/x', base64: PNG } }).ok, false);
  let a = b.ok('uploadAsset', { tipo: 'logo', arquivo: { nome: 'logo.png', tipo: 'image/png', base64: PNG } });
  assert.match(a.logo, /^data:image\/png;base64,/);
  b.ok('uploadAsset', { tipo: 'gptw', arquivo: { nome: 'gptw.png', tipo: 'image/png', base64: PNG } });
  a = b.ok('assetsArte');
  assert.strictEqual(a.gptw, '', 'sem vigência não exibe o selo');
  b.ok('saveCadastro', { tabela: 'Config', registro: { _key: 'GPTW_VIGENTE_ATE', Chave: 'GPTW_VIGENTE_ATE', Valor: '2026-12-31' } });
  a = b.ok('assetsArte');
  assert.strictEqual(a.gptwVigente, true);
  assert.ok(a.gptw.length > 20);
  b.setUser('ana1@viadupla.com');
  assert.strictEqual(b.call('uploadAsset', { tipo: 'foto', arquivo: { nome: 'f.png', tipo: 'image/png', base64: PNG } }).ok, false);
});

test('arte: somente vaga aprovada, versões, aprovação manual e publicação', () => {
  const { b, base } = setup();
  const pend = b.ok('saveVaga', base);
  assert.match(b.call('saveArte', { vagaId: pend.ID, modelo: 'institucional', formato: 'Instagram', base64: PNG }).error, /aprovadas/);
  const v = b.ok('saveVaga', Object.assign({}, base, { DataAprovacao: '2026-11-10' }));
  const d = b.ok('dadosArte', { vagaId: v.ID });
  assert.strictEqual(d.dados.local, 'Araucária - PR');
  assert.deepStrictEqual(d.dados.beneficios, ['Vale-refeição', 'Plano de saúde']);
  let r = b.ok('saveArte', { vagaId: v.ID, modelo: 'institucional', formato: 'Instagram', base64: PNG, dados: d.dados });
  assert.strictEqual(r.versao, 1);
  r = b.ok('saveArte', { vagaId: v.ID, modelo: 'amarelo', formato: 'Instagram', base64: PNG, dados: d.dados });
  assert.strictEqual(r.versao, 2);
  const id = r.id;
  assert.match(b.call('arteArquivo', { id, finalidade: 'divulgar' }).error, /aprovada/);
  assert.ok(b.ok('arteArquivo', { id }).base64);
  assert.match(b.call('publicarArte', { id, canal: 'LinkedIn' }).error, /aprovadas/);

  b.setUser('ana1@viadupla.com');
  assert.strictEqual(b.call('aprovarArte', { id, aprovar: true }).ok, false);
  b.setUser('dir@viadupla.com');
  assert.match(b.call('aprovarArte', { id: r.artes.find(a => a.ID !== id).ID, aprovar: false }).error, /motivo/);
  b.ok('aprovarArte', { id: r.artes.find(a => a.ID !== id).ID, aprovar: false, observacao: 'Ajustar benefícios' });
  b.ok('aprovarArte', { id, aprovar: true });
  b.setUser('ana1@viadupla.com');
  assert.ok(b.ok('arteArquivo', { id, finalidade: 'divulgar' }).base64);
  const lst = b.ok('publicarArte', { id, canal: 'LinkedIn' });
  const pub = lst.find(a => a.ID === id);
  assert.strictEqual(pub.Status, 'Publicada');
  assert.strictEqual(b.ok('getVaga', { id: v.ID }).Status, 'Aberta / recebendo candidaturas');
  assert.strictEqual(pub.desatualizada, false);
  // edição da vaga marca a arte como desatualizada
  b.setNow('2026-11-18T13:00:00Z');
  b.ok('saveVaga', Object.assign({}, base, { ID: v.ID, DataAprovacao: '2026-11-10', Salario: 'R$ 4.000' }));
  assert.strictEqual(b.ok('listArtes', { vagaId: v.ID }).find(a => a.ID === id).desatualizada, true);
  assert.strictEqual(b.ok('arteDados', { id }).modelo, 'amarelo');
});
