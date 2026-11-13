import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Linkedin,
  Target,
  Megaphone,
  DollarSign,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { CampaignConfig, ManualBidding } from './types';
import { OBJECTIVE_MAP, MIN_BUDGET_PER_AD_SET, effectiveCostType } from './types';
import type { LinkedInIntegrationStatus } from '@/lib/linkedin';
import { currencySymbol as symbolFor, fmtMoney, spendStatement, DAYS_PER_MONTH } from '../format';
import { plural } from '../labels';

interface ConfigStepProps {
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  linkedinStatus: LinkedInIntegrationStatus | null;
  /** Empresas já escolhidas na Segmentação (0 na primeira passada). Multiplica o orçamento. */
  adSetCount?: number;
  /** O usuário tentou avançar: mostra os erros dos campos obrigatórios mesmo sem toque. */
  showErrors?: boolean;
}

/** Erros dos campos obrigatórios. Puro: o wizard e o teste usam a mesma regra. */
export function configErrors(config: CampaignConfig): { campaignName?: string; budgetAmount?: string } {
  const errors: { campaignName?: string; budgetAmount?: string } = {};
  if (!config.campaignName.trim()) errors.campaignName = 'Dê um nome à campanha';
  const budget = parseFloat(config.budgetAmount);
  const kind = config.budgetType === 'daily' ? 'diário' : 'total';
  if (!config.budgetAmount.trim() || Number.isNaN(budget)) errors.budgetAmount = `Informe o orçamento ${kind}`;
  else if (budget < MIN_BUDGET_PER_AD_SET) errors.budgetAmount = `O LinkedIn aceita no mínimo ${MIN_BUDGET_PER_AD_SET} por empresa`;
  return errors;
}

export function ConfigStep({ config, onChange, linkedinStatus, adSetCount = 0, showErrors = false }: ConfigStepProps) {
  const update = (partial: Partial<CampaignConfig>) => {
    onChange({ ...config, ...partial });
  };

  // Erro só depois de interagir: ao sair do campo ou ao tentar avançar. Antes,
  // a tela abria com tudo em vermelho e o rodapé já dizia o que faltava.
  const [touched, setTouched] = useState<{ campaignName?: boolean; budgetAmount?: boolean }>({});
  const errors = configErrors(config);
  const errorFor = (field: 'campaignName' | 'budgetAmount') =>
    (touched[field] || showErrors) ? errors[field] : undefined;

  const handleObjectiveChange = (val: string) => {
    const mapped = OBJECTIVE_MAP[val];
    if (mapped) {
      // Lance manual que o novo objetivo não aceita volta para o automático,
      // para a tela nunca mostrar uma combinação que o LinkedIn recusa.
      const keepBid = config.biddingStrategy === 'automated'
        || mapped.manualBidding.includes(config.biddingStrategy as ManualBidding);
      const biddingStrategy = keepBid ? config.biddingStrategy : 'automated';
      update({
        objective: val,
        campaignType: mapped.type,
        biddingStrategy,
        costType: effectiveCostType({ objective: val, biddingStrategy }),
      });
    } else {
      update({ objective: val });
    }
  };

  const handleBiddingChange = (biddingStrategy: CampaignConfig['biddingStrategy']) => {
    update({ biddingStrategy, costType: effectiveCostType({ objective: config.objective, biddingStrategy }) });
  };

  const currency = linkedinStatus?.selected_ad_account_currency || 'BRL';
  const currencySymbol = symbolFor(currency);
  const objective = OBJECTIVE_MAP[config.objective];
  const perAdSet = parseFloat(config.budgetAmount) || 0;
  const per = config.budgetType === 'daily' ? 'por dia' : 'no total';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Configurar Campanha</h2>
        <p className="text-sm text-slate-500 mt-1">
          Defina os dados básicos da campanha antes de configurar a segmentação e criativo.
        </p>
      </div>

      {/* LinkedIn Status Banner */}
      {linkedinStatus?.status === 'connected' && linkedinStatus.selected_ad_account_id ? (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
          <Linkedin className="w-5 h-5 text-[#0077b5] shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-green-800">
              Conta conectada: {linkedinStatus.selected_ad_account_name || 'LinkedIn Ads'}
            </span>
            <span className="text-xs text-green-600 ml-2">
              Moeda: {currency}
            </span>
            {currency !== 'BRL' && (
              // Conta em dólar: o orçamento e o lance abaixo são cobrados em
              // {currency}, não em reais. Fácil de errar a ordem de grandeza.
              <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Esta conta cobra em {currency}: orçamento e lance abaixo são em {currencySymbol}, não em reais.
              </p>
            )}
          </div>
          <Link to="/integrations" className="text-xs font-medium text-green-700 hover:text-green-900 hover:underline shrink-0">
            Trocar conta
          </Link>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {linkedinStatus?.status !== 'connected'
                ? 'LinkedIn não conectado. Conecte em Integrações antes de publicar.'
                : 'Escolha a conta de anúncios em Integrações.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Identificação — Group + Campaigns */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF1ED] flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[#FF5F39]" />
            </div>
            <h3 className="font-semibold text-slate-800">Identificação</h3>
          </div>

          <div className="space-y-5">
            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                Nome da Campanha *
              </label>
              <input
                type="text"
                value={config.campaignName}
                onChange={(e) => update({ campaignName: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, campaignName: true }))}
                aria-invalid={!!errorFor('campaignName')}
                placeholder="Ex.: Q1 2026 Reconhecimento fintechs"
                className={`w-full p-2.5 text-sm border rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-[#FF5F39] outline-none placeholder:text-slate-400 ${errorFor('campaignName') ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errorFor('campaignName') && (
                <p className="text-xs text-red-600 mt-1">{errorFor('campaignName')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Card: Objetivo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Objetivo</h3>
          </div>

          <div className="space-y-2">
            {Object.entries(OBJECTIVE_MAP).map(([key, obj]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  config.objective === key
                    ? 'border-[#FF5F39] bg-[#FFF1ED] ring-1 ring-[#FF5F39]'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="objective"
                  value={key}
                  checked={config.objective === key}
                  onChange={() => handleObjectiveChange(key)}
                  className="mt-0.5 accent-[#FF5F39]"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800">{obj.label}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{obj.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{obj.costLabel}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Card: Orçamento & Agenda */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Orçamento & Agenda</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                Tipo de orçamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['daily', 'total'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => update({ budgetType: type })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      config.budgetType === type
                        ? 'border-[#FF5F39] bg-[#FFF1ED] text-[#E54A26]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'daily' ? 'Diário' : 'Total'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                Orçamento {config.budgetType === 'daily' ? 'diário' : 'total'} por empresa ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-medium">{currencySymbol}</span>
                <input
                  type="number"
                  value={config.budgetAmount}
                  onChange={(e) => update({ budgetAmount: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, budgetAmount: true }))}
                  aria-invalid={!!errorFor('budgetAmount')}
                  min={MIN_BUDGET_PER_AD_SET}
                  step="10"
                  placeholder="Ex.: 50"
                  className={`w-full p-2.5 pl-12 text-sm border rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-[#FF5F39] ${errorFor('budgetAmount') ? 'border-red-300' : 'border-slate-200'}`}
                />
              </div>
              {errorFor('budgetAmount') && (
                <p className="text-xs text-red-600 mt-1">{errorFor('budgetAmount')}</p>
              )}
              {/* O valor é por conjunto e cada empresa é um conjunto: a conta
                  fica escrita aqui, não só na Revisão. */}
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {adSetCount > 0 && perAdSet > 0
                  ? config.budgetType === 'daily'
                    ? `Por empresa. Com ${plural(adSetCount, 'empresa')}, você vai gastar até ${fmtMoney(perAdSet * adSetCount, currency)} por dia (≈ ${fmtMoney(perAdSet * adSetCount * DAYS_PER_MONTH, currency)} por mês).`
                    : `Por empresa. Com ${plural(adSetCount, 'empresa')}, você vai gastar até ${fmtMoney(perAdSet * adSetCount, currency)} no total.`
                  : `Por empresa. O valor é multiplicado pelo número de empresas que você escolher no passo 2.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Data de início
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => update({ startDate: e.target.value })}
                    className="w-full pl-9 p-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:ring-2 focus:ring-[#FF5F39]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Encerramento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={config.endDate}
                    min={config.startDate}
                    onChange={(e) => update({ endDate: e.target.value })}
                    className="w-full pl-9 p-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:ring-2 focus:ring-[#FF5F39]"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Opcional. Sem data, segue até você pausar.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Otimização & Bidding */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF1ED] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#FF5F39]" />
            </div>
            <h3 className="font-semibold text-slate-800">Lance e publicação</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Estratégia de lance
                </label>
                <div className="space-y-2">
                  {([
                    { value: 'automated', label: 'Automático', desc: `O LinkedIn define o lance. Recomendado. ${objective?.costLabel ?? ''}.` },
                    { value: 'manual_cpm', label: 'Manual, por mil impressões (CPM)', desc: 'Você define quanto paga, no máximo, a cada 1.000 vezes que o anúncio aparece.' },
                    { value: 'manual_cpc', label: 'Manual, por clique (CPC)', desc: 'Você define quanto paga, no máximo, por clique.' },
                  ] as const).map((opt) => {
                    // Só oferece o lance que o LinkedIn aceita para o objetivo.
                    const unavailable = opt.value !== 'automated' && !objective?.manualBidding.includes(opt.value);
                    return (
                    <label
                      key={opt.value}
                      title={unavailable ? `Não disponível para ${objective?.label ?? 'este objetivo'}` : undefined}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        unavailable
                          ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
                          : config.biddingStrategy === opt.value
                            ? 'border-[#FF5F39] bg-[#FFF1ED] ring-1 ring-[#FF5F39] cursor-pointer'
                            : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bidding"
                        value={opt.value}
                        disabled={unavailable}
                        checked={config.biddingStrategy === opt.value}
                        onChange={() => handleBiddingChange(opt.value)}
                        className="mt-0.5 accent-[#FF5F39]"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {unavailable ? `Não disponível para ${objective?.label ?? 'este objetivo'}.` : opt.desc}
                        </p>
                      </div>
                    </label>
                    );
                  })}
                </div>
              </div>

              {config.biddingStrategy !== 'automated' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Lance máximo ({config.biddingStrategy === 'manual_cpm' ? 'a cada mil impressões' : 'por clique'})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-medium">{currencySymbol}</span>
                    <input
                      type="number"
                      min="2"
                      step="0.5"
                      value={config.unitCostAmount}
                      onChange={(e) => update({ unitCostAmount: e.target.value })}
                      placeholder="Ex.: 15"
                      className="w-full pl-12 p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-[#FF5F39]"
                    />
                  </div>
                  {config.unitCostAmount && parseFloat(config.unitCostAmount) < 2 && (
                    <p className="text-xs text-red-600 mt-1">Lance mínimo: {fmtMoney(2, currency)}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Publicar já ativa</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {config.autoActivate
                        ? 'Os anúncios entram no ar assim que forem criados.'
                        : 'Os anúncios são criados pausados. Você ativa quando quiser.'}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={config.autoActivate}
                    aria-label="Publicar já ativa"
                    onClick={() => update({ autoActivate: !config.autoActivate })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] shrink-0 ${
                      config.autoActivate ? 'bg-[#FF5F39]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                        config.autoActivate ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {config.autoActivate && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>O gasto começa assim que os anúncios forem criados.</span>
                  </div>
                )}
              </div>

              {/* Summary box */}
              <div className="bg-[#FFF1ED] rounded-xl border border-[#FFD0C2] p-4">
                <h4 className="text-xs font-semibold text-[#E54A26] uppercase mb-2">Resumo</h4>
                <div className="space-y-1.5 text-sm text-[#212A46]">
                  <div className="flex justify-between">
                    <span className="text-[#FF5F39]">Campanha:</span>
                    <span className="font-medium truncate ml-2 max-w-[60%] text-right">{config.campaignName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#FF5F39]">Objetivo:</span>
                    <span className="font-medium">{OBJECTIVE_MAP[config.objective]?.label || config.objective}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#FF5F39]">Por empresa:</span>
                    <span className="font-medium">{perAdSet > 0 ? `${fmtMoney(perAdSet, currency)} ${per}` : '—'}</span>
                  </div>
                  {adSetCount > 0 && perAdSet > 0 && (
                    <p className="text-xs text-[#212A46] pt-1 border-t border-[#FFD0C2]">
                      {spendStatement({ perAdSet, adSets: adSetCount, budgetType: config.budgetType, currency, startDate: config.startDate, endDate: config.endDate }).headline}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
