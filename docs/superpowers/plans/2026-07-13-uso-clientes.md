# Plano de Implementação — Dashboard de Uso de Clientes

**Spec:** `docs/superpowers/specs/2026-07-13-uso-clientes-design.md` (leia antes de começar qualquer tarefa)
**Execução:** subagent-driven — Fase 1 sequencial, Fase 2 em paralelo, Fase 3 sequencial.

## Convenções que TODAS as tarefas devem seguir

- **Stack:** React 18 + TypeScript + Vite + Tailwind v4. Recharts para gráficos, `lucide-react`
  para ícones, `motion` para animação. Tudo já instalado — **não adicione dependências**.
- **Estilo do código:** siga `src/app/pages/dashboard/InternoTab.tsx` como referência de
  convenção (componentes funcionais nomeados com `export function`, Tailwind + `style={{}}`
  inline para os tokens de marca, sem default export).
- **Tokens visuais:** laranja `#FF5F39`, navy `#212A46`, fundo `#EDF2F5`, card branco
  `rounded-xl border border-[#d8d8d8]`, texto secundário `#64748B`, gridline `#E2E8F0`.
  Fonte `font-['Euclid_Circular_A',sans-serif]`. Números com `tabular-nums`.
- **Rampa de risco (EXCLUSIVA de risco, nunca use essas cores para outra coisa):**
  crítico `#DC2626` · em risco `#EA580C` · atenção `#CA8A04` · saudável `#059669`.
- **Cor nunca sozinha:** todo indicador de risco carrega ícone + rótulo além da cor.
- **`lib/` é puro:** nenhum arquivo em `src/app/pages/usage/lib/` pode importar React.
- **Sem `Math.random()`** em código de runtime — o mock usa seed determinístico.
- Ao terminar, rode `npx tsc --noEmit` e garanta que não há erro **nos arquivos que você criou**.

---

## FASE 1 — Fundação (sequencial, bloqueia tudo)

### Tarefa 1.1 — Tipos, mock e biblioteca pura

Criar:

**`src/app/pages/usage/data/types.ts`**

Exatamente os tipos do spec (secção "Modelo de dados"): `PlayType`, `TouchpointType`,
`Profile`, `Company`, `User`, `Play`, `Touchpoint`. Adicione também:

```ts
export type RiskBucket = 'critical' | 'at_risk' | 'watch' | 'healthy';
export type Dimension = 'recency' | 'trend' | 'depth' | 'concentration';

export interface Signal {
  id: string;
  label: string;              // ex: "Sem acesso há 24d"
  severity: 'high' | 'medium' | 'low';
}

export interface Health {
  score: number;              // 0-100, inteiro
  bucket: RiskBucket;
  breakdown: Record<Dimension, number>;  // cada um 0-100
  signals: Signal[];
}

export interface Period {
  start: Date;
  end: Date;
}
```

**`src/app/pages/usage/data/mockData.ts`**

Gerador determinístico de ~24 companies. Use um PRNG com seed fixo (mulberry32 ou similar,
~5 linhas) — **nunca `Math.random()`**. Ancore todas as datas relativas a uma constante
`export const TODAY = new Date('2026-07-13T12:00:00Z')` para a tela ser estável.

Exporte `export const COMPANIES: Company[]`.

Plante deliberadamente estes perfis (o resto pode ser gerado):
- **O fantasma** (≥2): último acesso e última atividade > 40 dias atrás.
- **O acumulador** (≥2): 15–30 plays criadas, ZERO fechadas (`endDate: null` em todas).
- **O refém** (≥2): 1 usuário responsável por >90% dos plays/touchpoints; os outros usuários
  com `lastAccessAt: null` (nunca acessaram).
- **O em queda** (≥2): volume de atividade nas últimas 4 semanas ~1/3 das 4 semanas anteriores.
- **Saudáveis** (≥8): uso distribuído entre 3+ usuários, ≥50% de plays fechadas, taxa de
  interação alta, acesso nos últimos 3 dias.
- O restante distribuído entre "atenção".

Nomes de company plausíveis de empresas brasileiras (fictícias). Emails no formato
`nome@empresa.com.br`. Plans: `'Starter' | 'Growth' | 'Enterprise'`. MRR entre 2k e 40k.

Touchpoints devem usar os 7 tipos reais e canais reais (`LinkedIn`, `Email`, `Ligação`,
`WhatsApp`, `Presencial`, `Instagram`, `SMS`, `Site`). `dueDate` no passado com
`endDate: null` = touchpoint atrasado — garanta que os clientes em risco tenham muitos.

**`src/app/pages/usage/lib/format.ts`**

```ts
export function daysAgo(date: Date | null, today?: Date): number | null
export function formatDaysAgo(date: Date | null, today?: Date): string   // "2d atrás" | "Nunca" | "Hoje"
export function formatPct(n: number, digits?: number): string            // "41%"
export function formatNumber(n: number): string                          // locale pt-BR
export function formatDelta(curr: number, prev: number): { pct: number; label: string; dir: 'up'|'down'|'flat' }
```

**`src/app/pages/usage/lib/selectors.ts`**

Funções puras de agregação. Todas recebem `(company, period)` e filtram por período onde
fizer sentido (um play "conta" no período se `createdAt` está dentro dele; "fechado no
período" se `endDate` está dentro dele).

```ts
export interface UsageMetrics {
  playsCreated: number;
  playsClosed: number;
  playsCloseRate: number;          // 0-1
  playsOpen: number;
  touchpointsCreated: number;
  touchpointsClosed: number;
  touchpointsLate: number;
  touchpointsLateRate: number;     // 0-1
  avgTouchpointsPerPlay: number;
  avgContactsPerPlay: number;
  avgInteractionsPerPlay: number;
  interactionRate: number;         // interações / contatos envolvidos, 0-1
  avgDaysToClose: number | null;   // null se nenhuma play fechada
  activeUsers: number;             // usuários com atividade no período
}

export function computeMetrics(company: Company, period: Period): UsageMetrics
export function previousPeriod(period: Period): Period        // mesmo tamanho, imediatamente antes
export function lastAccessAt(company: Company): Date | null   // max entre usuários
export function lastActivityAt(company: Company): Date | null
export function activityByWeek(company: Company, weeks: number, today?: Date): number[]  // p/ sparkline
export function activityHeatmap(company: Company, weeks: number, today?: Date): { week: number; day: number; count: number }[]
export function playTypeMix(company: Company, period: Period): { type: PlayType; count: number }[]
export function adoptionFunnel(company: Company, period: Period): { stage: string; value: number }[]
  // estágios: Contas, Contatos, Dossiês, Plays, Touchpoints, Interações, Plays fechadas
export function userStats(company: Company, period: Period): {
  user: User; plays: number; touchpoints: number; share: number  // share 0-1 da atividade total
}[]
```

"Atividade" de um usuário = plays que ele criou (`ownerEmail`) + touchpoints em que é
responsável (`responsibles`), dentro do período.

**`src/app/pages/usage/lib/health.ts`**

```ts
export const WEIGHTS = { recency: 0.35, trend: 0.25, depth: 0.25, concentration: 0.15 } as const;
export const BUCKET_THRESHOLDS = { critical: 30, at_risk: 55, watch: 75 } as const;

export function computeHealth(company: Company, period: Period, today?: Date): Health
export function bucketOf(score: number): RiskBucket
export const BUCKET_META: Record<RiskBucket, { label: string; color: string; icon: string }>
  // labels PT-BR: 'Crítico' | 'Em risco' | 'Atenção' | 'Saudável'
  // icon: nome do ícone lucide, ex 'OctagonAlert' | 'TriangleAlert' | 'CircleDashed' | 'CircleCheck'
```

Implemente as 4 dimensões exatamente como o spec descreve:
- **recency (35%):** dias desde `max(lastAccessAt, lastActivityAt)`. 0–3d → 100; decai
  linearmente até 30d → 0. `null` (nunca) → 0.
- **trend (25%):** `atividade(period) / atividade(previousPeriod)`. Razão ≥1 → 100.
  Razão ≤0.5 → 0. Interpolar linearmente entre. Se período anterior = 0 e atual > 0 → 100.
- **depth (25%):** média de `playsCloseRate`, `(1 - touchpointsLateRate)` e `interactionRate`,
  ×100.
- **concentration (15%):** com `shares` = share de cada usuário ativo, use
  `1 - HHI` normalizado (HHI = Σ share²). 1 usuário → HHI 1 → score 0. Distribuição uniforme
  entre N → score alto. ×100.

`signals` deve gerar entre 1 e 3 chips, priorizando os de maior severidade. Gere quando:
- sem acesso > 7d → `Sem acesso há Nd` (high se >21d)
- playsCreated ≥ 5 e playsClosed = 0 → `0 de N plays fechadas` (high)
- queda > 30% → `-N% de atividade` (high se >50%)
- share do top user > 0.8 → `1 usuário concentra N%` (medium)
- touchpointsLateRate > 0.5 → `N% dos touchpoints atrasados` (medium)
- interactionRate < 0.2 e touchpointsCreated > 10 → `Baixa taxa de interação (N%)` (medium)
- usuários que nunca acessaram > 0 → `N assentos nunca usados` (low)
- se saudável e sem nenhum sinal → `Uso saudável` (low)

**Testes (obrigatório — `vitest` já está instalado no projeto):**

Crie `src/app/pages/usage/lib/health.test.ts` e `src/app/pages/usage/lib/selectors.test.ts`.
A lógica pura é o coração desta feature — se o score mente, a tela inteira mente. Cubra:

- `bucketOf` nos limites exatos (29/30, 54/55, 74/75).
- Cada dimensão de `computeHealth` isoladamente, com uma company sintética montada no teste:
  recência 0d → 100 e 30d+ → 0; tendência com período anterior zerado; profundidade com
  0 plays fechadas; concentração com 1 usuário (→0) vs. 4 usuários uniformes (→alto).
- Os perfis plantados no mock caem no bucket certo: o fantasma é `critical`, os saudáveis são
  `healthy`. (Importe `COMPANIES` e asserte.)
- `computeMetrics` filtra corretamente por período (um play criado fora do período não conta).
- `previousPeriod` devolve uma janela de mesmo tamanho, imediatamente anterior, sem sobrepor.
- `userStats`: os `share` somam ~1 e o "refém" tem top-share > 0.9.

Rode `npx vitest run src/app/pages/usage` e reporte a saída real no seu relatório. Todos os
testes devem passar antes de você commitar.

---

## FASE 2 — Componentes de apresentação (PARALELO — tarefas independentes)

Todas as tarefas desta fase dependem SÓ da Fase 1. Nenhuma depende de outra. Cada componente
recebe dados via props e não busca dados por conta própria.

### Tarefa 2.1 — `HealthScoreRing.tsx` + `SignalChips.tsx`

`HealthScoreRing`: anel SVG de progresso. Props: `{ score: number; bucket: RiskBucket; size?: number }`.
Um círculo de fundo `#E2E8F0` e um arco na cor do bucket, com o número no centro
(`tabular-nums`, peso 700, cor do bucket). Suporte pelo menos dois tamanhos (56px no card,
120px no detalhe). Anime o arco na entrada com `motion` (`ease-out`, 400ms), respeitando
`prefers-reduced-motion`. Acessível: `role="img"` + `aria-label` descrevendo score e bucket.

`SignalChips`: renderiza `Signal[]`. Cada chip é uma pill pequena (`text-[11px]`), com fundo
esmaecido e borda na cor da severidade (high = vermelho, medium = âmbar, low = cinza), com um
ícone lucide à esquerda. Props: `{ signals: Signal[]; max?: number }`.

### Tarefa 2.2 — `StatTile.tsx`

Tile de métrica. Props:
`{ label: string; value: number | string; delta?: { pct: number; dir: 'up'|'down'|'flat' }; hint?: string; format?: 'number'|'pct'|'days'; invertDelta?: boolean; pending?: boolean }`

Número grande (`text-3xl`, 700, `#212A46`, `tabular-nums`) animado com o hook existente
`useCountUp` de `src/app/pages/dashboard/useCountUp.ts` (só quando `value` é number). Label
pequeno acima. Delta abaixo com seta e cor semântica — atenção: `invertDelta` inverte o
significado (subir "touchpoints atrasados" é RUIM). Quando `pending: true`, mostra um ícone
`Info` com tooltip "Pendente de instrumentação — dado ainda não rastreado pelo produto".

Card: `bg-white rounded-xl border border-[#d8d8d8] p-4`.

### Tarefa 2.3 — `PeriodFilter.tsx`

Filtro de período. Props: `{ period: Period; onChange: (p: Period) => void }`.

Um botão que abre um popover com presets (Últimos 7 dias / 30 dias / 90 dias / Este trimestre)
e a opção "Personalizado", que revela o `RangeCalendar` já existente em
`src/app/pages/dashboard/RangeCalendar.tsx` (leia a interface dele antes — ele recebe
`initialStart`/`initialEnd` como `yyyy-mm-dd` e chama `onApply(start, end)`).

O botão exibe o rótulo do período ativo. Ancore "hoje" na constante `TODAY` do mock.

### Tarefa 2.4 — `AdoptionFunnel.tsx`

Props: `{ stages: { stage: string; value: number }[] }`.

Barras horizontais, uma por estágio, largura proporcional ao maior valor. Entre estágios
consecutivos, mostre a **% de conversão como texto** (ex. `↓ 78%`). Calcule o maior drop-off
e **destaque-o visualmente** (borda/fundo âmbar + rótulo "maior queda"). Valor absoluto
sempre visível ao lado do nome do estágio. Sem Recharts — barras em `div` são mais simples
e mais acessíveis aqui. Use um gradiente de um só matiz (navy → navy claro) do topo do funil
pra base, **não** a rampa de risco.

### Tarefa 2.5 — `PlayTypeMix.tsx`

Props: `{ mix: { type: PlayType; count: number }[] }`.

Barras horizontais por tipo de play (`PrePlay`, `SalesPlay`, `CsPlay`, `OneToFewPlay`), com
contagem. Abaixo, uma **anotação interpretativa** derivada dos dados:
- só `PrePlay` (e total > 0) → "Só PrePlay — o cliente nunca chegou a vender."
- tem `CsPlay` → "Tem CsPlay — sinal de expansão/pós-venda."
- vazio → empty state.

Uma cor sólida (navy) para as barras — tipos de play não são uma escala, então não use
gradiente nem a rampa de risco.

### Tarefa 2.6 — `ActivityHeatmap.tsx`

Props: `{ cells: { week: number; day: number; count: number }[]; weeks: number }`.

Grid de `div`s: 7 linhas (dias, rotulados D/S/T/Q/Q/S/S) × N colunas (semanas). Intensidade
por opacidade de um único matiz navy (5 níveis). **Tooltip no hover com o valor numérico
exato e a data** — exigência de acessibilidade. Legenda embaixo com a escala ("menos" → 5
quadradinhos → "mais") **com os valores numéricos dos limites**. Célula com 0 fica cinza
claro, não invisível.

### Tarefa 2.7 — `UsersTable.tsx`

Props: `{ rows: { user: User; plays: number; touchpoints: number; share: number }[] }`.

Colunas: Nome (com email em `text-xs` abaixo) · Perfil (badge) · Último acesso (com o
marcador de "pendente de instrumentação" no cabeçalho da coluna) · Última atividade · Plays ·
Touchpoints · Share (barra horizontal + %).

Ordenável clicando no cabeçalho (`aria-sort` correto). Linhas de usuários que **nunca
acessaram** (`lastAccessAt === null`) ganham um tratamento sutil de destaque (fundo levemente
âmbar + rótulo "nunca acessou") — é o sinal de assento pago e não usado.

### Tarefa 2.8 — `CompanyCard.tsx`

Props: `{ company: Company; health: Health; metrics: UsageMetrics; sparkline: number[]; onClick: () => void }`.

Card clicável. Layout: linha superior com `HealthScoreRing` (56px) + nome da company + plano.
Abaixo, a sparkline (Recharts `<LineChart>` minimalista, sem eixos/grid/legenda, altura ~32px,
cor do bucket). Abaixo, `SignalChips` (máx 2). Rodapé em `text-xs` cinza: `N plays · N touch ·
N usuários`.

Hover: `translateY(-2px)` + sombra maior, transição 150ms. **Não mude tamanho nem margem**
(sem layout shift). É um `<button>` ou tem `role="button"` + `tabIndex` + handler de teclado —
precisa ser navegável por teclado com foco visível.

### Tarefa 2.9 — `CompanyTable.tsx`

Props: `{ rows: { company: Company; health: Health; metrics: UsageMetrics; prevMetrics: UsageMetrics }[]; onRowClick: (id: string) => void }`.

Tabela densa e sortável. Colunas: Cliente · Score (com badge de bucket: ícone + rótulo + cor) ·
Último acesso · Última atividade · Plays criadas · Fechadas · % fechadas · Touch criados ·
Finalizados · Atrasados · Média touch/play · Contatos/play · Interações/play · Dias p/ fechar ·
Usuários ativos · Δ atividade.

Cabeçalho sticky. `aria-sort` no cabeçalho ativo. Linha inteira clicável (navega ao detalhe).
Wrapper com `overflow-x-auto`. Números em `tabular-nums`.

---

## FASE 3 — Telas e roteamento (sequencial, depois da Fase 2)

### Tarefa 3.1 — `UsagePortfolio.tsx` + `RiskBoard.tsx`

`RiskBoard`: recebe as companies já com health computado, agrupa nos 4 buckets e renderiza
4 colunas. Cabeçalho de cada coluna: ícone + rótulo + contagem, na cor do bucket. Coluna com
scroll interno (`max-h`), empty state quando vazia. Cards entram com stagger de 40ms via
`motion` (respeitando `prefers-reduced-motion`).

`UsagePortfolio`: a tela. Estado local: `period`, `view: 'board' | 'table'`.
- Header: título "Uso de Clientes", subtítulo com contagem, `PeriodFilter`, toggle Board/Tabela.
- Faixa de 5 KPIs agregados (use `StatTile`): MRR em risco (soma do MRR de crítico + em risco) ·
  Clientes ativos (com atividade no período) / total · Clientes sem acesso há 7d+ · Taxa média
  de plays fechadas · Taxa média de interação.
- Um botão discreto "como calculamos o score" que abre um popover explicando as 4 dimensões e
  seus pesos (leia `WEIGHTS` de `health.ts` — não hardcode os números no texto).
- Board ou Tabela conforme o toggle.

Container: `max-w-[1600px] mx-auto p-6 space-y-6` sobre `bg-[#EDF2F5]`, igual às páginas atuais.

### Tarefa 3.2 — `UsageCompanyDetail.tsx`

Lê `:companyId` de `useParams`. Se não achar a company, mostra um empty state com link de volta.

Monta as 6 seções na ordem do spec: cabeçalho de saúde (ring grande + breakdown das 4
dimensões em barras + último acesso/última atividade/plano/usuários) → grid de `StatTile`s
com deltas vs. período anterior → `AdoptionFunnel` + `PlayTypeMix` lado a lado →
`ActivityHeatmap` → `UsersTable`.

Breadcrumb clicável de volta a `/uso-clientes`. `PeriodFilter` no header.

Atenção nos deltas: `touchpointsLate` e `touchpointsLateRate` usam `invertDelta` (subir é ruim).

### Tarefa 3.3 — Roteamento e sidebar

- Em `src/app/App.tsx`: adicionar `<Route path="uso-clientes" element={<UsagePortfolio />} />`
  e `<Route path="uso-clientes/:companyId" element={<UsageCompanyDetail />} />` dentro do
  `<Route element={<AppLayout />}>` (antes do catch-all `path="*"`).
- Em `src/app/components/Sidebar.tsx`: adicionar `{ icon: HeartPulse, key: "uso-clientes" }`
  ao array `navItems`. **Cuidado:** a Sidebar tem um mapeamento especial
  (`key === "analytics" ? "dashboard" : ...`) — a chave `uso-clientes` cai no caso default e
  navega pra `/uso-clientes` corretamente, mas confirme lendo o código.

**Verificação final (obrigatória):** rode `npx tsc --noEmit` (zero erros novos) e
`npm run build` (deve passar). Depois suba `npm run dev` e navegue de fato até
`/uso-clientes` e até um detalhe de cliente, confirmando que renderizam sem erro de console.
Reporte o que observou — não afirme que funciona sem ter rodado.
