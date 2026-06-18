import React, { useMemo } from 'react';
import { Building2, ChevronRight, ChevronDown } from 'lucide-react';
import type { AccountAnalytics } from '@/lib/linkedin';
import { sumTotals } from '@/lib/linkedin';
import { accountColor, buildAccountRows } from './accountAnalytics';
import { AccountDetailPanel } from './AccountDetailPanel';
import { fmtCurrency, fmtNum } from './format';

interface AccountPerformanceTableProps {
  accounts: AccountAnalytics[];   // todas as contas, na ordem original (cores estáveis)
  selectedIds: Set<string>;
  onToggle: (accountId: string) => void;
  onOpenDetail: (accountId: string) => void;
  expandedId: string | null;
  expandInline: boolean;          // true no desktop → renderiza AccountDetailPanel sob a linha
  currency: string;
}

type SortKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'conv' | 'leads' | 'cpl';

export function AccountPerformanceTable({ accounts, selectedIds, onToggle, onOpenDetail, expandedId, expandInline, currency }: AccountPerformanceTableProps) {
  const rows = useMemo(() => buildAccountRows(accounts), [accounts]);
  const totals = useMemo(() => sumTotals(accounts), [accounts]);
  const totalCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0';
  const totalCpc = totals.clicks > 0 ? (totals.costInLocalCurrency / totals.clicks).toFixed(2) : '0';
  const totalCpl = totals.oneClickLeads > 0 ? (totals.costInLocalCurrency / totals.oneClickLeads).toFixed(2) : null;
  const cy = currency === 'BRL' ? 'R$' : '$';

  const [sortKey, setSortKey] = React.useState<SortKey>('spend');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const sortVal = (r: typeof rows[number], k: SortKey): number => {
    const t = r.account.totals;
    switch (k) {
      case 'spend': return t.costInLocalCurrency;
      case 'impressions': return t.impressions;
      case 'clicks': return t.clicks;
      case 'ctr': return parseFloat(r.ctr);
      case 'cpc': return parseFloat(r.cpc);
      case 'conv': return t.externalWebsiteConversions;
      case 'leads': return t.oneClickLeads;
      case 'cpl': return r.cpl ? parseFloat(r.cpl) : -1;
    }
  };

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => (sortVal(a, sortKey) - sortVal(b, sortKey)) * (sortDir === 'asc' ? 1 : -1));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  };

  const maxSpend = Math.max(1, ...rows.map(r => r.account.totals.costInLocalCurrency));
  const maxImpr = Math.max(1, ...rows.map(r => r.account.totals.impressions));

  const SortableTh = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      onClick={() => onSort(k)}
      aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-3 py-2.5 font-medium text-right cursor-pointer select-none hover:text-slate-600"
    >
      <span className="inline-flex items-center gap-1 justify-end">
        {children}
        <span className="text-slate-300">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          Performance por Empresa
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Cada empresa-alvo tem seu próprio conjunto de anúncios. Clique numa linha para ver o detalhe; marque para filtrar o dashboard.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th className="px-4 py-2.5 w-8" />
              <th className="px-2 py-2.5 font-medium">Empresa</th>
              <SortableTh k="spend">Spend</SortableTh>
              <SortableTh k="impressions">Impressões</SortableTh>
              <SortableTh k="clicks">Clicks</SortableTh>
              <SortableTh k="ctr">CTR</SortableTh>
              <SortableTh k="cpc">CPC</SortableTh>
              <SortableTh k="conv">Conv.</SortableTh>
              <SortableTh k="leads">Leads</SortableTh>
              <SortableTh k="cpl">CPL</SortableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedRows.map(({ account, colorIndex, ctr, cpc, cpl }) => {
              const checked = selectedIds.has(account.accountId);
              const expanded = expandedId === account.accountId;
              return (
                <React.Fragment key={account.accountId}>
                  <tr
                    onClick={() => onOpenDetail(account.accountId)}
                    className={`cursor-pointer transition-colors ${checked ? 'hover:bg-slate-50' : 'opacity-50 hover:opacity-75'} ${expanded ? 'bg-slate-50' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(account.accountId)}
                        className="accent-[#FF5F39] cursor-pointer"
                        aria-label={`Filtrar ${account.accountName}`}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        {expandInline && (expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />)}
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accountColor(colorIndex) }} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{account.accountName}</p>
                          {account.industry && <p className="text-[11px] text-slate-400 truncate">{account.industry}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-800">
                      <span className="inline-flex items-center gap-2 justify-end w-full">
                        <span className="h-1.5 rounded-full" style={{ width: `${Math.round((account.totals.costInLocalCurrency / maxSpend) * 40)}px`, backgroundColor: accountColor(colorIndex) }} />
                        {fmtCurrency(account.totals.costInLocalCurrency, currency)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      <span className="inline-flex items-center gap-2 justify-end w-full">
                        <span className="h-1.5 rounded-full bg-slate-300" style={{ width: `${Math.round((account.totals.impressions / maxImpr) * 40)}px` }} />
                        {fmtNum(account.totals.impressions)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">{fmtNum(account.totals.clicks)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{ctr}%</td>
                    <td className="px-3 py-3 text-right text-slate-600">{cy}{cpc}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{account.totals.externalWebsiteConversions}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{account.totals.oneClickLeads}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{cpl ? `${cy}${cpl}` : '—'}</td>
                  </tr>
                  {expandInline && expanded && (
                    <tr>
                      <td colSpan={10} className="p-0">
                        <AccountDetailPanel account={account} colorIndex={colorIndex} currency={currency} variant="inline" />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
              <td className="px-3 py-3 text-right">{cy}{totalCpc}</td>
              <td className="px-3 py-3 text-right">{totals.externalWebsiteConversions}</td>
              <td className="px-3 py-3 text-right">{totals.oneClickLeads}</td>
              <td className="px-4 py-3 text-right">{totalCpl ? `${cy}${totalCpl}` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
