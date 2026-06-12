# Anúncio e Comentários por Empresa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A coluna direita do dashboard de analytics passa a mostrar, por empresa, o anúncio (preview do criativo em escala reduzida) e os comentários daquele post, com seletor para navegar entre as empresas selecionadas. Escopo mock-only.

**Spec:** `docs/superpowers/specs/2026-06-12-per-account-creative-comments-design.md`

**Architecture:** Tipo `AccountCreative` + campo `creative` em `AccountAnalytics`. Mock estende `MockAccountProfile` com criativo/post e ganha `getMockCommentsByAccount(accountId)`, com os 5 comentários atuais re-vinculados aos posts corretos. UI: dois componentes novos (`AccountAdPreview`, `AccountFocusSwitcher`) e estado `focusedAccountId` em `CampaignAnalytics.tsx`, que passa a carregar comentários por empresa focada no caminho mock.

**Tech Stack:** React 18 + TS, Tailwind 4, lucide-react. Sem framework de testes (validação: `npx tsc --noEmit` + `npm run build` + verificação manual).

**Baseline `npx tsc --noEmit`:** imprime um aviso pré-existente `tsconfig.json(15,5): error TS5101: Option 'baseUrl' is deprecated...` e sai com código != 0 mas SEM outros erros. Trate como baseline; qualquer outro diagnóstico é regressão.

---

## Estrutura de arquivos

- **Modify:** `src/lib/linkedin/analytics.ts` — tipo `AccountCreative`; campo `creative: AccountCreative` em `AccountAnalytics`.
- **Modify:** `src/lib/mockCampaignData.ts` — `MockAccountProfile` + criativo/post; `buildAccount` monta `creative`; `getMockCommentsByAccount`; comentários por empresa.
- **Modify:** `src/app/campaigns/accountAnalytics.ts` — `CTA_LABELS`, `ctaLabel(cta)`, `creativeFallbackGradient(index)`.
- **Create:** `src/app/campaigns/AccountAdPreview.tsx` — card de preview do criativo.
- **Create:** `src/app/campaigns/AccountFocusSwitcher.tsx` — seletor `◀ nome (i/N) ▶`.
- **Modify:** `src/app/campaigns/CampaignAnalytics.tsx` — estado `focusedAccountId`, carga de comentários por empresa, montagem da coluna direita no caminho mock.

---

### Task A: Tipo `AccountCreative` e campo em `AccountAnalytics`

**Files:** Modify `src/lib/linkedin/analytics.ts`

- [ ] **Step 1: Adicionar o tipo e o campo**

No bloco de tipos por empresa (onde está `AccountAnalytics`), adicionar ANTES de `AccountAnalytics`:

```ts
export interface AccountCreative {
  variant: 'named' | 'generic';
  headline: string;
  body: string;
  imageUrl: string;   // '' => preview usa gradiente de fallback
  cta: string;        // ex: 'LEARN_MORE'
  postUrn: string;    // urn:li:ugcPost:...
}
```

E adicionar o campo `creative` à interface `AccountAnalytics` existente (após `timeSeries`):

```ts
  timeSeries: AccountTimeSeriesPoint[];
  creative: AccountCreative;
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: o aviso baseline TS5101 — E erros em `mockCampaignData.ts` porque `buildAccount` ainda não preenche `creative` (esperado; Task B corrige). Não commitar ainda se houver erro fora desse arquivo; se o ÚNICO erro novo for "Property 'creative' is missing" em mockCampaignData.ts, prossiga para Task B no mesmo branch e faça os dois commits em sequência. Para manter o build verde por commit, FAÇA Task A e Task B e só então rode tsc/commit. **Portanto: não commitar a Task A isolada — implemente Task A imediatamente seguida da Task B e valide junto.**

(Sem commit nesta task — segue direto para Task B.)

---

### Task B: Mock com criativo, post e comentários por empresa

**Files:** Modify `src/lib/mockCampaignData.ts`

Depende da Task A (tipo `AccountCreative`). Validar e commitar A+B juntos.

- [ ] **Step 1: Estender o import de tipos**

Adicionar `AccountCreative` e `CampaignComment` ao import type de `./linkedin`:

```ts
import type {
  LinkedInCampaign,
  CampaignAnalyticsSummary,
  CampaignAnalyticsFull,
  CampaignCommentsResponse,
  CampaignComment,
  AccountAnalytics,
  AccountAnalyticsTotals,
  AccountTimeSeriesPoint,
  AccountCreative,
  CampaignAnalyticsByAccount,
} from './linkedin';
```

- [ ] **Step 2: Estender `MockAccountProfile` e os 5 perfis**

Adicionar campos à interface `MockAccountProfile`:

```ts
interface MockAccountProfile {
  accountId: string;
  accountName: string;
  industry: string;
  linkedinCampaignId: string;
  seed: number;
  weight: number;
  ctrBase: number;
  convRate: number;
  leadRate: number;
  postUrn: string;
  creativeVariant: 'named' | 'generic';
  creativeHeadline: string;
  creativeBody: string;
  creativeImageUrl: string;
  creativeCta: string;
}
```

Substituir o array `MOCK_ACCOUNT_PROFILES` por (mesmos valores numéricos de antes + criativo por empresa; `creativeImageUrl: ''` usa o gradiente de fallback):

```ts
const MOCK_ACCOUNT_PROFILES: MockAccountProfile[] = [
  { accountId: 'acc-techcorp', accountName: 'TechCorp Brasil', industry: 'Tecnologia', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-101', seed: 1101, weight: 1.35, ctrBase: 0.024, convRate: 0.020, leadRate: 0.014,
    postUrn: 'urn:li:ugcPost:mock-101', creativeVariant: 'named', creativeCta: 'LEARN_MORE', creativeImageUrl: '',
    creativeHeadline: 'TechCorp Brasil: escale seu pipeline enterprise com ABM',
    creativeBody: 'Decisores de tecnologia confiam na Maestro para orquestrar campanhas 1:1. Veja como gerar reuniões qualificadas com as contas que importam.' },
  { accountId: 'acc-innovatech', accountName: 'Innovatech', industry: 'SaaS', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-102', seed: 1102, weight: 1.0, ctrBase: 0.021, convRate: 0.018, leadRate: 0.012,
    postUrn: 'urn:li:ugcPost:mock-102', creativeVariant: 'named', creativeCta: 'SIGN_UP', creativeImageUrl: '',
    creativeHeadline: 'Innovatech, acelere seu go-to-market com dados de intenção',
    creativeBody: 'Personalize cada anúncio por conta e fale diretamente com o comitê de compra. Comece sua estratégia ABM hoje.' },
  { accountId: 'acc-datadriven', accountName: 'DataDriven Solutions', industry: 'Dados & Analytics', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-103', seed: 1103, weight: 0.75, ctrBase: 0.032, convRate: 0.026, leadRate: 0.018,
    postUrn: 'urn:li:ugcPost:mock-103', creativeVariant: 'named', creativeCta: 'DOWNLOAD', creativeImageUrl: '',
    creativeHeadline: 'DataDriven: transforme dados em receita previsível',
    creativeBody: 'Baixe o playbook de ABM orientado a dados e descubra como contas-alvo viram oportunidades de pipeline.' },
  { accountId: 'acc-scaleup', accountName: 'ScaleUp Ventures', industry: 'Venture Capital', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-104', seed: 1104, weight: 0.55, ctrBase: 0.014, convRate: 0.010, leadRate: 0.006,
    postUrn: 'urn:li:ugcPost:mock-104', creativeVariant: 'generic', creativeCta: 'LEARN_MORE', creativeImageUrl: '',
    creativeHeadline: 'Marketing baseado em contas para portfólios de alto crescimento',
    creativeBody: 'Da semente à série B, alcance os decisores certos com mensagens personalizadas por empresa.' },
  { accountId: 'acc-quantum', accountName: 'Quantum Bank', industry: 'Serviços Financeiros', linkedinCampaignId: 'urn:li:sponsoredCampaign:mock-105', seed: 1105, weight: 1.25, ctrBase: 0.015, convRate: 0.012, leadRate: 0.008,
    postUrn: 'urn:li:ugcPost:mock-105', creativeVariant: 'named', creativeCta: 'REQUEST_DEMO', creativeImageUrl: '',
    creativeHeadline: 'Quantum Bank: compliance e crescimento na mesma estratégia',
    creativeBody: 'Solicite uma demo e veja como instituições financeiras usam ABM para engajar contas corporativas com segurança.' },
];
```

- [ ] **Step 3: `buildAccount` monta o `creative`**

No `return` de `buildAccount`, adicionar o campo `creative` após `timeSeries`:

```ts
  return {
    accountId: profile.accountId,
    accountName: profile.accountName,
    industry: profile.industry,
    linkedinCampaignId: profile.linkedinCampaignId,
    totals,
    timeSeries: series,
    creative: {
      variant: profile.creativeVariant,
      headline: profile.creativeHeadline,
      body: profile.creativeBody,
      imageUrl: profile.creativeImageUrl,
      cta: profile.creativeCta,
      postUrn: profile.postUrn,
    },
  };
```

- [ ] **Step 4: Comentários por empresa**

Substituir a função `getMockComments` existente (o bloco que retorna `post_urn: 'urn:li:ugcPost:mock-001'` com 5 comentários) por um mapa de comentários por empresa + as duas funções. Os comentários migram para os posts corretos (cada comentário num anúncio de uma empresa-alvo; autores variados, alguns de outras empresas comentando):

```ts
// Comentários por empresa (cada empresa = 1 post próprio com seus comentários)
const MOCK_COMMENTS_BY_ACCOUNT: Record<string, CampaignComment[]> = {
  'acc-techcorp': [
    { id: 'tc1', author_name: 'Ricardo Almeida', author_title: 'VP of Sales @ Latitude Tech', text: 'Excelente conteúdo! Estamos implementando uma estratégia ABM similar e os resultados têm sido muito positivos.', created_at: '2026-03-21T14:30:00Z', likes_count: 12, is_reply: false, parent_comment_id: null },
    { id: 'tc2', author_name: 'Mariana Costa', author_title: 'Head of Marketing @ Innovatech', text: 'Concordo totalmente. A personalização é key para engajar decision makers no B2B.', created_at: '2026-03-21T16:45:00Z', likes_count: 7, is_reply: true, parent_comment_id: 'tc1' },
    { id: 'tc3', author_name: 'Ana Beatriz Santos', author_title: 'Growth Lead @ ScaleUp Ventures', text: '🔥 Dados impressionantes. O ROI de campanhas ABM bem executadas é incomparável.', created_at: '2026-03-20T08:20:00Z', likes_count: 15, is_reply: false, parent_comment_id: null },
  ],
  'acc-innovatech': [
    { id: 'in1', author_name: 'Fernando Oliveira', author_title: 'CEO @ DataDriven Solutions', text: 'Qual ferramenta vocês usam para a segmentação de contas? Temos buscado algo mais sofisticado.', created_at: '2026-03-19T09:15:00Z', likes_count: 4, is_reply: false, parent_comment_id: null },
    { id: 'in2', author_name: null, author_title: null, text: 'Muito bom! Salvando para referência.', created_at: '2026-03-18T11:00:00Z', likes_count: 2, is_reply: false, parent_comment_id: null },
  ],
  'acc-datadriven': [
    { id: 'dd1', author_name: 'Camila Ferreira', author_title: 'Diretora de Marketing @ NorthStar', text: 'O playbook é ótimo. A parte de dados de intenção mudou nossa abordagem.', created_at: '2026-03-22T10:10:00Z', likes_count: 9, is_reply: false, parent_comment_id: null },
  ],
  'acc-scaleup': [
    { id: 'su1', author_name: 'Pedro Henrique Lima', author_title: 'Partner @ Vertex Capital', text: 'Faz muito sentido para portfólios early-stage. Compartilhando com as investidas.', created_at: '2026-03-17T13:40:00Z', likes_count: 6, is_reply: false, parent_comment_id: null },
  ],
  'acc-quantum': [
    { id: 'qb1', author_name: 'Juliana Rocha', author_title: 'Head of Digital @ Meridian Bank', text: 'Compliance + ABM é exatamente o que o setor financeiro precisa. Demo solicitada!', created_at: '2026-03-23T15:25:00Z', likes_count: 11, is_reply: false, parent_comment_id: null },
    { id: 'qb2', author_name: 'Lucas Martins', author_title: 'CMO @ Quantum Bank', text: 'Obrigado pelo interesse! Nossa equipe entra em contato em breve.', created_at: '2026-03-23T17:00:00Z', likes_count: 3, is_reply: true, parent_comment_id: 'qb1' },
  ],
};

export function getMockCommentsByAccount(accountId: string): CampaignCommentsResponse {
  const profile = MOCK_ACCOUNT_PROFILES.find(p => p.accountId === accountId);
  const comments = MOCK_COMMENTS_BY_ACCOUNT[accountId] ?? [];
  return {
    post_urn: profile?.postUrn,
    total: comments.length,
    comments,
  };
}

// Legado: feed agregado (mantido para compat; dashboard usa getMockCommentsByAccount no caminho mock)
export function getMockComments(): CampaignCommentsResponse {
  const all = Object.values(MOCK_COMMENTS_BY_ACCOUNT).flat();
  return { post_urn: 'urn:li:ugcPost:mock-001', total: all.length, comments: all };
}
```

(Se `getMockComments` for importado em outro arquivo, a assinatura permanece compatível.)

- [ ] **Step 5: Verificar compilação e build (A+B juntos)**

Run: `npx tsc --noEmit && npm run build`
Expected: apenas o aviso baseline TS5101; build conclui sem erros. (Property 'creative' agora satisfeita.)

- [ ] **Step 6: Commit (A+B)**

```bash
git add src/lib/linkedin/analytics.ts src/lib/mockCampaignData.ts
git commit -m "feat(mock): criativo e comentarios por empresa (1 ad set = 1 post)"
```

---

### Task C: Helpers de CTA e fallback de imagem

**Files:** Modify `src/app/campaigns/accountAnalytics.ts`

- [ ] **Step 1: Adicionar ao final de `accountAnalytics.ts`**

```ts
// Rótulos PT-BR para os CTAs do LinkedIn
export const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Saiba mais',
  SIGN_UP: 'Cadastre-se',
  DOWNLOAD: 'Baixar',
  REQUEST_DEMO: 'Solicitar demo',
  SUBSCRIBE: 'Inscrever-se',
  REGISTER: 'Registrar',
  APPLY_NOW: 'Candidatar-se',
  CONTACT_US: 'Fale conosco',
};

export function ctaLabel(cta: string): string {
  return CTA_LABELS[cta] ?? 'Saiba mais';
}

// Gradiente determinístico por índice para preview sem imagem (reusa a paleta)
export function creativeFallbackGradient(index: number): string {
  const c = accountColor(index);
  return `linear-gradient(135deg, ${c} 0%, ${c}99 100%)`;
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: apenas o aviso baseline TS5101.

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/accountAnalytics.ts
git commit -m "feat(campaign): helpers de CTA e fallback de imagem do criativo"
```

---

### Task D: Componente `AccountAdPreview`

**Files:** Create `src/app/campaigns/AccountAdPreview.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { AccountCreative } from '@/lib/linkedin';
import { ctaLabel, creativeFallbackGradient } from './accountAnalytics';

interface AccountAdPreviewProps {
  creative: AccountCreative;
  accountName: string;
  industry: string | null;
  colorIndex: number;
}

export function AccountAdPreview({ creative, accountName, industry, colorIndex }: AccountAdPreviewProps) {
  const variantLabel = creative.variant === 'named' ? 'Personalizado' : 'Genérico';
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{accountName}</p>
          {industry && <p className="text-[11px] text-slate-400 truncate">{industry}</p>}
        </div>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          creative.variant === 'named'
            ? 'bg-[#FFF1ED] text-[#E54A26] border-[#FF5F39]/30'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {variantLabel}
        </span>
      </div>

      {/* Imagem do anúncio (proporção de link do LinkedIn 1.91:1) */}
      <div className="relative w-full aspect-[1.91/1] bg-slate-100">
        {creative.imageUrl ? (
          <img
            src={creative.imageUrl}
            alt={`Criativo do anúncio para ${accountName}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: creativeFallbackGradient(colorIndex) }}
            aria-label={`Pré-visualização do anúncio de ${accountName}`}
            role="img"
          >
            <ImageIcon className="w-8 h-8 text-white/70" />
          </div>
        )}
      </div>

      <div className="p-5 space-y-2">
        <h4 className="text-sm font-bold text-slate-900 leading-snug">{creative.headline}</h4>
        <p className="text-xs text-slate-500 line-clamp-2" title={creative.body}>{creative.body}</p>
        <div className="pt-1">
          <span className="inline-flex items-center text-xs font-semibold text-[#E54A26] border border-[#FF5F39]/40 rounded-md px-3 py-1.5">
            {ctaLabel(creative.cta)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

Nota: `line-clamp-2` está disponível no Tailwind 4 por padrão. Se o build reclamar, troque por estilo inline com `display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden` e reporte.

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: apenas o aviso baseline TS5101.

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/AccountAdPreview.tsx
git commit -m "feat(campaign): card de preview do anuncio por empresa"
```

---

### Task E: Componente `AccountFocusSwitcher`

**Files:** Create `src/app/campaigns/AccountFocusSwitcher.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AccountFocusSwitcherProps {
  label: string;      // nome da empresa focada
  index: number;      // posição (0-based) entre as selecionadas
  total: number;      // nº de empresas selecionadas
  onPrev: () => void;
  onNext: () => void;
}

export function AccountFocusSwitcher({ label, index, total, onPrev, onNext }: AccountFocusSwitcherProps) {
  const disabled = total <= 1;
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2">
      <button
        onClick={onPrev}
        disabled={disabled}
        aria-label="Empresa anterior"
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="min-w-0 text-center">
        <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
        <p className="text-[10px] text-slate-400">{index + 1} / {total}</p>
      </div>
      <button
        onClick={onNext}
        disabled={disabled}
        aria-label="Próxima empresa"
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: apenas o aviso baseline TS5101.

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/AccountFocusSwitcher.tsx
git commit -m "feat(campaign): seletor de navegacao entre empresas"
```

---

### Task F: Integração da coluna direita em `CampaignAnalytics.tsx`

**Files:** Modify `src/app/campaigns/CampaignAnalytics.tsx`

READ o arquivo inteiro primeiro. Pontos-chave existentes: estado `commentsData`/`commentsLoading`; `useEffect` que carrega comentários (linhas ~155-168) hoje chamando `getMockComments()` no caminho mock; estado `byAccount`, `selectedAccountIds`, `accounts`, `selectedAccounts` (já existem da entrega anterior); a coluna direita (RIGHT COLUMN 35%) com o card de comentários (linhas ~483-529).

- [ ] **Step 1: Imports**

Adicionar:

```ts
import { AccountAdPreview } from './AccountAdPreview';
import { AccountFocusSwitcher } from './AccountFocusSwitcher';
```

E estender o import de `@/lib/mockCampaignData` para incluir `getMockCommentsByAccount`:

```ts
import { isMockCampaign, MOCK_CAMPAIGN, getMockAnalyticsFull, getMockComments, getMockAnalyticsByAccount, getMockCommentsByAccount } from '@/lib/mockCampaignData';
```

- [ ] **Step 2: Estado de foco**

Junto aos outros `useState` (após `selectedAccountIds`):

```ts
const [focusedAccountId, setFocusedAccountId] = useState<string | null>(null);
```

- [ ] **Step 3: Derivar a empresa focada e mantê-la válida**

Após a derivação de `selectedAccounts`/`allSelected` (que já existem), adicionar:

```ts
// Empresa em foco na coluna direita: sempre uma das selecionadas, na ordem original.
const focusedAccount = React.useMemo(() => {
  if (selectedAccounts.length === 0) return null;
  return selectedAccounts.find(a => a.accountId === focusedAccountId) ?? selectedAccounts[0];
}, [selectedAccounts, focusedAccountId]);

const focusedIndex = focusedAccount ? selectedAccounts.findIndex(a => a.accountId === focusedAccount.accountId) : -1;

const focusPrev = useCallback(() => {
  setFocusedAccountId(() => {
    if (selectedAccounts.length === 0) return null;
    const i = selectedAccounts.findIndex(a => a.accountId === (focusedAccount?.accountId));
    const prev = (i - 1 + selectedAccounts.length) % selectedAccounts.length;
    return selectedAccounts[prev].accountId;
  });
}, [selectedAccounts, focusedAccount]);

const focusNext = useCallback(() => {
  setFocusedAccountId(() => {
    if (selectedAccounts.length === 0) return null;
    const i = selectedAccounts.findIndex(a => a.accountId === (focusedAccount?.accountId));
    const next = (i + 1) % selectedAccounts.length;
    return selectedAccounts[next].accountId;
  });
}, [selectedAccounts, focusedAccount]);

// O colorIndex estável da empresa focada (ordem original em accounts)
const focusedColorIndex = focusedAccount ? accounts.findIndex(a => a.accountId === focusedAccount.accountId) : 0;
```

- [ ] **Step 4: Carregar comentários por empresa focada**

Substituir o `useEffect` de comentários existente. Hoje ele depende de `[campaignId]` e chama `getMockComments()`. Passa a depender também da empresa focada no caminho mock:

```ts
useEffect(() => {
  setCommentsLoading(true);
  if (isMockCampaign(campaignId)) {
    const accId = focusedAccount?.accountId;
    const t = setTimeout(() => {
      setCommentsData(accId ? getMockCommentsByAccount(accId) : getMockComments());
      setCommentsLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }
  fetchCampaignComments(campaignId).then(d => {
    setCommentsData(d);
    setCommentsLoading(false);
  }).catch(() => setCommentsLoading(false));
}, [campaignId, focusedAccount?.accountId]);
```

(Trocar a empresa focada recarrega os comentários daquele post.)

- [ ] **Step 5: Montar a coluna direita no caminho mock**

Na RIGHT COLUMN (35%), envolver o conteúdo: quando `byAccount` e há empresa focada, renderizar o seletor + preview + card de comentários (com header identificando a empresa). Caminho real mantém o card de comentários como hoje.

Substituir o conteúdo interno de `<div className="lg:w-[35%]">` por:

```tsx
<div className="lg:w-[35%] space-y-6">
  {byAccount && focusedAccount && (
    <div className="sticky top-6 space-y-6">
      <AccountFocusSwitcher
        label={focusedAccount.accountName}
        index={focusedIndex}
        total={selectedAccounts.length}
        onPrev={focusPrev}
        onNext={focusNext}
      />
      <AccountAdPreview
        creative={focusedAccount.creative}
        accountName={focusedAccount.accountName}
        industry={focusedAccount.industry}
        colorIndex={focusedColorIndex}
      />
      <CommentsCard
        commentsData={commentsData}
        commentsLoading={commentsLoading}
        headerSuffix={focusedAccount.accountName}
      />
    </div>
  )}
  {!byAccount && (
    <CommentsCard
      commentsData={commentsData}
      commentsLoading={commentsLoading}
      headerSuffix={null}
    />
  )}
</div>
```

Extrair o card de comentários existente para um sub-componente `CommentsCard` (no MESMO arquivo, junto a `CommentItem`), preservando a estrutura/markup atual (sticky removido — o wrapper acima já é sticky no caminho mock; no caminho real, manter o card com `sticky top-6` interno). Implementação:

```tsx
function CommentsCard({ commentsData, commentsLoading, headerSuffix }: {
  commentsData: CampaignCommentsResponse | null;
  commentsLoading: boolean;
  headerSuffix: string | null;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${headerSuffix === null ? 'sticky top-6' : ''}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-slate-500" />
          Comentários{headerSuffix ? ` · ${headerSuffix}` : ''} {commentsData && !commentsLoading ? `(${commentsData.total})` : ''}
        </h3>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {commentsLoading ? (
          <div className="p-5 space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : commentsData?.error && commentsData.total === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Não foi possível carregar comentários.</p>
            <p className="text-xs text-slate-400 mt-1">{commentsData.error}</p>
          </div>
        ) : commentsData && commentsData.comments.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Nenhum comentário neste anúncio ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {commentsData?.comments
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

(Observação: usei `.slice().sort(...)` para não mutar o array de estado — correção do bug pré-existente, agora que o markup está sendo movido de qualquer forma.)

Remover o markup antigo do card de comentários inline da RIGHT COLUMN (agora vive em `CommentsCard`). Garantir que `CampaignCommentsResponse` já está importado como tipo (está).

- [ ] **Step 6: Verificar compilação e build**

Run: `npx tsc --noEmit && npm run build`
Expected: apenas o aviso baseline TS5101; build OK.

- [ ] **Step 7: Commit**

```bash
git add src/app/campaigns/CampaignAnalytics.tsx
git commit -m "feat(campaign): coluna direita com preview do anuncio e comentarios por empresa"
```

---

### Task G: Verificação manual no navegador

**Files:** nenhum.

- [ ] **Step 1: Dev server** — `npm run dev` (background), abrir `http://localhost:5173/campaigns/mock-abm-001`.

- [ ] **Step 2: Checklist**

1. Coluna direita mostra: seletor `◀ TechCorp Brasil (1/5) ▶`, card de preview (imagem com gradiente de fallback, badge "Personalizado", headline, body 2 linhas, CTA "Saiba mais"), e `Comentários · TechCorp Brasil (3)`.
2. Clicar ▶ navega para a próxima empresa: preview e comentários mudam juntos; contador `2/5`.
3. Navegação é circular (avançar no último volta ao primeiro).
4. Desmarcar a empresa focada nos chips: o foco salta para a primeira ainda selecionada; preview/comentários acompanham.
5. Selecionar só 1 empresa: setas do seletor ficam desabilitadas (opacidade), `1/1`.
6. CTA traduzido por empresa (Saiba mais / Cadastre-se / Baixar / Solicitar demo).
7. Empresa com variante 'generic' (ScaleUp Ventures) mostra badge "Genérico".
8. KPIs/gráfico/tabela à esquerda continuam funcionando como antes.
9. Console sem erros novos.

- [ ] **Step 3:** Encerrar dev server. Sem commit (verificação). Corrigir na task correspondente se algo falhar.
