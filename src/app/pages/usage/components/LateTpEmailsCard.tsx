/**
 * Interações com os e-mails automáticos de "touchpoints atrasados" (novo dado —
 * feedback Bernardo).
 *
 * Taxas POOLED (Σ aberturas ÷ Σ destinatários), como o resto da tela. O Δ segue
 * a regra da casa: só existe onde existe DENOMINADOR nos dois períodos — sem
 * envio não há taxa a comparar, e o vazio se explica em texto.
 */
import { Mail } from 'lucide-react';
import type { Company, Period } from '../data/types';
import { lateTpEmailStats } from '../lib/cs';
import { previousPeriod } from '../lib/selectors';
import { formatDaysAgo, formatDelta, formatNumber, formatPct } from '../lib/format';
import { TREND_BAD, TREND_FLAT, TREND_GOOD } from './colors';

const NAVY = '#212A46';
const MUTED = '#64748B';
const GRID = '#E2E8F0';

interface LateTpEmailsCardProps {
  company: Company;
  period: Period;
}

function DeltaText({ curr, prev }: { curr: number; prev: number }) {
  const delta = formatDelta(curr, prev);
  const color = delta.dir === 'flat' ? TREND_FLAT : delta.dir === 'up' ? TREND_GOOD : TREND_BAD;
  return (
    <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 600, color }}>
      {delta.label} vs. anterior
    </span>
  );
}

export function LateTpEmailsCard({ company, period }: LateTpEmailsCardProps) {
  const stats = lateTpEmailStats(company, period);
  const prev = lateTpEmailStats(company, previousPeriod(period));

  // Δ das taxas só com base nos DOIS períodos (mesma regra dos StatTiles).
  const comparable = stats.recipients > 0 && prev.recipients > 0;

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="mb-4 flex items-start gap-2">
        <Mail size={16} style={{ color: NAVY }} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
            E-mails de touchpoints atrasados
          </h3>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Interações com os avisos automáticos enviados no período
          </p>
        </div>
      </div>

      {stats.sent === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
          Nenhum e-mail de touchpoint atrasado enviado no período — sem atraso,
          sem aviso.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3" style={{ borderColor: GRID }}>
              <dt style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Envios</dt>
              <dd className="tabular-nums mt-0.5" style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>
                {formatNumber(stats.sent)}
              </dd>
              <dd style={{ fontSize: 11, color: MUTED }}>
                último {formatDaysAgo(stats.lastSentAt)}
              </dd>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: GRID }}>
              <dt style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Taxa de abertura</dt>
              <dd className="tabular-nums mt-0.5" style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>
                {formatPct(stats.openRate)}
              </dd>
              <dd>
                {comparable ? (
                  <DeltaText curr={stats.openRate} prev={prev.openRate} />
                ) : (
                  <span style={{ fontSize: 11, color: MUTED }}>sem base no período anterior</span>
                )}
              </dd>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: GRID }}>
              <dt style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Taxa de clique</dt>
              <dd className="tabular-nums mt-0.5" style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>
                {formatPct(stats.clickRate)}
              </dd>
              <dd>
                {comparable ? (
                  <DeltaText curr={stats.clickRate} prev={prev.clickRate} />
                ) : (
                  <span style={{ fontSize: 11, color: MUTED }}>sem base no período anterior</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-3 tabular-nums" style={{ fontSize: 11, color: MUTED }}>
            {formatNumber(stats.opens)} aberturas e {formatNumber(stats.clicks)} cliques
            sobre {formatNumber(stats.recipients)} destinatários somados · taxas
            pooled (Σ aberturas ÷ Σ destinatários)
          </p>
        </>
      )}
    </div>
  );
}
