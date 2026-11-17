# Prompts para continuidade

Dois prompts prontos para copiar e colar numa nova conversa com uma IA:

- **Prompt 1**: continuar o desenvolvimento da ferramenta de auditoria.
- **Prompt 2**: validar o relatório de outro sistema de conciliação (como foi feito com o sistema do desenvolvedor externo).

Anexe sempre os relatórios originais do MaxTrack e do RasterJor do mesmo período.

---

## Prompt 1 – Continuar o desenvolvimento da ferramenta

```
Atue como desenvolvedor sênior e especialista em RH/DP e em jornada de motoristas profissionais
(CLT, Lei 13.103/2015, CTB art. 67-C, STF ADI 5322).

Já existe uma ferramenta de Auditoria e Conciliação de Jornadas (MaxTrack × RasterJor) pronta,
no repositório GitHub rh8-droid/beneficios, pasta "auditoria-jornadas", branch
"claude/amazing-galileo-opc2me". Leia primeiro README.md, docs/ANALISE.md e js/ui/metodologia.js.
Não reescreva do zero: evolua o que existe e mantenha os testes passando (node tests/engine.test.js).

COMO A FERRAMENTA FUNCIONA
- Página HTML que roda 100% no navegador (abrir index.html), sem servidor. Dados ficam no IndexedDB.
- Motor em js/engine (util, config, parsers, reconcile, rules, diarias, payroll, audit);
  telas em js/ui. Bibliotecas locais em js/vendor (SheetJS, jsPDF, AutoTable).
- Ao mudar regras, aumentar AJ.VERSION em js/engine/audit.js: a auditoria salva é refeita
  automaticamente ao abrir a nova versão.

RELATÓRIOS DE ORIGEM
- MaxTrack "Relatório de Jornadas Completas" (XLS): 1 aba, cabeçalho na linha 4, 1 linha por
  motorista/dia; colunas Matrícula, Pessoa, CPF, Interstício, Consecutivas, Início, Fim, Placa,
  Total, Total de Trabalho, Direção, Em Posição, Espera, Dir. Contínua, Refeição, Até refeição,
  Repouso, Diurnas, Noturnas, Extras Diurnas/Noturnas, Extra Domingo, Extra Feriado, Extra Normal,
  Extra Excedente, Período 1..9; rodapé com parâmetros. "DSR" no MaxTrack = dia sem jornada.
  O MaxTrack não tem o calendário de feriados.
- RasterJor (espelho, XLS): 1 aba por motorista; bloco cadastral (Nome, CPF, Cargo,
  Nº Registro da Folha, Admissão, Empresa); colunas Data, Placa, Data/Hora Início, Data/Hora Fim,
  Hora Normal, Hora Normal Noturna, HE 50%, HE 50% Noturna, HE 100%, HE 100% Noturna, Refeição,
  Descanso, Saldo Espera, Repouso, Entre Jornada, Hora Falta Repouso, Tempo Atividade, Diária.
  Rótulos do dia: DSR, Feriado, Dia de DSR, Férias, Suspensão.

REGRAS DE NEGÓCIO JÁ DEFINIDAS PELO RH (manter)
- Cruzamento por CPF (matrícula NÃO serve: difere entre sistemas); fallback pelo nome.
- Jornadas comparadas por sobreposição de horário (não só pela data).
- Diferenças de até 2 minutos (para mais ou menos) não exigem ajuste.
- Motoristas que estão somente no MaxTrack são agregados: ficam fora da auditoria.
- Separar: (a) DIVERGÊNCIA ENTRE SISTEMAS = precisa de ajuste (integração, horas/HE,
  diárias, cadastro); (b) INCONFORMIDADE NA JORNADA = interjornada < 11h, refeição < 1h,
  excesso de jornada (8h + 4h), direção contínua > 5h30, mais de 6 dias sem DSR.
- Diárias conferidas pelo espelho do RasterJor: diária em dia sem jornada no RasterJor =
  "diária em dia de folga" (inclui DSR/feriado e jornada da véspera que avança menos de 4h).
- Dias consecutivos contados pelas jornadas do RasterJor.
- Criticidade: Crítica (impacto direto na folha), Alta, Média, Baixa, Sem ajuste.
- Ocorrências tratadas (Corrigido/Justificado/Encerrado) vão para página própria;
  responsável e data da tratativa preenchidos automaticamente (editáveis).
- Tema escuro como padrão, com botão para alternar.

PRÓXIMA ETAPA DESEJADA
Criar acesso para a LOGÍSTICA validar as inconformidades: cada motorista vinculado a um
programador (de preferência via planilha de programação), o programador vê só os seus
motoristas, justifica com motivo padrão + comentário, o RH aceita ou devolve, com prazo,
rastreabilidade (quem/quando/o quê) e indicadores (tempo de resposta, motivos, reincidência).
Como hoje os dados ficam só no navegador, é preciso armazenamento compartilhado com login
(sugestão: Google Planilhas + Apps Script, como o Portal de Benefícios do mesmo repositório).
Antes de construir, pergunte: plataforma (Google ou Microsoft), formato da planilha de
programação, quais ocorrências vão para a logística, número de programadores e prazo.

ORIENTAÇÕES
- Fale comigo em português simples: não tenho experiência técnica.
- Teste com os relatórios reais que vou anexar e mostre prints das telas.
- Nunca versione planilhas com dados de motoristas (LGPD).
- Entregue a versão nova em um arquivo .zip para eu baixar.
```

---

## Prompt 2 – Validar o relatório de outro sistema de conciliação

```
Preciso validar se um sistema de conciliação de jornadas (MaxTrack × RasterJor) está coerente.
Vou anexar:
1) o relatório de divergências gerado por esse sistema;
2) o relatório "Jornadas Completas" do MaxTrack e o espelho de jornada do RasterJor do mesmo
   período (fonte da verdade).
(Opcional: o Excel exportado pela nossa ferramenta de auditoria, para comparar.)

Faça assim:
1. Entenda a estrutura do relatório do sistema (colunas, tipos, sinais, datas) e me explique.
2. Para CADA linha do relatório, localize a jornada do motorista nos relatórios de origem
   (cruzar por nome/CPF e por sobreposição de horário, não só pela data) e calcule a
   diferença real = MaxTrack − RasterJor do item apontado (trabalho, refeição, HE...).
   Considere diferenças de até 2 minutos como arredondamento.
3. Classifique cada linha em:
   - CONFIRMADO: divergência real e valor compatível (até 15 min de diferença);
   - PROCEDE, VALOR DIFERENTE: divergência real, mas valor errado;
   - FALSO POSITIVO: MaxTrack e RasterJor iguais;
   - SEGMENTAÇÃO DIFERENTE: totais iguais, mas jornada cortada em ponto diferente;
   - VALOR INCORRETO: há diferença, mas sentido/valor errados;
   - FORA DO PERÍODO / SEM JORNADA: não validável.
4. Liste as divergências reais que o sistema NÃO apontou (jornadas do MaxTrack que não
   chegaram ao RasterJor, jornadas sem encerramento, jornadas unidas pelo RasterJor,
   trabalho/refeição divergentes acima de 15 min).
5. Aponte problemas de formato (campos fixos, percentuais errados, intervalos que não batem)
   e itens já APROVADOS que não procedem (risco de lançar ajuste errado na folha).
6. Gere um Excel para o desenvolvedor com as abas: "Leia-me" (base, convenção de sinal,
   tolerância, como conferir, resumo e observações de correção), "1. Falsos positivos",
   "2. Reais não apontadas", "3. Valor errado". Em cada linha: o que o sistema apontou, o que
   o MaxTrack e o RasterJor realmente mostram (início, fim, trabalho, refeição), a diferença
   real, ONDE CONFERIR (aba e linha de cada relatório de origem) e uma explicação curta.
   Não inclua CPF.
7. Resuma para mim em português simples, com números e exemplos concretos.

Referência da última validação (período 01 a 12/11/2026): de 82 apontamentos validáveis,
6 corretos, 18 com valor errado e 58 que não procediam; 108 divergências reais não apontadas,
sendo 24 jornadas do MaxTrack não integradas ao RasterJor.
```
