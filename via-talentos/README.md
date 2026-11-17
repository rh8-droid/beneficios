# VIA TALENTOS

Portal de Gestão Estratégica de Recrutamento e Seleção, Grupo Via Dupla (Via Dupla Transportes e Via Avant Logística).

* Arquitetura, banco de dados, layout e fluxo: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
* Código do sistema (Google Apps Script): [`apps-script/`](apps-script)
* Testes automatizados e servidor local de demonstração: [`tests/`](tests), [`dev/`](dev)

## Entrega atual: Fase 1

| Módulo | O que funciona |
|---|---|
| Layout institucional | Preto/grafite, amarelo institucional e branco; menu lateral com os 10 módulos; responsivo (menu em gaveta no celular). Logo e foto da sede são lidos do Drive (`LOGO_DRIVE_ID`, `FOTO_DRIVE_ID` em Config). |
| Configurações | Empresas, unidades, departamentos, cargos, gestores, analistas, feriados por unidade, usuários/perfis e parâmetros, com validação, bloqueio de duplicidade e inativação (sem apagar histórico). |
| Gestão de Vagas | Abertura com código automático (`VD-2026-0001` / `VA-2026-0001`), todos os campos do requisito, edição, 14 status com justificativa, várias posições preenchidas individualmente, cancelamento e reabertura de posição, nova requisição a partir de outra (reabertura), busca, filtros e exportação CSV. |
| Histórico | Toda alteração grava data/hora, usuário, de → para e justificativa (aba `Historico`). |
| SLA 15 dias úteis | Dias úteis decorridos e restantes, prazo original e ajustado, data real, atraso, % consumido, semáforo verde/amarelo/laranja/vermelho, feriados por unidade, suspensão com início/fim/justificativa (pausa configurável), exceções justificadas que preservam o prazo original. |
| Dashboard | 14 cards e 10 gráficos calculados dos registros, filtros por período, empresa, unidade, cargo, gestor, analista, status e departamento; lista de alertas (vencimento e vagas sem movimentação). Atualiza a cada 5 minutos. |
| SLA e Gargalos | Ranking das etapas com maior tempo de espera, responsável típico pela próxima ação e controle de prazo de todas as vagas ativas. |
| Perfis | Administrador RH, Analista RH (edita as suas vagas), Gestor (vê só as suas) e Direção (leitura consolidada). |

Os cards e gráficos de candidatos (funil, conversão, reprovações, origem) já leem as abas `Candidaturas`/`EtapasCandidatura` e passam a ter dados quando a Fase 2 estiver em uso.

## Como publicar (planilha "Processo de Contratação - VD")

1. Abra a planilha, vá em **Extensões → Apps Script**.
2. Crie os arquivos com os mesmos nomes da pasta `apps-script/` (`.gs` como *Script*, `.html` como *HTML*) e cole o conteúdo. Em **Configurações do projeto**, marque "Mostrar arquivo de manifesto" e substitua o `appsscript.json`.
   *Alternativa:* `npm i -g @google/clasp`, `clasp clone <scriptId>` e copie os arquivos, depois `clasp push`.
3. No editor, selecione a função **`setup`** e clique em **Executar** (autorize). Ela cria as abas e colunas que faltam sem apagar nada. Vagas já existentes recebem código e, se já estiverem em andamento, a data de abertura passa a ser o início do SLA.
4. (Opcional) Execute **`cadastrarFeriadosNacionais`** (ano corrente) e cadastre os feriados estaduais e municipais por unidade.
5. Confira a aba **Usuarios** (Email, Nome, Perfil, Ativo). Só e-mails ativos acessam o sistema.
6. **Implantar → Nova implantação → App da Web**: *Executar como: eu* e *Quem pode acessar: qualquer pessoa em viadupla.com*. Compartilhe o link.
7. Para usar a logo e a foto oficial: envie os arquivos ao Drive e informe os IDs em `Config` (`LOGO_DRIVE_ID`, `FOTO_DRIVE_ID`).

> A planilha e a pasta de currículos não precisam ser compartilhadas com gestores. O acesso é controlado pelo perfil dentro do app (LGPD).

## Testes e demonstração local

```bash
cd via-talentos/dev && npm install
npm test                       # 18 testes do back-end (SLA, feriados, suspensão, perfis, dashboard…)
node server.js --demo          # http://localhost:8080 com dados FICTÍCIOS de demonstração
```

O servidor local executa os mesmos arquivos `.gs` sobre uma planilha em memória (`tests/fake-gas.js`). Os dados de demonstração existem só nesse ambiente.

## Próximas fases

* **Fase 2:** candidatos (sem duplicidade), candidaturas, entrevistas, Kanban arrastar-e-soltar, reprovações, indicações, tempo por etapa.
* **Fase 3:** relatórios Excel/PDF, produtividade por analista, recorrência por cargo, alertas por e-mail, importação das planilhas antigas.
* **Fase 4:** Gerador de Artes (PNG/LinkedIn/Instagram/WhatsApp/PDF) com aprovação manual.
