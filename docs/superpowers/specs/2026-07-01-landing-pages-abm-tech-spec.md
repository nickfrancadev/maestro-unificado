# Tech Spec — Maestro Pages (Landing Pages ABM) · Protótipo Front-Only

> **Tipo:** Spec técnica (arquitetura + escopo de implementação).
> **Deriva de:** [PRD Landing Pages ABM](2026-07-01-landing-pages-abm-design.md).
> **Data:** 2026-07-01 · **Autor:** Nicholas + Claude · **Status:** Aprovado para plano.
> **Restrição central:** **Front-only, sem backend.** Tudo persiste em `localStorage`. IA é **simulada** (composição determinística). DNS/SSL de domínio próprio é **UI simulada**.

---

## 1. Objetivo

Tangibilizar a feature **Maestro Pages** inteira no front, de forma navegável e interativa, cobrindo as 11 áreas do PRD (§5.1–§5.11). Não é produção — é um protótipo funcional que "sente" real: LPs persistem, o editor DnD funciona, a personalização por conta muda a página ao vivo, e a página publicada é renderizada de verdade.

## 2. Stack (existente, reusar)

- React 18.3.1 + Vite 6.3.5 · React Router v6.30.3 (rotas em `src/app/App.tsx`).
- Tailwind CSS 4 + shadcn/ui (`src/app/components/ui/`, 50+ componentes) · lucide-react · recharts.
- `react-dnd` v16 + `react-dnd-html5-backend` v16 — já instalados e usados em `src/app/pages/PlaysCanvas.tsx` (reusar `DndProvider`/`HTML5Backend`).
- Tokens de tema em `src/styles/theme.css`.

**Reuso obrigatório (não reimplementar):**
- Brand Kit: `src/app/campaigns/wizard/brandKit.ts` (`BrandKit`, `MOCK_BRAND_FIXTURE`, `createDefaultBrandKit`).
- Analytics builders: `src/app/campaigns/accountAnalytics.ts` (`buildComparisonData`, `accountColor`, formatadores).
- Contas: `TargetAccount` (`src/app/campaigns/wizard/types.ts`) e `FacetItem` (tem `name`, `logo`, `industry`, `domain`).
- Wizard de Ads: `src/app/campaigns/wizard/CreativeStep.tsx` (campo `landingPageUrl` a ser substituído por picker).

## 3. Arquitetura

### 3.1 Princípio: documento de blocos + motor de render único

Uma LP é uma **lista ordenada de blocos tipados**. IA, templates e editor produzem/manipulam a mesma estrutura. Um único `<BlockRenderer>` desenha o documento em três lugares — canvas do editor, preview mobile, página pública `/p/:slug` — garantindo WYSIWYG fiel (AC-5.5.3) e "IA só gera blocos válidos" (AC-5.3.1) por construção.

### 3.2 Camadas (pasta `src/app/landingPages/`)

```
landingPages/
├─ schema/         # tipos de Block + block registry (render + painel + defaults + tokens por tipo)
├─ engine/         # BlockRenderer (render puro) + resolveTokens + merge de overrides + condições
├─ store/          # camada localStorage: CRUD de LPs, seed, versionamento, eventos, submissões, alertas
├─ overview/       # /landing-pages (grid, filtros, ações)
├─ create/         # /landing-pages/new (seletor: IA | template | branco) + compositor de IA simulado
├─ templates/      # catálogo ABM seed (≥4) como documentos de blocos
├─ editor/         # /landing-pages/:id/edit (3 painéis, DnD, undo/redo, autosave)
├─ publish/        # slug, publicar/despublicar, UI de domínios simulada
├─ public/         # /p/:slug (render público + accountContext via ?a=)
├─ analytics/      # /landing-pages/:id/analytics (funil + quebra por conta, reusa charts)
├─ forms/          # submissão → Contato/Conta (mock), dedupe
├─ alerts/         # regras de intenção → alerta mock (gancho Play)
└─ ads/            # picker de LP + "Criar LP da campanha" no CreativeStep
```

### 3.3 Modelo de dados (localStorage, chave `maestro.landingPages.v1`)

```ts
type BlockType =
  | 'navbar' | 'hero' | 'logos' | 'features' | 'richtext' | 'media'
  | 'testimonial' | 'stats' | 'cta' | 'form' | 'faq' | 'footer'
  | 'spacer' | 'embed';

interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;        // campos por tipo; strings aceitam tokens {{...}}
  showIf?: { field: string; op: '=='|'!='; value: string }; // condição por segmento (opcional)
}

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  templateOrigin: string | null;          // id do template ou 'ai' | 'blank'
  brandKit: BrandKit;                      // snapshot de brandKit.ts
  seo: { title: string; description: string; ogImage: string | null; noIndex: boolean };
  blocks: Block[];                         // documento base
  accountOverrides: Record<string /*accountId*/, Record<string /*blockId*/, Partial<Block>>>;
  formConfig: { fields: FormFieldMap[]; postSubmit: { type: 'message'|'redirect'; value: string } };
  links: { campaignIds: string[]; accountIds: string[] };
  createdAt: string; updatedAt: string;
}

interface PageEvent {           // gerado ao navegar no protótipo + seed mock
  id: string; landingPageId: string; accountId: string | null;
  type: 'page_view'|'scroll_depth'|'cta_click'|'form_start'|'form_submit';
  value?: number;               // ex.: scroll_depth 25/50/75/100
  ts: string;
}

interface FormSubmission { id: string; landingPageId: string; accountId: string | null;
  fields: Record<string,string>; ts: string; }

interface IntentAlert { id: string; landingPageId: string; accountId: string;
  reason: string; ownerId: string | null; ts: string; }
```

Datas: como `Date.now()`/`new Date()` são triviais no app real (não em workflows), o app usa `Date.now()` normalmente — apenas o mock seed pode usar timestamps fixos relativos.

### 3.4 Block registry (peça-chave)

Cada tipo de bloco registra um objeto:

```ts
interface BlockDef {
  type: BlockType;
  label: string;
  group: 'estrutura' | 'conteudo' | 'conversao' | 'prova';
  defaults: () => Record<string, unknown>;   // props iniciais
  tokens: string[];                          // tokens {{account.*}} que o bloco usa
  Render: React.FC<{ block: Block; ctx: RenderContext }>;
  Panel: React.FC<{ block: Block; onChange: (patch: Partial<Block>) => void }>;
}
```

IA e templates só emitem `type ∈ registry` → AC-5.3.1 grátis. Adicionar bloco novo = registrar um `BlockDef`.

### 3.5 Personalização (engine)

- `resolveTokens(text, ctx)`: troca `{{account.name|logo|industry|domain}}`, `{{contact.firstName}}` por dados reais; **fallback obrigatório** por token (nunca token cru — AC-5.5.4). Sanitiza saída (sem HTML injetável).
- `resolveBlock(block, page, ctx)`: aplica `accountOverrides[accountId][blockId]` (merge raso) e avalia `showIf`. Sem `accountContext` → versão default, sem tokens/overrides/condições (AC-5.6.2).
- `accountContext`:
  - Editor → **seletor de conta de preview** (ou "nenhuma").
  - Público `/p/:slug?a=<accountId>` → conta visitante (o `?a=` é o identificador que o wizard de Ads injeta; sem reverse-IP, §5.6).

## 4. Escopo por área (mapeado ao PRD)

| Área PRD | Rota / Ponto | Fidelidade |
|---|---|---|
| 5.1 Overview | `/landing-pages` | Real (localStorage + mock analytics) |
| 5.2 Seletor criação | `/landing-pages/new` | Real |
| 5.3 IA | dentro de `create/` | **Simulada** (composição determinística + animação) |
| 5.4 Templates | `templates/` seed ≥4 | Real |
| 5.5 Editor DnD | `/landing-pages/:id/edit` | Real |
| 5.6 Personalização | engine | Real |
| 5.7 Publicação path | `publish/` + `/p/:slug` | Real (path); **domínio próprio = UI simulada** |
| 5.8 Ads bidirecional | `CreativeStep.tsx` | Real (picker, UTMs, criar-da-campanha) |
| 5.9 Analytics | `/landing-pages/:id/analytics` | Mock + eventos ao vivo |
| 5.10 Formulários | `forms/` | Mock (cria/atualiza Contato) |
| 5.11 Alertas | `alerts/` | Mock (regra → alerta) |

## 5. Editor — detalhe (§5.5)

- **3 painéis:** esquerda = biblioteca de blocos (`useDrag`); centro = canvas (`<BlockRenderer>` + dropzones reordenáveis, `useDrop`, overlay mover/duplicar/remover/subir/descer); direita = painel de props do bloco/elemento selecionado (montado do `BlockDef.Panel`) ou config da página (SEO + form).
- **Dois níveis:** seções reordenáveis por DnD **+** elementos atômicos editáveis inline (`contentEditable`) e itens de lista adicionáveis/removíveis dentro do bloco. **Sem posicionamento absoluto por pixel** (risco §10 controlado).
- **Toggle Desktop/Mobile** (mesmo render, container estreito → fiel, AC-5.5.3).
- **Undo/redo** por pilha de snapshots; **autosave** debounced → localStorage.
- **Menu "＋ token"** em campos de texto, com fallback obrigatório.
- **Herança de tema:** cor/fonte default do Brand Kit; alterar Brand Kit propaga (AC-5.5.2).

## 6. Templates seed (§6, ≥4 — AC-6.1)

Microsite 1:1 de Conta · LP por Vertical/Indústria · Página de POC/Piloto · Convite para Demo. Cada um é um `LandingPage` de blocos com tokens `{{account.*}}` pré-configurados.

## 7. Ads integração (§5.8)

Em `CreativeStep.tsx`: campo `landingPageUrl` textual → **picker de LP** (busca por nome/conta) + opção URL manual. Link final por conta recebe `?a=<accountId>` + UTMs. Botão **"Criar LP a partir desta campanha"** abre `create/` (IA) pré-preenchido (público, mensagem, Brand Kit) e retorna com a LP selecionada como destino (AC-5.8.3). LP mostra campanhas vinculadas (bidirecional).

## 8. Analytics & roll-up (§5.9)

- `analytics/` reusa `buildComparisonData`/`AccountComparisonChart`/`AccountPerformanceTable`. Funil view→CTA→form + quebra por conta.
- Seed mock de `PageEvent` + eventos reais gerados na navegação do protótipo (page_view em `/p/:slug`, cta_click, form_submit).
- Roll-up: eventos entram na timeline mock da conta (AC-5.9.1).

## 9. Formulários & Alertas (§5.10–§5.11)

- Bloco `form`: submit → `FormSubmission` → cria/atualiza Contato ligado à Conta (mock), dedupe por email/domínio (AC-5.10.1).
- Regras de intenção: `scroll_depth≥80 + cta_click` OU `≥2 page_view em 7d` → `IntentAlert` atribuído ao dono da conta, com gancho visual "acionar Play" (AC-5.11.1).

## 10. Não-funcionais (§8)

- **XSS:** `resolveTokens` e blocos `embed`/`richtext` sanitizam; sem `dangerouslySetInnerHTML` com input não sanitizado.
- **LGPD:** banner de consentimento configurável (UI); tracking é first-party local.
- **Publicação:** publicar/despublicar idempotente; despublicada → `/p/:slug` mostra 404 amigável.
- **Domínio próprio:** UI de fluxo (Pendente→Verificando→Ativo) **simulada** — declarado explicitamente como não-real.

## 11. Fora do escopo (nesta fase)

Backend real, SSR, DNS/SSL reais, IA real, A/B testing, Deal Room, reverse-IP, marketplace de templates. Multi-org é single-org mock.
