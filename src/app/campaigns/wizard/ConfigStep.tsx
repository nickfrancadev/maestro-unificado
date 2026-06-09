import React from 'react';
import {
  Calendar,
  Info,
  Linkedin,
  Target,
  Megaphone,
  DollarSign,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { CampaignConfig } from './types';
import { OBJECTIVE_MAP } from './types';
import type { LinkedInIntegrationStatus } from '@/lib/linkedin';

interface ConfigStepProps {
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  linkedinStatus: LinkedInIntegrationStatus | null;
}

export function ConfigStep({ config, onChange, linkedinStatus }: ConfigStepProps) {
  const update = (partial: Partial<CampaignConfig>) => {
    onChange({ ...config, ...partial });
  };

  const handleObjectiveChange = (val: string) => {
    const mapped = OBJECTIVE_MAP[val];
    if (mapped) {
      update({
        objective: val,
        campaignType: mapped.type,
        costType: mapped.costType,
      });
    } else {
      update({ objective: val });
    }
  };

  const currency = linkedinStatus?.selected_ad_account_currency || 'BRL';
  const currencySymbol = currency === 'BRL' ? 'R$' : '$';

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
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {linkedinStatus?.status !== 'connected'
                ? 'LinkedIn não conectado. Conecte em Integrações antes de lançar.'
                : 'Selecione uma Ad Account na página de Integrações.'}
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
                placeholder="Ex: Nubank — Q1 2026 Brand Awareness"
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-[#FF5F39] outline-none placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Cada empresa-alvo vira um conjunto de anúncio dentro desta campanha. Use variáveis como <code className="bg-slate-100 px-1 rounded text-xs">{'{{company.name}}'}</code> para personalizar.
              </p>
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
                  <span className="text-[10px] font-mono text-slate-400 ml-2 uppercase">{obj.costType}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{obj.description}</p>
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
                Valor por campanha ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-medium">{currencySymbol}</span>
                <input
                  type="number"
                  value={config.budgetAmount}
                  onChange={(e) => update({ budgetAmount: e.target.value })}
                  min="10"
                  step="10"
                  className="w-full p-2.5 pl-10 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-[#FF5F39]"
                />
              </div>
              {parseFloat(config.budgetAmount) > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Orçamento por conjunto de anúncio (cada empresa-alvo).
                </p>
              )}
              {parseFloat(config.budgetAmount) > 0 && parseFloat(config.budgetAmount) < 10 && (
                <p className="text-xs text-red-500 mt-1">Budget mínimo: {currencySymbol}10{config.budgetType === 'daily' ? '/dia' : ''}</p>
              )}
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
                <p className="text-xs text-slate-400 mt-1">Opcional (campanha contínua).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Otimização & Bidding */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Otimização & Bidding</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Estratégia de lance
                </label>
                <div className="space-y-2">
                  {([
                    { value: 'automated', label: 'Automático', desc: 'O LinkedIn otimiza lances automaticamente. Recomendado.' },
                    { value: 'manual_cpm', label: 'Manual — CPM', desc: 'Defina o lance máximo por 1.000 impressões.' },
                    { value: 'manual_cpc', label: 'Manual — CPC', desc: 'Defina o lance máximo por clique.' },
                  ] as const).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        config.biddingStrategy === opt.value
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bidding"
                        value={opt.value}
                        checked={config.biddingStrategy === opt.value}
                        onChange={() => update({ biddingStrategy: opt.value })}
                        className="mt-0.5 accent-violet-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {config.biddingStrategy !== 'automated' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Lance máximo ({config.biddingStrategy === 'manual_cpm' ? 'CPM' : 'CPC'})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-medium">{currencySymbol}</span>
                    <input
                      type="number"
                      min="2"
                      step="0.5"
                      value={config.unitCostAmount}
                      onChange={(e) => update({ unitCostAmount: e.target.value })}
                      placeholder="Ex: 15.00"
                      className="w-full pl-10 p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  {config.unitCostAmount && parseFloat(config.unitCostAmount) < 2 && (
                    <p className="text-xs text-red-500 mt-1">Lance mínimo: {currencySymbol}2,00</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Auto-ativar campanhas</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {config.autoActivate
                        ? 'Todas as campanhas serão ativadas automaticamente.'
                        : 'Campanhas criadas como PAUSED. Ative manualmente depois.'}
                    </p>
                  </div>
                  <button
                    onClick={() => update({ autoActivate: !config.autoActivate })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                      config.autoActivate ? 'bg-green-600' : 'bg-slate-300'
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
                    <span>As campanhas começarão a gastar orçamento imediatamente após a criação.</span>
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
                    <span className="text-[#FF5F39]">Budget/conjunto:</span>
                    <span className="font-medium">{currencySymbol}{config.budgetAmount} {config.budgetType === 'daily' ? '/dia' : 'total'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
