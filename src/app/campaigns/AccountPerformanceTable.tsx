import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import type { AccountAnalytics } from '@/lib/linkedin';
import { sumTotals } from '@/lib/linkedin';
import { accountColor, buildAccountRows } from './accountAnalytics';
import { fmtCurrency, fmtNum } from './format';

interface AccountPerformanceTableProps {
  accounts: AccountAnalytics[];   // todas as contas, na ordem original (cores estáveis)
  selectedIds: Set<string>;
  onToggle: (accountId: string) => void;
  currency: string;
}

export function AccountPerformanceTable({ accounts, selectedIds, onToggle, currency }: AccountPerformanceTableProps) {
  const rows = useMemo(() => buildAccountRows(accounts), [accounts]);
  const totals = useMemo(() => sumTotals(accounts), [accounts]);
  const totalCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0';
  const cy = currency === 'BRL' ? 'R$' : '$';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          Performance por Empresa
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Cada empresa-alvo tem seu próprio conjunto de anúncios. Marque para filtrar o dashboard.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 w-8" />
              <th className="px-2 py-2.5 font-medium">Empresa</th>
              <th className="px-3 py-2.5 font-medium text-right">Spend</th>
              <th className="px-3 py-2.5 font-medium text-right">Impressões</th>
              <th className="px-3 py-2.5 font-medium text-right">Clicks</th>
              <th className="px-3 py-2.5 font-medium text-right">CTR</th>
              <th className="px-3 py-2.5 font-medium text-right">CPC</th>
              <th className="px-3 py-2.5 font-medium text-right">Conv.</th>
              <th className="px-3 py-2.5 font-medium text-right">Leads</th>
              <th className="px-4 py-2.5 font-medium text-right">CPL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(({ account, colorIndex, ctr, cpc, cpl }) => {
              const checked = selectedIds.has(account.accountId);
              return (
                <tr
                  key={account.accountId}
                  onClick={() => onToggle(account.accountId)}
                  className={`cursor-pointer transition-colors ${checked ? 'hover:bg-slate-50' : 'opacity-50 hover:opacity-75'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(account.accountId)}
                      onClick={e => e.stopPropagation()}
                      className="accent-[#FF5F39] cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accountColor(colorIndex) }} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{account.accountName}</p>
                        {account.industry && <p className="text-[11px] text-slate-400 truncate">{account.industry}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-800">{fmtCurrency(account.totals.costInLocalCurrency, currency)}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{fmtNum(account.totals.impressions)}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{fmtNum(account.totals.clicks)}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{ctr}%</td>
                  <td className="px-3 py-3 text-right text-slate-600">{cy}{cpc}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{account.totals.externalWebsiteConversions}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{account.totals.oneClickLeads}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{cpl ? `${cy}${cpl}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/60 text-slate-800 font-semibold">
              <td className="px-4 py-3" />
              <td className="px-2 py-3 text-xs uppercase tracking-wide text-slate-500">Total da campanha</td>
              <td className="px-3 py-3 text-right">{fmtCurrency(totals.costInLocalCurrency, currency)}</td>
              <td className="px-3 py-3 text-right">{fmtNum(totals.impressions)}</td>
              <td className="px-3 py-3 text-right">{fmtNum(totals.clicks)}</td>
              <td className="px-3 py-3 text-right">{totalCtr}%</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">{totals.externalWebsiteConversions}</td>
              <td className="px-3 py-3 text-right">{totals.oneClickLeads}</td>
              <td className="px-4 py-3 text-right">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
