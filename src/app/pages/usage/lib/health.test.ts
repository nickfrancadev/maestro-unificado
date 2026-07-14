import { describe, expect, it } from 'vitest';
import { COMPANIES, DEFAULT_PERIOD, TODAY, getCompany } from '../data/mockData';
import type { Company, Period, Play, Touchpoint, User } from '../data/types';
import { BUCKET_META, BUCKET_THRESHOLDS, WEIGHTS, bucketOf, computeHealth } from './health';
import { computeMetrics, userStats } from './selectors';

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
    dueDate: d(-5), // ainda no prazo
    endDate: d(3),
    contactsInvolved: 4,
    interactions: 4,
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
    users: [user('a@x.com.br', { lastAccessAt: d(0) })],
    plays: [],
    accountsCount: 10,
    contactsCount: 30,
    dossiersCount: 8,
    ...over,
  };
}

describe('bucketOf', () => {
  it('respeita os limites exatos', () => {
    expect(bucketOf(0)).toBe('critical');
    expect(bucketOf(29)).toBe('critical');
    expect(bucketOf(30)).toBe('at_risk');
    expect(bucketOf(54)).toBe('at_risk');
    expect(bucketOf(55)).toBe('watch');
    expect(bucketOf(74)).toBe('watch');
    expect(bucketOf(75)).toBe('healthy');
    expect(bucketOf(100)).toBe('healthy');
  });

  it('os thresholds são os documentados', () => {
    expect(BUCKET_THRESHOLDS).toEqual({ critical: 30, at_risk: 55, watch: 75 });
  });
});

describe('WEIGHTS e BUCKET_META', () => {
  it('os pesos somam 1', () => {
    const sum =
      WEIGHTS.recency + WEIGHTS.trend + WEIGHTS.depth + WEIGHTS.concentration;
    expect(sum).toBeCloseTo(1);
  });

  it('cada bucket tem rótulo PT-BR, cor da rampa de risco e ícone', () => {
    expect(BUCKET_META.critical.label).toBe('Crítico');
    expect(BUCKET_META.at_risk.label).toBe('Em risco');
    expect(BUCKET_META.watch.label).toBe('Atenção');
    expect(BUCKET_META.healthy.label).toBe('Saudável');
    expect(BUCKET_META.critical.color).toBe('#DC2626');
    expect(BUCKET_META.at_risk.color).toBe('#EA580C');
    expect(BUCKET_META.watch.color).toBe('#CA8A04');
    expect(BUCKET_META.healthy.color).toBe('#059669');
    for (const meta of Object.values(BUCKET_META)) {
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });
});

describe('dimensão: recência (35%)', () => {
  it('acesso hoje → 100', () => {
    const c = company({ users: [user('a@x.com.br', { lastAccessAt: d(0) })] });
    expect(computeHealth(c, PERIOD).breakdown.recency).toBe(100);
  });

  it('acesso há 3d → 100 (plateau)', () => {
    const c = company({ users: [user('a@x.com.br', { lastAccessAt: d(3) })] });
    expect(computeHealth(c, PERIOD).breakdown.recency).toBe(100);
  });

  it('acesso há 30d → 0', () => {
    const c = company({ users: [user('a@x.com.br', { lastAccessAt: d(30) })] });
    expect(computeHealth(c, PERIOD).breakdown.recency).toBe(0);
  });

  it('acesso há 45d → 0', () => {
    const c = company({ users: [user('a@x.com.br', { lastAccessAt: d(45) })] });
    expect(computeHealth(c, PERIOD).breakdown.recency).toBe(0);
  });

  it('nunca acessou e sem atividade → 0', () => {
    const c = company({ users: [user('a@x.com.br', { lastAccessAt: null })] });
    expect(computeHealth(c, PERIOD).breakdown.recency).toBe(0);
  });

  it('decai linearmente no meio da rampa (16.5d → ~50)', () => {
    const c = company({ users: [user('a@x.com.br', { lastAccessAt: d(17) })] });
    expect(computeHealth(c, PERIOD).breakdown.recency).toBeCloseTo(48, 0);
  });

  it('usa o máximo entre último acesso e última atividade', () => {
    const c = company({
      users: [user('a@x.com.br', { lastAccessAt: d(50) })],
      plays: [play({ createdAt: d(1), endDate: null, touchpoints: [] })],
    });
    expect(computeHealth(c, PERIOD).breakdown.recency).toBe(100);
  });
});

describe('dimensão: tendência (25%)', () => {
  const base = { touchpoints: [] as Touchpoint[], endDate: null };

  it('período anterior zerado e atual > 0 → 100', () => {
    const c = company({ plays: [play({ id: 'p1', createdAt: d(5), ...base })] });
    expect(computeHealth(c, PERIOD).breakdown.trend).toBe(100);
  });

  it('período anterior zerado e atual zerado → 0', () => {
    const c = company({ plays: [] });
    expect(computeHealth(c, PERIOD).breakdown.trend).toBe(0);
  });

  it('volume estável (razão 1) → 100', () => {
    const c = company({
      plays: [
        play({ id: 'a1', createdAt: d(5), ...base }),
        play({ id: 'a2', createdAt: d(10), ...base }),
        play({ id: 'b1', createdAt: d(35), ...base }),
        play({ id: 'b2', createdAt: d(40), ...base }),
      ],
    });
    expect(computeHealth(c, PERIOD).breakdown.trend).toBe(100);
  });

  it('queda de 50% → 0', () => {
    const c = company({
      plays: [
        play({ id: 'a1', createdAt: d(5), ...base }),
        play({ id: 'b1', createdAt: d(35), ...base }),
        play({ id: 'b2', createdAt: d(40), ...base }),
      ],
    });
    expect(computeHealth(c, PERIOD).breakdown.trend).toBe(0);
  });

  it('queda de 25% (razão 0.75) → ~50', () => {
    const c = company({
      plays: [
        play({ id: 'a1', createdAt: d(5), ...base }),
        play({ id: 'a2', createdAt: d(6), ...base }),
        play({ id: 'a3', createdAt: d(7), ...base }),
        play({ id: 'b1', createdAt: d(35), ...base }),
        play({ id: 'b2', createdAt: d(36), ...base }),
        play({ id: 'b3', createdAt: d(37), ...base }),
        play({ id: 'b4', createdAt: d(38), ...base }),
      ],
    });
    expect(computeHealth(c, PERIOD).breakdown.trend).toBe(50);
  });
});

describe('dimensão: profundidade (25%)', () => {
  it('nenhuma play fechada, todos os touchpoints atrasados, zero interação → 0', () => {
    const c = company({
      plays: [
        play({
          id: 'p1',
          createdAt: d(10),
          endDate: null,
          touchpoints: [
            tp({ id: 't1', createdAt: d(9), dueDate: d(5), endDate: null, interactions: 0 }),
            tp({ id: 't2', createdAt: d(9), dueDate: d(5), endDate: null, interactions: 0 }),
          ],
        }),
      ],
    });
    expect(computeHealth(c, PERIOD).breakdown.depth).toBe(0);
  });

  it('tudo fechado, nada atrasado, interação total → 100', () => {
    const c = company({
      plays: [
        play({
          id: 'p1',
          createdAt: d(10),
          endDate: d(2),
          touchpoints: [
            tp({ id: 't1', createdAt: d(9), contactsInvolved: 4, interactions: 4 }),
          ],
        }),
      ],
    });
    expect(computeHealth(c, PERIOD).breakdown.depth).toBe(100);
  });

  it('0 plays fechadas derruba a profundidade mesmo com touchpoints impecáveis', () => {
    const perfect = tp({ createdAt: d(9), contactsInvolved: 4, interactions: 4 });
    const c = company({
      plays: [
        play({ id: 'p1', createdAt: d(10), endDate: null, touchpoints: [{ ...perfect, id: 't1' }] }),
        play({ id: 'p2', createdAt: d(10), endDate: null, touchpoints: [{ ...perfect, id: 't2' }] }),
      ],
    });
    // (0 + 1 + 1) / 3 = 0.667
    expect(computeHealth(c, PERIOD).breakdown.depth).toBe(67);
  });

  describe('sem denominador não há nota — nem zero, nem de graça', () => {
    it('zero plays E zero touchpoints no período → depth 0 (e não 33)', () => {
      // `touchpointsLateRate` de 0 touchpoints valia 0, e `(1 - 0) = 1.0`
      // entrava cheio na média: quem não fez NADA no período colhia depth 33.
      const c = company({ plays: [] });
      expect(computeHealth(c, PERIOD).breakdown.depth).toBe(0);
    });

    it('plays antigas fora do período não geram profundidade', () => {
      const c = company({
        plays: [play({ id: 'velha', createdAt: d(120), endDate: d(100), touchpoints: [] })],
      });
      const h = computeHealth(c, PERIOD);
      expect(h.breakdown.depth).toBe(0);
    });

    it('uma play velha fechando dentro da janela não vale depth 67', () => {
      // Zero plays criadas, zero touchpoints, mas uma play antiga fecha na
      // janela: antes, `playsCloseRate` virava 1 (C2) e o late-rate vazio virava
      // 1 → depth 67 para uma company que não fez nada.
      const c = company({
        plays: [play({ id: 'velha', createdAt: d(120), endDate: d(3), touchpoints: [] })],
      });
      expect(computeHealth(c, PERIOD).breakdown.depth).toBe(0);
    });

    it('só touchpoints (nenhuma play criada no período) → média só do termo que existe', () => {
      // A play nasceu antes da janela; os touchpoints dela, dentro. Sem plays
      // criadas, o termo de close-rate não tem denominador e sai da média.
      const c = company({
        plays: [
          play({
            id: 'velha',
            createdAt: d(60),
            endDate: null,
            touchpoints: [
              tp({ id: 't1', createdAt: d(5), dueDate: d(-5), endDate: d(3), contactsInvolved: 4, interactions: 4 }),
            ],
          }),
        ],
      });
      // (1 - 0 atrasados) e interactionRate 1 → média dos 2 termos = 100.
      expect(computeHealth(c, PERIOD).breakdown.depth).toBe(100);
    });

    it('as companies fantasma do mock têm depth 0', () => {
      for (const id of ['valeverde', 'bonsaude']) {
        expect(computeHealth(getCompany(id)!, DEFAULT_PERIOD).breakdown.depth).toBe(0);
      }
    });
  });
});

describe('dimensão: concentração (15%)', () => {
  const solo = (email: string, id: string) =>
    play({ id, createdAt: d(5), ownerEmail: email, endDate: null, touchpoints: [] });

  it('1 usuário concentrando tudo → 0', () => {
    const c = company({
      users: [user('a@x.com.br', { lastAccessAt: d(1) })],
      plays: [solo('a@x.com.br', 'p1'), solo('a@x.com.br', 'p2')],
    });
    expect(computeHealth(c, PERIOD).breakdown.concentration).toBe(0);
  });

  it('4 usuários uniformes → 100', () => {
    const emails = ['a@x.com.br', 'b@x.com.br', 'c@x.com.br', 'e@x.com.br'];
    const c = company({
      users: emails.map((e) => user(e, { lastAccessAt: d(1) })),
      plays: emails.map((e, i) => solo(e, `p${i}`)),
    });
    expect(computeHealth(c, PERIOD).breakdown.concentration).toBe(100);
  });

  it('distribuição desbalanceada fica entre 0 e 100', () => {
    const c = company({
      users: [
        user('a@x.com.br', { lastAccessAt: d(1) }),
        user('b@x.com.br', { lastAccessAt: d(1) }),
      ],
      plays: [
        solo('a@x.com.br', 'p1'),
        solo('a@x.com.br', 'p2'),
        solo('a@x.com.br', 'p3'),
        solo('b@x.com.br', 'p4'),
      ],
    });
    const score = computeHealth(c, PERIOD).breakdown.concentration;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('sem atividade nenhuma → 0', () => {
    expect(computeHealth(company(), PERIOD).breakdown.concentration).toBe(0);
  });

  it('pôr um colega junto no touchpoint NÃO melhora a concentração de graça', () => {
    // O modelo não pode recompensar quem apenas acrescenta nomes ao
    // `responsibles`. Com contagem inteira por responsável, o ajudante que
    // co-assinava tudo ganhava crédito CHEIO e a concentração disparava.
    // Com crédito fracionário, `b` só leva a fatia que de fato lhe cabe.
    const mk = (helper: boolean) =>
      company({
        users: [
          user('a@x.com.br', { lastAccessAt: d(1) }),
          user('b@x.com.br', { lastAccessAt: d(1) }),
        ],
        plays: [
          play({
            id: 'p1',
            createdAt: d(5),
            ownerEmail: 'a@x.com.br',
            endDate: null,
            touchpoints: [0, 1, 2, 3].map((i) =>
              tp({
                id: `t${i}`,
                createdAt: d(4),
                // `a` faz sozinha as 2 primeiras; nas 2 últimas, `b` entra junto
                // — ou não, dependendo do cenário.
                responsibles:
                  i < 2 || !helper ? ['a@x.com.br'] : ['a@x.com.br', 'b@x.com.br'],
              }),
            ),
          }),
        ],
      });

    const alone = computeHealth(mk(false), PERIOD).breakdown.concentration;
    const shared = computeHealth(mk(true), PERIOD).breakdown.concentration;

    // Sozinha: `a` responde por 100% → concentração 0 (um só usuário ativo).
    expect(alone).toBe(0);
    // Com `b` co-assinando 2 de 4: crédito de `a` = 1 play + 2 + 0.5 + 0.5 = 4
    // de 5; `b` = 1 de 5. Longe do 50/50 que a contagem inteira produziria.
    const stats = userStats(mk(true), PERIOD);
    expect(stats.find((s) => s.user.email === 'b@x.com.br')!.share).toBeCloseTo(0.2);
    expect(shared).toBeGreaterThan(0);
    // A contagem inteira daria b = 2/7 ≈ 0.286 → HHI menor → concentração MAIOR.
    // Confere-se contra o valor exato do modelo fracionário:
    const hhi = 0.8 * 0.8 + 0.2 * 0.2;
    expect(shared).toBe(Math.round(((1 - hhi) / (1 - 1 / 2)) * 100));
  });
});

describe('score composto', () => {
  it('é a soma ponderada do breakdown, arredondada', () => {
    for (const c of COMPANIES) {
      const h = computeHealth(c, DEFAULT_PERIOD);
      const expected = Math.round(
        h.breakdown.recency * WEIGHTS.recency +
          h.breakdown.trend * WEIGHTS.trend +
          h.breakdown.depth * WEIGHTS.depth +
          h.breakdown.concentration * WEIGHTS.concentration,
      );
      expect(h.score).toBe(expected);
      expect(h.score).toBeGreaterThanOrEqual(0);
      expect(h.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(h.score)).toBe(true);
      expect(h.bucket).toBe(bucketOf(h.score));
    }
  });
});

describe('signals', () => {
  it('toda company tem entre 1 e 3 chips', () => {
    for (const c of COMPANIES) {
      const h = computeHealth(c, DEFAULT_PERIOD);
      expect(h.signals.length).toBeGreaterThanOrEqual(1);
      expect(h.signals.length).toBeLessThanOrEqual(3);
    }
  });

  it('chips vêm ordenados por severidade (high antes de low)', () => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    for (const c of COMPANIES) {
      const sev = computeHealth(c, DEFAULT_PERIOD).signals.map((s) => rank[s.severity]);
      expect([...sev].sort((a, b) => a - b)).toEqual(sev);
    }
  });

  it('acumulador emite "0 de N plays fechadas"', () => {
    const h = computeHealth(getCompany('aurora')!, DEFAULT_PERIOD);
    expect(h.signals.some((s) => /^0 de \d+ plays fechadas$/.test(s.label))).toBe(true);
  });

  it('fantasma emite "Sem acesso há Nd" com severidade alta', () => {
    const h = computeHealth(getCompany('valeverde')!, DEFAULT_PERIOD);
    const chip = h.signals.find((s) => s.label.startsWith('Sem acesso há'));
    expect(chip).toBeDefined();
    expect(chip!.severity).toBe('high');
  });

  it('company saudável sem problemas emite "Uso saudável"', () => {
    const h = computeHealth(getCompany('ubatuba')!, DEFAULT_PERIOD);
    expect(h.bucket).toBe('healthy');
    expect(h.signals.map((s) => s.label)).toContain('Uso saudável');
  });
});

describe('perfis plantados no mock', () => {
  it('os fantasmas são critical', () => {
    for (const id of ['valeverde', 'bonsaude']) {
      expect(computeHealth(getCompany(id)!, DEFAULT_PERIOD).bucket).toBe('critical');
    }
  });

  it('os acumuladores abrem 15-30 plays NO PERÍODO, não fecham nenhuma e não são healthy', () => {
    for (const id of ['aurora', 'ipiranga']) {
      const c = getCompany(id)!;
      const m = computeMetrics(c, DEFAULT_PERIOD);
      // O brief fala de plays CRIADAS NO PERÍODO. Medir `c.plays.length` somava
      // as duas janelas e "passava" mesmo com o período atual sub-semeado.
      expect(m.playsCreated).toBeGreaterThanOrEqual(15);
      expect(m.playsCreated).toBeLessThanOrEqual(30);
      expect(m.playsCreatedThatClosed).toBe(0);
      expect(c.plays.every((p) => p.endDate === null)).toBe(true);
      expect(computeHealth(c, DEFAULT_PERIOD).bucket).toBe('at_risk');
    }
  });

  it('os reféns têm assentos nunca usados e não são healthy', () => {
    for (const id of ['pantanal', 'cerrado']) {
      const c = getCompany(id)!;
      expect(c.users.filter((u) => u.lastAccessAt === null).length).toBeGreaterThan(0);
      expect(computeHealth(c, DEFAULT_PERIOD).bucket).not.toBe('healthy');
    }
  });

  it('os saudáveis são healthy', () => {
    const healthy = [
      'solaris',
      'ubatuba',
      'bompreco',
      'guanabara',
      'tramontinatech',
      'caatinga',
      'araucaria',
      'serragaucha',
      'novoporto',
      'ype',
      'amazoniadigital',
      'pampulha',
    ];
    for (const id of healthy) {
      expect(computeHealth(getCompany(id)!, DEFAULT_PERIOD).bucket).toBe('healthy');
    }
  });

  it('os 4 buckets estão povoados (≥2 cada) — o board não pode ter coluna vazia', () => {
    const counts: Record<string, number> = {
      critical: 0,
      at_risk: 0,
      watch: 0,
      healthy: 0,
    };
    for (const c of COMPANIES) counts[computeHealth(c, DEFAULT_PERIOD).bucket]++;
    for (const bucket of Object.keys(counts)) {
      expect(counts[bucket]).toBeGreaterThanOrEqual(2);
    }
  });

  it('o mock é determinístico: mesmos scores em duas chamadas', () => {
    const a = COMPANIES.map((c) => computeHealth(c, DEFAULT_PERIOD).score);
    const b = COMPANIES.map((c) => computeHealth(c, DEFAULT_PERIOD).score);
    expect(a).toEqual(b);
  });
});
