import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, ChevronDown, Check } from 'lucide-react';
import { RangeCalendar } from '../../dashboard/RangeCalendar';
import { TODAY, type Period } from '../data/types';

const ORANGE = '#FF5F39';
const NAVY = '#212A46';
const MUTED = '#64748B';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ *
 * Ponte Date <-> "yyyy-mm-dd"
 *
 * `RangeCalendar` fala strings `yyyy-mm-dd`; `Period` fala `Date`.
 * Todo o mock está ancorado em UTC (`TODAY = 2026-07-13T12:00:00Z`), então a
 * conversão é feita SEMPRE em UTC e a hora é fixada em meio-dia UTC. Meio-dia
 * sobrevive a offsets de ±12h sem trocar de dia de calendário — usar
 * `new Date('2026-07-13')` (meia-noite UTC) renderizaria "12" em qualquer
 * fuso negativo.
 * ------------------------------------------------------------------ */

/** `Date` → `"yyyy-mm-dd"` (componentes UTC, nunca locais). */
export function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `"yyyy-mm-dd"` → `Date` ancorado ao meio-dia UTC do mesmo dia de calendário. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** Normaliza qualquer `Date` para meio-dia UTC do seu dia de calendário. */
function atNoonUTC(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0),
  );
}

/** Período dos últimos `n` dias, terminando em `today` (inclusive). */
function lastNDays(n: number, today: Date = TODAY): Period {
  const end = atNoonUTC(today);
  return { start: new Date(end.getTime() - (n - 1) * MS_PER_DAY), end };
}

/** Trimestre corrente até hoje. */
function thisQuarter(today: Date = TODAY): Period {
  const end = atNoonUTC(today);
  const qStartMonth = Math.floor(end.getUTCMonth() / 3) * 3;
  const start = new Date(
    Date.UTC(end.getUTCFullYear(), qStartMonth, 1, 12, 0, 0, 0),
  );
  return { start, end };
}

interface Preset {
  id: string;
  label: string;
  build: (today?: Date) => Period;
}

export const PRESETS: Preset[] = [
  { id: '7d', label: 'Últimos 7 dias', build: (t) => lastNDays(7, t) },
  { id: '30d', label: 'Últimos 30 dias', build: (t) => lastNDays(30, t) },
  { id: '90d', label: 'Últimos 90 dias', build: (t) => lastNDays(90, t) },
  { id: 'quarter', label: 'Este trimestre', build: (t) => thisQuarter(t) },
];

function sameDayUTC(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

/** Qual preset (se algum) corresponde exatamente ao período atual. */
export function matchPreset(period: Period, today: Date = TODAY): Preset | null {
  return (
    PRESETS.find((p) => {
      const candidate = p.build(today);
      return (
        sameDayUTC(candidate.start, period.start) &&
        sameDayUTC(candidate.end, period.end)
      );
    }) ?? null
  );
}

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Rótulo do botão: nome do preset, ou o intervalo literal se for personalizado. */
export function periodLabel(period: Period, today: Date = TODAY): string {
  const preset = matchPreset(period, today);
  if (preset) return preset.label;
  return `${DATE_FMT.format(period.start)} – ${DATE_FMT.format(period.end)}`;
}

interface PeriodFilterProps {
  period: Period;
  onChange: (p: Period) => void;
}

export function PeriodFilter({ period, onChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);

  const active = matchPreset(period);
  const label = periodLabel(period);

  const close = () => {
    setOpen(false);
    setCustom(false);
  };

  const applyPreset = (p: Preset) => {
    onChange(p.build(TODAY));
    close();
  };

  const applyRange = (start: string, end: string) => {
    onChange({ start: fromISODate(start), end: fromISODate(end) });
    close();
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setCustom(false);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Período: ${label}. Alterar período`}
          className="flex items-center gap-2 bg-white rounded-xl border border-[#d8d8d8] px-3 py-2 font-['Euclid_Circular_A',sans-serif] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: NAVY,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <CalendarDays size={16} style={{ color: MUTED }} aria-hidden="true" />
          <span>{label}</span>
          <ChevronDown size={14} style={{ color: MUTED }} aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 font-['Euclid_Circular_A',sans-serif]"
        >
          {custom ? (
            <RangeCalendar
              initialStart={toISODate(period.start)}
              initialEnd={toISODate(period.end)}
              onApply={applyRange}
              onCancel={() => setCustom(false)}
            />
          ) : (
            <div
              role="menu"
              aria-label="Presets de período"
              className="bg-white rounded-xl border border-[#d8d8d8] p-1.5"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220 }}
            >
              {PRESETS.map((p) => {
                const selected = active?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => applyPreset(p)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[#F1F5F9] focus:outline-none focus-visible:bg-[#F1F5F9]"
                    style={{
                      fontSize: 13,
                      fontWeight: selected ? 600 : 400,
                      color: selected ? ORANGE : NAVY,
                    }}
                  >
                    <span>{p.label}</span>
                    {selected && (
                      <Check size={15} style={{ color: ORANGE }} aria-hidden="true" />
                    )}
                  </button>
                );
              })}

              <div className="my-1 border-t border-[#E2E8F0]" />

              <button
                type="button"
                role="menuitemradio"
                aria-checked={active === null}
                onClick={() => setCustom(true)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-[#F1F5F9] focus:outline-none focus-visible:bg-[#F1F5F9]"
                style={{
                  fontSize: 13,
                  fontWeight: active === null ? 600 : 400,
                  color: active === null ? ORANGE : NAVY,
                }}
              >
                <span>Personalizado</span>
                {active === null && (
                  <Check size={15} style={{ color: ORANGE }} aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
