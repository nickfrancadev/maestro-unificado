# Brief — marca enxuta: sem ícones/grafismos, logo único, cor escolhida entre candidatas

Data: 2026-07-30

Continua `2026-07-30-brief-inline-no-step-criativo-design.md`, que transformou o
Brief em painel inline. Aqui o conteúdo da seção Marca é enxugado.

## Contexto

O Brief acumulou campos que ninguém consome. Verificado no código:

| Campo | Consumidor a jusante |
|---|---|
| `icons` | nenhum |
| `graphics` | nenhum |
| `logos` (4 variantes) | nenhum |
| `colors` | landing pages (blocos + StylePanel) e `generateCopy` |
| `voice`, `context` | `generateCopy`, `/ai/client-voice` |

A IA que compõe logo sobre imagem-base usa o logo da **empresa-alvo** (via
logo.dev), não o do anunciante — por isso as quatro variantes de logo da marca
nunca foram lidas por nada.

Enquanto isso, a paleta tem o problema oposto: a extração pode encontrar mais de
uma cor plausível por papel, e a tela só comporta uma.

## Decisões (validadas no brainstorming)

- **Ícones e grafismos saem** do `BrandKit`, do painel e da fixture. Remoção,
  não desativação — não há consumidor para preservar.
- **Logo vira um só**: `logo: string | null`. `LogoVariant` e `LOGO_VARIANTS`
  deixam de existir.
- **`BrandKit.colors` não muda de formato.** Continua `{ primary, secondary,
  accent }`, um hex por papel. É o contrato que landing pages, `StylePanel` e
  `generateCopy` já consomem.
- **Candidatas entram como campo aditivo e opcional**, `colorOptions`. O painel
  mostra amostras clicáveis por papel; clicar define aquele papel em `colors`.
- **O campo hex continua editável** ao lado das amostras — preserva o invariante
  do spec anterior ("os campos são sempre editáveis") e permite valor fora da
  lista.
- **Candidatas não persistem no servidor.** Decisão consciente, ver abaixo.

## Modelo de dados

```ts
export interface BrandKit {
  status: 'defined' | 'empty';
  voice: string;
  context: string;
  websiteUrl: string;
  colors: { primary: string; secondary: string; accent: string };  // inalterado
  colorOptions?: {                    // novo, opcional
    primary: string[];
    secondary: string[];
    accent: string[];
  };
  fontFamily: string;
  logo: string | null;                // era Record<LogoVariant, string | null>
  source?: 'brandbook' | 'website';
  // removidos: icons, graphics
}
```

`colorOptions` é opcional de propósito: marca carregada do servidor não tem
candidatas, e a ausência precisa ser um estado normal, não um vazio a tratar.

## Persistência — o limite declarado

`/ai/client-voice` guarda apenas os três hexes escolhidos (`brand_colors`).
Persistir candidatas exigiria alterar o edge function, que **não tem deploy
automatizado** — o merge na `main` publica só o frontend.

Portanto:

- a cor **escolhida** persiste globalmente, como hoje;
- as **candidatas** vivem no estado da campanha (`creativeData`) e reaparecem ao
  re-extrair.

Justificativa: a extração do Brief é hoje mockada (`MOCK_BRAND_FIXTURE`), então
a fonte real das candidatas ainda não existe. Pagar um deploy manual de backend
por um recurso sem fonte real é adiantar custo sem benefício. Quando a extração
real chegar, persistir candidatas é uma adição, não uma correção.

## UI / Comportamento

### Seção Marca, depois da mudança

1. Bloco de extração (inalterado — primário quando vazia, secundário quando definida)
2. Chip de procedência (inalterado)
3. Tom de voz, Contexto (inalterados)
4. **Paleta da marca** — por papel: campo hex editável + amostras das candidatas
   quando houver
5. Fonte (inalterada)
6. **Logo** — um slot de upload
7. Botão "Salvar marca" (inalterado)

Saem as seções "Ícones da marca" e "Grafismos / padrões".

### Amostras de cor

Renderizadas só quando `colorOptions[papel]` tem itens. A amostra correspondente
ao valor atual de `colors[papel]` aparece marcada como ativa. Clicar numa amostra
grava aquele hex em `colors[papel]`.

Digitar no campo hex continua funcionando e pode divergir de todas as amostras —
nesse caso nenhuma fica marcada.

### Fonte das candidatas hoje

`MOCK_BRAND_FIXTURE` passa a trazer `colorOptions` com algumas cores por papel,
incluindo a que já é a escolhida. Sem isso as amostras nunca apareceriam, já que
a extração real ainda não devolve candidatas — o recurso ficaria invisível e sem
como ser exercitado na aplicação.

A fixture também perde `icons`/`graphics` e passa a ter um `logo` único; as
constantes `MOCK_ICON_*` e `MOCK_GRAPHIC_*` e as variantes de logo não usadas
são removidas junto.

## Compatibilidade

`BrandKit` é persistido em `localStorage` pelas landing pages
(`landingPages/store/repo.ts`). Páginas salvas antes desta mudança carregam
`logos`/`icons`/`graphics` e não têm `logo`.

Isso é inerte: nenhum bloco de landing page lê esses campos (verificado). Os
campos extras são ignorados na desserialização e `logo` fica `undefined`, que o
painel trata como "sem logo". Nenhuma migração é necessária.

## Testes

1. o painel não renderiza mais "Ícones da marca" nem "Grafismos / padrões"
2. `createDefaultBrandKit()` não traz `icons`/`graphics` e traz `logo: null`
3. um único slot de logo; o upload popula `logo`
4. clicar numa amostra grava aquele hex no papel correspondente
5. o campo hex segue editável e aceita valor fora das candidatas
6. sem `colorOptions`, a seção renderiza os três campos hex sem amostras
7. a amostra que casa com o valor atual aparece marcada como ativa

## Fora de escopo

- Trocar a extração mockada pela real
- Persistir `colorOptions` no `/ai/client-voice`
- Mover o Brand Kit para uma tela de Configurações global
