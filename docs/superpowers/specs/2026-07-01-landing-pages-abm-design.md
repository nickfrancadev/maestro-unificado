# PRD — Landing Pages ABM ("Maestro Pages")

> **Tipo:** PRD de produto (visão, escopo, requisitos e critérios de aceite).
> **Público:** Claude Code (implementador) + Produto.
> **Data:** 2026-07-01 · **Autor:** Nicholas (Maestro) · **Status:** Aprovado para detalhamento técnico
> **Repo:** `maestro-unificado` · **Área nova:** `/landing-pages`

---

## 1. Visão e contexto

O Maestro é um software de **Account-Based Marketing (ABM)**. Hoje o produto orquestra Contas-alvo, Plays/GTM e Campanhas de LinkedIn Ads — mas o clique do anúncio ainda cai numa URL externa que o cliente não controla nem consegue medir dentro do Maestro. Isso quebra o funil ABM exatamente no ponto de maior valor: **o momento em que uma conta-alvo conhecida chega até nós.**

**Maestro Pages** é a nova área que fecha esse loop. Permite ao usuário **criar, personalizar, publicar e medir Landing Pages** sem sair do Maestro — com **geração por IA**, **editor drag-and-drop** para leigos, e o diferencial que só um produto ABM pode entregar: **personalização dinâmica 1:1 por conta** e **analytics que rolam para a timeline da conta**, não da página.

### Por que agora / por que nós
- O wizard de campanhas **já assume** LP personalizada por conta: o campo `landingPageUrl` já nasce como `https://maestro.abm/p/{{account.slug}}`. A feature apenas materializa uma promessa que o produto já faz.
- Já existem no codebase: enriquecimento firmográfico (`enrich-organization`), logos de organização (`org-logos` + proxy `logo.dev`), `brandKit.ts`, analytics por conta (`accountAnalytics.ts`) e `react-dnd`. A base para IA-com-contexto, editor DnD e personalização já está no produto.

### Referência de mercado
Userled (ABM sales microsites): templates + IA para gerar centenas de páginas on-brand, URLs trackeáveis, alertas de engajamento para vendas, integração com LinkedIn e CRM. **Nossa aposta de diferenciação:** identidade da conta obtida de graça pelo próprio anúncio (sem reverse-IP na V1) e unificação do engajamento no nível da **conta**, dentro do mesmo motor de Plays/Analytics que o cliente já usa.

### Anti-visão (o que Maestro Pages NÃO é)
Não é um website builder de propósito geral, nem um CMS, nem um blog. É uma ferramenta de **página de destino ABM** acoplada a Ads, Contas e Plays.

---

## 2. Personas e Jobs-to-be-Done

| Persona | Contexto | Job principal |
|---|---|---|
| **Marketer ABM (leigo em design)** | Toca campanhas, não sabe codar nem usar Figma | "Quero criar uma LP bonita e on-brand para uma campanha em minutos, sem depender de designer/dev." |
| **Growth/Ops** | Cuida de tracking, domínios e atribuição | "Quero que toda LP seja trackeável e que o clique do anúncio se conecte à visita e ao lead, por conta." |
| **Vendedor (SDR/AE)** | Trabalha contas nomeadas | "Quero saber quando uma conta-alvo engajou com a página para agir na hora certa." |
| **Gestor de marketing** | Mede pipeline | "Quero ver quais contas avançaram do anúncio → página → lead." |

### Jobs prioritários (V1)
1. Criar uma LP a partir de um template ou por IA, editar no DnD, e publicar com URL trackeável.
2. Apontar essa LP como destino de um anúncio direto no wizard de campanha.
3. Personalizar a LP por conta automaticamente (logo, nome, setor da conta que veio do anúncio).
4. Ver analytics da LP consolidados na conta.

---

## 3. Escopo

### 3.1 Dentro do escopo (V1)
- **Overview** de LPs (grid por conta/campanha, status, métricas resumidas, filtros).
- **Biblioteca de templates ABM-nativos** (seed inicial curado — ver §6).
- **Geração com IA** que produz a página no **schema de blocos unificado** (100% editável no DnD).
- **Editor drag-and-drop** estilo Framer, para leigos.
- **Personalização dinâmica 1:1 por conta** via tokens `{{account.*}}` + variantes por conta.
- **Publicação**: path `/p/{slug}` (teste imediato) + **subdomínio grátis** (`{slug}.maestropages.com`) + **domínio próprio** do cliente (CNAME/verificação + SSL).
- **Tracking & Analytics** por LP e roll-up por conta; eventos de engajamento.
- **Integração bidirecional com LinkedIn Ads**: picker de LP como destino + UTMs automáticos + "Criar LP a partir da campanha".
- **Formulários** que capturam leads e enriquecem Contas/Contatos.
- **Alertas de intenção** para vendas a partir do engajamento na LP.

### 3.2 Fast-follow (documentado, fora da V1)
- A/B testing de variantes de LP.
- Deal Room persistente multi-stakeholder (a LP vira espaço de conta com documentos + plano de ação conjunto).
- Reverse-IP para desanonimizar tráfego frio (não vindo de anúncio).
- Marketplace de templates da comunidade.

### 3.3 Não-objetivos
- Editor de blog/CMS, e-commerce, checkout, multipágina complexa (>1 página por LP na V1 — hero-to-footer single page).

---

## 4. Fluxo de alto nível

```
Contas-alvo ──┐
              ├─► [Campanha LinkedIn Ads] ──► destino = LP (picker)
Brand Kit ────┘                                   │
                                                  ▼
        [Criar LP] ──(IA | Template | Branco)──► [Editor DnD / schema de blocos]
                                                  │
                                       [Personalização por conta: {{account.*}}]
                                                  │
                                                  ▼
                          [Publicar] → /p/slug · subdomínio · domínio próprio
                                                  │
                             (visitante = conta conhecida via slug do anúncio)
                                                  ▼
              [Tracking] → eventos → [Analytics por LP] + [Timeline da Conta] → [Alertas → Plays]
                                                  │
                              [Formulário] → lead → enriquece Contas/Contatos
```

---

## 5. Requisitos funcionais por tela

> Convenção de critérios de aceite: **AC-x.y**. "Deve" = obrigatório na V1.

### 5.1 Overview (`/landing-pages`)
Grid/tabela de todas as LPs da conta-organização (do cliente Maestro).

**Requisitos**
- Card/linha por LP com: nome, thumbnail, **status** (Rascunho / Publicada / Arquivada), URL publicada, conta(s)/campanha vinculada(s), e métricas resumidas (visitas, visitas de contas-alvo, taxa de conversão de formulário, engajamento médio).
- Filtros: por status, por conta-alvo, por campanha, por template de origem. Busca por nome.
- Ordenar por: recente, mais visitada, maior engajamento.
- Ações por LP: Editar, Duplicar, Publicar/Despublicar, Ver analytics, Arquivar, Copiar URL.
- CTA primário **"Nova Landing Page"** → abre o seletor de criação (IA / Template / Em branco).

**Critérios de aceite**
- **AC-5.1.1** Deve listar todas as LPs da organização com status e pelo menos uma métrica de tráfego visível sem abrir a LP.
- **AC-5.1.2** Filtrar por conta-alvo deve retornar apenas LPs vinculadas àquela conta (inclui variantes personalizadas).
- **AC-5.1.3** Duplicar deve gerar uma cópia em Rascunho com novo slug, sem afetar a original publicada.

### 5.2 Seletor de criação
Modal/tela com 3 caminhos que **convergem no mesmo editor/schema**:
1. **Gerar com IA** (recomendado em destaque).
2. **Começar de um template**.
3. **Começar em branco**.

**AC-5.2.1** Qualquer um dos 3 caminhos deve produzir um documento no **schema de blocos unificado** e abrir no mesmo editor.

### 5.3 Geração com IA
Formulário guiado (não prompt em branco) que **já nasce com contexto do produto**:
- Pré-preenche a partir de: **conta/campanha selecionada** (firmografia via `enrich-organization`), **objetivo** (ex.: agendar demo, baixar material, POC), **mensagem da campanha**, e **Brand Kit** (`brandKit.ts`: cores, fonte, logos).
- Campo livre para o marketer descrever oferta/ângulo.
- Saída: página completa em blocos (hero, prova social, benefícios, CTA, formulário, FAQ, footer) **on-brand e on-account**, editável em seguida.
- Ações: **Regenerar seção**, **Regenerar página**, **Reescrever bloco** (tom/tamanho), **Traduzir**.

**Critérios de aceite**
- **AC-5.3.1** A IA deve gerar exclusivamente blocos válidos do schema — nada de HTML solto fora do schema. Todo output é editável no DnD.
- **AC-5.3.2** Quando criada a partir de uma conta/campanha, a página gerada deve aplicar o Brand Kit (cores/fonte/logo) e referenciar dados reais da conta (nome/setor) por padrão.
- **AC-5.3.3** Regenerar uma seção não pode alterar as demais seções nem quebrar tokens de personalização já inseridos.

### 5.4 Templates (Biblioteca)
Galeria de **templates ABM-nativos** (ver catálogo §6). Cada template: preview, descrição do caso de uso, **Play associada** (quando houver), e tags (vertical, objetivo).

**Critérios de aceite**
- **AC-5.4.1** Selecionar um template deve instanciar uma LP em Rascunho já com blocos e slots de personalização configurados.
- **AC-5.4.2** Templates devem declarar quais tokens `{{account.*}}` usam, para o editor destacar o que será personalizado.

### 5.5 Editor Drag-and-Drop (estilo Framer, para leigos)
Layout de 3 painéis: **(esquerda)** biblioteca de blocos/seções · **(centro)** canvas WYSIWYG · **(direita)** propriedades do bloco selecionado + configurações da página.

**Blocos V1 (mínimo):** Navbar, Hero, Logos/Prova social, Features/Benefícios (grid), Texto rico, Imagem/Mídia, Depoimento, Estatísticas, CTA, **Formulário**, FAQ (accordion), Footer, Espaçador/Divisor, Embed (vídeo).

**Capacidades do editor**
- Arrastar blocos da biblioteca para o canvas; reordenar por drag; remover; duplicar.
- Edição inline de texto; troca de imagens (upload); ajuste de cores/tipografia herdando o Brand Kit.
- **Responsivo**: preview e ajustes para desktop e mobile.
- **Tokens de personalização**: inserir `{{account.name}}`, `{{account.logo}}`, `{{account.industry}}`, `{{contact.firstName}}` etc. em qualquer texto/imagem; o editor mostra preview com dados de uma conta de exemplo e permite **trocar a conta de preview**.
- Autosave (rascunho) + histórico básico (undo/redo).
- SEO/Meta por página: título, descrição, OG image, favicon.
- Configurar **destino do formulário** (mapeamento de campos → Contato/Conta) e ação pós-submit (mensagem/redirect).

**Critérios de aceite**
- **AC-5.5.1** Um usuário leigo deve conseguir montar uma LP publicável arrastando blocos, sem tocar em código.
- **AC-5.5.2** Alterar uma cor/fonte do Brand Kit deve refletir consistentemente nos blocos que herdam o tema.
- **AC-5.5.3** O preview mobile deve ser fiel ao render publicado em mobile.
- **AC-5.5.4** Tokens inválidos/sem dado devem ter **fallback** definido (ex.: `{{account.name}}` → "sua empresa") e nunca renderizar o token cru em produção.

### 5.6 Personalização dinâmica 1:1 por conta
Uma **LP-template** renderiza **variantes por conta**. A identidade da conta vem do **próprio anúncio**: o slug da conta já viaja na URL de destino (`/p/{{account.slug}}`), então a página sabe qual conta está visitando **sem reverse-IP**.

**Requisitos**
- Resolver `{{account.*}}` em runtime a partir do slug/param da URL, puxando dados já enriquecidos (nome, logo, setor, domínio) das Contas.
- Personalização por: **logo da conta**, **nome**, **setor/vertical**, e blocos condicionais por segmento (ex.: mostrar case de fintech se `account.industry = fintech`).
- **Variantes**: uma LP base pode ter overrides por conta ou por segmento, sem duplicar a página inteira.
- Fallback gracioso quando a página é acessada sem contexto de conta (tráfego direto).

**Critérios de aceite**
- **AC-5.6.1** Ao acessar `/p/{slug}` de uma conta-alvo, a página deve exibir logo + nome reais da conta.
- **AC-5.6.2** Sem contexto de conta, a página deve renderizar a versão default sem tokens crus.
- **AC-5.6.3** Editar a LP base deve propagar para todas as variantes, exceto campos com override explícito.

### 5.7 Publicação e Domínios
Três modos, do mais simples ao mais robusto:
1. **Path no domínio Maestro** — `maestroabm.com/p/{slug}` (o usuário escolhe o `/xyz`). Zero setup, para teste imediato.
2. **Subdomínio grátis** — `{escolhido}.maestropages.com`, provisionado automaticamente com SSL.
3. **Domínio próprio do cliente** — instruções de CNAME + verificação de propriedade + emissão automática de SSL.

**Requisitos**
- Escolha e validação de slug (único, kebab-case, disponibilidade em tempo real).
- Estado de publicação (Rascunho ≠ Publicada); publicar/despublicar sem perder o rascunho.
- Domínio próprio: fluxo de conexão com status (Pendente → Verificando → Ativo), instruções copiáveis, e checagem de propagação.
- Página publicada carrega rápido e é indexável/no-index configurável.

**Critérios de aceite**
- **AC-5.7.1** Publicar em path deve tornar a URL acessível imediatamente após confirmação de slug único.
- **AC-5.7.2** O fluxo de domínio próprio deve informar claramente o registro CNAME e refletir o status real de verificação/SSL.
- **AC-5.7.3** Despublicar deve tornar a URL inacessível (404/redirect) mantendo o rascunho editável.

### 5.8 Integração com LinkedIn Ads (bidirecional)
No **wizard de campanha (`CreativeStep`)**, o campo hoje textual **"URL de destino"** passa a oferecer:
- **Seletor de LP** criada no módulo (busca por nome/conta) além da opção de URL manual.
- **Injeção automática de UTMs** e do **identificador de conta** no link de cada anúncio, por conta-alvo (para personalização + atribuição).
- Botão **"Criar LP a partir desta campanha"** → abre a criação por IA já pré-preenchida com público, mensagem e Brand Kit da campanha.
- Na LP, mostrar de quais campanhas ela é destino (vínculo bidirecional).

**Critérios de aceite**
- **AC-5.8.1** No wizard, deve ser possível escolher uma LP existente como destino sem colar URL manualmente.
- **AC-5.8.2** O link final do anúncio, por conta, deve conter o slug/identificador da conta e UTMs, habilitando personalização e atribuição.
- **AC-5.8.3** "Criar LP a partir da campanha" deve herdar Brand Kit e mensagem, retornando ao wizard com a LP já selecionada como destino.

### 5.9 Tracking & Analytics (por LP e por Conta)
**Eventos mínimos:** page_view, scroll_depth (25/50/75/100), tempo na página, clique em CTA, form_start, form_submit, retorno (visita repetida), origem (campanha/anúncio/conta).

**Visões**
- **Analytics da LP**: visitas, visitantes únicos, fontes, funil (view → CTA → form), scroll/tempo, conversões, quebra por conta.
- **Roll-up na Conta**: os eventos da LP entram na **timeline/engajamento da conta** já existente (`accountAnalytics.ts`), unificando anúncio → clique → visita → CTA → lead num único fio por conta.

**Critérios de aceite**
- **AC-5.9.1** Cada evento de LP vinculado a uma conta conhecida deve aparecer na timeline/score daquela conta.
- **AC-5.9.2** A LP deve reportar funil view→CTA→form e quebra por conta-alvo.
- **AC-5.9.3** Tracking deve funcionar em modo **first-party** (sem depender de cookies de terceiros) e respeitar consentimento (§8).

### 5.10 Formulários → Contas/Contatos
- Submissão cria/atualiza **Contato** vinculado à **Conta** (expansão do comitê de compra), não apenas um "lead solto".
- Mapeamento de campos do formulário para propriedades de Contato/Conta.
- Deduplicação por email/domínio.

**AC-5.10.1** Um submit de formulário numa LP de conta-alvo deve criar/atualizar o Contato ligado àquela Conta.

### 5.11 Alertas de intenção (para vendas)
- Regras de engajamento (ex.: conta-alvo com scroll ≥80% + clique em CTA, ou 2+ visitas em 7 dias) disparam **alerta** e podem **acionar uma Play**.
- Alerta visível para o dono da conta e integrável ao motor de Plays/GTM existente.

**AC-5.11.1** Um engajamento acima do limiar por uma conta-alvo deve gerar um alerta atribuído ao dono da conta.

---

## 6. Catálogo de templates ABM-nativos (seed V1)

| Template | Caso de uso | Play associada |
|---|---|---|
| **Microsite 1:1 de Conta** | Página dedicada a uma única conta-alvo, hiper-personalizada | Play 1:1 |
| **LP por Vertical/Indústria** | Uma página por segmento (fintech, saúde, varejo…) | Play 1:few |
| **Página de POC/Piloto** | Proposta de piloto/prova de conceito para conta em negociação | Play de conversão |
| **Follow-up de Evento** | Continuação de conversa pós-evento/feira | Play de nutrição |
| **Convite para Demo/Reunião** | CTA único para agendamento | Play de ativação |
| **Deal Room (preview)** | Base para o fast-follow multi-stakeholder | — (fast-follow) |

**AC-6.1** V1 deve entregar ao menos 4 destes templates funcionais com tokens de personalização pré-configurados.

---

## 7. Modelo de dados (nível de produto)

> Entidades conceituais — a modelagem técnica (tabelas/KV) fica para o plano de implementação. O produto exige que existam:

- **LandingPage**: id, nome, slug, status, template de origem, documento de blocos (schema unificado), Brand Kit aplicado, config de SEO/meta, config de publicação (path/subdomínio/domínio), vínculos (campanhas, contas), timestamps.
- **PageVariant / Override**: LP base + overrides por conta ou segmento (personalização).
- **PersonalizationToken**: catálogo de tokens disponíveis (`account.*`, `contact.*`) + fallbacks.
- **Domain**: domínio/subdomínio, tipo, status de verificação, SSL.
- **PageEvent**: eventos de tracking com vínculo a conta/campanha/anúncio.
- **FormSubmission**: dados do formulário → Contato/Conta.
- **Vínculo Campaign↔LandingPage**: relação bidirecional com o wizard de Ads.

**Reuso obrigatório:** Brand Kit (`brandKit.ts`), enriquecimento de conta (`enrich-organization`/`org-logos`), analytics por conta (`accountAnalytics.ts`), motor de Plays/GTM. **Não** reimplementar essas capacidades.

---

## 8. Requisitos não-funcionais

- **Performance:** LP publicada deve carregar rápido (meta: LCP < 2,5s em 4G) — páginas leves, imagens otimizadas.
- **LGPD / Privacidade:** banner de consentimento configurável; tracking **first-party**; a personalização por conta não deve expor dados sensíveis de uma conta a visitantes de outra; respeitar opt-out.
- **Segurança:** isolamento por organização (multi-tenant); slugs/domínios não colidem entre orgs; sanitização de conteúdo do editor/IA (evitar XSS em blocos de embed/HTML).
- **Confiabilidade de publicação:** publicar/despublicar é idempotente; SSL automático para subdomínio e domínio próprio.
- **Acessibilidade:** páginas geradas seguem contraste e semântica mínimos (WCAG AA como meta).
- **Consistência visual:** editor e página publicada usam o mesmo motor de render do schema (WYSIWYG fiel).

---

## 9. Métricas de sucesso

**Adoção**
- % de campanhas de Ads que usam uma LP do Maestro como destino (meta de tração: >50% em 90 dias).
- Nº de LPs criadas por org / mês; % criadas via IA vs template vs branco.

**Ativação / valor**
- Tempo mediano "criar → publicar" (meta: < 15 min para um leigo).
- % de LPs com personalização por conta ativa.

**Impacto ABM**
- Taxa de visita de **contas-alvo** (não só tráfego total).
- Conversão de formulário por conta; nº de contas que geraram alerta de intenção.
- Contribuição para avanço de conta no funil (anúncio → LP → lead) na timeline da conta.

---

## 10. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Editor DnD é complexo e escorrega o cronograma | Alto | Blocos V1 enxutos (§5.5); reusar `react-dnd`; um só schema para IA e editor |
| Domínio próprio (DNS/SSL) tem casos de borda | Médio | V1 já entrega path + subdomínio para desbloquear valor; domínio próprio com status claro e fallback |
| IA gera fora do schema / conteúdo quebrado | Médio | Forçar saída estruturada validada contra o schema (AC-5.3.1) |
| Dados de conta insuficientes para personalizar | Médio | Fallbacks obrigatórios de token (AC-5.5.4); usar enriquecimento existente |
| Tracking vs LGPD | Médio | First-party + consentimento (§8) desde a V1 |
| Escopo inflar com Deal Room/A-B | Médio | Explicitamente fast-follow (§3.2) |

---

## 11. Faseamento sugerido (produto)

- **Fase 1 — Fundação:** área `/landing-pages`, Overview, schema de blocos, editor DnD (blocos mínimos), publicação em path, tracking básico + roll-up na conta.
- **Fase 2 — IA + Templates + Personalização:** geração por IA no schema, catálogo de templates ABM, tokens `{{account.*}}` + variantes por conta.
- **Fase 3 — Ads + Domínios + Alertas:** picker de LP no wizard + UTMs/identificador de conta + "Criar LP da campanha"; subdomínio grátis e domínio próprio; formulários→Contas; alertas de intenção → Plays.
- **Fast-follow:** A/B testing, Deal Room, reverse-IP, marketplace de templates.

---

## 12. Questões em aberto (para o plano técnico)
- Motor de render/hospedagem das LPs publicadas (SSR vs estático) e provedor de domínios/SSL.
- Onde persistir o documento de blocos e os eventos (KV atual vs tabela dedicada) dado o volume de analytics.
- Estratégia de resolução de `{{account.*}}` em runtime (edge vs client) preservando performance e LGPD.
- Motor de IA e formato de saída estruturada garantindo aderência ao schema.

> Estas questões são **de implementação** e serão resolvidas na etapa de arquitetura/plano — fora do escopo deste PRD de produto.
