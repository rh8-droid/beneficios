/* Texto da tela "Metodologia" (sem dados pessoais). */
(function (root) {
  'use strict';
  const AJ = (root.AJ = root.AJ || {});
  AJ.METODOLOGIA_HTML = `
<h2>Metodologia da auditoria</h2>
<p>A ferramenta compara o que o motorista <b>registrou</b> no rastreador (MaxTrack, por macros) com o que foi <b>apurado para pagamento</b> no sistema de jornada (RasterJor/Logai). O objetivo é identificar, antes do fechamento da folha, perdas de informação na integração, diferenças de cálculo e inconformidades de jornada.</p>

<h3>1. Estrutura dos relatórios analisados</h3>
<table>
<tr><th></th><th>MaxTrack – "Relatório de Jornadas Completas"</th><th>RasterJor – espelho de jornada</th></tr>
<tr><td>Formato</td><td>1 aba; cabeçalho na linha 4; 1 linha por motorista/dia; rodapé com os parâmetros configurados</td><td>1 aba por motorista; bloco cadastral (nome, CPF, cargo, nº registro da folha, admissão, empresa); cabeçalho em 2 níveis; 1 linha por dia</td></tr>
<tr><td>Identificação</td><td>Matrícula, Pessoa, CPF</td><td>Nome, CPF, Nº Registro da Folha, Empresa</td></tr>
<tr><td>Jornada</td><td>Início, Fim, Placa, Períodos 1–9 ("07:42 até 11:57")</td><td>Data/Hora Início, Data/Hora Fim, Placa</td></tr>
<tr><td>Horas</td><td>Total, Total de Trabalho, Diurnas, Noturnas, Extras Diurnas/Noturnas, Extra Domingo, Extra Feriado, Extra Normal (até o autorizado), Extra Excedente</td><td>Hora Normal, Hora Normal Noturna, HE 50%, HE 50% Noturna, HE 100%, HE 100% Noturna, Tempo Atividade</td></tr>
<tr><td>Atividades</td><td>Direção, Em Posição, Espera, Motor, Dir. Contínua (maior trecho), Refeição, Até refeição, Repouso</td><td>Refeição (início/fim/horas), Descanso (início/fim/horas), Saldo Espera</td></tr>
<tr><td>Descansos</td><td>Interstício (descanso antes da jornada), Consecutivas (dias seguidos)</td><td>Início/Fim Repouso, Entre Jornada (descanso após a jornada), Hora Falta Repouso</td></tr>
<tr><td>Situação do dia</td><td>"DSR" (na prática: dia sem jornada iniciada), "Férias"</td><td>DSR, Feriado, Dia de DSR (trabalhado), Férias, Suspensão</td></tr>
</table>

<h3>2. Chave de cruzamento</h3>
<p>O cruzamento é feito por <b>CPF + horário da jornada</b>. A matrícula <b>não</b> é usada como chave porque, nos relatórios reais, o Nº de Registro da Folha do RasterJor difere da matrícula do MaxTrack em vários motoristas (empresas diferentes do grupo) e há matrículas iguais para pessoas diferentes. Quando o CPF não bate, a ferramenta tenta o nome normalizado e sinaliza <i>CPF divergente</i>.</p>
<p>As jornadas são agrupadas por <b>sobreposição de horário</b> (não apenas pela data): se um sistema dividiu em duas uma jornada que o outro manteve inteira, as duas são comparadas como um único grupo e a diferença de fechamento é apontada.</p>

<h3>3. Comparações realizadas</h3>
<table>
<tr><th>Item</th><th>MaxTrack</th><th>RasterJor</th></tr>
<tr><td>Início / término</td><td>Início / Fim</td><td>Data/Hora Início / Fim</td></tr>
<tr><td>Total trabalhado</td><td>Total de Trabalho</td><td>Tempo Atividade</td></tr>
<tr><td>Horas normais</td><td>Total de Trabalho − extras</td><td>Hora Normal + Hora Normal Noturna</td></tr>
<tr><td>HE 50%</td><td>Extras (diurnas + noturnas) − domingo − feriado</td><td>HE 50% + HE 50% Noturna</td></tr>
<tr><td>HE 100%</td><td>Extra Domingo + Extra Feriado</td><td>HE 100% + HE 100% Noturna</td></tr>
<tr><td>Refeição / descanso / espera</td><td>Refeição / Repouso / Espera</td><td>Horas Refeição / Horas Descanso / Saldo Espera</td></tr>
<tr><td>Placa</td><td>Placa (pode listar terminal de login)</td><td>Placa</td></tr>
</table>
<p><b>Diferença = MaxTrack − RasterJor.</b> Positiva: registrado e não apurado (risco de pagamento a menor). Negativa: apurado a maior no RasterJor (risco de pagamento indevido).</p>
<p><b>Status da conciliação:</b> <span class="badge ok"><span class="dot"></span>Conciliado</span> diferenças dentro da tolerância (5 min por marcação / 10 min no dia – CLT art. 58 §1º);
<span class="badge warn"><span class="dot"></span>Necessita conferência</span> diferença acima da tolerância e até 15 min, ou diferenças acessórias (placa, refeição, agrupamento, feriado);
<span class="badge bad"><span class="dot"></span>Divergente</span> diferença acima de 15 min ou jornada ausente em um dos sistemas;
<span class="badge nv"><span class="dot"></span>Não validado</span> dados insuficientes ou fora do período comum aos dois relatórios. Todos os limites são parametrizáveis.</p>
<p><b>Feriados e DSR de escala:</b> quando o RasterJor trata o dia como feriado/DSR (HE 100%) e o MaxTrack como dia normal (HE 50%), a comparação reclassifica as horas do MaxTrack e aponta a diferença de calendário como "conferência", em vez de acusar falta de horas.</p>

<h3>4. Regras de auditoria</h3>
<table>
<tr><th>Regra</th><th>Critério padrão</th><th>Classificação</th><th>Fonte</th></tr>
<tr><td>Descanso entre jornadas</td><td>&lt; 11h entre o fim de uma jornada e o início da seguinte (inclui o "Interstício" informado para a 1ª jornada do período)</td><td>Infração trabalhista</td><td>CLT art. 66; art. 235-C §3º; STF ADI 5322 (sem fracionamento); OJ 355</td></tr>
<tr><td>Intervalo intrajornada</td><td>Trabalho &gt; 6h com refeição &lt; 1h; trabalho de 4–6h com pausa &lt; 15 min</td><td>Infração trabalhista</td><td>CLT art. 71 e §4º; art. 235-C §2º</td></tr>
<tr><td>Jornada &gt; 6h sem refeição registrada</td><td>Sem macro de refeição</td><td>Ausência de registro (não presume supressão)</td><td>CLT art. 71</td></tr>
<tr><td>Direção contínua</td><td>Maior trecho contínuo &gt; 5h30</td><td>Infração (CTB)</td><td>CTB art. 67-C</td></tr>
<tr><td>Excesso de jornada</td><td>Trabalho &gt; 8h + HE máximas (padrão 4h, CCT)</td><td>Infração trabalhista</td><td>CLT art. 235-C</td></tr>
<tr><td>Dias consecutivos</td><td>&gt; 6 dias seguidos com jornada (usa o contador do MaxTrack)</td><td>Infração trabalhista</td><td>CLT art. 67; Lei 605/49</td></tr>
<tr><td>Pausa interna longa</td><td>Pausa ≥ 4h dentro da mesma jornada (possível repouso não encerrado)</td><td>Inconformidade operacional</td><td>Controle de jornada</td></tr>
<tr><td>Limite semanal / direção diária / tempo até refeição</td><td>Parâmetros internos (ex.: valores configurados no MaxTrack)</td><td>Inconformidade operacional</td><td>Regra interna</td></tr>
<tr><td>Jornada sem encerramento</td><td>Início sem fim</td><td>Ausência de registro</td><td>CLT art. 74 §2º</td></tr>
<tr><td>Jornada ausente / motorista ausente / situação divergente (férias, suspensão)</td><td>Presente em um sistema e não no outro</td><td>Falha de integração</td><td>—</td></tr>
<tr><td>Diferença de horas, HE, horários, placa</td><td>Acima da tolerância</td><td>Divergência de apuração</td><td>—</td></tr>
<tr><td>CPF / matrícula diferentes</td><td>Cadastro diferente entre sistemas</td><td>Divergência cadastral</td><td>—</td></tr>
</table>
<p>As regras legais usam o <b>MaxTrack como fonte primária</b> (registro original das macros). Para jornadas que só existem no RasterJor, usa-se o RasterJor. Quando um dado necessário não existe (ex.: direção no RasterJor), a regra fica como <b>"Não foi possível validar"</b> – a ausência de informação não é tratada como prova de que algo não ocorreu.</p>

<h3>5. Limitações dos dados disponíveis</h3>
<ul>
<li>Os relatórios trazem <b>totais por jornada</b>, não o log de cada macro. A falta de macro é inferida (jornada sem fim, jornada sem refeição, sem direção, pausa longa interna); para confirmar, consulte o relatório de macros do MaxTrack.</li>
<li>O MaxTrack informa apenas o <b>maior trecho de direção contínua</b>, sem o horário; o RasterJor não informa direção.</li>
<li>O MaxTrack rotula como "DSR" todo dia sem jornada iniciada, sem distinguir folga, DSR ou falta.</li>
<li>O MaxTrack da empresa não tem o calendário de feriados (Domingo e Feriado sem jornada normal parametrizada); o RasterJor tem.</li>
<li>Jornadas em aberto no RasterJor acumulam horas até a emissão do relatório; essas diferenças ficam pendentes e não entram no total de HE indevida.</li>
<li>Arquivos PDF não são importados: os dois sistemas exportam XLS, que é a fonte estruturada confiável.</li>
<li>Os valores financeiros são simulações (valor hora × adicional) e não substituem o cálculo da folha.</li>
</ul>

<h3>6. Segurança e rastreabilidade</h3>
<ul>
<li>Todo o processamento ocorre no navegador; nenhum dado é enviado a servidores.</li>
<li>Cada auditoria registra usuário, data/hora, nome e hash SHA-256 dos arquivos e os parâmetros usados.</li>
<li>Cada alteração de tratativa registra quem, quando, o valor anterior e o novo.</li>
<li>Recomenda-se backup periódico (Histórico → Backup) guardado em local restrito, pois contém dados pessoais (LGPD).</li>
</ul>`;
})(typeof globalThis !== 'undefined' ? globalThis : this);
