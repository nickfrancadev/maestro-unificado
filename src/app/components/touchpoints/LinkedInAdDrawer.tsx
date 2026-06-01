import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Linkedin, Users, Image as ImageIcon, DollarSign, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { LinkedInAdData } from './TouchpointTimeline';

interface AudienceAccount { id: string; name: string; }
interface AudienceContact { id: string; name: string; role?: string; }

interface LinkedInAdDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (ad: LinkedInAdData) => void;
  initialAd?: LinkedInAdData;
  playName: string;
  availableAccounts: AudienceAccount[];
  availableContacts: AudienceContact[];
}

type Step = 1 | 2 | 3;

const OBJECTIVES = [
  { value: 'awareness', label: 'Brand Awareness', desc: 'Aumentar reconhecimento da marca' },
  { value: 'lead-gen', label: 'Lead Generation', desc: 'Capturar leads qualificados' },
  { value: 'conversions', label: 'Conversões', desc: 'Direcionar para uma ação específica' },
] as const;

const CTAS = ['Saiba mais', 'Cadastre-se', 'Baixar', 'Solicitar demo', 'Entrar em contato'];

export function LinkedInAdDrawer({
  isOpen,
  onClose,
  onPublish,
  initialAd,
  playName,
  availableAccounts,
  availableContacts,
}: LinkedInAdDrawerProps) {
  const [step, setStep] = useState<Step>(1);

  const [objective, setObjective] = useState<'awareness' | 'lead-gen' | 'conversions'>(
    initialAd?.objective || 'awareness'
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    initialAd?.audience?.accountIds ?? availableAccounts.map((a) => a.id)
  );
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    initialAd?.audience?.contactIds ?? availableContacts.map((c) => c.id)
  );

  const [headline, setHeadline] = useState(initialAd?.creative?.headline ?? '');
  const [description, setDescription] = useState(initialAd?.creative?.description ?? '');
  const [cta, setCta] = useState(initialAd?.creative?.cta ?? 'Saiba mais');
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialAd?.creative?.imageUrl);

  const [dailyBudget, setDailyBudget] = useState<number>(initialAd?.budget?.daily ?? 50);
  const [startDate, setStartDate] = useState(initialAd?.budget?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialAd?.budget?.endDate ?? '');

  const [publishing, setPublishing] = useState(false);

  if (!isOpen) return null;

  const estimatedReach = Math.round(
    (selectedAccountIds.length * 850 + selectedContactIds.length * 120) * (objective === 'awareness' ? 1.4 : 1)
  );

  const canAdvance = step === 1
    ? selectedAccountIds.length > 0 || selectedContactIds.length > 0
    : step === 2
    ? headline.trim().length > 0 && description.trim().length > 0
    : dailyBudget > 0 && !!startDate && !!endDate;

  const handlePublish = async () => {
    setPublishing(true);
    await new Promise((r) => setTimeout(r, 1000));
    const ad: LinkedInAdData = {
      status: 'published',
      objective,
      audience: { accountIds: selectedAccountIds, contactIds: selectedContactIds },
      creative: { headline, description, cta, imageUrl },
      budget: { daily: dailyBudget, startDate, endDate },
      adId: 'ad-' + Math.random().toString(36).slice(2, 9),
      publishedAt: new Date().toISOString(),
    };
    onPublish(ad);
    setPublishing(false);
    toast.success('Anúncio publicado no LinkedIn Ads!');
    onClose();
  };

  const toggleAccount = (id: string) =>
    setSelectedAccountIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleContact = (id: string) =>
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageUrl(URL.createObjectURL(f));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[560px] h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0a66c2] flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#212a46] text-base">Criar LinkedIn Ad</h2>
              <p className="text-xs text-gray-500">Play: {playName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-gray-200 bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            {([1, 2, 3] as Step[]).map((s, idx) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s ? 'bg-[#0a66c2] text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-[#212a46]' : 'text-gray-400'}`}>
                  {s === 1 ? 'Objetivo + Audiência' : s === 2 ? 'Criativo' : 'Orçamento'}
                </span>
                {idx < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-[#0a66c2]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Objetivo da campanha</label>
                <div className="grid grid-cols-1 gap-2">
                  {OBJECTIVES.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setObjective(o.value)}
                      className={`text-left px-4 py-3 rounded-lg border transition-all ${
                        objective === o.value
                          ? 'border-[#0a66c2] bg-[#e3f0ff]'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-sm text-[#212a46]">{o.label}</div>
                      <div className="text-xs text-gray-500">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Contas da play
                  </label>
                  <span className="text-xs text-gray-400">{selectedAccountIds.length}/{availableAccounts.length}</span>
                </div>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {availableAccounts.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400">Nenhuma conta vinculada à play</div>
                  )}
                  {availableAccounts.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedAccountIds.includes(a.id)}
                        onChange={() => toggleAccount(a.id)}
                        className="accent-[#0a66c2]"
                      />
                      <span className="text-sm text-[#212a46]">{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Contatos da play
                  </label>
                  <span className="text-xs text-gray-400">{selectedContactIds.length}/{availableContacts.length}</span>
                </div>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {availableContacts.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400">Nenhum contato vinculado à play</div>
                  )}
                  {availableContacts.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(c.id)}
                        onChange={() => toggleContact(c.id)}
                        className="accent-[#0a66c2]"
                      />
                      <div className="text-sm text-[#212a46]">
                        {c.name}
                        {c.role && <span className="text-xs text-gray-400 ml-1">· {c.role}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#0a66c2]/30 bg-[#e3f0ff]/40 px-4 py-3 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-[#0a66c2]" />
                <div className="text-xs text-[#212a46]">
                  Estimativa de alcance: <strong>~{estimatedReach.toLocaleString('pt-BR')}</strong> profissionais
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Título do anúncio</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value.slice(0, 150))}
                  placeholder="Ex.: Acelere seu ABM com inteligência de conta"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2]"
                />
                <p className="text-[10px] text-gray-400 mt-1">{headline.length}/150</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 600))}
                  placeholder="Conte o que faz seu produto único para essa audiência"
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">{description.length}/600</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Imagem
                </label>
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="preview" className="w-full h-40 object-cover rounded-lg border border-gray-200" />
                    <button
                      onClick={() => setImageUrl(undefined)}
                      className="absolute top-2 right-2 bg-white/90 rounded-full p-1 hover:bg-white"
                    >
                      <X className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center py-8 cursor-pointer hover:border-[#0a66c2] hover:bg-gray-50">
                    <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Clique para enviar uma imagem</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Call to action</label>
                <select
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0a66c2]"
                >
                  {CTAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Orçamento diário (R$)
                </label>
                <input
                  type="number"
                  min={1}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Fim</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2]"
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-2 bg-[#f8fafc]">
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Resumo</h3>
                <div className="text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Objetivo</span>
                    <span className="font-medium text-[#212a46]">
                      {OBJECTIVES.find((o) => o.value === objective)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Audiência</span>
                    <span className="font-medium text-[#212a46]">
                      {selectedAccountIds.length} contas · {selectedContactIds.length} contatos
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Headline</span>
                    <span className="font-medium text-[#212a46] truncate max-w-[260px]">{headline || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">CTA</span>
                    <span className="font-medium text-[#212a46]">{cta}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Orçamento diário</span>
                    <span className="font-medium text-[#212a46]">R$ {dailyBudget}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((step - 1) as Step))}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-[#212a46] flex items-center gap-1"
          >
            {step === 1 ? (
              'Cancelar'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </>
            )}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canAdvance}
              className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-1 transition-all ${
                canAdvance
                  ? 'bg-[#0a66c2] text-white hover:bg-[#084d92]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Avançar
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={!canAdvance || publishing}
              className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
                canAdvance && !publishing
                  ? 'bg-[#0a66c2] text-white hover:bg-[#084d92]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Linkedin className="w-4 h-4" />
              {publishing ? 'Publicando...' : 'Publicar no LinkedIn Ads'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
