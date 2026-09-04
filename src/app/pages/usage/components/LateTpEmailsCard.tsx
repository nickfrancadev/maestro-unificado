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
import { CardHeader } from './CardHeader';

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

/** Uma métrica do card, no mesmo desenho dos demais blocos numéricos. */
function EmailStat({
  label,
  value,
  foot,
}: {
  label: string;
  value: string;
  foot: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3 flex flex-col h-full" style={{ borderColor: GRID }}>
      <dt style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>{label}</dt>
      <dd
        className="tabular-nums mt-0.5"
        style={{ fontSize: 22, fontWeight: 700, color: NAVY, lineHeight: 1.1 }}
      >
        {value}
      </dd>
      <dd className="mt-auto pt-1" style={{ fontSize: 11, color: MUTED }}>
        {foot}
      </dd>
    </div>
  );
}

export function LateTpEmailsCard({ company, period }: LateTpEmailsCardProps) {
  const stats = lateTpEmailStats(company, period);
  const prev = lateTpEmailStats(company, previousPeriod(period));

  // Δ das taxas só com base nos DOIS períodos (mesma regra dos StatTiles).
  const comparable = stats.recipients > 0 && prev.recipients > 0;

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif] h-full flex flex-col"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <CardHeader
        icon={Mail}
        title="E-mails de touchpoints atrasados"
        subtitle="Interações com os avisos automáticos enviados no período"
      />

      {stats.sent === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
          Nenhum e-mail de touchpoint atrasado enviado no período — nada venceu
          em aberto na janela.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 auto-rows-fr">
            <EmailStat
              label="Envios"
              value={formatNumber(stats.sent)}
              foot={`último ${formatDaysAgo(stats.lastSentAt)}`}
            />
            <EmailStat
              label="Taxa de abertura"
              value={formatPct(stats.openRate)}
              foot={
                comparable ? (
                  <DeltaText curr={stats.openRate} prev={prev.openRate} />
                ) : (
                  'sem base no período anterior'
                )
              }
            />
            <EmailStat
              label="Taxa de clique"
              value={formatPct(stats.clickRate)}
              foot={
                comparable ? (
                  <DeltaText curr={stats.clickRate} prev={prev.clickRate} />
                ) : (
                  'sem base no período anterior'
                )
              }
            />
          </dl>

          {/*
           * A conta pode mostrar "0 touchpoints atrasados" HOJE e ainda assim ter
           * recebido cobrança: o e-mail é histórico, e o que ele cobrou foi
           * resolvido. Sem esta linha, os dois números pareceriam se contradizer.
           */}
          <p className="mt-3 tabular-nums" style={{ fontSize: 11, color: MUTED }}>
            Os avisos cobraram até {formatNumber(stats.maxOverdue)}{' '}
            {stats.maxOverdue === 1 ? 'touchpoint vencido' : 'touchpoints vencidos'} em
            aberto · taxas pooled (Σ aberturas ÷ Σ destinatários)
          </p>

          {/* envio a envio: a taxa agregada esconde qual disparo funcionou */}
          <table className="w-full mt-4 border-collapse">
            <caption className="text-left pb-1" style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>
              Envios do período
            </caption>
            <thead>
              <tr>
                {['Data', 'Cobrou', 'Enviados', 'Aberturas', 'Cliques'].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`border-b py-1 ${i === 0 ? 'text-left' : 'text-right'}`}
                    style={{ borderColor: GRID, fontSize: 11, fontWeight: 600, color: MUTED }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.sends.map((e) => (
                <tr key={e.id}>
                  <td
                    className="border-b py-1.5 tabular-nums text-left"
                    style={{ borderColor: GRID, fontSize: 12, color: NAVY }}
                  >
                    {formatDaysAgo(e.sentAt)}
                  </td>
                  <td
                    className="border-b py-1.5 tabular-nums text-right"
                    style={{ borderColor: GRID, fontSize: 12, color: NAVY }}
                  >
                    {formatNumber(e.overdueCount)}
                  </td>
                  <td
                    className="border-b py-1.5 tabular-nums text-right"
                    style={{ borderColor: GRID, fontSize: 12, color: MUTED }}
                  >
                    {formatNumber(e.recipients)}
                  </td>
                  <td
                    className="border-b py-1.5 tabular-nums text-right"
                    style={{ borderColor: GRID, fontSize: 12, color: MUTED }}
                  >
                    {formatNumber(e.opens)}
                  </td>
                  <td
                    className="border-b py-1.5 tabular-nums text-right"
                    style={{ borderColor: GRID, fontSize: 12, color: MUTED }}
                  >
                    {formatNumber(e.clicks)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
