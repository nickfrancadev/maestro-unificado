// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
  PeriodFilter,
  PRESETS,
  toISODate,
  fromISODate,
  periodLabel,
} from './PeriodFilter';
import { TODAY, type Period } from '../data/types';

afterEach(cleanup);

const MS_PER_DAY = 86_400_000;

describe('PeriodFilter — ponte Date <-> yyyy-mm-dd', () => {
  it('"Últimos 7 dias" não desloca de dia: termina em 2026-07-13 e começa em 2026-07-07', () => {
    const p = PRESETS.find((x) => x.id === '7d')!.build(TODAY);
    expect(toISODate(p.end)).toBe('2026-07-13');
    expect(toISODate(p.start)).toBe('2026-07-07');
    // exatamente 6 dias de distância (7 dias inclusivos)
    expect((p.end.getTime() - p.start.getTime()) / MS_PER_DAY).toBe(6);
    // ancorado ao meio-dia UTC -> sobrevive a ±12h de offset
    expect(p.start.getUTCHours()).toBe(12);
    expect(p.end.getUTCHours()).toBe(12);
  });

  it('round-trip Date -> yyyy-mm-dd -> Date é estável (idempotente)', () => {
    for (const preset of PRESETS) {
      const p = preset.build(TODAY);
      for (const d of [p.start, p.end]) {
        const iso = toISODate(d);
        const back = fromISODate(iso);
        expect(toISODate(back)).toBe(iso);
        // segundo round-trip idêntico ao primeiro
        expect(fromISODate(toISODate(back)).getTime()).toBe(back.getTime());
      }
    }
  });

  it('a âncora de meio-dia UTC sobrevive a leituras locais de -12h até +11h59', () => {
    const noon = fromISODate('2026-07-13');
    // Anti-exemplo: `new Date('2026-07-13')` = meia-noite UTC. Lido em UTC-1 já é dia 12.
    const midnight = new Date('2026-07-13');

    // "que dia o relógio marca neste fuso?" — desloca a LEITURA, não o instante.
    const dayInZone = (d: Date, offsetHours: number) =>
      new Date(d.getTime() + offsetHours * 3600_000).getUTCDate();

    // janela segura, em passos de 15min (cobre fusos :30 e :45 como Índia/Nepal/Chatham)
    for (let off = -12; off < 12; off += 0.25) {
      expect(dayInZone(noon, off)).toBe(13);
    }

    // Fronteira honesta: meio-dia + 12h é exatamente meia-noite -> vira o dia.
    // Fusos >= UTC+12 (Auckland, Kiritimati) leriam 14/07 com getters LOCAIS.
    // Não nos afeta porque `toISODate` usa getUTC* e o Intl é fixado em UTC —
    // mas a garantia é -12..+11:59, não ±12 fechado.
    expect(dayInZone(noon, 12)).toBe(14);

    // meia-noite UTC seria muito pior: quebra em TODO fuso negativo.
    expect(dayInZone(midnight, -1)).toBe(12);
    expect(dayInZone(midnight, -0.25)).toBe(12);
  });

  it('o dia RENDERIZADO é correto em qualquer fuso: a formatação é fixada em UTC', () => {
    // Independentemente do TZ do navegador, toISODate lê componentes UTC.
    const p = PRESETS.find((x) => x.id === '7d')!.build(TODAY);
    expect(toISODate(p.start)).toBe('2026-07-07');
    // ...e o rótulo humano também (Intl com timeZone: 'UTC').
    expect(periodLabel(p)).toBe('Últimos 7 dias');
    const custom: Period = {
      start: fromISODate('2026-07-13'),
      end: fromISODate('2026-07-13'),
    };
    // 13 (e não 12/14) em qualquer fuso, porque o formatter é UTC
    expect(periodLabel(custom)).toContain('13');
  });

  it('"Este trimestre" começa em 01/07/2026 (Q3)', () => {
    const p = PRESETS.find((x) => x.id === 'quarter')!.build(TODAY);
    expect(toISODate(p.start)).toBe('2026-07-01');
    expect(toISODate(p.end)).toBe('2026-07-13');
  });

  it('periodLabel reconhece preset e cai no intervalo literal quando personalizado', () => {
    expect(periodLabel(PRESETS[0].build(TODAY))).toBe('Últimos 7 dias');
    const custom: Period = {
      start: fromISODate('2026-01-05'),
      end: fromISODate('2026-02-09'),
    };
    expect(periodLabel(custom)).toContain('–');
    expect(periodLabel(custom)).toContain('2026');
  });
});

describe('PeriodFilter — render', () => {
  it('renderiza o rótulo do período ativo e abre o popover com os presets', () => {
    const period = PRESETS.find((x) => x.id === '30d')!.build(TODAY);
    render(<PeriodFilter period={period} onChange={() => {}} />);

    const trigger = screen.getByRole('button', { name: /Alterar período/ });
    expect(trigger.textContent).toContain('Últimos 30 dias');

    fireEvent.click(trigger);
    expect(screen.getByRole('menuitemradio', { name: /Últimos 7 dias/ })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: /Personalizado/ })).toBeTruthy();
    // o preset ativo é o selecionado
    const active = screen.getByRole('menuitemradio', { name: /Últimos 30 dias/ });
    expect(active.getAttribute('aria-checked')).toBe('true');
  });

  it('clicar num preset emite um Period com fronteiras corretas', () => {
    let got: Period | null = null;
    render(
      <PeriodFilter period={PRESETS[1].build(TODAY)} onChange={(p) => (got = p)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Alterar período/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Últimos 90 dias/ }));

    expect(got).not.toBeNull();
    expect(toISODate(got!.start)).toBe('2026-04-15');
    expect(toISODate(got!.end)).toBe('2026-07-13');
  });

  it('"Personalizado" revela o RangeCalendar e o Aplicar devolve um Period', () => {
    let got: Period | null = null;
    render(
      <PeriodFilter period={PRESETS[0].build(TODAY)} onChange={(p) => (got = p)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Alterar período/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Personalizado/ }));

    // RangeCalendar montou (navegação de mês + botão Aplicar)
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(got).not.toBeNull();
    // sem trocar dias, aplica o range inicial de volta -> sem drift
    expect(toISODate(got!.start)).toBe('2026-07-07');
    expect(toISODate(got!.end)).toBe('2026-07-13');
  });
});
