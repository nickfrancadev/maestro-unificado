/**
 * C1 — um chip de sinal tem que MEDIR O QUE O RÓTULO DIZ.
 *
 * `idleDays` (a dimensão de recência) é o mais RECENTE entre `lastAccessAt` e
 * `lastActivityAt` — correto como recência, e intocado aqui. O defeito era o
 * RÓTULO: esse número saía na tela como "Sem acesso há {idleDays}d", enquanto o
 * painel "Conta", ao lado, mostrava o acesso de verdade (`lastAccessAt`). O
 * mesmo cliente exibia dois "últimos acessos" diferentes na mesma tela —
 * valeverde: chip "Sem acesso há 46d" vs. painel "Último acesso: 58d atrás".
 *
 * Estes testes são sobre a CONTRADIÇÃO, não sobre a string: eles comparam o
 * número do chip com a grandeza que ele afirma medir. Por isso caem no código
 * pré-fix — lá o chip dizia "acesso" e carregava o número da atividade.
 */
import { describe, it, expect } from 'vitest';
import { COMPANIES, DEFAULT_PERIOD, getCompany } from '../data/mockData';
import { computeHealth } from './health';
import { lastAccessAt, lastActivityAt } from './selectors';
import { daysAgo } from './format';

/** O número embutido num rótulo "… há 46d". */
function daysIn(label: string): number | null {
  const m = /(\d+)d/.exec(label);
  return m ? Number(m[1]) : null;
}

describe('C1 — o chip de inatividade não contradiz o painel "Conta"', () => {
  it('nenhum chip afirma "acesso" carregando o número da atividade', () => {
    // As 4 companies onde acesso e atividade DIVERGEM são as que expunham o bug.
    const divergent = COMPANIES.filter((c) => {
      const a = daysAgo(lastAccessAt(c));
      const b = daysAgo(lastActivityAt(c));
      return a !== null && b !== null && a !== b;
    });
    expect(divergent.length).toBeGreaterThan(0);

    for (const c of divergent) {
      const accessDays = daysAgo(lastAccessAt(c));
      for (const s of computeHealth(c, DEFAULT_PERIOD).signals) {
        if (!/acesso/i.test(s.label)) continue;
        const n = daysIn(s.label);
        if (n === null) continue;
        // Se um chip fala de "acesso", o número tem que ser o do ACESSO —
        // e nestas companies ele não é. Pré-fix: "Sem acesso há 46d" com
        // lastAccessAt = 58d atrás.
        expect(
          n,
          `${c.id}: chip "${s.label}" diz acesso mas lastAccessAt é ${accessDays}d`,
        ).toBe(accessDays);
      }
    }
  });

  it('o chip do fantasma mede a INATIVIDADE (lastActivityAt), e se diz assim', () => {
    const v = getCompany('valeverde')!;
    const activityDays = daysAgo(lastActivityAt(v)); // 46
    const accessDays = daysAgo(lastAccessAt(v)); // 58
    expect(activityDays).not.toBe(accessDays); // o mock preserva a divergência

    const chip = computeHealth(v, DEFAULT_PERIOD).signals.find((s) =>
      /^Sem atividade há/.test(s.label),
    );
    expect(chip, 'o chip deve nomear inatividade, não acesso').toBeDefined();
    expect(daysIn(chip!.label)).toBe(activityDays);
    expect(chip!.severity).toBe('high');
  });

  it('todo chip com "Nd" bate com a grandeza que o seu rótulo nomeia', () => {
    for (const c of COMPANIES) {
      const activityDays = daysAgo(lastActivityAt(c));
      for (const s of computeHealth(c, DEFAULT_PERIOD).signals) {
        if (!/^Sem atividade há/.test(s.label)) continue;
        expect(daysIn(s.label), `${c.id}: "${s.label}"`).toBe(activityDays);
      }
    }
  });
});
