import { describe, expect, it } from 'vitest';
import { COMPANIES, DEFAULT_PERIOD, TODAY, getCompany } from '../data/mockData';
import type { Company, Period, Play, Touchpoint, User } from '../data/types';
import {
  activityByWeek,
  activityHeatmap,
  adoptionFunnel,
  computeMetrics,
  lastAccessAt,
  lastActivityAt,
  playTypeMix,
  previousPeriod,
  userStats,
} from './selectors';

const DAY = 86_400_000;

function d(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY);
}

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
    id: 'tp',
    type: 'Descoberta',
    channel: 'Email',
    responsibles: ['a@x.com.br'],
    createdAt: d(5),
    dueDate: d(1),
    endDate: d(2),
    contactsInvolved: 4,
    interactions: 2,
    ...over,
  };
}

function play(over: Partial<Play> = {}): Play {
  return {
    id: 'p',
    name: 'Play',
    type: 'SalesPlay',
    ownerEmail: 'a@x.com.br',
    createdAt: d(10),
    startDate: d(9),
    expectedEndDate: d(-5),
    endDate: null,
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
    onboardedAt: d(200),
    mrr: 10_000,
    users: [user('a@x.com.br')],
    plays: [],
    accountsCount: 10,
    contactsCount: 30,
    dossiersCount: 8,
    ...over,
  };
}

const PERIOD: Period = { start: d(29), end: TODAY };

describe('previousPeriod', () => {
  it('devolve uma janela de mesmo tamanho, imediatamente anterior, sem sobrepor', () => {
    const prev = previousPeriod(PERIOD);
    expect(prev.end.getTime()).toBe(PERIOD.start.getTime() - 1);
    expect(prev.end.getTime() - prev.start.getTime()).toBe(
      PERIOD.end.getTime() - PERIOD.start.getTime(),
    );
    expect(prev.end.getTime()).toBeLessThan(PERIOD.start.getTime());
  });

  it('não deixa buraco nem sobreposição em janelas encadeadas', () => {
    const p1 = previousPeriod(PERIOD);
    const p2 = previousPeriod(p1);
    expect(p2.end.getTime()).toBe(p1.start.getTime() - 1);
  });
});

describe('computeMetrics', () => {
  it('ignora plays criadas fora do período', () => {
    const c = company({
      plays: [
        play({ id: 'in', createdAt: d(5) }),
        play({ id: 'out', createdAt: d(100) }),
      ],
    });
    expect(computeMetrics(c, PERIOD).playsCreated).toBe(1);
  });

  it('ignora touchpoints criados fora do período', () => {
    const c = company({
      plays: [
        play({
          createdAt: d(5),
          touchpoints: [
            tp({ id: 't1', createdAt: d(4) }),
            tp({ id: 't2', createdAt: d(90) }),
          ],
        }),
      ],
    });
    expect(computeMetrics(c, PERIOD).touchpointsCreated).toBe(1);
  });

  it('conta plays fechadas no período e calcula a taxa de fechamento', () => {
    const c = company({
      plays: [
        play({ id: 'p1', createdAt: d(20), endDate: d(3) }),
        play({ id: 'p2', createdAt: d(20), endDate: null }),
        play({ id: 'p3', createdAt: d(20), endDate: null }),
        play({ id: 'p4', createdAt: d(20), endDate: null }),
      ],
    });
    const m = computeMetrics(c, PERIOD);
    expect(m.playsCreated).toBe(4);
    expect(m.playsClosed).toBe(1);
    expect(m.playsOpen).toBe(3);
    expect(m.playsCloseRate).toBeCloseTo(0.25);
  });

  it('marca como atrasado o touchpoint vencido e não finalizado', () => {
    const c = company({
      plays: [
        play({
          createdAt: d(10),
          touchpoints: [
            tp({ id: 'late', dueDate: d(2), endDate: null }),
            tp({ id: 'onTime', dueDate: d(-2), endDate: null }),
            tp({ id: 'closed', dueDate: d(2), endDate: d(1) }),
          ],
        }),
      ],
    });
    const m = computeMetrics(c, PERIOD);
    expect(m.touchpointsCreated).toBe(3);
    expect(m.touchpointsLate).toBe(1);
    expect(m.touchpointsLateRate).toBeCloseTo(1 / 3);
    expect(m.touchpointsClosed).toBe(1);
  });

  it('interactionRate = interações / contatos envolvidos', () => {
    const c = company({
      plays: [
        play({
          createdAt: d(10),
          touchpoints: [
            tp({ id: 't1', contactsInvolved: 4, interactions: 1 }),
            tp({ id: 't2', contactsInvolved: 6, interactions: 3 }),
          ],
        }),
      ],
    });
    expect(computeMetrics(c, PERIOD).interactionRate).toBeCloseTo(4 / 10);
  });

  it('avgDaysToClose é null quando nenhuma play fechou', () => {
    const c = company({ plays: [play({ createdAt: d(10), endDate: null })] });
    expect(computeMetrics(c, PERIOD).avgDaysToClose).toBeNull();
  });

  it('avgDaysToClose usa createdAt → endDate das plays fechadas', () => {
    const c = company({
      plays: [play({ createdAt: d(20), endDate: d(10) })],
    });
    expect(computeMetrics(c, PERIOD).avgDaysToClose).toBeCloseTo(10, 5);
  });

  it('activeUsers só conta quem tem atividade no período', () => {
    const c = company({
      users: [user('a@x.com.br'), user('b@x.com.br'), user('c@x.com.br')],
      plays: [
        play({ createdAt: d(5), ownerEmail: 'a@x.com.br', touchpoints: [] }),
        play({
          createdAt: d(5),
          ownerEmail: 'b@x.com.br',
          touchpoints: [tp({ createdAt: d(4), responsibles: ['b@x.com.br'] })],
        }),
      ],
    });
    expect(computeMetrics(c, PERIOD).activeUsers).toBe(2);
  });
});

describe('lastAccessAt / lastActivityAt', () => {
  it('lastAccessAt é o máximo entre os usuários (null se ninguém acessou)', () => {
    const c = company({
      users: [
        user('a@x.com.br', { lastAccessAt: d(10) }),
        user('b@x.com.br', { lastAccessAt: d(2) }),
        user('c@x.com.br', { lastAccessAt: null }),
      ],
    });
    expect(lastAccessAt(c)).toEqual(d(2));
    expect(lastAccessAt(company({ users: [user('a@x.com.br')] }))).toBeNull();
  });

  it('lastActivityAt é o evento mais recente entre plays e touchpoints', () => {
    const c = company({
      plays: [
        play({ createdAt: d(30), endDate: d(9), touchpoints: [tp({ createdAt: d(20), endDate: d(4) })] }),
      ],
    });
    expect(lastActivityAt(c)).toEqual(d(4));
  });
});

describe('activityByWeek / activityHeatmap', () => {
  it('devolve `weeks` buckets com o mais recente por último', () => {
    const c = company({
      plays: [
        play({ id: 'p1', createdAt: d(1), touchpoints: [] }),
        play({ id: 'p2', createdAt: d(1), touchpoints: [] }),
        play({ id: 'p3', createdAt: d(20), touchpoints: [] }),
      ],
    });
    const weeks = activityByWeek(c, 8);
    expect(weeks).toHaveLength(8);
    expect(weeks[7]).toBe(2); // semana corrente
    expect(weeks.reduce((s, n) => s + n, 0)).toBe(3);
  });

  it('heatmap devolve weeks × 7 células', () => {
    const cells = activityHeatmap(company(), 12);
    expect(cells).toHaveLength(84);
    expect(cells.every((c) => c.count === 0)).toBe(true);
  });
});

describe('playTypeMix / adoptionFunnel', () => {
  it('conta plays por tipo dentro do período', () => {
    const c = company({
      plays: [
        play({ id: 'p1', type: 'PrePlay', createdAt: d(5) }),
        play({ id: 'p2', type: 'PrePlay', createdAt: d(5) }),
        play({ id: 'p3', type: 'CsPlay', createdAt: d(5) }),
        play({ id: 'p4', type: 'CsPlay', createdAt: d(200) }), // fora do período
      ],
    });
    const mix = playTypeMix(c, PERIOD);
    expect(mix.find((m) => m.type === 'PrePlay')!.count).toBe(2);
    expect(mix.find((m) => m.type === 'CsPlay')!.count).toBe(1);
    expect(mix.find((m) => m.type === 'SalesPlay')!.count).toBe(0);
  });

  it('funil tem os 7 estágios na ordem certa', () => {
    const stages = adoptionFunnel(company(), PERIOD).map((s) => s.stage);
    expect(stages).toEqual([
      'Contas',
      'Contatos',
      'Dossiês',
      'Plays',
      'Touchpoints',
      'Interações',
      'Plays fechadas',
    ]);
  });
});

describe('userStats', () => {
  it('shares somam ~1 quando há atividade', () => {
    for (const c of COMPANIES) {
      const stats = userStats(c, DEFAULT_PERIOD);
      const total = stats.reduce((s, r) => s + r.share, 0);
      const hasActivity = stats.some((r) => r.plays + r.touchpoints > 0);
      if (hasActivity) expect(total).toBeCloseTo(1, 6);
      else expect(total).toBe(0);
    }
  });

  it('o "refém" tem top-share > 0.9', () => {
    for (const id of ['pantanal', 'cerrado']) {
      const c = getCompany(id)!;
      const top = Math.max(...userStats(c, DEFAULT_PERIOD).map((s) => s.share));
      expect(top).toBeGreaterThan(0.9);
    }
  });

  it('atividade = plays criadas (ownerEmail) + touchpoints responsáveis', () => {
    const c = company({
      users: [user('a@x.com.br'), user('b@x.com.br')],
      plays: [
        play({
          id: 'p1',
          createdAt: d(5),
          ownerEmail: 'a@x.com.br',
          touchpoints: [
            tp({ id: 't1', createdAt: d(4), responsibles: ['b@x.com.br'] }),
            tp({ id: 't2', createdAt: d(4), responsibles: ['a@x.com.br', 'b@x.com.br'] }),
          ],
        }),
      ],
    });
    const stats = userStats(c, PERIOD);
    const a = stats.find((s) => s.user.email === 'a@x.com.br')!;
    const b = stats.find((s) => s.user.email === 'b@x.com.br')!;
    expect(a.plays).toBe(1);
    expect(a.touchpoints).toBe(1);
    expect(b.plays).toBe(0);
    expect(b.touchpoints).toBe(2);
    expect(a.share + b.share).toBeCloseTo(1);
  });
});
