# VIA TALENTOS — Arquitetura, Banco de Dados e Fluxo Operacional

Portal de Gestão Estratégica de Recrutamento e Seleção do Grupo Via Dupla
(Via Dupla Transportes e Via Avant Logística).

---

## 1. Decisão de plataforma (1ª versão)

| Camada | Tecnologia | Por quê |
|---|---|---|
| Front-end | HTML + CSS + JavaScript (SPA) servido pelo `HtmlService` | Roda no navegador do usuário, responsivo, sem instalação. Mesmo padrão do Portal de Benefícios já usado pelo RH. |
| Back-end | Google Apps Script (V8) | Autenticação Google Workspace nativa (`@viadupla.com`), sem servidor para manter. |
| Banco de dados | Google Sheets (planilha **Processo de Contratação - VD**), uma aba por tabela | Já é a base atual do RH; permite auditoria manual e importação das planilhas existentes. |
| Arquivos | Google Drive (currículos, logotipos, foto da sede, artes PNG/PDF) | Controle de compartilhamento do Workspace; os elementos oficiais ficam guardados como arquivos reutilizáveis. |
| Gráficos | Chart.js 4 (CDN cdnjs) | Leve e sem custo. |
| Alertas | Gatilhos de tempo do Apps Script + `MailApp` (Fase 3) | E-mail diário e notificações no painel. |

### Limites validados para o Sheets como banco

* Até cerca de **50 mil candidaturas/ano** e algumas dezenas de usuários simultâneos é confortável: cada tela lê as abas uma vez por requisição (cache em memória por execução) e as gravações usam `LockService` para evitar conflito e duplicidade.
* Limites do Apps Script: 6 min por execução, 10 milhões de células por planilha e 30 execuções simultâneas por usuário. Quando o volume passar de cerca de 200 mil linhas somadas, o caminho de migração é trocar só a camada `Db` (`02_Db.gs`) por Cloud SQL ou Firestore. As regras de negócio não dependem do Sheets.
* **Segurança/LGPD:** o app é publicado como *Web App* "executar como: eu (conta de serviço do RH)", com "acesso: qualquer pessoa da organização". A planilha e a pasta de currículos **não são compartilhadas** com gestores: eles só enxergam o que o perfil deles permite pela aplicação.

---

## 2. Arquitetura em camadas

```
┌──────────────────────────── Navegador (desktop / celular) ────────────────────────────┐
│ Index.html  ─ Styles.html ─ App.js.html                                               │
│  Menu lateral │ Dashboard │ Vagas │ Candidatos │ Kanban │ ... │ Configurações          │
│        └── google.script.run.api(acao, dados) ──────────────┐                         │
└─────────────────────────────────────────────────────────────┼─────────────────────────┘
                                                              ▼
┌──────────────────────────── Google Apps Script ───────────────────────────────────────┐
│ 08_Api.gs        roteador único: valida perfil → chama serviço → trata erro           │
│ 03_Auth.gs       usuário logado, perfis (Admin RH, Analista RH, Gestor, Direção)      │
│ 05_Vagas.gs      abertura, edição, status, posições, suspensão, exceção de SLA        │
│ 06_Cadastros.gs  empresas, unidades, departamentos, cargos, gestores, analistas,      │
│                  feriados, usuários, parâmetros                                       │
│ 07_Dashboard.gs  indicadores e séries dos gráficos (sempre a partir dos registros)    │
│ 04_Sla.gs        motor de dias úteis e SLA (funções puras, testadas)                  │
│ 02_Db.gs         repositório genérico: aba ↔ objeto, cria colunas que faltam, lock    │
│ 09_Setup.gs      cria/atualiza as abas e listas padrão                                │
└──────────────────────────────────────────┬────────────────────────────────────────────┘
                                           ▼
                Google Sheets (dados)  +  Google Drive (arquivos)
```

Princípios:

1. **Uma única porta de entrada** (`api`) com checagem de perfil antes de qualquer leitura ou gravação.
2. **Regras de negócio puras** (SLA, dias úteis, indicadores) separadas do acesso à planilha. Por isso são testadas automaticamente fora do Google (`npm test`).
3. **Nada é apagado:** status, suspensões e exceções geram novos registros em `Historico`, e o prazo original fica preservado para auditoria.
4. **Sem dados fictícios em produção:** o ambiente de demonstração (`dev/`) usa um banco em memória separado.

---

## 3. Estrutura do banco de dados (abas)

Convenções: `ID` é a chave interna (prefixo + 8 hex). Datas ficam em texto ISO (`aaaa-mm-dd` ou `aaaa-mm-dd hh:mm:ss`). Colunas novas são acrescentadas automaticamente no fim da aba, sem mexer nas existentes.

### 3.1 Núcleo de vagas (Fase 1)

**Vagas**: requisição de vaga

| Coluna | Descrição |
|---|---|
| ID | `VAG-xxxxxxxx` |
| Codigo | Código legível e único: `VD-2026-0001` / `VA-2026-0001` (sequencial por empresa e ano) |
| Empresa | Via Dupla \| Via Avant |
| Unidade, Cargo, Departamento, Gestor, Analista | Referências aos cadastros |
| QtdPosicoes | Quantidade de posições |
| DataAbertura | Data da solicitação |
| DataAprovacao | **Data oficial de abertura aprovada: início do SLA** |
| MotivoAbertura, ColaboradorSubstituido | Substituição, aumento de quadro, nova função, outra |
| TipoContrato, Modalidade, Horario | CLT/PJ/Estágio/Aprendizagem; presencial/híbrido/remoto |
| Salario, SalarioACombinar | Faixa salarial ou "A combinar" |
| Requisitos, Atribuicoes, Beneficios, Observacoes | Textos (Observacoes = internas) |
| Prioridade | Baixa, Média, Alta, Crítica |
| Status | Um dos 14 status oficiais |
| DataFechamento | Data em que a última posição foi preenchida / vaga concluída |
| Reaberturas | Quantas vezes a mesma requisição foi reaberta |
| ReaberturaDe | ID da vaga original (quando a reabertura gera nova requisição) |
| Etapas | Etapas do Kanban habilitadas para esta vaga (lista separada por `;`) |
| CriadoEm, CriadoPor, AtualizadoEm | Auditoria |

**Posicoes**: uma linha por posição da vaga

| ID | VagaID | Numero | Status (Aberta / Preenchida / Cancelada) | DataFechamento | CandidatoID | NomeContratado | Reaberturas |

**Suspensoes**: | ID | VagaID | Inicio | Fim | Justificativa | PausaSLA (Sim/Não) | Usuario | CriadoEm |

**ExcecoesSLA**: | ID | VagaID | DiasAdicionais | Justificativa | Usuario | CriadoEm |
(o prazo ajustado é calculado; o prazo original nunca é alterado)

**Historico**: trilha de auditoria de tudo

| ID | Tipo (Vaga/Posicao/Candidatura/Config…) | ReferenciaID | De | Para | DataHora | Usuario | Nota |

### 3.2 Cadastros (Fase 1)

| Aba | Colunas |
|---|---|
| Empresas | ID, Nome, Sigla, Ativo |
| Unidades | ID, Empresa, Nome, Cidade, UF, Ativo |
| Departamentos | ID, Nome, Ativo |
| Cargos | ID, Nome, Departamento, Ativo |
| Gestores | ID, Nome, Email, Empresa, Departamento, Ativo |
| Analistas | ID, Nome, Email, Ativo |
| Feriados | Data, Unidade (vazio = todas), Descricao |
| Usuarios | Email, Nome, Perfil, Ativo |
| Config | Chave, Valor (SLA_DIAS_UTEIS, SLA_SUSPENSAO_PAUSA, ALERTA_DIAS_RESTANTES, SITE_CANDIDATURA, LOGO_DRIVE_ID, FOTO_DRIVE_ID…) |

### 3.3 Processo seletivo (Fase 2, estrutura já criada)

| Aba | Colunas principais |
|---|---|
| Candidatos | ID, Codigo, Nome, CPF (opcional, para duplicidade), Email, Telefone, Cidade, UF, CargoInteresse, Origem, Formacao, Experiencia, Pretensao, Disponibilidade, CurriculoId (Drive), Analista, CriadoEm, ConsentimentoLGPD, ExcluirApos |
| Candidaturas | ID, VagaID, CandidatoID, Origem, Indicador, DataCandidatura, Etapa, EntradaEtapa, Responsavel, ProximaAcao, PrazoAcao, Status, MotivoReprovacao, Observacoes (restritas), DataConclusao |
| Entrevistas | ID, CandidaturaID, Tipo (RH/Gestor/Direção), Agendamento, Realizacao, Entrevistador, Resultado, Parecer, MotivoReprovacao, ProximaEtapa, RetornoPrevisto |
| EtapasCandidatura | ID, CandidaturaID, Etapa, Entrada, Saida, Responsavel, MotivoAtraso: base do tempo por etapa e dos gargalos |
| Indicacoes | ID, CandidatoID, CandidaturaID, Indicador, EmpresaIndicador, DepartamentoIndicador, DataIndicacao, Resultado, DataContratacao |

Regra de duplicidade: o candidato é único por CPF; sem CPF, por e-mail ou telefone normalizado. O mesmo candidato participa de várias vagas por meio de **Candidaturas**.

### 3.4 Automação visual (Fase 4)

| Aba | Colunas |
|---|---|
| Artes | ID, VagaID, Modelo, Formato (PNG/LinkedIn/Instagram/WhatsApp/PDF), ArquivoId, Versao, Status (Rascunho/Aprovada/Publicada), AprovadoPor, CriadoEm |

---

## 4. Motor de SLA (15 dias úteis)

* Início: **DataAprovacao** (sem aprovação, o SLA ainda não começou).
* Dia útil: segunda a sexta, excluindo feriados da unidade da vaga e feriados gerais (Unidade vazia).
* `diasDecorridos` = dias úteis após o início até hoje (ou até o fechamento).
* `prazoOriginal` = 15º dia útil após o início.
* `prazoAjustado` = prazo original + dias úteis de exceções justificadas + dias úteis suspensos (se `SLA_SUSPENSAO_PAUSA = Sim`).
* `diasRestantes`, `atraso`, `% consumido` derivam do prazo ajustado. O original fica sempre visível.
* SLA medido **por posição**. A vaga está "no SLA" quando todas as posições preenchidas fecharam no prazo.

| Faixa (dias úteis decorridos e efetivos) | Sinal |
|---|---|
| 0 a 9 | Verde: dentro do prazo |
| 10 a 12 | Amarelo: atenção |
| 13 a 15 | Laranja: crítico |
| > 15 | Vermelho: vencido |

---

## 5. Layout do dashboard

```
┌────────────┬──────────────────────────────────────────────────────────────────────┐
│ VIA        │  Dashboard                          [Atualizado 09:41] [Atualizar]  │
│ TALENTOS   ├──────────────────────────────────────────────────────────────────────┤
│            │ Filtros: Período | Empresa | Unidade | Cargo | Gestor | Analista |   │
│ Dashboard  │          Status | Departamento                       [Limpar]       │
│ Vagas      ├──────────────────────────────────────────────────────────────────────┤
│ Candidatos │ [Vagas abertas] [Posições disp.] [Abertas no mês] [Encerradas mês]   │
│ Kanban     │ [No SLA] [Fora do SLA] [Próx. vencimento] [Tempo médio] [Taxa SLA]   │
│ Entrevistas│ [Candidaturas] [Em processo] [Aprovados] [Reprovados] [Contratações] │
│ Indicações ├───────────────────────────────────┬──────────────────────────────────┤
│ SLA        │ Abertas x fechadas por mês        │ Vagas dentro x fora do SLA       │
│ Relatórios ├───────────────────────────────────┼──────────────────────────────────┤
│ Artes      │ Tempo médio por cargo             │ Tempo médio por etapa            │
│ Config.    ├───────────────────────────────────┼──────────────────────────────────┤
│            │ Funil / conversão por etapa       │ Motivos de reprovação            │
│ (usuário / │ Vagas por analista                │ Reaberturas por cargo            │
│  perfil)   │ Contratações por origem           │ Vagas em alerta de SLA (lista)   │
└────────────┴───────────────────────────────────┴──────────────────────────────────┘
```
Paleta: preto `#0f0f0f` e grafite `#1f1f1f`/`#2b2b2b` predominantes, amarelo institucional `#f2c200` para destaques e branco para texto. No celular, o menu vira gaveta e os cards ficam em 2 colunas.

---

## 6. Fluxo operacional

```
Gestor solicita ─► Analista cadastra vaga (status "Aguardando aprovação")
        │
        ▼
Aprovação (DataAprovacao) ─► SLA de 15 dias úteis começa ─► "Aprovada / aguardando divulgação"
        │                                                   │
        │                                     Gerador de Artes (Fase 4) → aprovação manual
        ▼
"Aberta / recebendo candidaturas" ─► candidatos entram no Kanban (Fase 2)
        │   Triagem → Contato → Entrevista RH → Gestor → Direção → Testes → Decisão
        │   (cada mudança grava entrada/saída da etapa e o responsável)
        ▼
Aprovado ─► Proposta ─► Processo admissional ─► Contratado
        │
        ▼
Posição preenchida (data real) ─► quando todas as posições fecham: vaga "Concluída / contratada"
        │
        ├─ Suspensão: registra início, fim e justificativa (pausa o SLA se configurado)
        ├─ Exceção de SLA: dias adicionais justificados (prazo original preservado)
        └─ Reabertura de posição: contador de reaberturas + histórico
```

---

## 7. Perfis de acesso

| Perfil | Vagas | Cadastros/Config | Dashboard |
|---|---|---|---|
| Administrador RH | Todas, criar/editar/excluir lógico | Total | Total |
| Analista RH | Cria; edita as suas (Analista = seu nome) | Consulta | Total |
| Gestor | Somente as vagas em que é Gestor (leitura + entrevistas na Fase 2) | — | Das suas vagas |
| Direção | Leitura consolidada | — | Total |

Usuário não cadastrado em **Usuarios** (ou inativo) não acessa o sistema.

---

## 8. Plano de entregas

| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Layout institucional, cadastros (empresas, unidades, departamentos, cargos, gestores, analistas, feriados, usuários, parâmetros), gestão de vagas e posições, histórico, SLA automático, dashboard | **Entregue** |
| 2 | Candidatos (sem duplicidade), candidaturas, entrevistas, Kanban arrastar-e-soltar, reprovações, indicações, tempo por etapa | **Entregue** |
| 3 | Relatórios Excel/PDF, gargalos, produtividade por analista, recorrência por cargo, alertas por e-mail | Próxima |
| 4 | Gerador de Artes (PNG/LinkedIn/Instagram/WhatsApp/PDF), templates, histórico e aprovação | — |
