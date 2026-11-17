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
    ALERTAS_EMAIL: 'Não',
    ALERTAS_HORA: '7',
    CODIGO_CULTURA: '',
    GPTW_DRIVE_ID: '',
    GPTW_VIGENTE_ATE: '',
    BENEFICIOS_PADRAO: 'Vale-refeição;Vale-alimentação;Plano de saúde;Plano odontológico;Seguro de vida;Convênio farmácia;Participação nos resultados;TotalPass',
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
    'Reaberturas', 'ReaberturaDe', 'Etapas', 'CriadoEm', 'CriadoPor', 'AtualizadoEm', 'AtualizadoPor', 'ImportKey'],
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
  Artes: ['ID', 'VagaID', 'Modelo', 'Formato', 'ArquivoId', 'Versao', 'Status', 'AprovadoPor', 'CriadoEm', 'CriadoPor',
    'AprovadoEm', 'PublicadoEm', 'Canal', 'Dados', 'Largura', 'Altura', 'Observacao'],
  Indicacoes: ['ID', 'CandidatoID', 'CandidaturaID', 'Indicador', 'EmpresaIndicador',
    'DepartamentoIndicador', 'DataIndicacao', 'Resultado', 'DataContratacao', 'CargoPretendido',
    'Observacoes', 'CriadoEm', 'CriadoPor']
};

/** Chave usada para localizar registros em cada aba. */
var SCHEMA_KEY = {
  Usuarios: 'Email',
  Config: 'Chave'
};
