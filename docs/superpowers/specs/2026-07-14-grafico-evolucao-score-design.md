# Gráfico de Evolução do Score — Design

**Data:** 2026-07-14
**Status:** Aprovado
**Escopo:** Substitui o heatmap de atividade na tela de detalhe do dashboard de Uso de Clientes.
**Spec original da feature:** `docs/superpowers/specs/2026-07-13-uso-clientes-design.md`

## Problema

A tela de detalhe (`/uso-clientes/:companyId`) tem um card "Atividade por dia" — um heatmap
7 dias × 12 semanas estilo GitHub contributions. Ele é fraco por três motivos:

1. **Responde à pergunta errada.** "Em que dia da semana essa company age" não ajuda a
   decidir nada sobre churn. O eixo dia-da-semana é ruído numa métrica agregada por company.
2. **Ignora o filtro de período** da tela — mostra 12 semanas fixas, contradizendo o resto.
3. **Densidade de informação péssima.** 84 células num card largo, quando o sinal acionável
   cabe numa frase.

## Objetivo

Substituir o heatmap por um **gráfico de evolução do health score** ao longo do tempo — que
responde à pergunta central da tela: *este cliente está melhorando ou piorando?* O score é a
métrica central de toda a página, então sua trajetória amarra a tela inteira.

## Decisões

| Decisão | Escolha | Alternativa descartada |
|---|---|---|
| O que mostrar | Evolução do health score | Tendência de atividade; composição por usuário; remover sem repor |
| Janela de cada ponto | **Deslizante** (mesmo tamanho do período, terminando na data do ponto) | Fatias fixas isoladas |
| Alcance do gráfico | **12 semanas fixas** com o período do filtro sombreado | Estrito ao período do filtro |
| Cor da curva | Segue o bucket do ponto final | Navy neutro fixo |
| Linhas de bucket | Sim (30/55/75) | Sem referências |

**Por que janela deslizante:** é como o próprio health score funciona (sempre olha uma janela
recente), então o último ponto da curva **bate com o score grande do topo da tela** —
coerência entre superfícies, que os reviews anteriores cobraram repetidamente.

**Por que 12 semanas fixas em vez de estrito ao filtro:** um gráfico de tendência precisa de
tendência para mostrar. Estrito ao filtro, um período de 7 dias renderiza 1–2 pontos (inútil),
e 7/30 dias são os filtros mais usados. A faixa fixa com o período sombreado dá a trajetória
completa E onde o recorte atual se encaixa. O número grande do score continua respeitando o
filtro; só o gráfico revela mais passado — o que é informação, não contradição.

## Dados (sem tocar na `lib/` congelada)

Nova função pura `scoreTimeline` — vive num arquivo novo, NÃO modifica `health.ts` nem
`selectors.ts` (a fundação está congelada e é só consumida):

```ts
// src/app/pages/usage/lib/timeline.ts
export interface ScorePoint {
  date: Date;        // fim da janela deslizante daquele ponto
  score: number;     // 0–100
  bucket: RiskBucket;
  inFilter: boolean; // o fim da janela cai dentro do período do filtro?
}

export function scoreTimeline(
  company: Company,
  period: Period,
  weeks?: number,    // default 12
  today?: Date,      // default TODAY
): ScorePoint[]
```

Para cada uma das `weeks` semanas (da mais antiga à atual):
- monta uma janela deslizante `[fim - duração(period), fim]`, onde `duração(period)` é o
  tamanho do período do filtro e `fim` é o fim daquela semana (a última semana termina em
  `today`);
- chama `computeHealth(company, janela, today)` e guarda `score` + `bucket`;
- marca `inFilter = true` se `fim` está dentro de `[period.start, period.end]`.

Garantias:
- **O último ponto usa exatamente o período do filtro** → `score` do último ponto ==
  `computeHealth(company, period)` == score grande do topo. Testado.
- **Company nova:** pontos cujo início de janela é anterior a `company.onboardedAt` são
  omitidos (não inventa histórico pré-onboarding). A série começa no onboarding.
- **Cliente fantasma:** a série é uma linha reta baixa — leitura correta ("está morto e
  sempre esteve"), sem empty state especial.

## Componente

`src/app/pages/usage/components/ScoreTimeline.tsx` — substitui `ActivityHeatmap.tsx`.

Props: `{ points: ScorePoint[]; period: Period }`.

Visual (Recharts — já no projeto):
- **Área suave** com gradiente sutil; eixo Y **fixo em 0–100** (escala estável e comparável
  entre clientes).
- **Cor da linha/área segue o bucket do ponto final** — usa a rampa de risco
  (`BUCKET_META[bucket].color`), uso legítimo pois é um indicador de risco. Nunca hardcodar o
  hex (há teste-guarda); ler de `BUCKET_META`.
- **Linhas de referência horizontais** nos limites de bucket (30/55/75, de
  `BUCKET_THRESHOLDS`) em cinza tênue (`#E2E8F0`) — para ver o cliente CRUZANDO fronteiras
  ("entrou em zona de risco há 5 semanas" é a leitura mais forte).
- **Trecho do período do filtro sombreado** via `ReferenceArea`.
- Título "Evolução do score" + subtítulo "Últimas N semanas" (deixa claro que a extensão do
  gráfico ≠ período do filtro).
- **Selo de tendência** no cabeçalho, derivado da série: variação em pontos entre o primeiro e
  o último ponto (ex.: "▼ −36 pts" / "▲ +12 pts" / "estável"), com cor de tendência
  (`TREND_GOOD`/`TREND_BAD`/`TREND_FLAT` de `./colors` — NÃO a rampa de risco).
- Tooltip no hover/foco: data + score + rótulo do bucket. Teclado-acessível.
- Respeita `prefers-reduced-motion` (regra global já existe; animação de entrada do Recharts
  desligada sob reduced-motion).

Layout: mesma faixa do heatmap, altura ~180px (menor que o heatmap gordo). Ajuste fino de
largura/composição decidido na implementação para equilibrar com o funil/mix acima.

## Integração

`UsageCompanyDetail.tsx`:
- Remove o import e o uso de `ActivityHeatmap` e a chamada a `activityHeatmap(...)`.
- Adiciona `scoreTimeline(company, period)` e `<ScoreTimeline points={...} period={period} />`.
- `HEATMAP_WEEKS` → `TIMELINE_WEEKS = 12`.

`activityHeatmap` e `activityByWeek` em `selectors.ts` permanecem (podem ter outros usos — o
sparkline do CompanyCard usa `activityByWeek`); só o heatmap **na tela de detalhe** sai.
Verificar se `activityHeatmap` fica sem nenhum consumidor após a troca; se sim, removê-lo é
limpeza legítima, mas confirmar antes.

## Testes

`timeline.test.ts` (puro, roda em `node`):
- O último ponto de `scoreTimeline(c, period)` tem `score` == `computeHealth(c, period).score`.
- Série de um cliente em queda é (não-estritamente) decrescente ao final.
- Company onboardada há 4 semanas gera ≤ 4 pontos, nenhum antes do onboarding.
- A janela de cada ponto tem a mesma duração do período do filtro.
- `inFilter` marca exatamente os pontos cujo fim cai dentro do período.

`ScoreTimeline.test.tsx` (jsdom): renderiza com série real + série de um ponto + série vazia
sem crashar; a cor da área vem de `BUCKET_META` (não hardcoded).

## Fora de escopo

Sem histórico persistido (o score é recalculável para qualquer janela — não precisa de
armazenamento). Sem comparação de trajetórias entre clientes. Sem export. Sem anotações de
evento na linha do tempo ("aqui ele fechou 3 plays") — seria ótimo, mas depende de dados que o
mock não modela por evento datado de forma rica; fica para depois se houver backend.
