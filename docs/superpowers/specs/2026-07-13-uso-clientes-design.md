# Dashboard de Uso de Clientes — Design

**Data:** 2026-07-13
**Status:** Aprovado
**Escopo:** Front-only (mock). Nenhuma integração de backend nesta fase.

## Problema

O time Maestro não tem visibilidade de como seus clientes usam o produto. Não dá pra
responder "qual cliente está caminhando pro churn?" sem abrir o banco. As telas atuais
(`/dashboard`) são voltadas ao usuário-cliente — mostram as contas *dele*, os plays *dele*.
Falta a visão inversa: o Maestro olhando para os clientes do Maestro.

## Objetivo

Uma superfície interna que responda, em ordem:

1. **Onde eu olho primeiro?** — clientes ordenados por risco de churn.
2. **Por que esse cliente está em risco?** — sinais explícitos, não um score opaco.
3. **O que está acontecendo dentro dele?** — métricas de uso, funil de adoção, quem usa.

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Localização | Página nova e independente (`/uso-clientes`) | Aba no `/dashboard`; reescrever a aba "Interno" |
| Dados | Mock front-only, modelado a partir do backend real | Ligar no Supabase agora |
| Navegação | Duas telas: Portfólio → Detalhe do Cliente | Tela única com filtro; master-detail |
| Risco | Health Score fixo (pesos documentados na UI) | Score configurável; sem score |
| Visual | Identidade da marca + risk board autoral em cards | Fiel-e-sóbrio; terminal denso |
| Último acesso | Mock (marcado "pendente de instrumentação") **+** Última atividade (derivável) | Só mock; só proxy real |

## Contexto do produto real

Levantado em `MAESTRO/2026/Dev/maestro-real/maestro_api` (NestJS + MongoDB).

**Distinção crítica:** `Company` = o cliente pagante (tenant). `Accounts` = as contas-alvo
que ele prospecta. Esta página é sobre **Company**.

- **Users** pertencem a companies via `other_companies[]`. Perfis: `SYS_ADMIN > ADMIN > AGENCY > EDITOR > VIEWER`.
- **Play** tem 4 tipos: `PrePlay`, `SalesPlay`, `CsPlay`, `OneToFewPlay`. Ciclo de vida é
  `status: boolean` (true = aberta) + `archived`. Fechamento grava `end_date`. Existe
  `expected_end_date` (permite medir atraso vs. planejado) e um bloco `learning[]` no fechamento.
- **Touchpoint** tem 7 tipos: `Relacionamento`, `Atenção`, `Autoridade`, `Encantamento`,
  `Descoberta`, `Engajamento`, `Negociação`. (Não existe "Afinidade".) Canais são free-form.
  Existe `date_status: "late"` — touchpoint atrasado.
- **Interactions** é coleção própria, uma por touchpoint, com os contatos que de fato
  responderam e a `interaction_date`.
- **Nomes de campo:** `created_since` / `updated_in` / `end_date` (não `created_at`/`closed_at`).

### ⚠️ Login não é rastreado

Não existe `last_login`, `last_access`, tabela de sessão ou log de auth. O auth é JWT
stateless e não escreve nada de volta no usuário. Existe Mixpanel no frontend, fora da API.

**Consequência:** "Último acesso" aparece na UI como **mock, marcado com um indicador de
"pendente de instrumentação"**, ao lado de "Última atividade" — que é derivável de verdade
(a data mais recente em que o usuário criou ou fechou um play/touchpoint). A página serve
também como especificação do que precisa ser instrumentado pra ir a produção.

## Arquitetura

Rotas:
- `/uso-clientes` → Portfólio
- `/uso-clientes/:companyId` → Detalhe do Cliente

Novo item na `Sidebar` (ícone `HeartPulse`).

```
src/app/pages/usage/
  UsagePortfolio.tsx        composição da tela 1
  UsageCompanyDetail.tsx    composição da tela 2
  components/
    RiskBoard.tsx           os 4 buckets em colunas
    CompanyCard.tsx         card de cliente
    CompanyTable.tsx        vista densa alternativa
    HealthScoreRing.tsx     anel de score (SVG)
    SignalChips.tsx         chips de "por quê"
    AdoptionFunnel.tsx      funil de adoção
    ActivityHeatmap.tsx     heatmap semanal
    PlayTypeMix.tsx         mix de tipos de play
    UsersTable.tsx          usuários da company
    PeriodFilter.tsx        filtro de período (reusa RangeCalendar)
    StatTile.tsx            tile de métrica (reusa useCountUp)
  data/
    types.ts                tipos espelhando o modelo real
    mockData.ts             gerador determinístico (seed fixo)
  lib/
    health.ts               cálculo do score — puro
    selectors.ts            agregações — puro
    format.ts               formatação (datas, %, números)
```

**Regra de fronteira:** `lib/` é puro e não importa React. Toda a matemática vive lá; os
componentes só renderizam. Quando o backend chegar, troca-se `data/` e `lib/` continua igual.

## Modelo de dados (mock)

```ts
type PlayType = 'PrePlay' | 'SalesPlay' | 'CsPlay' | 'OneToFewPlay';
type TouchpointType = 'Relacionamento' | 'Atenção' | 'Autoridade'
                    | 'Encantamento' | 'Descoberta' | 'Engajamento' | 'Negociação';
type Profile = 'ADMIN' | 'AGENCY' | 'EDITOR' | 'VIEWER';

interface Company {
  id: string; name: string; plan: string; seats: number;
  onboardedAt: Date; mrr: number;
  users: User[]; plays: Play[];
  accountsCount: number; contactsCount: number; dossiersCount: number;
}

interface User {
  id: string; name: string; email: string; profile: Profile;
  lastAccessAt: Date | null;    // MOCK — pendente de instrumentação
  lastActivityAt: Date | null;  // derivável do backend real
}

interface Play {
  id: string; name: string; type: PlayType; ownerEmail: string;
  createdAt: Date; startDate: Date; expectedEndDate: Date;
  endDate: Date | null;         // não-nulo = fechada
  archived: boolean;
  touchpoints: Touchpoint[];
  contactsInvolved: number;
  saleClosed?: boolean;
}

interface Touchpoint {
  id: string; type: TouchpointType; channel: string;
  responsibles: string[];
  createdAt: Date; dueDate: Date; endDate: Date | null;
  contactsInvolved: number;
  interactions: number;         // contatos que de fato responderam
}
```

**Mock:** ~24 companies, gerador determinístico (seed fixo — sem `Math.random()` solto, pra
a tela ser idêntica em todo reload). Perfis plantados de propósito:

- **O fantasma** — zero acesso há 40+ dias.
- **O acumulador** — muitas plays criadas, zero fechadas.
- **O refém** — 1 usuário concentra >90% da atividade.
- **O em queda** — atividade caiu >60% vs. período anterior.
- **Os saudáveis** — uso distribuído, plays fechando, interação alta.

## Health Score

`health.ts` expõe uma função pura:

```ts
computeHealth(company, period) → {
  score: number;          // 0–100
  bucket: 'critical' | 'at_risk' | 'watch' | 'healthy';
  breakdown: Record<Dimension, number>;
  signals: Signal[];      // os chips explicativos
}
```

### Dimensões

| Dimensão | Peso | Cálculo |
|---|---|---|
| **Recência** | 35% | Dias desde o mais recente entre último acesso e última atividade. 0–3d = 100; decai linearmente até >30d = 0. |
| **Tendência** | 25% | Atividade do período ÷ atividade do período anterior de mesmo tamanho. Queda >50% zera a dimensão. |
| **Profundidade** | 25% | Média de: taxa de plays fechadas, taxa de touchpoints no prazo, taxa de interação (respondentes ÷ envolvidos). |
| **Concentração** | 15% | Dispersão da atividade entre usuários. 1 usuário responsável por tudo = penalidade máxima. |

### Buckets

| Bucket | Faixa | Ícone | Cor |
|---|---|---|---|
| Crítico | < 30 | ⛔ | `#DC2626` |
| Em risco | 30–54 | ⚠️ | `#EA580C` |
| Atenção | 55–74 | ◐ | `#CA8A04` |
| Saudável | ≥ 75 | ✓ | `#059669` |

### Sinais (chips)

Cada company exibe de 1 a 3 chips explicando por que está naquele bucket. Exemplos:
`Sem acesso há 24d` · `0 de 18 plays fechadas` · `-67% de atividade` ·
`1 usuário concentra 94%` · `73% dos touchpoints atrasados` · `Nunca fechou um play`

**O score ordena; os chips explicam.** A tela nunca apresenta um número sem justificativa.
Um tooltip "como calculamos" no cabeçalho documenta os pesos.

## Tela 1 — Portfólio (`/uso-clientes`)

Header: título, contagem de clientes, **filtro de período**, toggle **Board ↔ Tabela**.

**Faixa de KPIs** (bullet charts contra benchmark): MRR em risco · Clientes ativos ·
Clientes sem acesso (7d+) · Taxa de plays fechadas · Taxa de interação.

**Risk Board** (vista padrão): quatro colunas — Crítico / Em risco / Atenção / Saudável —
cada uma com os cards das companies daquele bucket, ordenados por score ascendente. Cada
coluna tem contagem no cabeçalho e scroll interno.

**Card de cliente:** anel de score (SVG, cor do bucket), nome, sparkline de 8 semanas de
atividade, chips de sinal, e no rodapé os números-chave (plays · touchpoints · usuários
ativos). Hover eleva 2px com sombra (sem shift de layout). Clique navega ao detalhe.

**Vista Tabela:** mesma fonte de dados, tabela densa e sortável com todas as colunas —
score, último acesso, última atividade, plays criadas/fechadas/%, touchpoints
criados/fechados/atrasados, média de touchpoints por play, contatos/play, interações/play,
dias até fechamento, usuários ativos, Δ vs. período anterior.

## Tela 2 — Detalhe do Cliente (`/uso-clientes/:companyId`)

Breadcrumb de volta ao portfólio. Filtro de período compartilhado.

1. **Cabeçalho de saúde:** anel de score grande + bucket, e o breakdown das 4 dimensões em
   barras. Ao lado: último acesso (com marcador de "pendente de instrumentação"), última
   atividade, plano, contagem de usuários (total e ativos no período).

2. **StatTiles** (com Δ vs. período anterior): Plays criadas · Plays fechadas ·
   Touchpoints criados · Touchpoints finalizados · Média de touchpoints por play ·
   Média de contatos por play · Média de interações por play · Dias até fechamento ·
   % de touchpoints atrasados. Números animam com `useCountUp` (padrão já usado no app).

3. **Funil de adoção:** Contas → Contatos → Dossiês → Plays → Touchpoints → Interações →
   Plays fechadas. Barras horizontais com a **% de conversão explícita entre estágios**, e
   destaque automático do maior drop-off. Responde "onde esse cliente trava?".

4. **Mix de tipos de play:** barras horizontais por `PlayType`. Um cliente só com `PrePlay`
   nunca chegou a vender; presença de `CsPlay` indica expansão. A leitura vem anotada.

5. **Heatmap de atividade:** 12 semanas × dias, intensidade por volume de eventos. Legenda
   com escala numérica e valor exato no hover (exigência de acessibilidade).

6. **Tabela de usuários:** Nome · Perfil · Último acesso · Última atividade · Plays ·
   Touchpoints · **Share** (% da atividade da company gerada por aquele usuário). A coluna
   Share expõe o risco de concentração, e é onde aparecem os usuários que **nunca
   acessaram** — assentos pagos e não usados.

## Sistema visual

**Cor = significado, sem exceção.**

| Papel | Cor |
|---|---|
| Marca / seleção | `#FF5F39` (nunca usada em dado) |
| Texto / estrutura | `#212A46` |
| Texto secundário | `#64748B` |
| Superfície / fundo | `#FFFFFF` / `#EDF2F5` |
| Borda | `#d8d8d8` (cards) / `#E2E8F0` (gridlines) |
| Risco — Crítico | `#DC2626` |
| Risco — Em risco | `#EA580C` |
| Risco — Atenção | `#CA8A04` |
| Risco — Saudável | `#059669` |

A rampa de risco é **exclusiva de risco** — não aparece em nenhum outro contexto. Todos os
quatro tons passam 4.5:1 sobre branco.

**Cor nunca sozinha:** todo bucket carrega ícone + rótulo além da cor.

Conflito laranja-marca (`#FF5F39`) vs. laranja-risco (`#EA580C`): resolvido confinando o
risco a superfícies próprias (anel, chip, cabeçalho de coluna) e nunca colocando os dois
lado a lado num mesmo elemento.

**Charts (Recharts):**
- Funil → barras horizontais com % explícita (mais legível e acessível que um funil literal).
- Mix de plays → barras horizontais.
- Sparkline → `<Line>` minimalista sem eixos.
- Heatmap → grid de `div`s, legenda de escala + valor no hover.
- KPIs → bullet chart contra benchmark.
- Sem pizza, sem 3D, sem gradiente decorativo. Gridlines em `#E2E8F0`.

**Movimento:** `motion` (já no projeto) só nas entradas — stagger de 40ms nos cards do
board, `ease-out` 200ms. Respeita `prefers-reduced-motion`.

**Tipografia:** Euclid Circular A (fonte do app). Números em `tabular-nums`.

## Fora de escopo (YAGNI)

Export CSV · alertas e notificações · comparação lado-a-lado de clientes · persistência de
filtros · responsividade mobile (é ferramenta interna de desktop — não quebra abaixo de
1280px, mas não é desenhada pra 375px) · autenticação/permissão de "time interno" ·
qualquer integração de backend.
