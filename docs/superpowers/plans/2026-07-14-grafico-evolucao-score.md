# Plano — Gráfico de Evolução do Score

**Spec:** `docs/superpowers/specs/2026-07-14-grafico-evolucao-score-design.md` (leia antes de qualquer tarefa)
**Base:** branch `feat/uso-clientes-melhorias`, a partir de `224218f`.
**Execução:** 3 tarefas sequenciais, cada uma revisada antes da próxima.

## Convenções globais (todas as tarefas)

- **Stack:** React 18 + TS + Vite + Tailwind v4. Recharts 2.15, lucide-react, motion — já instalados, **não adicione deps**.
- **Estilo de código:** siga os componentes existentes em `src/app/pages/usage/components/` (ex.: `AdoptionFunnel.tsx`, `StatTile.tsx`). Componentes `export function` nomeados, sem default export. Card idiom: `bg-white rounded-xl p-5 border border-[#d8d8d8]`, `boxShadow: '0 1px 3px rgba(0,0,0,0.05)'`, `font-['Euclid_Circular_A',sans-serif]`, números `tabular-nums`.
- **Tokens:** navy `#212A46`, texto secundário `#64748B`, gridline `#E2E8F0`, marca/seleção `#FF5F39` (só marca/seleção, nunca dado).
- **Rampa de risco (EXCLUSIVA de risco):** crítico `#DC2626`, em risco `#EA580C`, atenção `#CA8A04`, saudável `#059669`. **Nunca hardcode esses hexes** — leia de `BUCKET_META[bucket].color`. Existe um teste-guarda (`components/rampColors.guard.test.ts`) que verifica se algum arquivo `.tsx` de componente contém o hex LITERAL da rampa; a allow-list é `new Set(['SignalChips.tsx'])`. Como `ScoreTimeline` deve ler a cor de `BUCKET_META` (sem nunca digitar o hex no fonte), ele passa no guarda **sem entrar na allow-list**. **NÃO adicione `ScoreTimeline.tsx` à allow-list** — se você precisou adicionar, é porque hardcodou o hex; leia de `BUCKET_META` em vez disso.
- **Cores de tendência (FORA da rampa):** `TREND_GOOD`/`TREND_BAD`/`TREND_FLAT` de `./colors`.
- **`lib/` é pura:** nada em `lib/` importa React.
- **Congelado — NÃO MODIFIQUE:** `lib/health.ts`, `lib/selectors.ts`, `lib/format.ts`, `data/`. Só consuma.
- **Datas:** tudo ancora em `TODAY` (de `data/types`), nunca `new Date()`.
- **Testes:** `vitest.config.ts` já roda `.test.ts` em node e `.test.tsx` em jsdom. Ao terminar cada tarefa: `npx vitest run src/app/pages/usage` e `npx tsc --noEmit` sem erro novo nos seus arquivos.

---

## Tarefa 1 — `lib/timeline.ts` (função pura + testes)

Criar `src/app/pages/usage/lib/timeline.ts`:

```ts
import type { Company, Period, RiskBucket } from '../data/types';
import { TODAY } from '../data/types';
import { computeHealth } from './health';

export interface ScorePoint {
  date: Date;         // fim da janela deslizante deste ponto
  score: number;      // 0–100
  bucket: RiskBucket;
  inFilter: boolean;  // date cai dentro de [period.start, period.end]?
}

export function scoreTimeline(
  company: Company,
  period: Period,
  weeks = 12,
  today: Date = TODAY,
): ScorePoint[]
```

Lógica:
- `duration = period.end - period.start` (ms). É o tamanho da janela deslizante.
- A última semana termina em `today`. A semana `i` (de 0 = mais antiga a `weeks-1` = atual)
  termina em `end_i = today - (weeks-1-i)*7 dias`.
- Para cada semana: `janela = { start: new Date(end_i - duration), end: end_i }`.
- **Omite** o ponto se `janela.start < company.onboardedAt` (não inventa histórico
  pré-onboarding). Resultado: company nova gera menos pontos, começando no onboarding.
- Para os pontos restantes: `h = computeHealth(company, janela, today)`; ponto =
  `{ date: end_i, score: h.score, bucket: h.bucket, inFilter: end_i ∈ [period.start, period.end] }`.
- Retorna em ordem cronológica (mais antigo → atual).

**Cuidado com timezone:** faça a aritmética em ms sobre os timestamps (`.getTime()`), como o
resto de `lib/` faz. Não use getters locais de data.

Testes `src/app/pages/usage/lib/timeline.test.ts` (node):
1. O último ponto de `scoreTimeline(c, period)` tem `.score === computeHealth(c, period, TODAY).score`
   e `.bucket === computeHealth(...).bucket`. (Use uma company real de `COMPANIES` e `DEFAULT_PERIOD`.)
2. A janela de cada ponto tem duração == `period.end - period.start` (verifique via `date` de
   pontos consecutivos: ficam a 7 dias um do outro; a duração da janela é constante — asserte
   reconstruindo `start = date - duration`).
3. Uma company onboardada há ~4 semanas (monte uma sintética, ou ajuste `onboardedAt` de uma
   cópia) gera ≤ 4 pontos e nenhum ponto com janela iniciando antes de `onboardedAt`.
4. `inFilter` é `true` exatamente para os pontos cujo `date` cai em `[period.start, period.end]`
   — para `DEFAULT_PERIOD`, o último ponto (hoje) está dentro; um ponto de 10 semanas atrás não.
5. Um cliente em queda (use um ghost/declining de `COMPANIES`) tem série cujo último ponto
   não é maior que o primeiro (tendência não-crescente ao final).

Rode `npx vitest run src/app/pages/usage/lib/timeline.test.ts` e cole a saída real no relatório.

---

## Tarefa 2 — `components/ScoreTimeline.tsx` (componente + testes)

Criar `src/app/pages/usage/components/ScoreTimeline.tsx`. Props:
`{ points: ScorePoint[]; period: Period; weeks?: number }` (weeks default 12, só para o texto do subtítulo).

Estrutura (card padrão, ver convenções):
- Cabeçalho: título "Evolução do score", subtítulo "Últimas {weeks} semanas". À direita, um
  **selo de tendência** derivado de `points`: `delta = último.score - primeiro.score`,
  arredondado; renderiza `▲ +N pts` / `▼ −N pts` / `estável` (|delta| ≤ 2 → estável), com cor
  `TREND_GOOD` (delta>0) / `TREND_BAD` (delta<0) / `TREND_FLAT` de `./colors`, ícone lucide
  (`TrendingUp`/`TrendingDown`/`Minus`). Números `tabular-nums`.
- Gráfico Recharts (`ResponsiveContainer` altura ~180):
  - `<AreaChart data={points.map(p => ({ x: p.date.getTime(), score: p.score, ... }))}>`.
  - `<YAxis domain={[0, 100]} ticks={[0,30,55,75,100]}>` — escala fixa e comparável.
  - `<XAxis>` com os `date` formatados curtos (dd/mm). Poucos ticks; não polua.
  - **`<ReferenceLine>` em 30, 55, 75** (de `BUCKET_THRESHOLDS` de `lib/health`) em `#E2E8F0`,
    finas. São as fronteiras de bucket.
  - **`<ReferenceArea>`** cobrindo o intervalo `[period.start, period.end]` no eixo X, fundo
    bem sutil (ex.: `#FF5F39` a ~6% de opacidade, OU um cinza — escolha o que não brigar com a
    curva; teste visual). Rotule discretamente "período".
  - **Cor da área/linha = `BUCKET_META[último.bucket].color`** (lida de `BUCKET_META`, nunca
    hardcoded). Gradiente do stroke color a ~15% → transparente no fill.
  - `<Tooltip>` custom: data + score + rótulo do bucket (`BUCKET_META[bucket].label`).
  - Passe `key` explícito nos filhos do Recharts (padrão do projeto, ver `Home.tsx`).
  - Anima entrada só se não for reduced-motion (`isAnimationActive={!reduced}` via
    `useReducedMotion()` de `motion/react`).
- Casos-limite:
  - `points.length === 0` → empty state ("Sem histórico de score no período.").
  - `points.length === 1` → renderiza o ponto (um dot), selo mostra "—"/"novo", sem crash.

Import `BUCKET_META`, `BUCKET_THRESHOLDS` de `../lib/health`; `TREND_*` de `./colors`.

Testes `src/app/pages/usage/components/ScoreTimeline.test.tsx` (jsdom):
- Renderiza com uma série real (gere via `scoreTimeline(COMPANIES[i], DEFAULT_PERIOD)`) sem crash.
- Renderiza com série de 1 ponto e com `[]` sem crash (empty state no segundo).
- O selo de tendência mostra a direção certa: monte uma série decrescente → selo é `TREND_BAD`
  (cor `#EF4444`); crescente → `TREND_GOOD`. Asserte pela cor renderizada, não só pelo texto
  (evita teste vacuous — a rodada anterior teve testes que passavam por construção).
- A cor da área vem de `BUCKET_META` — asserte que uma série cujo último bucket é `critical`
  usa `#DC2626` em algum lugar do SVG.

Rode e cole a saída real.

---

## Tarefa 3 — Integração na tela + remoção do heatmap

Editar `src/app/pages/usage/UsageCompanyDetail.tsx`:
- Remover o import de `ActivityHeatmap` e a chamada `activityHeatmap(company, HEATMAP_WEEKS)`.
- Importar `ScoreTimeline` e `scoreTimeline`; `HEATMAP_WEEKS` vira `TIMELINE_WEEKS = 12`.
- No lugar do `<ActivityHeatmap .../>`, renderizar
  `<ScoreTimeline points={scoreTimeline(company, period, TIMELINE_WEEKS)} period={period} weeks={TIMELINE_WEEKS} />`.
- Verifique o `useMemo`/derivação existente (a tela memoiza métricas por `company`+`period` —
  encaixe a timeline no mesmo padrão para não recalcular a cada render).

Remoção do heatmap (só depois de confirmar que a tela compila com a troca):
- `ActivityHeatmap.tsx` e `ActivityHeatmap.test.tsx` / `charts.smoke.test.tsx` (a parte do
  heatmap): remover o componente e seus testes. **Antes de deletar**, `grep -rn ActivityHeatmap src/`
  para garantir que a tela de detalhe era o único consumidor. Se `charts.smoke.test.tsx` testa
  vários componentes juntos, remova só os casos do heatmap, não o arquivo inteiro.
- `selectors.ts` está CONGELADO — **não** remova `activityHeatmap` dele mesmo que fique órfão
  (é fundação; mexer nela está fora de escopo e arriscaria o resto). Apenas **reporte** se
  `activityHeatmap` ficou sem consumidor, para decisão futura. `activityByWeek` continua usado
  pelo sparkline do `CompanyCard` — não toque.

**Verificação final (obrigatória, cole a saída):**
1. `npx vitest run` — suíte inteira verde (as duas features; não quebre os testes da landing-pages).
2. `npx tsc --noEmit` — sem erro novo.
3. `npm run build` — passa.
4. **Suba o app e olhe.** `npm run dev`, abra a detail de um cliente saudável, um crítico
   (ghost) e um em risco. Confirme: a curva aparece, a cor segue o bucket, as linhas de 30/55/75
   aparecem, o trecho do período fica sombreado, o último ponto do gráfico condiz com o score
   grande do topo, e o selo de tendência aponta a direção certa. Troque o período no filtro e
   confirme que o sombreado e o último ponto acompanham. Reporte o que VIU (screenshot se puder).
