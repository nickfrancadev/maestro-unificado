import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ArrowLeft, DollarSign, Eye, MousePointerClick, TrendingUp, Heart, Share2, MessageCircle, UserPlus } from 'lucide-react';
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
    </div>
  );
}
