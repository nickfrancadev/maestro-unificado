import { describe, expect, it } from 'vitest';
import { COMPANIES, DEFAULT_PERIOD, TODAY, getCompany } from '../data/mockData';
import type { Company, Period, Play, Touchpoint, User } from '../data/types';
import {
  activityByWeek,
  activityHeatmap,
  activityVolume,
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
  const contains = (p: Period, t: Date) =>
    t.getTime() >= p.start.getTime() && t.getTime() <= p.end.getTime();

  it('nenhum evento pode cair nas duas janelas ao mesmo tempo', () => {
    // A propriedade que importa: `trend` compara volumes de janelas DISJUNTAS.
    // Se um único evento fosse contado dos dois lados, a razão mentiria.
    const prev = previousPeriod(PERIOD);
    for (let ms = prev.start.getTime() - DAY; ms <= PERIOD.end.getTime() + DAY; ms += 3600_000) {
      const t = new Date(ms);
      expect(contains(prev, t) && contains(PERIOD, t)).toBe(false);
    }
  });

  it('as duas janelas têm a mesma duração — senão a comparação de volume é injusta', () => {
    const prev = previousPeriod(PERIOD);
    const spanOf = (p: Period) => p.end.getTime() - p.start.getTime();
    expect(spanOf(prev)).toBe(spanOf(PERIOD));
    expect(prev.end.getTime()).toBeLessThan(PERIOD.start.getTime());
  });

  it('janelas encadeadas cobrem o passado sem buraco: fim de p2 encosta no início de p1', () => {
    const p1 = previousPeriod(PERIOD);
    const p2 = previousPeriod(p1);
    const gap = p1.start.getTime() - p2.end.getTime();
    expect(gap).toBeLessThanOrEqual(1);
    expect(gap).toBeGreaterThan(0);
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

  describe('playsCloseRate usa uma coorte só (as plays CRIADAS no período)', () => {
    it('cliente que parou de criar plays e deixou uma antiga fechar NÃO tem taxa perfeita', () => {
      // Este é o cliente que o dashboard existe para pegar: zero plays novas,
      // uma play velha fechando por inércia. Com numerador e denominador de
      // coortes diferentes, isso rendia `playsCloseRate === 1` — nota máxima
      // por não fazer absolutamente nada.
      const c = company({
        plays: [play({ id: 'velha', createdAt: d(120), endDate: d(3) })],
      });
      const m = computeMetrics(c, PERIOD);
      expect(m.playsCreated).toBe(0);
      expect(m.playsClosed).toBe(1); // segue sendo verdade, e útil no display
      expect(m.playsCloseRate).toBe(0); // mas NÃO vira crédito
    });

    it('play criada antes do período e fechada dentro dele não entra no numerador', () => {
      const c = company({
        plays: [
          play({ id: 'velha', createdAt: d(120), endDate: d(3) }),
          play({ id: 'nova1', createdAt: d(10), endDate: null }),
          play({ id: 'nova2', createdAt: d(10), endDate: null }),
        ],
      });
      const m = computeMetrics(c, PERIOD);
      expect(m.playsCreated).toBe(2);
      expect(m.playsClosed).toBe(1); // a velha
      expect(m.playsCreatedThatClosed).toBe(0); // nenhuma das duas novas fechou
      expect(m.playsCloseRate).toBe(0);
    });

    it('a taxa nunca precisa de clamp: não existe entrada que a faça passar de 1', () => {
      // 3 plays velhas fechando no período + 1 nova criada e fechada.
      // A fórmula antiga fazia 4/1 → 4, clampado a 1. A coorte única dá 1/1.
      const c = company({
        plays: [
          play({ id: 'v1', createdAt: d(100), endDate: d(2) }),
          play({ id: 'v2', createdAt: d(100), endDate: d(2) }),
          play({ id: 'v3', createdAt: d(100), endDate: d(2) }),
          play({ id: 'nova', createdAt: d(10), endDate: d(1) }),
        ],
      });
      const m = computeMetrics(c, PERIOD);
      expect(m.playsClosed).toBe(4);
      expect(m.playsCreated).toBe(1);
      expect(m.playsCreatedThatClosed).toBe(1);
      expect(m.playsCloseRate).toBe(1);
    });

    it('em todas as companies do mock a taxa é exatamente a razão da coorte', () => {
      for (const c of COMPANIES) {
        const m = computeMetrics(c, DEFAULT_PERIOD);
        expect(m.playsCreatedThatClosed).toBeLessThanOrEqual(m.playsCreated);
        expect(m.playsCloseRate).toBeCloseTo(
          m.playsCreated === 0 ? 0 : m.playsCreatedThatClosed / m.playsCreated,
          6,
        );
        expect(m.playsCloseRate).toBeLessThanOrEqual(1);
      }
    });
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

  it('atividade = plays criadas (ownerEmail) + touchpoints responsáveis (crédito fracionário)', () => {
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
    expect(a.touchpoints).toBeCloseTo(0.5); // t2 dividido com b
    expect(b.plays).toBe(0);
    expect(b.touchpoints).toBeCloseTo(1.5); // t1 inteiro + metade de t2
    // 2 touchpoints existem; o crédito distribuído soma exatamente 2, não 3.
    expect(a.touchpoints + b.touchpoints).toBeCloseTo(2);
    expect(a.share + b.share).toBeCloseTo(1);
  });

  it('INVARIANTE: a soma da atividade por usuário é exatamente o activityVolume', () => {
    // Contar 1 inteiro por responsável inflava o total: um touchpoint com 2
    // donos virava 2 unidades de atividade. Os shares continuavam somando 1
    // (o denominador estava inflado igual), então o teste de shares era cego.
    // Este aqui não é: ele confere contra o volume REAL.
    for (const c of COMPANIES) {
      const rows = userStats(c, DEFAULT_PERIOD);
      const total = rows.reduce((s, r) => s + r.plays + r.touchpoints, 0);
      expect(total).toBeCloseTo(activityVolume(c, DEFAULT_PERIOD), 6);
    }
  });

  it('INVARIANTE: vale também num caso sintético com multi-responsáveis', () => {
    const c = company({
      users: [user('a@x.com.br'), user('b@x.com.br'), user('c@x.com.br')],
      plays: [
        play({
          id: 'p1',
          createdAt: d(5),
          ownerEmail: 'a@x.com.br',
          touchpoints: [
            tp({ id: 't1', createdAt: d(4), responsibles: ['a@x.com.br', 'b@x.com.br', 'c@x.com.br'] }),
            tp({ id: 't2', createdAt: d(4), responsibles: ['a@x.com.br', 'b@x.com.br'] }),
            tp({ id: 't3', createdAt: d(4), responsibles: ['c@x.com.br'] }),
          ],
        }),
      ],
    });
    const total = userStats(c, PERIOD).reduce((s, r) => s + r.plays + r.touchpoints, 0);
    expect(total).toBeCloseTo(activityVolume(c, PERIOD), 6); // 1 play + 3 tps = 4
    expect(total).toBeCloseTo(4);
  });

  it('acrescentar um nome ao `responsibles` não cria atividade do nada', () => {
    // O exploit da contagem inteira: pôr um colega junto no touchpoint fazia o
    // total da company subir (o mesmo trabalho passava a valer 2 unidades) e,
    // como o `share` do ajudante subia, a concentração melhorava de graça.
    const users = [user('a@x.com.br'), user('b@x.com.br')];
    const mk = (responsibles: string[][]) =>
      company({
        users,
        plays: [
          play({
            id: 'p1',
            createdAt: d(5),
            ownerEmail: 'a@x.com.br',
            touchpoints: responsibles.map((r, i) =>
              tp({ id: `t${i}`, createdAt: d(4), responsibles: r }),
            ),
          }),
        ],
      });

    const A = ['a@x.com.br'];
    const AB = ['a@x.com.br', 'b@x.com.br'];
    const solo = mk([A, A, A, A]);
    const withHelper = mk([AB, AB, AB, AB]); // MESMO trabalho, mais um nome

    const totalOf = (c: Company) =>
      userStats(c, PERIOD).reduce((s, r) => s + r.plays + r.touchpoints, 0);

    // Antes: 5 → 9. Agora o volume não se mexe: os mesmos 1 play + 4 tps.
    expect(totalOf(solo)).toBeCloseTo(5);
    expect(totalOf(withHelper)).toBeCloseTo(5);
    expect(totalOf(withHelper)).toBeCloseTo(activityVolume(withHelper, PERIOD));
  });

  it('quem divide touchpoints tem share menor do que quem os assina sozinho', () => {
    // `a` faz 2 touchpoints sozinha e divide outros 2 com `b`. O crédito de `a`
    // é 2 + 0.5 + 0.5 = 3 (não 4), e o de `b` é 1 (não 2) — os shares e, por
    // consequência, a concentração, mudam. Com contagem inteira, `b` levava
    // crédito cheio por trabalho que só co-assinou.
    const c = company({
      users: [user('a@x.com.br'), user('b@x.com.br')],
      plays: [
        play({
          id: 'p1',
          createdAt: d(5),
          ownerEmail: 'a@x.com.br',
          endDate: null,
          touchpoints: [
            tp({ id: 't1', createdAt: d(4), responsibles: ['a@x.com.br'] }),
            tp({ id: 't2', createdAt: d(4), responsibles: ['a@x.com.br'] }),
            tp({ id: 't3', createdAt: d(4), responsibles: ['a@x.com.br', 'b@x.com.br'] }),
            tp({ id: 't4', createdAt: d(4), responsibles: ['a@x.com.br', 'b@x.com.br'] }),
          ],
        }),
      ],
    });
    const stats = userStats(c, PERIOD);
    const a = stats.find((s) => s.user.email === 'a@x.com.br')!;
    const b = stats.find((s) => s.user.email === 'b@x.com.br')!;
    expect(a.touchpoints).toBeCloseTo(3);
    expect(b.touchpoints).toBeCloseTo(1);
    // total = 1 play + 4 tps = 5; a leva 4/5, b leva 1/5.
    // A contagem inteira daria a=5, b=2, total 7 → 0.714 / 0.286.
    expect(a.share).toBeCloseTo(0.8);
    expect(b.share).toBeCloseTo(0.2);
  });
});
