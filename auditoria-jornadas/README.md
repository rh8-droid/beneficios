# Auditoria e Conciliação de Jornadas — MaxTrack × RasterJor

Ferramenta do RH/DP para conferir, **antes do fechamento da folha**, se as jornadas que os motoristas registraram no **MaxTrack** (macros do rastreador) foram integradas e apuradas corretamente no **RasterJor/Logai**. Ela também identifica inconformidades legais e operacionais de jornada.

## Como usar

1. Abra `index.html` no Chrome ou no Edge (basta dar dois cliques; não precisa de servidor nem de internet).
2. Na primeira vez, informe seu nome. Ele fica registrado em cada auditoria e em cada tratativa.
3. **Importar e executar**: arraste o relatório *Jornadas Completas* do MaxTrack e o *espelho de jornada* do RasterJor (XLS/XLSX/CSV) do **mesmo período**.
4. Confira o reconhecimento das colunas. Se o layout mudar, ajuste em *Mapeamento de colunas*.
5. Clique em **Executar auditoria**.

| Tela | O que mostra |
|---|---|
| Painel gerencial | Indicadores, status das jornadas, ocorrências por categoria e por motorista, com filtros por período, motorista, matrícula, empresa, tipo e status |
| Conciliação de jornadas | Comparativo MaxTrack × RasterJor por jornada: início, fim, horas, HE 50%, HE 100% e motivo de cada diferença |
| Motoristas | Relatório individual com cadastro, jornada dia a dia, validações e ocorrências, exportável em PDF/Excel |
| Gestão de ocorrências | Tratativa (status, responsável, observações, data de resolução), atualização em lote e histórico de alterações |
| Conciliação de diárias | Diária do RasterJor × dias com jornada: diárias indevidas (dia sem jornada), não geradas (dia com jornada) e casos de viagem para conferência |
| Impacto na folha | HE não computadas, HE computadas a maior, horas normais não apuradas, indenizações potenciais e simulação em R$. **Não altera a folha** |
| Histórico | Todas as auditorias (usuário, data, arquivos com hash SHA-256), reprocessamento e backup |
| Parâmetros | Tolerâncias, limites legais e convencionais, feriados, cadastros ignorados e máscara de CPF |
| Metodologia | Estrutura dos relatórios, regras, base legal e limitações |

**Exportação:** os botões *Excel* e *PDF* do topo exportam a visão atual, com os filtros aplicados.

## Status

- 🟢 **Conciliado**: diferenças de até 2 minutos, para mais ou para menos (não exigem ajuste manual).
- 🟡 **Necessita conferência**: a diferença é pequena, ou há divergência acessória (placa, refeição, feriado ou forma de agrupar a jornada).
- 🔴 **Divergente / inconforme**: a diferença passa de 15 min, a jornada está ausente em um dos sistemas ou há infração.
- ⚪ **Não validado**: os dados são insuficientes. A ausência de informação nunca é tratada como prova.

## Criticidade

Filtro disponível no painel, conciliação, motoristas, ocorrências, diárias e folha:

- **Crítica**: impacto direto no pagamento (jornada/motorista não integrado, diária indevida ou não gerada, jornada em aberto no RasterJor, diferença ≥ 60 min).
- **Alta**: infrações trabalhistas e diferenças acima de 15 min.
- **Média**: inconformidades operacionais, horários divergentes, diárias para conferência.
- **Baixa**: diferenças de 3 a 15 min, placa, cadastro.
- **Sem ajuste**: jornadas com diferença de até 2 min e sem ocorrência.

## Segurança (LGPD)

- Todo o processamento acontece **no navegador**. Nenhum arquivo é enviado para servidores.
- O histórico fica no IndexedDB do navegador. Faça backups em *Histórico → Backup (JSON)* e guarde-os em local restrito.
- O `.gitignore` bloqueia o commit de planilhas e backups. **Nunca** versione relatórios reais.

## Estrutura

```
index.html            interface
css/app.css           estilos (tema claro/escuro)
js/engine/            motor (sem dependência de tela, roda também no Node)
  util.js             datas/horas, CPF, formatação
  config.js           parâmetros padrão e catálogo de ocorrências
  parsers.js          leitura MaxTrack/RasterJor (detecção de cabeçalho, mapeamento)
  reconcile.js        vínculo de motoristas (CPF/nome) e agrupamento de jornadas por sobreposição
  rules.js            regras legais, operacionais, de registro e de integração
  payroll.js          impacto potencial na folha
  audit.js            orquestração e indicadores
js/ui/                telas, armazenamento local e exportação
js/vendor/            SheetJS 0.18.5, jsPDF 2.5.1, jsPDF-AutoTable 3.8.2 (offline)
tests/engine.test.js  testes com dados sintéticos   →  node tests/engine.test.js
tests/run-real.js     resumo de relatórios reais    →  node tests/run-real.js mt.xlsx rj.xlsx
docs/ANALISE.md       análise dos relatórios reais e validação da lógica
```

## Base legal considerada (parametrizável)

CLT arts. 58 §1º, 66, 67, 71, 74 e 235-A a 235-H; Lei 13.103/2015; CTB art. 67-C; STF ADI 5322 (que vedou o fracionamento da interjornada e o desconto do tempo de espera); OJ 355 da SDI-1/TST. Ajuste os parâmetros conforme a convenção coletiva e valide com o jurídico.
