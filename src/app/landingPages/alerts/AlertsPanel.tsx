import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { listAlerts, type IntentAlert } from '../store/tracking';
import { listAccounts, type LpAccount } from '../store/accounts';
import { listPages } from '../store/repo';
import type { LandingPage } from '../store/model';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} • ${time}`;
}

export interface AlertsPanelProps {
  /** Optional cap on how many alerts to render (e.g. for a compact embedded view). */
  limit?: number;
  /** Render without the outer Card chrome — useful when the caller already wraps it (e.g. a Dialog). */
  bare?: boolean;
}

/**
 * Lists intent alerts saved by the public landing page tracking (see
 * store/tracking.ts + alerts/rules.ts). Read-only surface: alerts are
 * generated elsewhere by the rules engine when a visitor's behaviour on
 * `/p/:slug?a=<accountId>` matches an intent rule (deep scroll + CTA click,
 * or 2+ visits within 7 days).
 *
 * "Acionar Play" hook: for this prototype it navigates to `/plays` (the
 * Plays area) carrying the account id via router state, and shows a toast
 * confirming the hand-off. There is no backend wiring to auto-create a play
 * from an alert yet, so this is a stub navigation rather than a real
 * play-creation action.
 */
export function AlertsPanel({ limit, bare = false }: AlertsPanelProps) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<IntentAlert[]>([]);
  const [accounts, setAccounts] = useState<LpAccount[]>([]);
  const [pages, setPages] = useState<LandingPage[]>([]);

  useEffect(() => {
    setAlerts(listAlerts());
    setAccounts(listAccounts());
    setPages(listPages());
  }, []);

  const accountsById = useMemo(() => {
    const map = new Map<string, LpAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const pagesById = useMemo(() => {
    const map = new Map<string, LandingPage>();
    pages.forEach((p) => map.set(p.id, p));
    return map;
  }, [pages]);

  const sorted = useMemo(
    () => [...alerts].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
    [alerts],
  );

  const visible = limit ? sorted.slice(0, limit) : sorted;

  const handleAcionarPlay = (alert: IntentAlert) => {
    const account = accountsById.get(alert.accountId);
    toast.success(
      `Sinal de intenção enviado para Plays${account ? ` — ${account.name}` : ''}.`,
    );
    navigate('/plays', { state: { accountId: alert.accountId } });
  };

  const list = (
    <div className="divide-y divide-slate-100">
      {visible.length === 0 && (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          Nenhum alerta de intenção ainda.
        </div>
      )}
      {visible.map((alert) => {
        const account = accountsById.get(alert.accountId);
        const page = pagesById.get(alert.landingPageId);
        return (
          <div key={alert.id} className="flex items-start justify-between gap-4 px-6 py-4">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="flex items-center justify-center rounded-lg shrink-0 mt-0.5"
                style={{ width: 32, height: 32, background: '#FFF1ED', color: '#FF5F39' }}
              >
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {account?.name ?? alert.accountId ?? 'Conta desconhecida'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {page?.name ?? 'Landing page removida'} • {alert.reason}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{formatTimestamp(alert.ts)}</p>
              </div>
            </div>
            <button
              onClick={() => handleAcionarPlay(alert)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5F39] text-white rounded-lg text-xs font-medium hover:bg-[#E54A26] transition-colors shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              Acionar Play
            </button>
          </div>
        );
      })}
    </div>
  );

  if (bare) return list;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4 text-[#FF5F39]" />
              Alertas de intenção
            </CardTitle>
            <CardDescription className="mt-1">
              Contas com sinais de alta intenção nas suas landing pages.
            </CardDescription>
          </div>
          {sorted.length > 0 && <Badge variant="secondary">{sorted.length}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">{list}</CardContent>
    </Card>
  );
}

export default AlertsPanel;
