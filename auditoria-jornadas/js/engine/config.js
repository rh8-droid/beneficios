/*
 * Parâmetros padrão da auditoria. Todos são editáveis na tela "Parâmetros"
 * para refletir convenção coletiva (CCT/ACT) e regras internas.
 *
 * Os valores padrão seguem a CLT (arts. 58, 66, 67, 71, 235-A a 235-H),
 * a Lei 13.103/2015, o CTB (art. 67-C) e a decisão do STF na ADI 5322
 * (julgada em 2023), além dos parâmetros encontrados no rodapé do relatório
 * do MaxTrack da empresa. Revisar com o jurídico/sindicato antes de usar
 * como base para decisões disciplinares ou pagamentos.
 */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});

  const DEFAULTS = {
    // ---------- Conciliação ----------
    versaoCfg: 2,
    toleranciaMarcacao: 2, // min por marcação: diferenças de até 2 min não exigem ajuste manual
    toleranciaDiaria: 2, // min de diferença de horas/HE no dia sem exigir ajuste
    limiteCritico: 60, // min: divergências de horas/HE a partir disso são "Críticas"
    limiteConferencia: 15, // até aqui = "necessita conferência"; acima = divergente

    // ---------- Jornada ----------
    jornadaNormal: { 0: 0, 1: 480, 2: 480, 3: 480, 4: 480, 5: 480, 6: 240 }, // min por dia da semana (0=dom)
    jornadaBaseLegal: 480, // 8h (CLT art. 235-C caput)
    heMaxDiaria: 240, // 4h quando autorizado por CCT (art. 235-C); a CLT sem CCT admite 2h
    limiteSemanal: 3360, // 56h de trabalho na semana (44h + 12h extras) – regra parametrizável
    validarSemanal: true,
    maxDiasConsecutivos: 6, // DSR (CLT art. 67 / Lei 605/49)

    // ---------- Descansos ----------
    interjornadaMin: 660, // 11h (CLT art. 66 e art. 235-C §3º)
    permitirFracionamentoInterjornada: false, // vedado pelo STF na ADI 5322
    interjornadaPrimeiroPeriodo: 480, // 8h (somente se fracionamento permitido)
    intrajornadaAcima6h: 60, // 1h (CLT art. 71 / art. 235-C §2º)
    intrajornada4a6h: 15, // 15 min (CLT art. 71 §1º)
    considerarDescansoComoIntervalo: false, // somar "descanso" ao intervalo de refeição
    direcaoContinuaMax: 330, // 5h30 (CTB art. 67-C)
    direcaoDiariaMax: 600, // 10h (regra operacional configurada no MaxTrack)
    validarDirecaoDiaria: true,
    pausaInternaLonga: 240, // pausas internas ≥ 4h dentro de uma mesma jornada são sinalizadas
    tempoMaxAteRefeicao: 330, // 5h30 até a refeição (regra operacional configurada no MaxTrack)
    validarTempoAteRefeicao: false,

    // ---------- Diárias ----------
    conciliarDiarias: true,
    diariaEmTodoDiaTrabalhado: true, // espera diária em todo dia com jornada iniciada
    valorDiaria: 0, // R$ – diária inteira (0 = não simula)
    valorMeiaDiaria: 0, // R$ – meia diária

    // ---------- Folha ----------
    valorHoraPadrao: 0, // R$ – 0 = não simula valores
    adicionalHE50: 50,
    adicionalHE100: 100,
    valoresHora: {}, // por CPF

    // ---------- Exibição ----------
    mascararCpf: false,
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function merge(base, over) {
    const out = clone(base);
    if (!over) return out;
    for (const k of Object.keys(over)) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') {
        out[k] = Object.assign({}, base[k], over[k]);
      } else if (over[k] !== undefined) {
        out[k] = over[k];
      }
    }
    return out;
  }

  // Tipos de ocorrência: categoria, gravidade padrão e base legal/descrição
  const CATEGORIAS = {
    INFRACAO: 'Infração trabalhista',
    OPERACIONAL: 'Inconformidade operacional',
    INTEGRACAO: 'Falha de integração',
    DIVERGENCIA: 'Divergência de apuração',
    REGISTRO: 'Ausência / falha de registro',
    CADASTRO: 'Divergência cadastral',
    NAO_VALIDADO: 'Não foi possível validar',
    DIARIA: 'Divergência de diárias',
  };

  const TIPOS = {
    // Integração
    JORNADA_AUSENTE_RJ: { cat: 'INTEGRACAO', grav: 'Alta', nome: 'Jornada do MaxTrack ausente no RasterJor' },
    JORNADA_AUSENTE_MT: { cat: 'INTEGRACAO', grav: 'Média', nome: 'Jornada do RasterJor sem correspondente no MaxTrack' },
    MOTORISTA_AUSENTE_RJ: { cat: 'INTEGRACAO', grav: 'Alta', nome: 'Motorista do MaxTrack não encontrado no RasterJor' },
    MOTORISTA_AUSENTE_MT: { cat: 'INTEGRACAO', grav: 'Baixa', nome: 'Motorista do RasterJor não encontrado no MaxTrack' },
    SITUACAO_DIVERGENTE: { cat: 'INTEGRACAO', grav: 'Média', nome: 'Situação do dia divergente entre sistemas' },
    DUPLICIDADE: { cat: 'INTEGRACAO', grav: 'Média', nome: 'Possível registro duplicado' },
    // Divergências de apuração
    HORARIO_DIVERGENTE: { cat: 'DIVERGENCIA', grav: 'Média', nome: 'Horário de início/fim divergente' },
    HORAS_DIVERGENTES: { cat: 'DIVERGENCIA', grav: 'Alta', nome: 'Total de horas trabalhadas divergente' },
    HE50_DIVERGENTE: { cat: 'DIVERGENCIA', grav: 'Alta', nome: 'Hora extra 50% divergente' },
    HE100_DIVERGENTE: { cat: 'DIVERGENCIA', grav: 'Alta', nome: 'Hora extra 100% divergente' },
    INTERVALO_DIVERGENTE: { cat: 'DIVERGENCIA', grav: 'Baixa', nome: 'Refeição/descanso/espera divergente' },
    PLACA_DIVERGENTE: { cat: 'DIVERGENCIA', grav: 'Baixa', nome: 'Placa divergente' },
    // Cadastro
    CPF_DIVERGENTE: { cat: 'CADASTRO', grav: 'Média', nome: 'CPF divergente entre sistemas' },
    MATRICULA_DIVERGENTE: { cat: 'CADASTRO', grav: 'Baixa', nome: 'Matrícula MaxTrack ≠ Nº Registro RasterJor' },
    // Infrações
    INTERJORNADA: { cat: 'INFRACAO', grav: 'Alta', nome: 'Descanso entre jornadas inferior a 11h' },
    INTRAJORNADA: { cat: 'INFRACAO', grav: 'Alta', nome: 'Intervalo intrajornada inferior ao mínimo' },
    DIRECAO_CONTINUA: { cat: 'INFRACAO', grav: 'Alta', nome: 'Direção contínua acima de 5h30' },
    EXCESSO_JORNADA: { cat: 'INFRACAO', grav: 'Alta', nome: 'Jornada acima do limite diário' },
    DIAS_CONSECUTIVOS: { cat: 'INFRACAO', grav: 'Alta', nome: 'Dias consecutivos sem DSR' },
    // Operacionais
    LIMITE_SEMANAL: { cat: 'OPERACIONAL', grav: 'Média', nome: 'Horas semanais acima do parâmetro' },
    DIRECAO_DIARIA: { cat: 'OPERACIONAL', grav: 'Média', nome: 'Tempo de direção diário acima do parâmetro' },
    PAUSA_INTERNA_LONGA: { cat: 'OPERACIONAL', grav: 'Média', nome: 'Jornada com pausa interna longa (possível interjornada não encerrada)' },
    TEMPO_ATE_REFEICAO: { cat: 'OPERACIONAL', grav: 'Baixa', nome: 'Refeição após o tempo máximo parametrizado' },
    INTERJORNADA_FRACIONADA: { cat: 'OPERACIONAL', grav: 'Média', nome: 'Interjornada < 11h – conferir fracionamento' },
    // Registros
    SEM_REFEICAO: { cat: 'REGISTRO', grav: 'Alta', nome: 'Jornada > 6h sem registro de refeição' },
    JORNADA_ABERTA: { cat: 'REGISTRO', grav: 'Alta', nome: 'Jornada sem encerramento' },
    SEQUENCIA_INVALIDA: { cat: 'REGISTRO', grav: 'Média', nome: 'Sequência de eventos inconsistente' },
    SEM_DIRECAO: { cat: 'REGISTRO', grav: 'Baixa', nome: 'Jornada sem tempo de direção registrado' },
    // Diárias
    DIARIA_SEM_JORNADA: { cat: 'DIARIA', grav: 'Alta', nome: 'Diária gerada em dia sem jornada' },
    DIARIA_CONTINUACAO: { cat: 'DIARIA', grav: 'Média', nome: 'Diária em dia sem início de jornada (continuação/viagem)' },
    DIARIA_NAO_GERADA: { cat: 'DIARIA', grav: 'Alta', nome: 'Dia com jornada sem diária gerada' },
    DIARIA_SO_RJ: { cat: 'DIARIA', grav: 'Média', nome: 'Diária em jornada sem registro no MaxTrack' },
    // Não validado
    NAO_VALIDADO: { cat: 'NAO_VALIDADO', grav: 'Baixa', nome: 'Regra não validada por falta de dados' },
  };

  const GRAV_ORDEM = { Crítica: 4, Alta: 3, Média: 2, Baixa: 1 };
  const CRITICIDADES = ['Crítica', 'Alta', 'Média', 'Baixa'];

  // Ocorrências com impacto direto no pagamento são "Críticas"
  const TIPOS_CRITICOS = new Set(['JORNADA_AUSENTE_RJ', 'MOTORISTA_AUSENTE_RJ', 'DIARIA_SEM_JORNADA', 'DIARIA_NAO_GERADA']);
  function criticidade(o, cfg) {
    if (TIPOS_CRITICOS.has(o.tipo)) return 'Crítica';
    if (o.tipo === 'JORNADA_ABERTA' && o.sistema === 'RasterJor') return 'Crítica';
    if (o.catKey === 'DIVERGENCIA' && o.minutos && o.minutos >= (cfg.limiteCritico || 60)) return 'Crítica';
    return o.gravidade;
  }

  AJ.config = { DEFAULTS, clone, merge, CATEGORIAS, TIPOS, GRAV_ORDEM, CRITICIDADES, criticidade };
  if (typeof module !== 'undefined' && module.exports) module.exports = AJ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
