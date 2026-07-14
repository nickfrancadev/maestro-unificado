import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, MousePointerClick, FileCheck2, Users, Info } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getPage } from '../store/repo';
import type { LandingPage } from '../store/model';
import { buildFunnel, buildLpSeries, buildPerAccountRows } from './mockSeries';
import { accountColor } from '../../campaigns/accountAnalytics';
import { fmtDateLabel } from '../../campaigns/format';

const ACCENT = '#FF5F39';

function fmtInt(n: number): string {
  return n.toLocaleString('pt-BR');
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function FunnelStage({
  icon,
  label,
  value,
  rateLabel,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  rateLabel?: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center gap-2 flex-1">
        <div
          className="flex items-center justify-center rounded-xl w-12 h-12"
          style={{ background: '#FFF1ED', color: ACCENT }}
        >
          {icon}
        </div>
        <div className="text-2xl font-bold text-slate-900">{fmtInt(value)}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center justify-center px-2 -mt-6 shrink-0" style={{ minWidth: 64 }}>
          <div className="w-full h-px bg-slate-200 relative">
            <div className="absolute right-0 -top-1 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-slate-300" />
          </div>
          {rateLabel && (
            <span className="text-[11px] font-semibold text-slate-500 mt-1 whitespace-nowrap">{rateLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function LandingPageAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<LandingPage | undefined | null>(null);

  useEffect(() => {
    if (!id) return;
    setPage(getPage(id) ?? undefined);
  }, [id]);

  const series = useMemo(() => (id ? buildLpSeries(id) : []), [id]);
  const funnel = useMemo(() => (id ? buildFunnel(id) : null), [id]);
  const accountRows = useMemo(() => (id ? buildPerAccountRows(id) : []), [id]);

  const chartData = useMemo(
    () => series.map((p) => ({ ...p, dateLabel: fmtDateLabel(p.date) })),
    [series],
  );

  if (page === null) {
    return <div className="max-w-7xl mx-auto p-6 text-slate-500">Carregando…</div>;
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">Landing page não encontrada</p>
        <p className="text-sm text-slate-500 mt-1">
          A página que você está tentando visualizar não existe mais ou foi removida.
        </p>
        <button
          onClick={() => navigate('/landing-pages')}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#FF5F39] text-white rounded-lg text-sm font-medium hover:bg-[#E54A26] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Landing Pages
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/landing-pages')}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{page.name}</h1>
          <p className="text-sm text-slate-500 font-mono">/p/{page.slug}</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-6">Funil de conversão</h2>
        {funnel && (
          <div className="flex items-start">
            <FunnelStage icon={<Eye className="w-5 h-5" />} label="Visualizações" value={funnel.views} rateLabel={fmtPct(funnel.ctaRate)} />
            <FunnelStage icon={<MousePointerClick className="w-5 h-5" />} label="Cliques no CTA" value={funnel.ctaClicks} rateLabel={fmtPct(funnel.formRate)} />
            <FunnelStage icon={<FileCheck2 className="w-5 h-5" />} label="Formulários enviados" value={funnel.formSubmits} isLast />
          </div>
        )}
      </div>

      {/* Time series */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Evolução nos últimos 30 dias
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="lpViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lpCta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lpForm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} />
              <Area type="monotone" dataKey="views" name="Visualizações" stroke={ACCENT} strokeWidth={2} fillOpacity={1} fill="url(#lpViews)" />
              <Area type="monotone" dataKey="ctaClicks" name="Cliques no CTA" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#lpCta)" />
              <Area type="monotone" dataKey="formSubmits" name="Formulários" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#lpForm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-account breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Detalhamento por conta
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Conta</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Visualizações</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Cliques no CTA</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Formulários</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Conversão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accountRows.map((row, index) => (
                <tr key={row.accountId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: accountColor(index) }}
                      />
                      <span className="text-sm font-medium text-slate-800">{row.accountName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-slate-700">{fmtInt(row.views)}</td>
                  <td className="px-6 py-3 text-right text-sm text-slate-700">{fmtInt(row.ctaClicks)}</td>
                  <td className="px-6 py-3 text-right text-sm text-slate-700">{fmtInt(row.formSubmits)}</td>
                  <td className="px-6 py-3 text-right text-sm font-semibold text-slate-900">{fmtPct(row.conversion)}</td>
                </tr>
              ))}
              {accountRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 text-sm">
                    Nenhum evento registrado para esta página ainda. Acesse a página pública para gerar dados reais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-start gap-2 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            Cada evento capturado nesta landing page é atribuído à conta identificada (via UTM/link personalizado) e
            alimenta a linha do tempo daquela conta na visão de Contas — assim o time comercial vê a visita, o clique
            no CTA e o envio de formulário no histórico consolidado da empresa, não apenas aqui.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPageAnalytics;
