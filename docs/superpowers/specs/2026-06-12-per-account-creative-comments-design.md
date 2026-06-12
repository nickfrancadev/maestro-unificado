# Anúncio e Comentários por Empresa no Analytics — Design

**Data:** 2026-06-12
**Status:** Aprovado
**Escopo:** somente mock (`mock-abm-001`), espelhando a shape do futuro endpoint real.
**Continuação de:** `2026-06-11-per-account-analytics-design.md`

## Contexto e problema

A entrega anterior adicionou métricas por empresa (1 ad set = 1 empresa-alvo). Mas a coluna direita do dashboard (`src/app/campaigns/CampaignAnalytics.tsx`, 35%) ainda mostra um card de comentários **global e desvinculado de empresa**: o mock retorna um único `post_urn: 'urn:li:ugcPost:mock-001'` e o backend real assume 1 creative por campanha (`creatives[0]`). Não dá para saber de qual anúncio/empresa são os comentários, nem ver o anúncio em si.

No modelo real da Maestro cada conjunto de anúncios (empresa-alvo) tem **1 criativo/post próprio** no LinkedIn — portanto seus próprios comentários e seu próprio preview. O dashboard precisa refletir isso: navegar entre os anúncios das empresas, ver o criativo de cada um e os comentários daquele post.

**Decisão de produto confirmada:** 1 anúncio (criativo/post) por empresa. "Navegar entre anúncios" = navegar entre empresas.

## Decisões de design

1. **Escopo:** só mock. Cada empresa ganha criativo + post + comentários próprios.
2. **Navegação:** coluna direita mostra **uma empresa por vez**, com seletor compacto (`◀ Empresa (i/N) ▶`) que percorre apenas as empresas atualmente selecionadas nos chips de filtro.
3. **Conteúdo da coluna:** card de **preview do anúncio** (criativo em escala reduzida) acima do card de **comentários daquele post**.

## Modelo de dados

### Tipos (em `src/lib/linkedin/analytics.ts`)

Novo tipo de criativo e extensão de `AccountAnalytics`:

```ts
export interface AccountCreative {
  variant: 'named' | 'generic';
  headline: string;
  body: string;
  imageUrl: string;
  cta: string;          // ex: 'LEARN_MORE'
  postUrn: string;      // urn:li:ugcPost:...
}

export interface AccountAnalytics {
  // ...campos existentes (accountId, accountName, industry, linkedinCampaignId, totals, timeSeries)
  creative: AccountCreative;
}
```

Comentários NÃO entram em `AccountAnalytics` (não inflar o objeto de métricas). Ficam num lookup separado, espelhando o endpoint real `GET /linkedin/campaign-comments?campaignId=...&accountId=...` (que no real resolveria o creative/post do ad set daquela conta e buscaria `socialActions/{postUrn}/comments`):

```ts
// retorno por empresa, mesma shape de CampaignCommentsResponse já existente
getMockCommentsByAccount(accountId: string): CampaignCommentsResponse
```

`CampaignCommentsResponse` (já existe: `post_urn?`, `comments[]`, `total`, `error?`) é reaproveitado sem mudança.

### Mock (`src/lib/mockCampaignData.ts`)

- `MockAccountProfile` ganha: `creativeVariant`, `creativeHeadline`, `creativeBody`, `creativeImageUrl`, `creativeCta`, `postUrn`.
- `buildAccount` passa a montar o sub-objeto `creative` a partir do profile.
- Criativos coerentes por empresa (headline/body fazem sentido para o tema ABM enterprise; `imageUrl` é um placeholder determinístico por empresa — gradiente/cor por índice, sem rede).
- **Comentários re-vinculados:** os 5 comentários atuais (hoje todos no post global) são redistribuídos para os posts das empresas corretas. Hoje o vínculo está conceitualmente errado — "Ricardo Almeida @ TechCorp Brasil" é o **autor**, não o anúncio. No novo modelo, cada empresa tem um pequeno conjunto de comentários no SEU post (autores variados, incluindo membros de outras empresas comentando no anúncio daquela conta). Total de comentários por empresa varia (algumas com mais engajamento, coerente com os perfis de performance).
- `getMockCommentsByAccount(accountId)` retorna `{ post_urn: profile.postUrn, comments, total }` para a empresa; `accountId` desconhecido → `{ comments: [], total: 0 }`.
- `getMockComments()` (legado, sem accountId) é mantido por compatibilidade, mas o dashboard deixa de usá-lo para campanha com dados por conta.

## UI (`src/app/campaigns/CampaignAnalytics.tsx` + novos componentes)

### Estado

- Novo `focusedAccountId: string | null`. Derivado da seleção: sempre que `selectedAccountIds` muda, se o foco atual não está mais selecionado (ou é null), passa a ser a **primeira** das selecionadas na ordem original. Garante que a coluna sempre mostre uma empresa válida.
- Os comentários passam a ser carregados por empresa focada (mock síncrono via `getMockCommentsByAccount(focusedAccountId)`), substituindo o `getMockComments()` global no caminho mock. Caminho real (não-mock) permanece com `fetchCampaignComments(campaignId)` e o card global (sem preview/seletor) — exatamente como antes.

### Coluna direita (35%) — caminho mock (`byAccount` presente)

De cima para baixo, dentro do container sticky existente:

1. **Seletor de empresa** (`AccountFocusSwitcher`): `◀  {nome da empresa}  (i/N)  ▶`, onde N = nº de empresas selecionadas e i = posição da focada. Setas avançam/voltam circularmente entre as selecionadas. Setas são `<button>` reais com `aria-label` ("Empresa anterior"/"Próxima empresa"), área de toque ≥40px e `disabled` real quando N≤1 (`opacity-40 cursor-default`, sem ação). A posição `(i/N)` cumpre o papel de active-state visível. (Guidelines: `keyboard-nav`, `aria-labels`, `touch-target-size`, `nav-state-active`.)
2. **Card de preview do anúncio** (`AccountAdPreview`): bloco do criativo da empresa focada — imagem em escala reduzida (aspect fixo `aspect-[1.91/1]` — proporção de imagem de link do LinkedIn — `object-cover` com `width/height`/aspect declarado para evitar layout shift; fallback de gradiente por índice via `accountColor` quando `imageUrl` vazio), badge de variant (named/generic), headline (bold, `slate-900`), body truncado em 2 linhas (`line-clamp-2`) com `title` full no hover, badge de CTA traduzido (`LEARN_MORE → "Saiba mais"` etc.), e header com nome + indústria da empresa-alvo. É representação fiel reduzida, não a imagem cheia. (Guidelines aplicadas: `image-dimension` aspect-ratio reservado, `truncation-strategy` ellipsis + título completo, `visual-hierarchy` por peso/tamanho.)
3. **Card de comentários** (componente existente, ajustado): header passa a `Comentários · {empresa} ({total})`; lista os comentários do post focado. Loading/empty/erro como hoje.

### Caminho real (não-mock, `byAccount === null`)

Coluna inalterada: sem seletor, sem preview — apenas o card de comentários global como antes (o backend ainda assume 1 post/campanha). Sem prometer o que não existe.

## Organização de código

- `AccountAdPreview.tsx` — card de preview do criativo (props: `creative: AccountCreative`, `accountName`, `industry`).
- `AccountFocusSwitcher.tsx` — seletor `◀ nome (i/N) ▶` (props: empresas selecionadas em ordem, focada, callbacks prev/next).
- Helper de CTA: mapa `CTA_LABELS` + paleta de fallback de imagem por índice em `src/app/campaigns/accountAnalytics.ts` (reusa `accountColor`).
- `CampaignAnalytics.tsx` orquestra o estado `focusedAccountId` e a carga de comentários por empresa.
- O card de comentários permanece em `CampaignAnalytics.tsx` (`CommentItem` já é local) — só o header muda. (Pré-existente, fora de escopo: o conector de resposta usa `position:absolute` sem pai `relative`, e `comments.sort()` muta in-place — não corrigir aqui salvo se trivial e adjacente.)

## Tratamento de erros

Mock síncrono e determinístico. Defesas: `focusedAccountId` nunca aponta para empresa não-selecionada; `getMockCommentsByAccount` com id desconhecido → vazio; seletor com 1 empresa não navega; `imageUrl` vazio → fallback de gradiente.

## Testes

Sem framework de testes no projeto (consistente com a entrega anterior). Validação por `npx tsc --noEmit` + `npm run build` por task e verificação manual no navegador (Playwright headless) ao final: navegar entre empresas, preview reflete a focada, comentários mudam por empresa, foco acompanha mudança de seleção, caminho real inalterado.

## Fora de escopo (próxima entrega — backend real)

- Persistir `post_urn`/`creative_id` por ad set em `campaign_accounts` (hoje fica em KV).
- Endpoint `GET /linkedin/campaign-comments` aceitar `accountId` e resolver o post do ad set daquela conta.
- Endpoint/colunas para servir o criativo real por conta ao preview.
- Imagem real do criativo (hoje placeholder).
