# Performance por Empresa no Analytics de Campanha — Design

**Data:** 2026-06-11
**Status:** Aprovado
**Escopo desta entrega:** somente dados mock (`mock-abm-001`), espelhando fielmente a shape do futuro endpoint real.

## Contexto e problema

Na Maestro, uma campanha ABM de LinkedIn Ads é composta por 1 Campaign Group implícito e N conjuntos de anúncios (ad sets), **um por empresa-alvo** (modelo definido em `2026-06-09-per-account-adsets-design.md`, junction table `campaign_accounts`). O dashboard de analytics (`/campaigns/:id`, componente `src/app/campaigns/CampaignAnalytics.tsx`) mostra hoje apenas métricas agregadas da campanha — falta a dimensão central do ABM: **como cada empresa-alvo está performando**.

A página atual tem um placeholder dizendo que performance por empresa requer o pivot `MEMBER_COMPANY` (LinkedIn Standard tier). **Isso está conceitualmente incorreto para o nosso modelo:** `MEMBER_COMPANY` é demografia de audiência (em que empresas trabalham as pessoas que viram o anúncio). Como cada ad set da Maestro é dedicado a uma única empresa, a separação por empresa sai do pivot `CAMPAIGN` do endpoint `adAnalytics` — disponível em qualquer tier — passando os N ad sets em `campaigns=List(...)`: o LinkedIn retorna uma linha por ad set, que mapeia 1:1 para empresa via `campaign_accounts.linkedin_campaign_id` → `target_accounts`.

O backend (`supabase/functions/make-server-a4d5bbe0/index.ts`) já usa exatamente esse endpoint/pivot para o agregado (`/linkedin/campaign-analytics-full`), então a versão real é uma extensão natural — fora do escopo desta entrega.

## Decisões de design

1. **Escopo:** só mock. UI completa + dados mock por empresa; endpoint real fica para entrega futura.
2. **Layout:** tabela comparativa "Performance por Empresa" + filtro multi-seleção que afeta todo o dashboard.
3. **Comparação simultânea:** gráfico temporal com uma linha por empresa selecionada (cores distintas, legenda), KPIs agregando a seleção.

## Modelo de dados

Novos tipos (em `src/lib/linkedin/analytics.ts`, junto dos tipos existentes de analytics):

```ts
interface AccountAnalyticsTotals {
  // mesmas métricas brutas do CampaignAnalyticsFull (sem timeSeries/delta):
  impressions: number; clicks: number; landingPageClicks: number;
  likes: number; shares: number; comments: number; follows: number;
  costInLocalCurrency: number;
  externalWebsiteConversions: number;
  externalWebsitePostClickConversions: number;
  externalWebsitePostViewConversions: number;
  oneClickLeads: number; oneClickLeadFormOpens: number;
  viralImpressions: number; viralClicks: number; viralLikes: number; viralShares: number;
  approximateMemberReach: number;
  cardClicks: number; cardImpressions: number;
}

interface AccountAnalytics {
  accountId: string;            // id em target_accounts
  accountName: string;          // ex: "Petrobras"
  industry: string | null;
  linkedinCampaignId: string;   // URN do ad set (urn:li:sponsoredCampaign:...)
  totals: AccountAnalyticsTotals;
  timeSeries: { date: string; impressions: number; clicks: number; cost: number; likes: number; shares: number }[];
}

interface CampaignAnalyticsByAccount {
  campaignId: string;
  currency: string;
  accounts: AccountAnalytics[];
}
```

Essa shape espelha o que o futuro endpoint `GET /linkedin/campaign-analytics-by-account?campaignId=...&dateRange=...` retornará: no backend real, duas chamadas a `adAnalytics?q=statistics&pivots=List(CAMPAIGN)` (uma `timeGranularity=ALL` para totals, uma `DAILY` para séries) com os N ad sets em `campaigns=List(...)`, agrupando elementos por `pivotValues[0]` (URN do ad set) e resolvendo nome/indústria via `campaign_accounts` + `target_accounts`.

### Mock (`src/lib/mockCampaignData.ts`)

- 5 empresas mock coerentes com o tema "ABM — Enterprise Decision Makers Q1 2026" (grandes contas enterprise brasileiras fictícias ou reais genéricas), cada uma com perfil de performance distinto (uma de alto engajamento, uma de alto custo/baixo CTR etc.) para a comparação ser ilustrativa.
- Cada empresa tem série temporal própria gerada com o mesmo gerador determinístico (seed distinta por empresa, pesos distintos).
- **Consistência por construção:** o agregado da campanha (`getMockAnalyticsFull`) passa a ser **derivado da soma das séries por empresa**, em vez de uma série independente. KPIs agregados, gráfico e tabela nunca se contradizem. Os valores absolutos do mock atual podem mudar; ninguém depende deles.
- Métricas derivadas por empresa (CTR, CPC, CPL etc.) são calculadas no client a partir de `totals`, com os mesmos helpers do agregado.
- Nova função `getMockAnalyticsByAccount(dateRange: string): CampaignAnalyticsByAccount` aplica o mesmo recorte de range (7d/30d/90d/all) usado por `getMockAnalyticsFull`.

## UI (`src/app/campaigns/CampaignAnalytics.tsx`)

### Filtro multi-seleção por empresa

- Linha de chips abaixo do header (uma chip por empresa, com estado marcado/desmarcado), visível apenas quando há dados por empresa (campanha mock; futuramente, campanhas reais com o endpoint).
- Estado `selectedAccountIds: Set<string>`; padrão = todas selecionadas. Atalho "Todas" para resetar.
- Não é permitido zerar a seleção (desmarcar a última mantém ao menos uma) — dashboard vazio não é um estado útil.
- A seleção também é controlável pelos checkboxes da tabela (mesma fonte de estado).

### Seções agregadas refletem a seleção

KPI cards (Spend, Impressões, Clicks, CTR), Custo & Eficiência, Engajamento Social, Conversões e Alcance & Virais passam a ser calculados sobre a **soma dos `totals` das empresas selecionadas** (helpers puros de agregação). Com todas selecionadas, equivale ao comportamento atual. Os delta badges vs período anterior só aparecem com todas as empresas selecionadas (não temos delta por subconjunto no mock; omitir é melhor que mentir).

### Gráfico temporal comparativo

- Substitui o AreaChart dual-axis (impressões × clicks) por um gráfico de **uma linha por empresa selecionada** (recharts `LineChart`), cores distintas e estáveis por empresa (paleta fixa indexada), legenda e tooltip por data mostrando cada empresa.
- Como múltiplas séries exigem uma métrica por vez, entra um **seletor de métrica**: Impressões | Clicks | Investimento (segmented control/pills, padrão Impressões).
- Séries das empresas selecionadas são mescladas por data para o formato do recharts (`{ date, [accountId]: value }`).

### Tabela "Performance por Empresa"

- **Substitui o placeholder `MEMBER_COMPANY`** (texto removido).
- Uma linha por empresa: checkbox (vinculado à seleção global), nome + indústria, Spend, Impressões, Clicks, CTR, CPC, Conversões, Leads, CPL.
- Ordenada por Spend desc (sem sort interativo nesta entrega).
- Linha de rodapé com totais da campanha (todas as empresas, independente da seleção).

### O que não muda

- Coluna de comentários (35%) intocada.
- Dropdown de date range continua funcionando e se aplica também aos dados por empresa.
- Para campanhas reais (não-mock), nada da feature renderiza — sem placeholder prometendo dado que ainda não existe.

## Organização de código

`CampaignAnalytics.tsx` já está grande; novos blocos saem em arquivos próprios:

- `src/app/campaigns/AccountPerformanceTable.tsx` — tabela + checkboxes.
- `src/app/campaigns/AccountComparisonChart.tsx` — gráfico multi-linha + seletor de métrica.
- Helpers puros de agregação (somar `totals`, mesclar séries por data, métricas derivadas) em `src/lib/linkedin/analytics.ts`, junto dos tipos — são usados tanto pelo mock (`src/lib/mockCampaignData.ts`) quanto pela UI, e `lib` não deve importar de `app`.
- Helpers de apresentação (paleta de cores por empresa, dados do gráfico comparativo, linhas derivadas da tabela) em `src/app/campaigns/accountAnalytics.ts`.
- Formatadores compartilhados (`fmtCurrency`, `fmtNum`, `fmtDateLabel`), hoje locais em `CampaignAnalytics.tsx`, extraídos para `src/app/campaigns/format.ts` para reuso pelos novos componentes.

## Tratamento de erros

Escopo mock: dados são síncronos e determinísticos, sem estados de erro de rede novos. Defesas pontuais: divisão por zero nas métricas derivadas (mesmo padrão do código atual: retorna '0'/null) e seleção nunca vazia.

## Testes

Testes unitários para os helpers puros (agregação de `totals`, merge de séries por data, recorte de range, derivadas com divisor zero), na infra de testes do projeto se existente; caso o projeto não tenha infra de testes configurada, a implementação registra isso no plano e valida via verificação manual no navegador (mock é determinístico, valores conferíveis).

## Fora de escopo (próxima entrega — backend real)

- Endpoint `GET /linkedin/campaign-analytics-by-account` no edge function (duas chamadas `adAnalytics` pivot `CAMPAIGN`, mapeamento URN → empresa via `campaign_accounts`/`target_accounts`).
- Deltas vs período anterior por empresa/subconjunto.
- Sort interativo e export da tabela.
