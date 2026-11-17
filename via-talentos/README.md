# VIA TALENTOS

Portal de Gestão Estratégica de Recrutamento e Seleção, Grupo Via Dupla (Via Dupla Transportes e Via Avant Logística).

* Arquitetura, banco de dados, layout e fluxo: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
* Código do sistema (Google Apps Script): [`apps-script/`](apps-script)
* Testes automatizados e servidor local de demonstração: [`tests/`](tests), [`dev/`](dev)

## Entregas: Fases 1 a 4 (projeto completo)

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

**Fase 2 — acompanhamento dos candidatos**

| Módulo | O que funciona |
|---|---|
| Candidatos | Base única com código `CAN-000001`; bloqueio de duplicidade por CPF (validado), e-mail ou telefone; histórico de participação em vários processos sem duplicar cadastro; currículo (PDF/Word/imagem, até 8 MB) guardado numa pasta restrita do Drive e baixado só pelo sistema; consentimento e prazo de retenção (LGPD) e anonimização pelo Administrador. |
| Kanban | 12 colunas, arrastar e soltar, etapas configuráveis por vaga; cada card mostra candidato, vaga, analista, data de entrada, dias úteis aguardando, próxima ação, responsável e prazo (vermelho quando vencido). Reprovação exige motivo padronizado; "Contratado" preenche automaticamente a próxima posição da vaga. Parado há mais de 3 dias úteis: pede o motivo do atraso. |
| Entrevistas | RH, gestor e direção: agendamento, realização, entrevistador, parecer, resultado, motivo de reprovação, próxima etapa e retorno previsto. Agendar move o candidato para a etapa da entrevista; o resultado move para a próxima etapa ou para reprovado. Gestor e Direção registram as entrevistas do seu tipo. |
| Indicações | Cadastro do indicado e do colaborador indicador (empresa e departamento), vínculo opcional a uma vaga, reaproveitamento de cadastro existente, taxa de conversão, cargos com mais indicações e contratações por origem. |
| Tempo por etapa | Entrada, saída, tempo em dias úteis, responsável e motivo do atraso de cada etapa do candidato; ranking de espera por etapa e ações vencidas por responsável em **SLA e Gargalos**. |
| Perfis | Gestor só vê candidatos já encaminhados (a partir da entrevista com gestor) das suas vagas; observações e pretensão salarial ficam restritas ao RH. |

**Fase 3 — inteligência gerencial**

| Módulo | O que funciona |
|---|---|
| Relatórios | 11 relatórios (geral, mensal, por analista, SLA, gargalos, candidatos por etapa, motivos de reprovação, indicações, recorrência, produtividade, canceladas/suspensas) com os filtros do dashboard, exportação em **Excel (.xlsx)** e **PDF** (gerado pelo Google, A4 paisagem). |
| Produtividade | Por analista: vagas, posições abertas/preenchidas, candidaturas, entrevistas, encaminhados ao gestor, contratações, tempo médio, % SLA, pendências — com a espera em etapas do RH separada da espera em gestor/direção. |
| Recorrência por cargo | Requisições × posições solicitadas × preenchidas × reaberturas, aberturas por mês, motivo e gestor mais frequentes, e comparação entre dois períodos. |
| Alertas | Sino no topo com contador: vagas vencendo/vencidas, sem movimentação, aguardando aprovação, candidatos aguardando retorno, decisões pendentes do gestor, aprovados aguardando admissão e entrevistas de hoje/amanhã — no formato "Vaga / Aberta há / Etapa crítica / Tempo de espera / Responsável / SLA restante". Envio diário por e-mail (dias úteis), configurável em Configurações → Alertas por e-mail. |
| Importação | Configurações → Importar planilha antiga: lê as abas antigas (ex.: RECRUTAMENTO, Página6) com cabeçalho mesclado, pré-visualiza, converte os status e importa sem duplicar; filtro "somente vagas com movimentação a partir de" (padrão: últimos 3 meses) e botão para desfazer a importação de uma aba. |

**Fase 4 — Gerador de Artes**

| Módulo | O que funciona |
|---|---|
| Identidade visual | Configurações → Identidade visual: envio do **logotipo oficial**, da **foto da sede** e do **selo GPTW** (com data de vigência), texto do **Código de Cultura**, site de candidatura e benefícios padrão. Os arquivos ficam no Drive e são reutilizados — nada é recriado por IA. |
| Gerador | Preenchimento automático com os dados da vaga aprovada; edição dos textos; escolha dos benefícios; opção de ocultar salário; selo GPTW só quando vigente; 3 modelos (Institucional com foto da sede, Destaque amarelo, Compacto); ajuste automático do tamanho da fonte; pré-visualização ao vivo. |
| Formatos | PNG alta qualidade (2160×2700), Instagram (1080×1350), LinkedIn (1200×1200), WhatsApp/status (1080×1920) e PDF A4. |
| Aprovação e histórico | Cada geração vira uma versão "Aguardando aprovação"; Administrador RH ou Direção aprova/reprova (com motivo); o download para divulgação só é liberado após aprovação; registro da publicação (canal e data) — a primeira publicação muda a vaga para "Aberta / recebendo candidaturas"; aviso de arte **desatualizada** quando a vaga é editada; "Regenerar" reabre a versão no editor. |

## Como publicar (planilha "Processo de Contratação - VD")

Basta copiar e colar **2 arquivos** da pasta [`dist/`](dist):

1. Abra a planilha e vá em **Extensões → Apps Script**.
2. No arquivo `Código.gs` que já existe, apague tudo e cole o conteúdo de **`dist/Codigo.gs`**.
3. Clique em **+ → HTML**, dê o nome **`Index`** (sem ".html") e cole o conteúdo de **`dist/Index.html`**.
   Em **Configurações do projeto** (engrenagem), marque "Exibir arquivo de manifesto appsscript.json no editor" e substitua o conteúdo de `appsscript.json` por **`dist/appsscript.json`**.
   Depois, selecione a função **`autorizarPermissoes`** e clique em **Executar** para aceitar todas as permissões (Drive, e-mail e agendamento).
4. Salve. No topo, selecione a função **`setup`** e clique em **Executar** (autorize na primeira vez — e de novo sempre que uma nova fase pedir permissões, como o Drive para currículos). Ela cria as abas e colunas que faltam sem apagar nada.
5. (Opcional) Execute **`cadastrarFeriadosNacionais`**; cadastre feriados estaduais e municipais pela tela de Configurações.
6. Confira a aba **Usuarios** (Email, Nome, Perfil, Ativo): só e-mails ativos acessam.
7. **Implantar → Nova implantação → App da Web** com *Executar como: eu* e *Quem pode acessar: qualquer pessoa em viadupla.com*. Compartilhe o link gerado.
8. Logo e foto oficial: envie ao Drive e informe os IDs em `Config` (`LOGO_DRIVE_ID`, `FOTO_DRIVE_ID`).

Nas próximas versões, repita só os passos 2, 3 e **Implantar → Gerenciar implantações → editar → Nova versão**, e o link continua o mesmo.

Os arquivos de `dist/` são gerados a partir de `apps-script/` com `node dev/build-bundle.js`. Quem preferir pode usar o [clasp](https://github.com/google/clasp) com a pasta `apps-script/`.

> A planilha e a pasta de currículos não precisam ser compartilhadas com gestores. O acesso é controlado pelo perfil dentro do app (LGPD).

## Testes e demonstração local

```bash
cd via-talentos/dev && npm install
npm test                       # 35 testes do back-end (SLA, feriados, suspensão, perfis, dashboard…)
node server.js --demo          # http://localhost:8080 com dados FICTÍCIOS de demonstração
```

O servidor local executa os mesmos arquivos `.gs` sobre uma planilha em memória (`tests/fake-gas.js`). Os dados de demonstração existem só nesse ambiente.

