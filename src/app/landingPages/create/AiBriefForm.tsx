// Guided AI brief form — collects a structured brief (not a blank prompt)
// used to deterministically compose a page via composePage(). Prefills the
// account name/industry from the selected account.
import { useMemo, useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { listAccounts, type LpAccount } from '../store/accounts';
import type { AiBrief } from './composer';

const OBJECTIVE_OPTIONS: { value: AiBrief['objective']; label: string; hint: string }[] = [
  { value: 'demo', label: 'Convite para demonstração', hint: 'Convidar a conta para uma demo ao vivo.' },
  { value: 'material', label: 'Material por vertical', hint: 'Página 1:muitos segmentada por setor.' },
  { value: 'poc', label: 'Prova de conceito (POC)', hint: 'Engajar a conta em uma avaliação guiada.' },
];

export interface AiBriefSubmission {
  brief: AiBrief;
  pageName: string;
}

interface AiBriefFormProps {
  onSubmit: (submission: AiBriefSubmission) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function AiBriefForm({ onSubmit, onCancel, submitting }: AiBriefFormProps) {
  const accounts = useMemo<LpAccount[]>(() => listAccounts(), []);
  const [objective, setObjective] = useState<AiBrief['objective']>('demo');
  const [accountId, setAccountId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [angle, setAngle] = useState('');
  const [pageName, setPageName] = useState('');

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const brief: AiBrief = {
      objective,
      accountName: selectedAccount?.name,
      industry: selectedAccount?.industry,
      message: message.trim() || undefined,
      angle: angle.trim() || undefined,
    };
    const defaultName = selectedAccount
      ? `${OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.label} · ${selectedAccount.name}`
      : OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.label ?? 'Landing Page gerada por IA';
    onSubmit({ brief, pageName: pageName.trim() || defaultName });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">Objetivo da página</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {OBJECTIVE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setObjective(opt.value)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                objective === opt.value
                  ? 'border-[#FF5F39] bg-[#FFF1ED] ring-1 ring-[#FF5F39]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-medium text-slate-900">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-1">{opt.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="ai-brief-account" className="block text-sm font-semibold text-slate-900 mb-2">
          Conta alvo
        </label>
        <select
          id="ai-brief-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
        >
          <option value="">Sem conta específica (genérico)</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.industry}
            </option>
          ))}
        </select>
        {selectedAccount && (
          <p className="text-xs text-slate-500 mt-1.5">
            A página será personalizada para <strong>{selectedAccount.name}</strong> (setor: {selectedAccount.industry}).
          </p>
        )}
      </div>

      <div>
        <label htmlFor="ai-brief-angle" className="block text-sm font-semibold text-slate-900 mb-2">
          Ângulo / gancho (opcional)
        </label>
        <input
          id="ai-brief-angle"
          type="text"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          placeholder="Ex: Proposta exclusiva para o time de marketing"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
        />
      </div>

      <div>
        <label htmlFor="ai-brief-message" className="block text-sm font-semibold text-slate-900 mb-2">
          Mensagem principal (opcional)
        </label>
        <textarea
          id="ai-brief-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Descreva o contexto ou a mensagem central que a IA deve destacar na página..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F39] resize-none"
        />
      </div>

      <div>
        <label htmlFor="ai-brief-name" className="block text-sm font-semibold text-slate-900 mb-2">
          Nome da página (opcional)
        </label>
        <input
          id="ai-brief-name"
          type="text"
          value={pageName}
          onChange={(e) => setPageName(e.target.value)}
          placeholder="Deixe em branco para gerar automaticamente"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F39]"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5F39] text-white rounded-lg text-sm font-medium hover:bg-[#E54A26] transition-colors shadow-sm disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4" />
          {submitting ? 'Gerando página…' : 'Gerar página com IA'}
        </button>
      </div>
    </form>
  );
}

export default AiBriefForm;
