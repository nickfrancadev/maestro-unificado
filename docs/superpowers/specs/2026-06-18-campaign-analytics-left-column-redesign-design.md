# Redesign — Coluna Esquerda do Campaign Analytics

**Data:** 2026-06-18
**Rota afetada:** `/campaigns/:id` (ex. `mock-abm-001`)
**Arquivo principal:** [src/app/campaigns/CampaignAnalytics.tsx](../../../src/app/campaigns/CampaignAnalytics.tsx)
**Specs relacionados:** `2026-06-11-per-account-analytics-design.md`, `2026-06-12-per-account-creative-comments-design.md`

## Problema

A coluna esquerda da tela de analytics mistura dois modelos mentais que brigam entre si:

1. **Agregado** — KPIs, gráfico, custo, social, conversões, virais: tudo somado das empresas selecionadas.
2. **Por-empresa** — a tabela `AccountPerformanceTable`, hoje enterrada na Section 7 (última), depois de 6 seções.

O usuário-alvo cria uma campanha que roda **um anúncio por empresa** e quer responder: *"qual empresa performa melhor? quanto custa cada uma?"* — uma intenção **comparativa**. Mas a tela está estruturada como dashboard agregado, com a comparação como apêndice no fim do scroll. Os filtros (pills) **somam** as empresas selecionadas num número único, que não responde a nenhuma pergunta de negócio real. Resultado: sensação de "dados jogados e desconexos", sem visão clara por empresa.

A coluna direita (carrossel de empresa + preview do anúncio + comentários) **não** será alterada — está bem resolvida.

## Decisões (tomadas no brainstorming)

1. **Intenção dominante: visão dupla** — comparar todas (visão geral) → mergulhar em uma (drill-down).
2. **Mecânica de drill-down adaptativa por breakpoint:**
   - **Desktop (≥1024px):** expande **inline** — clicar na linha da empresa abre um painel logo abaixo dela, mantendo as outras empresas à vista. Desktop tem largura pra isso sem perder contexto.
   - **Mobile (<1024px):** **substitui** a coluna por uma tela focada da empresa, com "← Voltar". Espaço escasso → foco total.
3. **Hierarquia da visão geral: manter tudo visível, só reordenar** (sem recolher/accordion).
4. **Destaque do vencedor: opção B — barras de magnitude + ordenação por coluna**, sem cor semântica (verde/vermelho) por enquanto. Evoluível: cor pode ser adicionada depois sem refazer.

## Arquitetura

### Estados da coluna esquerda

Novo state em `CampaignAnalytics.tsx`:

- `detailAccountId: string | null` — qual empresa está com o detalhe aberto. `null` = visão geral.

Comportamento por breakpoint (detectado via CSS/media-query e/ou hook de viewport):

- **Desktop:** quando `detailAccountId` é setado, a `AccountPerformanceTable` renderiza um painel expansível **dentro** da linha correspondente. O resto da visão geral continua visível.
- **Mobile:** quando `detailAccountId` é setado, a coluna esquerda inteira é substituída pelo `AccountDetailPanel` em modo tela-cheia com cabeçalho "← Voltar".

### Sincronização com a coluna direita

Abrir o detalhe de uma empresa **também** atualiza o `focusedAccountId` existente, para que o preview do anúncio (`AccountAdPreview`) e os comentários (`CommentsCard`) à direita sempre correspondam à empresa em foco. Isso resolve uma desconexão atual onde o foco da direita podia divergir da intenção do usuário na esquerda.

### Componentes

| Componente | Mudança |
|---|---|
| `CampaignAnalytics.tsx` | Orquestra `detailAccountId`; escolhe inline (desktop) vs replace (mobile); sincroniza `focusedAccountId`; aplica nova ordem das seções. |
| `AccountPerformanceTable.tsx` | + ordenação por coluna (`aria-sort`); + barras de magnitude inline em Spend e Impressões; + linha expansível no desktop que renderiza `AccountDetailPanel`. |
| **`AccountDetailPanel.tsx`** (novo) | Conteúdo do detalhe de UMA empresa: KPIs dela + mini-gráfico dela + social/conversões/virais dela. Reutilizado nos dois containers (expand inline no desktop, tela-cheia no mobile). Recebe um `AccountAnalytics` e o `currency`. |

`AccountComparisonChart.tsx` permanece como está (já desenha multi-linha por empresa via `selectedIds`); só muda de posição na ordem.

## Nova ordem da Visão Geral

Ordem atual: KPIs → Gráfico → Custo → Social → Conversões → Virais → **Tabela (última)**.

Nova ordem (agrupada por intenção):

1. **KPIs da campanha** (Spend, Impressões, Clicks, CTR) — saúde geral. Topo, como hoje.
2. **🥇 Tabela "Performance por Empresa"** — sobe pra logo abaixo dos KPIs. Coração da resposta "quem ganha". Ganha ordenação + barras (opção B).
3. **Gráfico "Comparativo por empresa"** (multi-linha) — logo após a tabela. Tabela = "quanto"; gráfico = "como evoluiu". Ambos comparativos, ficam juntos.
4. **Métricas agregadas detalhadas** — Custo/Eficiência → Social → Conversões → Virais, sob um rótulo de seção **"Métricas agregadas (empresas selecionadas)"** que deixa explícito que são somatórios, não por-empresa.

Mudança-chave: comparativos (tabela + gráfico) sobem; agregados descem e ganham rótulo que avisa "isto é soma". Elimina a confusão entre número somado vs. número por empresa.

## Detalhes da tabela (opção B)

- **Ordenação:** clicar no cabeçalho de qualquer coluna numérica (Spend, Impressões, Clicks, CTR, CPC, Conv., Leads, CPL) ordena asc/desc. Indicador de direção (↑/↓) + `aria-sort` para acessibilidade. Estado de ordenação em state local da tabela.
- **Barras de magnitude:** em Spend e Impressões, uma barrinha proporcional ao maior valor da coluna, na cor da empresa (`accountColor`), ao lado do número.
- **Linha expansível (desktop):** clicar na linha (não no checkbox) abre/fecha o `AccountDetailPanel` daquela empresa. Hoje o clique na linha faz toggle de seleção — esse comportamento muda: **clique na linha = abrir detalhe**; **checkbox = filtrar seleção** (mantido). Chevron (▸/▾) na linha sinaliza expansibilidade.
- **Mobile:** clicar na linha seta `detailAccountId` (replace), sem expand inline.
- Footer "Total da campanha" permanece.

## Acessibilidade & responsividade

- Ordenação com `aria-sort` no `<th>` ativo (`sortable-table`).
- Barras são reforço visual de números já presentes — não dependem só de cor (`color-not-only`).
- Chevron + linha clicável têm `cursor-pointer`; checkbox para com `stopPropagation` (já existe).
- Alvo de toque ≥44px nas linhas em mobile.
- Breakpoint único de troca de mecânica: 1024px (`lg` do Tailwind), consistente com o layout 65/35 atual.
- Botão "← Voltar" no detalhe mobile com label acessível.

## Fora de escopo

- Coluna direita (anúncio, comentários, carrossel) — inalterada.
- Cor semântica de melhor/pior na tabela (decidido adiar; evoluível).
- Recolher/accordion de seções (decidido manter tudo visível).
- Mudanças no modelo de dados (`AccountAnalytics` já tem tudo necessário: `totals`, `timeSeries`, `creative`).

## Critérios de sucesso

- Tabela comparativa visível sem scroll (logo abaixo dos KPIs) e ordenável por qualquer métrica.
- Clicar numa empresa abre o detalhe dela — inline no desktop, tela-cheia no mobile — e a direita sincroniza.
- Métricas agregadas claramente rotuladas como soma, separadas das comparativas.
- Nenhuma regressão na coluna direita nem no comportamento de filtro por checkbox.
