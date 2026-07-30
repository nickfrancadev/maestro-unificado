# Brief inline no Step Criativo

Data: 2026-07-30

Substitui parcialmente `2026-06-03-brief-modal-brand-kit-design.md`: mantém o
modelo de dados (`BrandKit`, `BriefDraft`) e os dois caminhos de extração, mas
troca o overlay por um painel e abandona o estado somente-leitura.

## Contexto

O Brief carrega a marca do anunciante — tom de voz, contexto, cores, fonte,
logos — e alimenta a geração de copy e imagem de toda a campanha. É a entrada
mais determinante do Step Criativo.

Hoje ele é um modal que só abre se a pessoa achar e clicar na linha "Brief" do
painel esquerdo. Duas consequências:

1. **Fica invisível.** Quem não clica gera anúncios sem a marca configurada.
2. **Trava quem já tem marca.** Quando `/ai/client-voice` devolve algo salvo, o
   `CreativeStep` marca `brandKit.status = 'defined'` e o modal renderiza
   `BrandSummary` — somente leitura — em vez de `BrandEditor`. O `BrandEditor` é
   onde vivem o upload de brandbook e a extração do site, então **quem já tem
   marca definida não tem caminho nenhum para alterá-la**, nem manualmente nem
   por re-extração.

O segundo ponto é um bug de fato, não só de descoberta.

## Decisões (validadas no brainstorming)

- **Painel, não modal.** O Brief vira um terceiro alvo de edição, irmão de
  "Template global" e das empresas.
- **Alvo inicial.** Ao entrar no Step Criativo, `editingTarget` começa no Brief.
  Navegação livre: clicar em Template global ou numa empresa troca na hora.
  Descartado bloquear o avanço — travaria quem só quer ajustar um texto.
- **Estado definido é editável.** Campos preenchidos e editáveis; extração vira
  ação secundária. Inverte a hierarquia atual.
- **Estado vazio mostra os campos.** Extração como atalho no topo, campos
  visíveis e preenchíveis abaixo. Sem brandbook e sem site ainda dá para digitar.
- **`BrandSummary` é removido.** Sem estado somente-leitura, perde a função.
- **`BriefModal` é removido.** Consumidor único (`CreativeStep`), verificado.

## Arquitetura

### Navegação

O `CreativeStep` já dirige o painel principal por um único estado:

```ts
const [editingTarget, setEditingTarget] = useState<string>(TEMPLATE_TARGET);
```

A mudança acompanha o padrão existente:

```ts
const BRIEF_TARGET = '__brief__';
const [editingTarget, setEditingTarget] = useState<string>(BRIEF_TARGET);
```

O painel principal passa a ter três ramos: Brief, Template global, empresa.

### Arquivos

| Arquivo | Mudança |
|---|---|
| `wizard/BriefPane.tsx` | **novo** — conteúdo do brief sem casca de overlay |
| `wizard/BriefModal.tsx` | **removido** |
| `wizard/CreativeStep.tsx` | `BRIEF_TARGET`, alvo inicial, ramo de render; perde `voiceModalOpen` |
| `wizard/BriefPane.test.tsx` | **novo** |

`BriefDraft` migra de `BriefModal.tsx` para `BriefPane.tsx` (o `CreativeStep`
importa o tipo de lá).

### Composição do BriefPane

`BriefPane` recebe as props atuais do `BriefModal` menos `onClose`, e renderiza
duas seções com separação visual explícita:

- **Marca** — global, persiste em `/ai/client-voice`
- **Aplicação nesta campanha** — produto, público, persona; só desta campanha

`BrandEditor` funde os estados A (só extração) e B (chip + campos) num único
layout: bloco de extração + campos sempre visíveis.

### Papel do `BrandKit.status` após a mudança

Hoje `status` decide entre `BrandSummary` (leitura) e `BrandEditor` (edição).
Com a leitura removida, ele deixa de governar editabilidade — mas continua
existindo e passa a governar apenas apresentação:

- subtítulo da linha "Brief" no painel esquerdo (resumo vs. "Defina a marca")
- texto do chip de procedência
- rótulo do botão de salvar ("Salvar marca" vs. "Salvar modelo")

Os campos são sempre editáveis, nos dois estados. `persistVoice` continua
marcando `status: 'defined'` ao salvar, como hoje.

## Salvamento

As duas seções têm destinos diferentes, e isso dita comportamentos diferentes:

- **Aplicação nesta campanha** → `creativeData`, atualiza ao vivo como o resto
  do wizard.
- **Marca** → `/ai/client-voice`, **global**. Mantém botão **"Salvar marca"**
  explícito, com aviso de que a alteração vale para todas as campanhas.

Salvar a marca a cada tecla escreveria no servidor e mudaria campanhas que a
pessoa não está editando. É o único ponto que foge do padrão inline, de propósito.

## UI / Comportamento

### Painel esquerdo

A linha "Brief" perde o chevron `›` (que promete overlay) e ganha o mesmo
tratamento de selecionado das demais. O subtítulo reflete o estado: resumo do
tom de voz quando definido, "Defina a marca" quando vazio.

### Estado vazio (`status === 'empty'`)

Bloco de extração no topo — dropzone de brandbook (PDF) e campo de site com
"Extrair com IA" — e abaixo os campos da marca, vazios e editáveis.

Remove a mensagem "Os campos da marca aparecem após a extração".

### Estado definido (`status === 'defined'`)

Campos preenchidos e editáveis. Abaixo, discretas: "Substituir a partir de PDF"
e "Extrair do site novamente".

Chip de procedência quando houver `source` ("Extraído do site" / "Brand Book
lido"). Marca vinda do servidor não tem `source`; nesse caso o chip indica
origem nas configurações salvas.

## Erros e bordas

Preservados do comportamento atual: limite de 5MB por asset, validação de tipo
de imagem, `extractError` / `extractWarning` renderizados junto ao bloco de
extração.

Extração falhando não limpa campos já preenchidos.

## Testes

Em `BriefPane.test.tsx` (jsdom, padrão dos `.test.tsx` do projeto):

1. marca definida renderiza campos **editáveis** — cobre o bug central
2. estado definido expõe as ações de substituir por PDF e re-extrair
3. estado vazio mostra campos preenchíveis sem extração prévia
4. editar campo de "Aplicação nesta campanha" não dispara escrita global
5. "Salvar marca" chama o save global uma vez

Em `CreativeStep`:

6. monta com o Brief como alvo inicial
7. trocar para Template global e para uma empresa segue funcionando

## Fora de escopo

- Mover o Brand Kit para tela de Configurações global (já previsto no spec de
  2026-06-03)
- Alterar o `BrandBriefDrawer` (brief por empresa-alvo, coisa distinta)
- Mudar os endpoints de extração
