import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import type { Profile, User } from '../data/types';
import { formatDaysAgo, formatNumber, formatPct } from '../lib/format';
import { PendingMarker } from './PendingMarker';

const NAVY = '#212A46';
const MUTED = '#64748B';
const GRID = '#E2E8F0';

/** Âmbar — exceção permitida à rampa de risco: assento pago sem uso. */
const AMBER_BG = '#FFFBEB';
const AMBER_TEXT = '#92400E';

export interface UserRow {
  user: User;
  plays: number;
  touchpoints: number;
  share: number;
}

interface UsersTableProps {
  rows: UserRow[];
}

type SortKey =
  | 'name'
  | 'profile'
  | 'lastAccessAt'
  | 'lastActivityAt'
  | 'plays'
  | 'touchpoints'
  | 'share';
type SortDir = 'asc' | 'desc';

const PROFILE_LABEL: Record<Profile, string> = {
  ADMIN: 'Admin',
  AGENCY: 'Agência',
  EDITOR: 'Editor',
  VIEWER: 'Visualizador',
};

/** Badges de perfil — neutros de propósito: perfil não é risco. */
const PROFILE_STYLE: Record<Profile, { bg: string; color: string; border: string }> = {
  ADMIN: { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE' },
  AGENCY: { bg: '#F0F9FF', color: '#075985', border: '#BAE6FD' },
  EDITOR: { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  VIEWER: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
};

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
  /** marcador de "pendente de instrumentação" */
  pending?: string;
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Nome', numeric: false },
  { key: 'profile', label: 'Perfil', numeric: false },
  {
    key: 'lastAccessAt',
    label: 'Último acesso',
    numeric: false,
    pending:
      'Pendente de instrumentação: o backend atual não registra login, então este valor é simulado. "Última atividade" é a métrica derivável hoje.',
  },
  { key: 'lastActivityAt', label: 'Última atividade', numeric: false },
  { key: 'plays', label: 'Plays', numeric: true },
  { key: 'touchpoints', label: 'Touchpoints', numeric: true },
  { key: 'share', label: 'Share', numeric: true },
];

/** `null` (nunca) ordena sempre no fim, independente da direção. */
function compare(a: UserRow, b: UserRow, key: SortKey, dir: SortDir): number {
  const sign = dir === 'asc' ? 1 : -1;

  switch (key) {
    case 'name':
      return sign * a.user.name.localeCompare(b.user.name, 'pt-BR');
    case 'profile':
      return sign * a.user.profile.localeCompare(b.user.profile, 'pt-BR');
    case 'lastAccessAt':
    case 'lastActivityAt': {
      const av = a.user[key];
      const bv = b.user[key];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sign * (av.getTime() - bv.getTime());
    }
    default:
      return sign * (a[key] - b[key]);
  }
}

function ShareBar({ share }: { share: number }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0));
  return (
    <div className="flex items-center justify-end gap-2">
      <div
        className="h-1.5 w-16 rounded-full overflow-hidden shrink-0"
        style={{ background: GRID }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, background: NAVY }}
        />
      </div>
      <span className="tabular-nums" style={{ fontSize: 13, color: NAVY, minWidth: 40 }}>
        {formatPct(pct)}
      </span>
    </div>
  );
}

export function UsersTable({ rows }: UsersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('plays');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(
    () => [...rows].sort((a, b) => compare(a, b, sortKey, sortDir)),
    [rows, sortKey, sortDir],
  );

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // texto começa A→Z; número começa do maior
      setSortDir(key === 'name' || key === 'profile' ? 'asc' : 'desc');
    }
  };

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 720 }}>
          <caption className="sr-only">
            Uso por usuário no período. Colunas ordenáveis. Usuários que nunca acessaram
            são destacados.
          </caption>
          <thead>
            <tr className="border-b" style={{ borderColor: GRID }}>
              {COLUMNS.map((col) => {
                const isActive = col.key === sortKey;
                const ariaSort = isActive
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                const SortIcon = !isActive
                  ? ChevronsUpDown
                  : sortDir === 'asc'
                    ? ArrowUp
                    : ArrowDown;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`pb-2.5 ${col.numeric ? 'text-right' : 'text-left'}`}
                  >
                    <span
                      className={`inline-flex items-center gap-1 ${col.numeric ? 'flex-row-reverse' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(col.key)}
                        aria-label={`Ordenar por ${col.label}`}
                        className="inline-flex items-center gap-1 rounded px-1 -mx-1 py-0.5 transition-colors hover:bg-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: isActive ? NAVY : MUTED,
                        }}
                      >
                        <span>{col.label}</span>
                        <SortIcon
                          size={12}
                          aria-hidden="true"
                          style={{ color: isActive ? NAVY : '#94A3B8' }}
                        />
                      </button>
                      {col.pending && <PendingMarker text={col.pending} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="py-8 text-center"
                  style={{ fontSize: 13, color: MUTED }}
                >
                  Nenhum usuário nesta empresa.
                </td>
              </tr>
            )}

            {sorted.map(({ user, plays, touchpoints, share }) => {
              const never = user.lastAccessAt === null;
              return (
                <tr
                  key={user.id}
                  className="border-b last:border-b-0"
                  style={{
                    borderColor: GRID,
                    background: never ? AMBER_BG : undefined,
                  }}
                >
                  <td className="py-2.5 pr-3 align-top">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                        {user.name}
                      </span>
                      {never && (
                        <span
                          className="inline-flex items-center rounded-full border px-1.5 py-0.5"
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            background: '#FEF3C7',
                            borderColor: '#FDE68A',
                            color: AMBER_TEXT,
                          }}
                        >
                          nunca acessou
                        </span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: MUTED }}>
                      {user.email}
                    </div>
                  </td>

                  <td className="py-2.5 pr-3 align-top">
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: PROFILE_STYLE[user.profile].bg,
                        borderColor: PROFILE_STYLE[user.profile].border,
                        color: PROFILE_STYLE[user.profile].color,
                      }}
                    >
                      {PROFILE_LABEL[user.profile] ?? user.profile}
                    </span>
                  </td>

                  <td
                    className="py-2.5 pr-3 align-top tabular-nums"
                    style={{ fontSize: 13, color: never ? AMBER_TEXT : NAVY }}
                  >
                    {formatDaysAgo(user.lastAccessAt)}
                  </td>

                  <td
                    className="py-2.5 pr-3 align-top tabular-nums"
                    style={{ fontSize: 13, color: NAVY }}
                  >
                    {formatDaysAgo(user.lastActivityAt)}
                  </td>

                  <td
                    className="py-2.5 pr-3 align-top text-right tabular-nums"
                    style={{ fontSize: 13, color: NAVY }}
                  >
                    {formatNumber(plays)}
                  </td>

                  <td
                    className="py-2.5 pr-3 align-top text-right tabular-nums"
                    style={{ fontSize: 13, color: NAVY }}
                  >
                    {formatNumber(touchpoints)}
                  </td>

                  <td className="py-2.5 align-top">
                    <ShareBar share={share} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
