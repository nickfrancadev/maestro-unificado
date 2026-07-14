/**
 * O funil de adoção NÃO é um funil estrito, e agora ele sabe disso.
 *
 * Os estágios têm unidades diferentes (contas → contatos → dossiês → plays →
 * touchpoints → interações → plays fechadas) e SÓ UM deles aninha de verdade no
 * outro (`Plays fechadas ⊂ Plays`). Daí duas relações distintas:
 *
 *  - CONVERSÃO (%) — só onde há aninhamento. Só ela pode ser "queda"/"expansão",
 *    e só ela concorre a "maior queda".
 *  - RAZÃO POR UNIDADE — onde as unidades não se encaixam. "3,7 interações por
 *    touchpoint" é informativo; "374% de conversão" entre touchpoints e
 *    interações é ruído (I4).
 *
 * E "tem dado?" é uma pergunta sobre o PERÍODO: os três primeiros estágios são
 * contagens estáticas do cadastro, nunca zero, e gatear o estado vazio neles o
 * tornava inalcançável — o cliente-fantasma ganhava um funil confiante
 * diagnosticando um gargalo dossiê→play para quem só parou de logar (I3).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import type { FunnelStage } from '../lib/selectors';
import { AdoptionFunnel } from './AdoptionFunnel';

afterEach(cleanup);

/** Estágio estático do topo (cadastro da company, fora do período). */
function stat(stage: string, value: number, perUnitLabel?: string): FunnelStage {
  return { stage, value, periodScoped: false, perUnitLabel };
}

/** Estágio recortado pelo período. */
function scoped(
  stage: string,
  value: number,
  extra: Partial<FunnelStage> = {},
): FunnelStage {
  return { stage, value, periodScoped: true, ...extra };
}

/**
 * A linha de relação que precede o estágio, ou `null` se ele não tem uma.
 *
 * Ancorada na ESTRUTURA (o `li` do estágio menos o card), não num `data-testid`
 * novo: um seletor que só existisse depois do fix faria estes testes falharem
 * no código antigo por "elemento não encontrado" em vez de falharem pelo
 * defeito real. A prova precisa vir da semântica.
 */
function findRelationRow(stage: string): HTMLElement | null {
  const li = screen.getByText(stage).closest('li');
  if (!(li instanceof HTMLElement)) throw new Error(`estágio "${stage}" não encontrado`);
  const children = Array.from(li.children) as HTMLElement[];
  return children.length > 1 ? children[0] : null;
}

function relationRow(stage: string): HTMLElement {
  const row = findRelationRow(stage);
  if (!row) throw new Error(`sem linha de relação em "${stage}"`);
  return row;
}

describe('I4 — o funil não afirma conversões que não existem', () => {
  it('entre unidades que NÃO aninham não há %, nem seta, nem "expansão"/"queda"', () => {
    // 50 touchpoints → 187 interações. Uma interação não é um "touchpoint
    // convertido": não existe conversão de 374% aqui.
    render(
      <AdoptionFunnel
        stages={[
          scoped('Touchpoints', 50),
          scoped('Interações', 187, { perUnitLabel: 'interações por touchpoint' }),
        ]}
      />,
    );

    const row = relationRow('Interações');
    const text = row.textContent ?? '';
    expect(text).not.toMatch(/%/); // ← o bug: "↑340% expansão"
    expect(text).not.toContain('↑');
    expect(text).not.toContain('↓');
    expect(text.toLowerCase()).not.toContain('expansão');
    expect(text.toLowerCase()).not.toContain('queda');
    // O que ELE PODE dizer: a razão por unidade, que é uma grandeza real.
    expect(text).toMatch(/3,7\s*interações por touchpoint/);
  });

  it('a % sobrevive onde uma etapa é subconjunto genuíno da outra', () => {
    // Plays fechadas ⊂ Plays: 18 de 25 plays criadas fecharam = 72%. Isto é
    // uma conversão de verdade, e continua sendo dita como tal.
    render(
      <AdoptionFunnel
        stages={[
          scoped('Plays', 25),
          scoped('Touchpoints', 60, { perUnitLabel: 'touchpoints por play' }),
          scoped('Plays fechadas', 18, { subsetOf: 'Plays' }),
        ]}
      />,
    );

    const row = relationRow('Plays fechadas');
    expect(row.textContent).toMatch(/72%/);
    expect(row.textContent).toContain('↓');
    // a contração se diz em texto, com a variação em pontos percentuais
    expect(within(row).getByText(/queda \(-28 pp\)/i)).toBeTruthy();
    // e ela diz de QUE base fala — a conversão salta o estágio adjacente
    expect(row.textContent).toMatch(/de Plays/);
  });

  it('"maior queda" só é apontada em CONVERSÕES, nunca entre unidades soltas', () => {
    // Dossiês→Plays é uma razão por unidade (0,07 plays por dossiê): pré-fix,
    // essa "queda de 93%" era eleita a maior queda e o funil inventava um
    // gargalo. A única conversão real aqui (Plays fechadas ⊂ Plays) não contrai
    // muito, mas é a única que PODE ser marcada.
    render(
      <AdoptionFunnel
        stages={[
          stat('Contas', 41),
          stat('Contatos', 164, 'contatos por conta'),
          stat('Dossiês', 15, 'dossiês por contato'),
          scoped('Plays', 1, { perUnitLabel: 'plays por dossiê' }),
          scoped('Plays fechadas', 1, { subsetOf: 'Plays' }),
        ]}
      />,
    );

    // Nenhuma contração de conversão (1/1 = 100%, estável) → nenhuma marca.
    expect(screen.queryByText('maior queda')).toBeNull();
  });
});

describe('I3 — o funil não narra gargalo para quem não fez nada', () => {
  it('zero atividade no período → estado vazio, mesmo com cadastro cheio', () => {
    // O fantasma: 41 contas, 164 contatos, 15 dossiês (tudo ESTÁTICO, nunca
    // zero) e absolutamente nada no período. Pré-fix, `hasData` via
    // `some(v > 0)` enxergava as 41 contas e renderizava o funil, que então
    // diagnosticava "Dossiês → Plays, maior queda".
    render(
      <AdoptionFunnel
        stages={[
          stat('Contas', 41),
          stat('Contatos', 164, 'contatos por conta'),
          stat('Dossiês', 15, 'dossiês por contato'),
          scoped('Plays', 0, { perUnitLabel: 'plays por dossiê' }),
          scoped('Touchpoints', 0, { perUnitLabel: 'touchpoints por play' }),
          scoped('Interações', 0, { perUnitLabel: 'interações por touchpoint' }),
          scoped('Plays fechadas', 0, { subsetOf: 'Plays' }),
        ]}
      />,
    );

    expect(screen.getByText(/Sem atividade no período/)).toBeTruthy();
    // e NADA de gargalo inventado
    expect(screen.queryByText('maior queda')).toBeNull();
    expect(screen.queryByText('Contas')).toBeNull();
  });

  it('uma única play no período já basta para o funil existir', () => {
    render(
      <AdoptionFunnel
        stages={[
          stat('Contas', 41),
          scoped('Plays', 1, { perUnitLabel: 'plays por dossiê' }),
        ]}
      />,
    );
    expect(screen.queryByText(/Sem atividade no período/)).toBeNull();
    expect(screen.getByText('Plays')).toBeTruthy();
  });
});

describe('AdoptionFunnel — invariantes de renderização', () => {
  it('denominador zero não produz NaN, Infinity nem 0%', () => {
    render(
      <AdoptionFunnel
        stages={[
          scoped('Plays', 0),
          scoped('Touchpoints', 3, { perUnitLabel: 'touchpoints por play' }),
        ]}
      />,
    );
    // 0 → 3 é indefinido: a linha simplesmente não existe.
    expect(findRelationRow('Touchpoints')).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|∞/);
  });

  it('conversão exatamente 1 não é nem queda nem expansão', () => {
    render(
      <AdoptionFunnel
        stages={[
          scoped('Plays', 10),
          scoped('Plays fechadas', 10, { subsetOf: 'Plays' }),
        ]}
      />,
    );
    const row = relationRow('Plays fechadas');
    expect(row.textContent).not.toContain('↓');
    expect(row.textContent).not.toContain('↑');
    expect(row.textContent).toMatch(/100%/);
    expect(row.textContent).toMatch(/estável/);
  });

  it('a pior CONTRAÇÃO entre conversões é a marcada', () => {
    render(
      <AdoptionFunnel
        stages={[
          scoped('Plays', 100),
          scoped('Plays fechadas', 22, { subsetOf: 'Plays' }),
        ]}
      />,
    );
    expect(screen.getAllByText('maior queda')).toHaveLength(1);
    expect(relationRow('Plays fechadas').textContent).toContain('maior queda');
  });
});
