import { describe, it, expect } from 'vitest';
import { stepFrame, showAllStepLabels, STEP_MAX_WIDTH_PX } from './stepLayout';

describe('largura de cada passo, num lugar só', () => {
  it('mantém os valores combinados', () => {
    expect(STEP_MAX_WIDTH_PX).toEqual({ form: 768, segmentation: 1152, creative: null, review: 1280 });
    expect([1, 2, 3, 4, 5].map((s) => stepFrame(s).maxWidthPx)).toEqual([768, 1152, 768, null, 1280]);
  });

  it('a classe bate com a largura (max-w-3xl = 768, 6xl = 1152, 7xl = 1280)', () => {
    expect(stepFrame(1).frameClass).toContain('max-w-3xl');
    expect(stepFrame(2).frameClass).toContain('max-w-6xl');
    expect(stepFrame(4).frameClass).not.toContain('max-w');
    expect(stepFrame(5).frameClass).toContain('max-w-7xl');
  });

  it('na moldura de 768 px a barra de passos mostra só o rótulo do passo atual', () => {
    expect(showAllStepLabels(1)).toBe(false);
    expect(showAllStepLabels(2)).toBe(true);
    expect(showAllStepLabels(4)).toBe(true);
  });
});
