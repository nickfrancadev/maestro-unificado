/**
 * Camada de CS (feedback Spina/Bernardo) — a lógica pura que enriquece cards e
 * detalhe: renovação/prioridade, estágio da jornada, tempo no estado, transição
 * de bucket, playbook, sinais antecedentes e e-mails de touchpoints atrasados.
 */
import { describe, expect, it } from 'vitest';
import { COMPANIES, DEFAULT_PERIOD, TODAY } from '../data/mockData';
import type { Company, Health, Period, Play, Touchpoint, User } from '../data/types';
import { computeHealth } from './health';
import { previousPeriod } from './selectors';
import {
  CHAMPION_STALE_DAYS,
  PLAYBOOK,
  antecedentSignals,
  bucketTenure,
  bucketTransition,
  championStatus,
  daysToRenewal,
  formatTenure,
  journeyStage,
  lateTpEmailStats,
  renewalPriority,
} from './cs';

const DAY = 86_400_000;

function d(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY);
}

const PERIOD: Period = { start: d(29), end: TODAY };

function user(email: string, over: Partial<User> = {}): User {
  return {
    id: email,
    name: email,
    email,
    profile: 'EDITOR',
    lastAccessAt: null,
    lastActivityAt: null,
    ...over,
  };
}

function tp(over: Partial<Touchpoint> = {}): Touchpoint {
  return {
    id: `tp-${Math.round(over.createdAt?.getTime() ?? 0)}`,
    type: 'Descoberta',
    channel: 'Email',
    responsibles: ['a@x.com.br'],
    createdAt: d(5),
    dueDate: d(-5),
    endDate: d(3),
    contactsInvolved: 4,
    interactions: 4,
    ...over,
  };
}

function play(over: Partial<Play> = {}): Play {
  return {
    id: over.id ?? 'p',
    name: 'Play',
    type: 'SalesPlay',
    ownerEmail: 'a@x.com.br',
    createdAt: d(10),
    startDate: d(9),
    expectedEndDate: d(-5),
    endDate: d(2),
    archived: false,
    touchpoints: [],
    contactsInvolved: 5,
    ...over,
  };
}

function company(over: Partial<Company> = {}): Company {
  return {
    id: 'c',
    name: 'C',
    plan: 'Growth',
    seats: 5,
    onboardedAt: d(300),
    mrr: 10_000,
    users: [user('a@x.com.br', { lastAccessAt: d(0), lastActivityAt: d(0) })],
    plays: [],
    accountsCount: 10,
    contactsCount: 30,
    dossiersCount: 8,
    ...over,
  };
}

function health(bucket: Health['bucket']): Health {
  return {
    score: 50,
    bucket,
    breakdown: { recency: 0, trend: 0, depth: 0, concentration: 0 },
    signals: [],
  };
}

describe('daysToRenewal / renewalPriority', () => {
  it('conta dias até a renovação e null sem renewalAt', () => {
    expect(daysToRenewal(company({ renewalAt: new Date(TODAY.getTime() + 30 * DAY) }))).toBe(30);
    expect(daysToRenewal(company())).toBeNull();
  });

  it('renovação iminente fura a fila na frente de MRR igual renovando longe', () => {
    const soon = company({ mrr: 30_000, renewalAt: new Date(TODAY.getTime() + 30 * DAY) });
    const far = company({ mrr: 30_000, renewalAt: new Date(TODAY.getTime() + 300 * DAY) });
    expect(renewalPriority(soon)).toBeGreaterThan(renewalPriority(far));
  });

  it('sem renewalAt, a prioridade degrada para o próprio MRR', () => {
    expect(renewalPriority(company({ mrr: 12_345 }))).toBe(12_345);
  });
});

describe('journeyStage', () => {
  it('≤90d de casa é Onboarding, mesmo com renovação distante', () => {
    const c = company({
      onboardedAt: d(30),
      renewalAt: new Date(TODAY.getTime() + 335 * DAY),
    });
    expect(journeyStage(c).id).toBe('onboarding');
  });

  it('renovação a ≤90d é Renovação; o resto é Adoção', () => {
    expect(
      journeyStage(company({ renewalAt: new Date(TODAY.getTime() + 45 * DAY) })).id,
    ).toBe('renewal');
    expect(
      journeyStage(company({ renewalAt: new Date(TODAY.getTime() + 200 * DAY) })).id,
    ).toBe('adoption');
  });
});

describe('bucketTenure', () => {
  it('devolve tenure para todas as companies do mock sem quebrar', () => {
    for (const c of COMPANIES) {
      const t = bucketTenure(c, DEFAULT_PERIOD);
      if (t === null) continue; // histórico curto demais: sem pontos, sem invenção
      expect(t.days).toBeGreaterThanOrEqual(0);
      expect(t.days % 7).toBe(0); // granularidade semanal — o número é um piso
    }
  });

  it('o tenure é coerente com a série: bucket estável desde o início → sinceDataStart', () => {
    // Company sem NENHUMA atividade: todo ponto disponível é o mesmo bucket.
    const ghost = company({ users: [user('a@x.com.br')], plays: [] });
    const t = bucketTenure(ghost, PERIOD);
    if (t !== null) expect(t.sinceDataStart).toBe(true);
  });

  it('formatTenure: piso semanal legível', () => {
    expect(formatTenure(null)).toBeNull();
    expect(formatTenure({ days: 0, sinceDataStart: false })).toBe('há <7d');
    expect(formatTenure({ days: 21, sinceDataStart: false })).toBe('há 21d');
    expect(formatTenure({ days: 21, sinceDataStart: true })).toBe('há 21d+');
  });
});

describe('bucketTransition', () => {
  it('sem mudança de bucket → null (o gatilho é a TRANSIÇÃO, não o estado)', () => {
    expect(bucketTransition(health('watch'), health('watch'))).toBeNull();
  });

  it('saudável → atenção é piora; atenção → saudável é melhora', () => {
    expect(bucketTransition(health('watch'), health('healthy'))).toEqual({
      from: 'healthy',
      to: 'watch',
      dir: 'worsened',
    });
    expect(bucketTransition(health('healthy'), health('watch'))?.dir).toBe('improved');
  });
});

describe('PLAYBOOK', () => {
  it('mapeia o feedback literalmente: atenção=email, em risco=tarefa, crítico=alerta+call', () => {
    expect(PLAYBOOK.watch.label).toMatch(/e-mail/i);
    expect(PLAYBOOK.at_risk.label).toMatch(/tarefa/i);
    expect(PLAYBOOK.critical.label).toMatch(/call/i);
    // saudável não tem ação a disparar — botão nenhum
    expect(PLAYBOOK.healthy.cta).toBeNull();
  });
});

describe('championStatus / antecedentSignals', () => {
  /** Champion no período ANTERIOR (share alto) que parou de mexer. */
  function withGoneChampion(): Company {
    const champ = user('champ@x.com.br', {
      lastAccessAt: d(20),
      lastActivityAt: d(CHAMPION_STALE_DAYS + 6),
    });
    const other = user('other@x.com.br', { lastAccessAt: d(1), lastActivityAt: d(1) });
    return company({
      users: [champ, other],
      plays: [
        // toda a atividade do período anterior é do champion
        play({ id: 'p1', ownerEmail: champ.email, createdAt: d(45), endDate: null }),
        play({ id: 'p2', ownerEmail: champ.email, createdAt: d(40), endDate: null }),
        // período atual: só o outro usuário
        play({ id: 'p3', ownerEmail: other.email, createdAt: d(3), endDate: null }),
      ],
    });
  }

  it('detecta o champion do período anterior que sumiu', () => {
    const status = championStatus(withGoneChampion(), PERIOD);
    expect(status?.name).toBe('champ@x.com.br');
    expect(status!.inactiveDays).toBeGreaterThan(CHAMPION_STALE_DAYS);
  });

  it('champion ainda ativo → null', () => {
    const c = withGoneChampion();
    c.users[0].lastActivityAt = d(2);
    expect(championStatus(c, PERIOD)).toBeNull();
  });

  it('tickets e NPS viram chips só quando são sinal (≥3 tickets, NPS detrator)', () => {
    const quiet = antecedentSignals(company({ openTickets: 1, nps: 9 }), PERIOD);
    expect(quiet).toEqual([]);

    const noisy = antecedentSignals(company({ openTickets: 5, nps: 4 }), PERIOD);
    expect(noisy.map((s) => s.id)).toEqual(['open-tickets', 'nps-detractor']);
    expect(noisy[0].severity).toBe('high'); // 5 tickets
  });

  it('campos ausentes (mock antigo/carteira construída) não fabricam sinal', () => {
    expect(antecedentSignals(company(), PERIOD)).toEqual([]);
  });
});

describe('lateTpEmailStats', () => {
  const emails = [
    { id: 'e1', sentAt: d(2), recipients: 4, opens: 3, clicks: 1 },
    { id: 'e2', sentAt: d(9), recipients: 4, opens: 1, clicks: 0 },
    { id: 'e3', sentAt: d(40), recipients: 4, opens: 4, clicks: 4 }, // fora do período
  ];

  it('agrega SÓ os envios do período, com taxas pooled', () => {
    const s = lateTpEmailStats(company({ lateTouchpointEmails: emails }), PERIOD);
    expect(s.sent).toBe(2);
    expect(s.recipients).toBe(8);
    expect(s.opens).toBe(4);
    expect(s.openRate).toBeCloseTo(0.5);
    expect(s.clickRate).toBeCloseTo(1 / 8);
    expect(s.lastSentAt?.getTime()).toBe(d(2).getTime());
  });

  it('o envio fora do período entra no período ANTERIOR (base do Δ)', () => {
    const s = lateTpEmailStats(
      company({ lateTouchpointEmails: emails }),
      previousPeriod(PERIOD),
    );
    expect(s.sent).toBe(1);
    expect(s.openRate).toBeCloseTo(1);
  });

  it('sem envios (ou sem o campo) → zeros e lastSentAt null, nunca NaN', () => {
    const s = lateTpEmailStats(company(), PERIOD);
    expect(s).toEqual({
      sent: 0,
      recipients: 0,
      opens: 0,
      clicks: 0,
      openRate: 0,
      clickRate: 0,
      lastSentAt: null,
    });
  });

  it('no mock: quem tem touchpoint atrasado tem e-mail; quem não tem, não tem', () => {
    for (const c of COMPANIES) {
      const late = c.plays
        .flatMap((p) => p.touchpoints)
        .filter((t) => t.endDate === null && t.dueDate.getTime() < TODAY.getTime()).length;
      const emailCount = (c.lateTouchpointEmails ?? []).length;
      if (late === 0) expect(emailCount).toBe(0);
      else expect(emailCount).toBeGreaterThan(0);
    }
  });
});

describe('coerência com o health real do mock', () => {
  it('bucketTransition compara os buckets que a UI de fato computa', () => {
    for (const c of COMPANIES.slice(0, 6)) {
      const h = computeHealth(c, DEFAULT_PERIOD);
      const prev = computeHealth(c, previousPeriod(DEFAULT_PERIOD));
      const t = bucketTransition(h, prev);
      if (t) {
        expect(t.to).toBe(h.bucket);
        expect(t.from).toBe(prev.bucket);
      }
    }
  });
});
