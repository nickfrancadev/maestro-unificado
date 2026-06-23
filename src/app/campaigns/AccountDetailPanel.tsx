import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowLeft, DollarSign, Eye, MousePointerClick, TrendingUp, Heart, Share2, MessageCircle, UserPlus, Users, Megaphone } from 'lucide-react';
import type { AccountAnalytics } from '@/lib/linkedin';
import { accountColor } from './accountAnalytics';
import { fmtCurrency, fmtNum, fmtDateLabel } from './format';

export interface AccountDetailPanelProps {
  account: AccountAnalytics;
  colorIndex: number;
  currency: string;
  variant: 'inline' | 'fullscreen';
  onBack?: () => void;
}

export function AccountDetailPanel({ account, colorIndex, currency, variant, onBack }: AccountDetailPanelProps) {
  const t = account.totals;
  const color = accountColor(colorIndex);
  const cy = currency === 'BRL' ? 'R$' : '$';
  const ctr = t.impressions > 0 ? ((t.clicks / t.impressions) * 100).toFixed(2) : '0';
  const cpc = t.clicks > 0 ? (t.costInLocalCurrency / t.clicks).toFixed(2) : '0';
  const cpm = t.impressions > 0 ? ((t.costInLocalCurrency / t.impressions) * 1000).toFixed(2) : '0';
  const engagementRate = t.impressions > 0
    ? (((t.clicks + t.likes + t.comments + t.shares + t.follows) / t.impressions) * 100).toFixed(2)
    : '0';
  const cpl = t.oneClickLeads > 0 ? (t.costInLocalCurrency / t.oneClickLeads).toFixed(2) : null;
  const gradId = React.useId();
  const series = account.timeSeries.map(p => ({ ...p, dateLabel: fmtDateLabel(p.date) }));

  const wrap = variant === 'fullscreen'
    ? 'space-y-4'
    : 'bg-slate-50/60 border-t border-slate-100 px-4 py-4 space-y-4';

  return (
    <div className={wrap}>
      {variant === 'fullscreen' && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[#E54A26] bg-[#FFF1ED] border border-[#FF5F39]/30 rounded-lg px-3 py-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar · {account.accountName}
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" style={{ color }} /> Spend</p>
          <p className="text-lg font-bold text-slate-900">{fmtCurrency(t.costInLocalCurrency, currency)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-600" /> Impressões</p>
          <p className="text-lg font-bold text-slate-900">{fmtNum(t.impressions)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-purple-600" /> Clicks</p>
          <p className="text-lg font-bold text-slate-900">{fmtNum(t.clicks)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-600" /> CTR · CPC</p>
          <p className="text-lg font-bold text-slate-900">{ctr}% · {cy}{cpc}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500 mb-3">Evolução · {account.accountName}</p>
        <div className="h-[180px] w-full">
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id={`d-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} />
                <Area type="monotone" dataKey="impressions" name="Impressões" stroke={color} strokeWidth={2} fill={`url(#d-${gradId})`} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-500" /> Likes</p><p className="text-base font-bold text-slate-900">{fmtNum(t.likes)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-blue-500" /> Shares</p><p className="text-base font-bold text-slate-900">{fmtNum(t.shares)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-amber-500" /> Comments</p><p className="text-base font-bold text-slate-900">{fmtNum(t.comments)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-green-500" /> Follows</p><p className="text-base font-bold text-slate-900">{fmtNum(t.follows)}</p></div>
      </div>

      {/* Custo e Eficiência */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500">CPM</p><p className="text-base font-bold text-slate-900">{cy}{cpm}</p><p className="text-[11px] text-slate-400">Custo por mil impressões</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500">Engagement Rate</p><p className="text-base font-bold text-slate-900">{engagementRate}%</p><p className="text-[11px] text-slate-400">Engajamento / impressões</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500">CPL</p><p className="text-base font-bold text-slate-900">{cpl ? `${cy}${cpl}` : '—'}</p><p className="text-[11px] text-slate-400">Custo por lead</p></div>
      </div>

      {/* Conversões */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500">Conversões</p><p className="text-base font-bold text-slate-900">{fmtNum(t.externalWebsiteConversions)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500">Pós-Clique</p><p className="text-base font-bold text-slate-900">{fmtNum(t.externalWebsitePostClickConversions)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"><p className="text-xs text-slate-500">Leads</p><p className="text-base font-bold text-slate-900">{fmtNum(t.oneClickLeads)}</p></div>
      </div>

      {/* Alcance e Virais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium"><Users className="w-4 h-4 text-[#FF5F39]" /> Alcance e Virais</div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-slate-500">Alcance Estimado</p><p className="text-base font-bold text-slate-900">{fmtNum(t.approximateMemberReach)}</p></div>
            <div><p className="text-xs text-slate-500">Impressões Virais</p><p className="text-base font-bold text-slate-900">{fmtNum(t.viralImpressions)}</p></div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium"><Megaphone className="w-4 h-4 text-purple-500" /> Amplificação Viral</div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-slate-500">Viral Clicks</p><p className="text-base font-bold text-slate-900">{fmtNum(t.viralClicks)}</p></div>
            <div><p className="text-xs text-slate-500">Viral Likes</p><p className="text-base font-bold text-slate-900">{fmtNum(t.viralLikes)}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
