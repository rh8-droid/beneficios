# Via Talentos: guia de passagem do projeto

Guia para quem vai manter e evoluir o sistema daqui em diante, com ou sem um assistente de IA (ChatGPT ou outro).

---

## 1. Onde está cada coisa

| Item | Local |
|---|---|
| Planilha (banco de dados) | Google Sheets **"TESTE Processo de Contratação - VD"** (ID `1yB5UJFSgViRzbU8D1Qf2fw7yOMOzbdqQqXRTdCNljqA`) |
| Código em produção | Na planilha: **Extensões → Apps Script** |
| Código-fonte organizado | Pasta `via-talentos/apps-script/` (também no arquivo `via-talentos-codigo-fonte.zip`) |
| Versão "2 arquivos" | Pasta `via-talentos/dist/` (`Codigo.gs` + `Index.html`), gerada a partir do código-fonte |
| Documentação técnica | `via-talentos/docs/ARQUITETURA.md` (tabelas, SLA, fluxo, perfis) |
| Arquivos no Drive | Pastas "Via Talentos — Currículos (acesso restrito)", "Via Talentos — Artes de vagas" e "Via Talentos — Identidade visual" (criadas automaticamente) |

---

## 2. Recomendação para manutenção: usar os arquivos separados

Hoje o Apps Script tem 2 arquivos grandes (`Código.gs` com cerca de 3.500 linhas e `Index` com cerca de 2.800). **Para manutenção com ChatGPT, é bem mais seguro trocar para os arquivos separados**, porque cada ajuste mexe em um arquivo pequeno.

Como trocar (uma vez só):
1. Abra o Apps Script da planilha e **faça uma cópia de segurança**: copie o conteúdo dos 2 arquivos atuais para um Documento Google.
2. Apague `Código.gs` e `Index`.
3. Crie os arquivos abaixo com **exatamente estes nomes** e cole o conteúdo de cada um (da pasta `apps-script/` do zip):
   - **Script (+ → Script):** `00_Config`, `01_Util`, `02_Db`, `03_Auth`, `04_Sla`, `05_Vagas`, `06_Cadastros`, `07_Dashboard`, `08_Api`, `09_Setup`, `10_Candidatos`, `11_Processo`, `12_Relatorios`, `13_Alertas`, `14_Importacao`, `15_Artes`
   - **HTML (+ → HTML):** `Index`, `Styles`, `Scripts`, `Fase2`, `Fase3`, `Fase4`
4. Salve, execute `setup` uma vez e publique uma nova versão (seção 4).

A ordem dos arquivos `.gs` não importa para o Apps Script, mas os nomes HTML precisam ser exatamente esses, porque o `Index` chama os outros por nome.

---

## 3. Mapa do código: o que fica em cada arquivo

**Servidor (Apps Script / `.gs`)**

| Arquivo | Responsabilidade |
|---|---|
| `00_Config` | Listas oficiais (status, etapas, motivos de reprovação, origens), parâmetros padrão e **colunas de cada aba** (`SCHEMA`) |
| `01_Util` | Datas (formato `aaaa-mm-dd`), textos, IDs |
| `02_Db` | Leitura e gravação nas abas (`Db.all`, `Db.find`, `Db.insert`, `Db.update`, `Db.withLock`) |
| `03_Auth` | Usuário logado e perfis (Administrador RH, Analista RH, Gestor, Direção) |
| `04_Sla` | Dias úteis, feriados, suspensões e cálculo do SLA de 15 dias úteis |
| `05_Vagas` | Abertura e edição de vagas, status, posições, suspensão, exceção de SLA |
| `06_Cadastros` | Empresas, unidades, departamentos, cargos, gestores, analistas, feriados, usuários, parâmetros |
| `07_Dashboard` | Cards, gráficos e alertas do dashboard |
| `08_Api` | **Porta de entrada**: `doGet` e a lista `API_ROUTES` (toda ação da tela passa por aqui) |
| `09_Setup` | `setup()` (cria abas e colunas) e `cadastrarFeriadosNacionais(ano)` |
| `10_Candidatos` | Cadastro de candidatos, duplicidade, currículo, LGPD |
| `11_Processo` | Candidaturas, Kanban, entrevistas, indicações, tempo por etapa |
| `12_Relatorios` | 11 relatórios, PDF, produtividade, recorrência |
| `13_Alertas` | Alertas do sino e envio diário por e-mail |
| `14_Importacao` | Importação das abas antigas (RECRUTAMENTO, Página6) |
| `15_Artes` | Gerador de artes: identidade visual, versões, aprovação, publicação |

**Telas (HTML)**

| Arquivo | Responsabilidade |
|---|---|
| `Index` | Estrutura da página: menu, seções de cada tela e bibliotecas (Chart.js, SheetJS, jsPDF) |
| `Styles` | Cores e layout (preto/grafite, amarelo `#F2C200`, branco; tema claro e escuro) |
| `Scripts` | Base: chamadas ao servidor (`api(...)`), formulários, Dashboard, Vagas, SLA, Configurações |
| `Fase2` | Telas de Candidatos, Kanban, Entrevistas, Indicações |
| `Fase3` | Relatórios, Produtividade, Recorrência, sino de alertas, Alertas por e-mail, Importação |
| `Fase4` | Gerador de Artes (desenho da arte em canvas) e Identidade visual |

---

## 4. Como publicar uma alteração

1. Edite o arquivo no Apps Script e **salve** (Ctrl+S).
2. Se a alteração **criou colunas novas ou mudou permissões**, execute a função **`setup`** (selecione-a no topo e clique em Executar).
3. **Implantar → Gerenciar implantações → ícone de lápis → Versão: "Nova versão" → Implantar.** O link continua o mesmo.
4. Abra o link e teste (seção 7).
5. Se algo der errado: **Implantar → Gerenciar implantações → editar → escolher a versão anterior**. Volta na hora.

Antes de importações ou mudanças grandes: **Arquivo → Fazer uma cópia** da planilha.

---

## 5. Texto para colar no ChatGPT antes de pedir um ajuste

Copie o bloco abaixo, cole no início da conversa e, **em seguida, cole o(s) arquivo(s) que serão alterados** (veja a seção 3 para saber qual).

```
Você vai me ajudar a manter o sistema "Via Talentos", um portal de Recrutamento e Seleção
feito em Google Apps Script (runtime V8) com Google Sheets como banco de dados.
Vou colar abaixo apenas o(s) arquivo(s) relevante(s). Regras obrigatórias:

ARQUITETURA
- Cada aba da planilha é uma tabela. As colunas de cada aba estão em SCHEMA (arquivo 00_Config).
  Para criar coluna nova: acrescente o nome no FINAL da lista em SCHEMA (nunca renomeie nem remova
  colunas existentes) e depois eu executo setup().
- Acesso aos dados SOMENTE pelo objeto Db: Db.all('Aba'), Db.find('Aba', id), Db.insert('Aba', obj),
  Db.update('Aba', id, patch). Toda gravação deve ficar dentro de Db.withLock(function () { ... }).
- Datas são texto 'aaaa-mm-dd' (ou 'aaaa-mm-dd hh:mm:ss'). Use Util.today(), Util.now(), Util.toIsoDate().
- Dias úteis e SLA: use as funções de Sla (Sla.businessDaysBetween, Sla.addBusinessDays, Sla.forVaga).
- Permissões: no início das funções que gravam, use Auth.require('Administrador RH', 'Analista RH', ...);
  para vagas use Auth.canSeeVaga(vaga) / Auth.canEditVaga(vaga).
- Erros para o usuário: throw UserError('mensagem em português').
- Toda alteração relevante deve gravar histórico: logHistory_(tipo, idReferencia, de, para, nota).
- O navegador chama o servidor SEMPRE por api('nomeDaAcao', {dados}) — que retorna uma Promise.
  Toda ação nova precisa ser registrada em API_ROUTES no arquivo 08_Api.
- Front-end em JavaScript puro (sem frameworks). Funções utilitárias já existentes: $(seletor),
  $$(seletor), esc(texto), fmtDate(iso), options(lista, selecionado, placeholder), toast(msg),
  fail(erro), formDialog({title, fields, onSubmit}), openDialog('#dlg', html), card(...), icon(nome).
- Identidade visual: preto/grafite, amarelo #F2C200 e branco. Use as variáveis CSS existentes
  (var(--surface), var(--text), var(--accent) etc.) para funcionar no tema claro e escuro.
- Logotipo, foto da sede e selo GPTW são arquivos oficiais enviados pelo sistema; nunca desenhe
  ou invente esses elementos.
- Indicadores devem ser calculados a partir dos registros reais (nada de dados fictícios).

FORMA DA RESPOSTA
- Diga exatamente em qual arquivo e em qual função mexer.
- Entregue a FUNÇÃO COMPLETA alterada (não trechos soltos), para eu substituir inteira.
- Se precisar de coluna nova, ação nova na API ou executar setup(), avise explicitamente.
- Não altere nada além do necessário para o pedido.

MEU PEDIDO:
[descreva aqui o ajuste]
```

**Dica:** peça uma coisa por vez, teste e publique antes de pedir a próxima. Se o ChatGPT sugerir reescrever um arquivo inteiro, desconfie e peça só a função alterada.

---

## 6. Regras de negócio que não devem ser quebradas

- **SLA:** 15 dias úteis por posição, contados a partir da **data oficial de aprovação** (`DataAprovacao`), sem sábados, domingos e feriados da unidade. Faixas: verde até 9, amarelo de 10 a 12, laranja de 13 a 15, vermelho acima disso.
- **Suspensão** pausa o SLA quando o parâmetro `SLA_SUSPENSAO_PAUSA = Sim`. **Exceção de SLA** soma dias, mas o prazo original continua registrado.
- **Nada é apagado:** cadastros são inativados, e toda mudança gera linha na aba `Historico`.
- **Candidato único:** o sistema bloqueia duplicidade por CPF, e-mail ou telefone.
- **Gestor** só vê candidatos encaminhados (a partir da entrevista com gestor) das suas vagas. Observações e pretensão salarial são restritas ao RH.
- **Arte** só é baixada para divulgação depois de aprovada (Administrador RH ou Direção).
- **Usuários:** só e-mails ativos na aba `Usuarios` acessam. Perfis: `Administrador RH`, `Analista RH`, `Gestor`, `Direção`.

---

## 7. Teste rápido após cada publicação

1. O link abre e mostra o Dashboard sem mensagem de erro.
2. **Gestão de Vagas:** abrir uma vaga, alterar o status e ver a mudança no Histórico.
3. **Kanban:** arrastar um candidato de coluna.
4. **Relatórios:** gerar um relatório e exportar para Excel.
5. Se a alteração foi em uma tela específica, testar essa tela com um usuário de cada perfil envolvido.
6. Se aparecer "Erro inesperado": no Apps Script, abra **Execuções** (menu à esquerda) para ver o detalhe.

---

## 8. Pendências conhecidas

| Pendência | O que fazer |
|---|---|
| Arquivos oficiais | Em **Configurações → Identidade visual**: enviar o logotipo, a foto da sede e o selo GPTW (com a vigência) e escrever o texto do Código de Cultura |
| Modelo de arte de referência | Ajustar o modelo "Institucional" (função `desenharArte` no arquivo `Fase4`) para seguir a arte de referência da vaga de Analista de Gestão de Pessoas |
| Vagas importadas | Ficam com Unidade e Gestor "Não informado": corrigir pela edição da vaga |
| Linha 211 da aba RECRUTAMENTO (Lavador) | Preencher a "Data Aprovação" na planilha antiga e importar de novo |
| Testes em produção | Validar o envio real de e-mail (Configurações → Alertas por e-mail → "Enviar alertas agora") e o PDF real dos relatórios |
| Feriados | Rodar `cadastrarFeriadosNacionais(2027)` no início de cada ano e cadastrar os feriados municipais e estaduais por unidade |
| LGPD | Definir quem revisa os candidatos com retenção vencida (coluna `ExcluirApos`) e usar "Anonimizar" |

---

## 9. Para desenvolvedores (opcional)

A pasta `via-talentos/` também tem testes automáticos e um servidor local que executa o mesmo código fora do Google:

```
cd via-talentos/dev && npm install
npm test                 # 35 testes do servidor
node server.js --demo    # http://localhost:8080 com dados fictícios
node build-bundle.js     # regenera dist/Codigo.gs e dist/Index.html
```
