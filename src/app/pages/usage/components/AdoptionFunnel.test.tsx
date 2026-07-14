/**
 * O funil de adoção NÃO é um funil estrito.
 *
 * Os estágios têm unidades diferentes (contas → contatos → dossiês → plays →
 * touchpoints → interações → plays fechadas). Um cliente saudável tem MAIS
 * contatos que contas e MAIS touchpoints que plays: a razão `próximo/anterior`
 * legitimamente passa de 1. Isso é EXPANSÃO, não queda.
 *
 * O bug que estes testes travam: o componente renderizava uma seta ↓ fixa para
 * qualquer razão, então "Contas 29 → Contatos 116" (razão 4,0 — saudável) saía
 * como "↓ 400%", e o componente mentia em TODO cliente. Ele existe para
 * responder "onde o cliente empaca" — se ele chama expansão de queda, o sinal
 * mais acionável da tela é ruído.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { AdoptionFunnel } from './AdoptionFunnel';

afterEach(cleanup);

/**
 * A linha de conversão que precede o estágio `stage`, ou `null` se o estágio
 * não tem uma (primeiro estágio, ou denominador zero).
 *
 * Ancorada na ESTRUTURA (o `li` do estágio, menos o card do estágio), não num
 * `data-testid` novo: um seletor que só existe depois do fix faria estes testes
 * falharem no código antigo por "elemento não encontrado" em vez de falharem
 * pelo defeito real. A prova precisa vir da semântica.
 */
function findConversionRow(stage: string): HTMLElement | null {
  const li = screen.getByText(stage).closest('li');
  if (!(li instanceof HTMLElement)) throw new Error(`estágio "${stage}" não encontrado`);
  // O último filho direto do `li` é o card do estágio (nome + valor + barra);
  // qualquer filho anterior é a linha de conversão.
  const children = Array.from(li.children) as HTMLElement[];
  return children.length > 1 ? children[0] : null;
}

function conversionRow(stage: string): HTMLElement {
  const row = findConversionRow(stage);
  if (!row) throw new Error(`sem linha de conversão em "${stage}"`);
  return row;
}

describe('AdoptionFunnel — direção da variação entre estágios', () => {
  it('expansão (29 contas → 116 contatos) NÃO é uma queda', () => {
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Contas', value: 29 },
          { stage: 'Contatos', value: 116 },
        ]}
      />,
    );

    const row = conversionRow('Contatos');
    // O bug: "↓ 400%". A seta para baixo não pode aparecer numa expansão.
    expect(row.textContent).not.toContain('↓');
    expect(row.textContent).toContain('↑');
    // 116/29 = 4,0 contatos por conta — a razão é o dado, e ela é > 100%.
    expect(row.textContent).toMatch(/400%/);
    // e a palavra "queda" não pode ser usada para descrever um crescimento
    expect(row.textContent?.toLowerCase()).not.toContain('queda');
    expect(within(row).getByText(/expansão|crescimento/i)).toBeTruthy();
  });

  it('contração (100 plays → 25 fechadas) É uma queda, com sinal e seta coerentes', () => {
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Plays', value: 100 },
          { stage: 'Contatos', value: 90 }, // contração leve, NÃO é a maior queda
          { stage: 'Plays fechadas', value: 22 }, // 22/90 — a maior queda
        ]}
      />,
    );

    // A contração leve (90/100) tem que se descrever como queda por conta
    // própria, sem depender do badge "maior queda" para carregar a palavra.
    const row = conversionRow('Contatos');
    expect(row.textContent).toContain('↓');
    expect(row.textContent).not.toContain('↑');
    expect(row.textContent).toMatch(/90%/); // conversão de 90%
    expect(row.textContent).not.toContain('maior queda');
    expect(within(row).getByText(/queda/i)).toBeTruthy(); // -10 pp, dito em texto
  });

  it('razão exatamente 1 não é nem queda nem expansão', () => {
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Plays', value: 10 },
          { stage: 'Touchpoints', value: 10 },
        ]}
      />,
    );
    const row = conversionRow('Touchpoints');
    expect(row.textContent).not.toContain('↓');
    expect(row.textContent).not.toContain('↑');
    expect(row.textContent).toMatch(/100%/);
  });

  it('denominador zero não produz NaN, Infinity nem 0%', () => {
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Contas', value: 5 },
          { stage: 'Plays', value: 0 },
          { stage: 'Touchpoints', value: 3 },
        ]}
      />,
    );
    // 0 → 3 é indefinido, não "+∞%" e não "0%": a linha simplesmente não existe.
    expect(findConversionRow('Touchpoints')).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|∞/);
  });

  it('a "maior queda" é a pior CONTRAÇÃO, nunca a menor expansão', () => {
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Contas', value: 29 },
          { stage: 'Contatos', value: 116 }, // ×4,00 — expansão enorme
          { stage: 'Dossiês', value: 110 }, // ×0,95 — contração leve (-5 pp)
          { stage: 'Plays', value: 11 }, // ×0,10 — contração brutal (-90 pp) ← esta
          { stage: 'Touchpoints', value: 22 }, // ×2,00 — expansão
        ]}
      />,
    );

    expect(screen.getAllByText('maior queda')).toHaveLength(1);
    // a marca vive dentro da linha de conversão que precede "Plays"
    expect(conversionRow('Plays').textContent).toContain('maior queda');
    for (const stage of ['Contatos', 'Dossiês', 'Touchpoints']) {
      expect(conversionRow(stage).textContent).not.toContain('maior queda');
    }
  });

  it('sem nenhuma contração, nenhum estágio é marcado como "maior queda"', () => {
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Contas', value: 10 },
          { stage: 'Contatos', value: 40 },
          { stage: 'Dossiês', value: 80 },
        ]}
      />,
    );
    expect(screen.queryByText('maior queda')).toBeNull();
  });

  it('o cliente-fantasma (tudo zerado depois do topo) não gera queda fantasma', () => {
    // 41 contas → 164 contatos → 15 dossiês → 0 plays → 0 tps → 0 interações
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Contas', value: 41 },
          { stage: 'Contatos', value: 164 },
          { stage: 'Dossiês', value: 15 },
          { stage: 'Plays', value: 0 },
          { stage: 'Touchpoints', value: 0 },
        ]}
      />,
    );
    // Dossiês cai para 9% (15/164) e Plays cai para 0% (0/15). A pior é Plays:
    // é exatamente ali que o cliente-fantasma trava — nunca chega a criar play.
    expect(screen.getAllByText('maior queda')).toHaveLength(1);
    expect(conversionRow('Plays').textContent).toContain('maior queda');
    // 0 → 0 (Touchpoints) é indefinido: sem linha, sem marca.
    expect(findConversionRow('Touchpoints')).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });
});
