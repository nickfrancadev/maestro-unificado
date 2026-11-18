// Largura e margens do assistente de campanha, num lugar só.
//
// Cada passo tem UMA largura máxima, e a barra de passos (topo), o conteúdo e
// o rodapé usam a MESMA moldura: mesma margem lateral (`STEP_GUTTER`) e mesma
// largura centralizada (`frameClass`). Assim os três ficam alinhados entre si
// em qualquer passo e em tela larga. Os passos não definem largura própria.
//
// | Passo                         | Largura máxima          |
// |-------------------------------|-------------------------|
// | 1 Configuração, 3 Marca       | 768 px  (max-w-3xl)     |
// | 2 Segmentação                 | 1152 px (max-w-6xl)     |
// | 4 Criativos                   | largura total           |
// | 5 Revisão                     | 1280 px (max-w-7xl)     |
//
// Criativos é um espaço de trabalho de 3 colunas: o conteúdo vai de borda a
// borda (o CreativeStep anula o respiro com -m-8), e o topo e o rodapé ficam
// na largura total com a mesma margem lateral.
//
// As classes são strings literais de propósito: o Tailwind lê o texto-fonte e
// não acharia uma classe montada em tempo de execução.

/** Margem lateral do topo, do conteúdo e do rodapé (32 px). */
export const STEP_GUTTER = 'px-8';

/** Respiro do conteúdo: a mesma margem lateral, mais o vertical. */
export const STEP_CONTENT_PADDING = 'p-8';

/**
 * A barra de rolagem do conteúdo não pode deslocar o centro da moldura em
 * relação ao topo e ao rodapé: os três reservam o mesmo espaço para ela.
 */
export const STEP_SCROLLBAR_GUTTER = '[scrollbar-gutter:stable]';

export type StepWidth = 'form' | 'segmentation' | 'creative' | 'review';

export const STEP_MAX_WIDTH_PX: Record<StepWidth, number | null> = {
  form: 768,
  segmentation: 1152,
  creative: null,
  review: 1280,
};

const FRAME_CLASS: Record<StepWidth, string> = {
  form: 'w-full mx-auto max-w-3xl',
  segmentation: 'w-full mx-auto max-w-6xl',
  creative: 'w-full',
  review: 'w-full mx-auto max-w-7xl',
};

export function stepWidth(step: number): StepWidth {
  if (step === 2) return 'segmentation';
  if (step === 4) return 'creative';
  if (step === 5) return 'review';
  return 'form';
}

/** A moldura do passo: a mesma classe vai no topo, no conteúdo e no rodapé. */
export function stepFrame(step: number): { width: StepWidth; maxWidthPx: number | null; frameClass: string } {
  const width = stepWidth(step);
  return { width, maxWidthPx: STEP_MAX_WIDTH_PX[width], frameClass: FRAME_CLASS[width] };
}

/**
 * Na moldura de formulário (768 px) não cabem os cinco rótulos da barra de
 * passos ao lado do título e do "Salvar rascunho": ali só o passo atual mostra
 * o rótulo (os outros ficam para leitor de tela).
 */
export function showAllStepLabels(step: number): boolean {
  const max = stepFrame(step).maxWidthPx;
  return max === null || max >= 1152;
}
