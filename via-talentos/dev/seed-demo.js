/**
 * Dados FICTÍCIOS para demonstração local. Não usar em produção.
 * Avança o relógio simulado para gerar histórico de etapas realista.
 */
module.exports = function seed(b) {
  const at = iso => b.setNow(iso + 'T13:00:00Z');
  at('2026-08-01');
  const cad = (tabela, registro) => b.ok('saveCadastro', { tabela, registro });
  [['Via Dupla', 'Araucária/PR', 'Araucária', 'PR'], ['Via Dupla', 'Guarulhos/SP', 'Guarulhos', 'SP'], ['Via Avant', 'Curitiba/PR', 'Curitiba', 'PR']]
    .forEach(([Empresa, Nome, Cidade, UF]) => cad('Unidades', { Empresa, Nome, Cidade, UF }));
  ['Gestão de Pessoas', 'Transporte', 'Manutenção', 'Financeiro', 'Logística'].forEach(Nome => cad('Departamentos', { Nome }));
  [['Analista de Gestão de Pessoas', 'Gestão de Pessoas'], ['Motorista Carreteiro', 'Transporte'], ['Mecânico Diesel', 'Manutenção'], ['Assistente Financeiro', 'Financeiro'], ['Conferente', 'Logística']]
    .forEach(([Nome, Departamento]) => cad('Cargos', { Nome, Departamento }));
  ['Gestor Transporte', 'Gestora Pessoas', 'Gestor Manutenção', 'Gestora Financeiro', 'Gestor Logística'].forEach(Nome => cad('Gestores', { Nome }));
  ['Analista A', 'Analista B', 'Analista C'].forEach(Nome => cad('Analistas', { Nome }));
  b.run('cadastrarFeriadosNacionais', 2026);
  cad('Feriados', { Data: '2026-09-08', Unidade: 'Curitiba/PR', Descricao: 'Nossa Senhora da Luz dos Pinhais' });

  const vagas = [
    ['Motorista Carreteiro', 'Transporte', 'Gestor Transporte', 'Analista A', 'Guarulhos/SP', 'Via Dupla', 3, '2026-08-03', [['Triagem de currículos', '2026-08-05'], ['Entrevistas com gestor', '2026-08-12']], [['2026-08-18', 'Contratado 1'], ['2026-08-21', 'Contratado 2'], ['2026-08-31', 'Contratado 3']]],
    ['Mecânico Diesel', 'Manutenção', 'Gestor Manutenção', 'Analista B', 'Araucária/PR', 'Via Dupla', 1, '2026-08-17', [['Triagem de currículos', '2026-08-20'], ['Entrevistas com gestor', '2026-09-01'], ['Entrevistas com direção', '2026-09-10']], [['2026-09-14', 'Contratado 4']]],
    ['Assistente Financeiro', 'Financeiro', 'Gestora Financeiro', 'Analista C', 'Curitiba/PR', 'Via Avant', 1, '2026-09-08', [['Entrevistas com RH', '2026-09-11']], [['2026-09-25', 'Contratado 5']]],
    ['Conferente', 'Logística', 'Gestor Logística', 'Analista A', 'Curitiba/PR', 'Via Avant', 2, '2026-10-05', [['Triagem de currículos', '2026-10-07'], ['Entrevistas com gestor', '2026-10-15']], [['2026-10-23', 'Contratado 6']]],
    ['Analista de Gestão de Pessoas', 'Gestão de Pessoas', 'Gestora Pessoas', 'Analista B', 'Araucária/PR', 'Via Dupla', 1, '2026-10-26', [['Triagem de currículos', '2026-10-28'], ['Entrevistas com RH', '2026-11-04'], ['Entrevistas com gestor', '2026-11-10']], []],
    ['Motorista Carreteiro', 'Transporte', 'Gestor Transporte', 'Analista C', 'Araucária/PR', 'Via Dupla', 2, '2026-11-03', [['Triagem de currículos', '2026-11-05']], []],
    ['Mecânico Diesel', 'Manutenção', 'Gestor Manutenção', 'Analista A', 'Guarulhos/SP', 'Via Dupla', 1, '2026-10-13', [['Entrevistas com gestor', '2026-10-20']], []]
  ];
  for (const [Cargo, Departamento, Gestor, Analista, Unidade, Empresa, QtdPosicoes, data, etapas, fechamentos] of vagas) {
    at(data);
    let v = b.ok('saveVaga', {
      Empresa, Unidade, Cargo, Departamento, Gestor, Analista, QtdPosicoes, DataAbertura: data,
      MotivoAbertura: 'Aumento de quadro', TipoContrato: 'CLT', Modalidade: 'Presencial', Horario: 'Seg a sex, 08h às 18h',
      SalarioACombinar: 'Sim', Requisitos: 'Experiência na função', Atribuicoes: 'Atividades do cargo', Beneficios: 'Vale-refeição\nPlano de saúde', Prioridade: 'Alta'
    });
    v = b.ok('changeVagaStatus', { id: v.ID, status: 'Aberta / recebendo candidaturas', data });
    for (const [status, d] of etapas) { at(d); b.ok('changeVagaStatus', { id: v.ID, status, data: d }); }
    fechamentos.forEach(([d, nome], i) => { at(d); v = b.ok('fillPosition', { id: v.posicoes[i].ID, data: d, nome }); });
  }
  at('2026-11-16');
  b.ok('saveVaga', { Empresa: 'Via Dupla', Unidade: 'Guarulhos/SP', Cargo: 'Conferente', Departamento: 'Logística', Gestor: 'Gestor Logística', Analista: 'Analista B', QtdPosicoes: 4, DataAbertura: '2026-11-16', MotivoAbertura: 'Substituição', ColaboradorSubstituido: 'Colaborador X', TipoContrato: 'CLT', Salario: 'R$ 2.400', Prioridade: 'Média' });

  // Candidatos e processo seletivo (Fase 2)
  const ativas = b.ok('listVagas', { situacao: 'ativas' }).filter(v => v.sla.iniciado);
  const nomes = ['Ana Paula Ribeiro', 'Bruno Henrique Costa', 'Carla Mendes Souza', 'Diego Fernandes Lima', 'Elisa Rocha Martins', 'Fábio Augusto Pereira',
    'Gabriela Nunes Alves', 'Hugo Leonardo Dias', 'Isabela Torres Gomes', 'João Victor Moraes', 'Karen Lopes Vieira', 'Lucas Matheus Prado'];
  const origens = ['LinkedIn', 'Indeed', 'Site', 'Indicação', 'WhatsApp', 'Banco de talentos'];
  let n = 0;
  at('2026-11-04');
  for (const v of ativas) {
    for (let i = 0; i < 4 && n < nomes.length; i++, n++) {
      const origem = origens[n % origens.length];
      b.ok('addCandidatura', {
        vagaId: v.ID, Origem: origem, Indicador: origem === 'Indicação' ? 'Colaborador ' + (n + 1) : '', EmpresaIndicador: 'Via Dupla',
        candidato: { Nome: nomes[n], Email: nomes[n].split(' ')[0].toLowerCase() + n + '@exemplo.com', Telefone: '4199000' + String(1000 + n), Cidade: 'Curitiba', UF: 'PR', ConsentimentoLGPD: 'Sim' }
      });
    }
  }
  const cards = b.ok('kanban', {}).cards;
  const mv = (c, etapa, extra) => b.ok('moveCandidatura', Object.assign({ id: c.ID, etapa }, extra || {}));
  at('2026-11-06');
  cards.forEach((c, i) => { if (i % 4 !== 3) mv(c, 'Triagem de currículo'); });
  at('2026-11-10');
  cards.forEach((c, i) => { if (i % 4 === 0) b.ok('saveEntrevista', { CandidaturaID: c.ID, Tipo: 'RH', Agendamento: '2026-11-11T10:00', Entrevistador: c.analista }); });
  cards.forEach((c, i) => { if (i % 4 === 1) mv(c, 'Reprovado / desistente', { motivoReprovacao: ['Experiência incompatível com a função', 'Pretensão salarial incompatível', 'Não respondeu aos contatos'][i % 3] }); });
  at('2026-11-12');
  cards.forEach((c, i) => {
    if (i % 4 === 0) {
      const cd = b.ok('getCandidatura', { id: c.ID });
      b.ok('saveEntrevista', { ID: cd.entrevistas[0].ID, CandidaturaID: c.ID, Tipo: 'RH', Agendamento: '2026-11-11T10:00', Entrevistador: c.analista, Resultado: 'Aprovado', ProximaEtapa: 'Entrevista gestor', Parecer: 'Boa comunicação e experiência compatível.' });
    }
  });
  at('2026-11-14');
  b.ok('saveEntrevista', { CandidaturaID: cards[0].ID, Tipo: 'Gestor', Agendamento: '2026-11-18T14:00', Entrevistador: cards[0].gestor });
  b.ok('saveIndicacao', { Nome: 'Marcos Antônio Teixeira', Telefone: '41988776655', Indicador: 'Colaborador 20', EmpresaIndicador: 'Via Dupla', DepartamentoIndicador: 'Transporte', CargoPretendido: 'Motorista Carreteiro' });
};
