import React, { useMemo, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AccountAnalytics } from '@/lib/linkedin';
import { accountColor, buildComparisonData, COMPARISON_METRICS, type ComparisonMetric } from './accountAnalytics';
import { fmtCurrency, fmtNum } from './format';

interface AccountComparisonChartProps {
  accounts: AccountAnalytics[];   // todas as contas, na ordem original (cores estáveis)
  selectedIds: Set<string>;
  currency: string;
  loading: boolean;
}

export function AccountComparisonChart({ accounts, selectedIds, currency, loading }: AccountComparisonChartProps) {
  const [metric, setMetric] = useState<ComparisonMetric>('impressions');

  const selected = useMemo(
    () => accounts
      .map((account, colorIndex) => ({ account, colorIndex }))
      .filter(({ account }) => selectedIds.has(account.accountId)),
    [accounts, selectedIds],
  );

  const chartData = useMemo(
    () => buildComparisonData(selected.map(s => s.account), metric),
    [selected, metric],
  );

  const fmtValue = (v: number) => metric === 'cost' ? fmtCurrency(v, currency) : fmtNum(v);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h3 className="font-bold text-slate-800">Comparativo por empresa</h3>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {COMPARISON_METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              aria-pressed={metric === m.key}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                metric === m.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        {selected.map(({ account, colorIndex }) => (
          <div key={account.accountId} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accountColor(colorIndex) }} />
            {account.accountName}
          </div>
        ))}
      </div>

      <div className="h-[260px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => fmtValue(v)} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                formatter={(value: number | undefined, name: string) => [typeof value === 'number' ? fmtValue(value) : '—', name]}
              />
              {selected.map(({ account, colorIndex }) => (
                <Line
                  key={account.accountId}
                  type="monotone"
                  dataKey={account.accountId}
                  name={account.accountName}
                  stroke={accountColor(colorIndex)}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Sem dados para o período selecionado</span>
          </div>
        )}
      </div>
    </div>
  );
}
