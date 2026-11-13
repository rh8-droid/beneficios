# Análise dos relatórios reais e validação da lógica

Base: relatórios do período **01/11/2026 a 12/11/2026** (MaxTrack "Jornadas Completas" emitido em 13/11/2026 e espelho de jornada do RasterJor do mesmo período).
Este documento traz **apenas números agregados**: nenhum nome, CPF ou matrícula de motorista é versionado.

## 1. Estrutura encontrada

| | MaxTrack | RasterJor |
|---|---|---|
| Organização | 1 aba, 1 linha por motorista/dia (1.227 linhas) | 101 abas (1 por motorista), 12 linhas/dia por aba |
| Cabeçalho | Linha 4, 39 colunas | Bloco cadastral (linhas 1–7) + cabeçalho em 2 níveis (linhas 9–10), 23 colunas |
| Motoristas | 108 CPFs | 101 CPFs |
| Jornadas | 849 | 759 |
| Dias sem jornada | 345 "DSR" + 57 "Férias" | DSR, Feriado, Dia de DSR, Férias, Suspensão, "—" |
| Extras | Rodapé com 27 parâmetros configurados (interstício 11h, HE autorizada 4h, direção contínua 5h30, refeição 1h, máx. 6 dias…) | — |

Colunas completas de cada relatório e a correspondência entre elas estão na tela **Metodologia** da ferramenta.

## 2. Descobertas que definiram a lógica

1. **A matrícula não serve de chave.** Em 18 motoristas a matrícula do MaxTrack é diferente do "Nº Registro da Folha" do RasterJor (empresas diferentes do grupo), e há matrículas iguais para pessoas diferentes. O cruzamento é feito por **CPF** (97 motoristas). Quando o CPF não bate, a ferramenta tenta o **nome** (1 caso) e sinaliza.
2. **O "DSR" do MaxTrack quer dizer "dia sem jornada iniciada"**, e não descanso semanal de fato. A situação real do dia (DSR, feriado, férias, suspensão) vem do RasterJor.
3. **O MaxTrack não tem o feriado de 02/11 cadastrado.** Ele apura essas horas como normais/HE 50%, enquanto o RasterJor apura HE 100%. Isso é tratado como diferença de calendário, com reclassificação, e não como falta de horas (4 jornadas).
4. **As jornadas precisam ser comparadas por sobreposição de horário, não por data.** Há 11 casos em que o RasterJor **uniu duas jornadas do MaxTrack em uma** e computou como trabalho o descanso entre elas (em um caso, 12h de repouso viraram cerca de 10h de HE 50% a mais), e 10 casos em que o MaxTrack manteve como uma só jornada o que o RasterJor dividiu em duas.
5. **Jornadas em aberto no RasterJor** (10 casos, todas no último dia do período) acumulam horas até a emissão do relatório, com até 29h "trabalhadas". Elas ficam como pendência e não entram no total de HE indevida.
6. **Total de trabalho**: os dois sistemas costumam diferir em 1–2 minutos (arredondamento de segundos). Por isso as tolerâncias seguem o art. 58 §1º da CLT (5 min por marcação, 10 min no dia).
7. **"Hora Falta Repouso" do RasterJor** confere com o descanso calculado a partir dos horários do MaxTrack (ex.: 09:34 de descanso, 01:26 faltantes nos dois). Isso valida a regra de interjornada.
8. **Há usuários que não são motoristas** logados no MaxTrack (ex.: manutenção). Eles podem ser excluídos em *Parâmetros → Cadastros ignorados*.

## 3. Resultado da auditoria com os parâmetros padrão

| Indicador | Valor |
|---|---|
| Jornadas analisadas | 839 |
| Conciliadas (conferem dentro da tolerância) | 589 (70,2%) |
| Necessitam conferência | 29 |
| Divergentes | 221 |
| Jornadas do MaxTrack **sem apuração** no RasterJor | 90 (17 motoristas; 919h50 registradas) |
| Jornadas do RasterJor sem MaxTrack | 1 |
| Motoristas do MaxTrack não encontrados no RasterJor | 10 (2 deles são usuários de manutenção) |
| Conflitos de situação (férias no MaxTrack não lançadas no RasterJor) | 12 |
| HE 50% registradas e não computadas no RasterJor | 475h20 |
| HE 100% registradas e não computadas no RasterJor | 46h37 |
| HE 50% computadas a maior no RasterJor | 254h33 |
| Horas normais não apuradas (risco de falta indevida) | 544h01 |

Inconformidades de jornada (fonte: MaxTrack):

| Regra | Ocorrências |
|---|---|
| Jornada acima de 8h + 4h extras | 302 |
| Descanso entre jornadas < 11h | 256 (em 209 o RasterJor também apurou falta de repouso; em 9 não apurou) |
| Dias consecutivos sem DSR (> 6) | 30 |
| Intervalo intrajornada abaixo do mínimo | 27 |
| Jornada > 6h sem refeição registrada | 13 |
| Direção contínua > 5h30 | 11 |
| Pausa interna ≥ 4h dentro da mesma jornada | 21 |

## 4. Limitações

- Os relatórios trazem totais por jornada, e não o registro de cada macro. A falta de macro é inferida (jornada sem fim, sem refeição, sem direção, pausa longa) e deve ser confirmada no relatório de macros.
- O horário exato da direção contínua não é exportado. Existe apenas o maior trecho contínuo, e só no MaxTrack.
- O RasterJor não informa direção, então a regra de direção só vale para jornadas presentes no MaxTrack. Nos demais casos, o resultado é "Não foi possível validar".
- Arquivos PDF não são importados, porque os dois sistemas exportam XLS, que é a fonte estruturada confiável.
- O limite diário padrão (8h + 4h) supõe que a CCT autoriza 4h extras, como está configurado no MaxTrack. Ele deve ser confirmado com o jurídico ou sindicato.
