import { useState } from "react";
import { GtmProduto, GtmMomento, GtmPublico, GtmPitch } from "../gtmStore";
import { Sparkles, X, Check, Copy } from "lucide-react";

export function PitchGenerator({
  produtos,
  momentos,
  publicos,
  onClose,
  onSave,
  onLink,
  initialData,
}: {
  produtos: GtmProduto[];
  momentos: GtmMomento[];
  publicos: GtmPublico[];
  onClose: () => void;
  onSave: (p: GtmPitch) => void;
  onLink?: (produtoId: string, momentoId: string, publicoId: string) => void;
  initialData?: { produtoId?: string; momentoId?: string; publicoId?: string };
}) {
  const [step, setStep] = useState<"form" | "gerando" | "resultado">("form");
  const [form, setForm] = useState({
    produtoId: initialData?.produtoId || "",
    momentoId: initialData?.momentoId || "",
    publicoId: initialData?.publicoId || "",
    contexto: "",
    tom: "Consultivo",
    canal: "E-mail",
  });
  const [pitch, setPitch] = useState("");
  const [copied, setCopied] = useState(false);

  const gerarPitch = () => {
    setStep("gerando");

    // Auto-link relations on generate
    if (onLink && form.produtoId) {
      onLink(form.produtoId, form.momentoId, form.publicoId);
    }

    setTimeout(() => {
      const prod = produtos.find(p => p.id === form.produtoId);
      const mom = momentos.find(m => m.id === form.momentoId);
      const pub = publicos.find(p => p.id === form.publicoId);

      const pNome = prod?.nome || "nossa solução";
      const mNome = mom?.titulo || "este momento do mercado";
      const pubNome = pub?.nome || "sua equipe";

      let generated = "";
      if (form.canal === "LinkedIn") {
        generated = `Fala [Nome],\n\nVi que você está liderando o time em meio a ${mNome}. Com esse cenário, muitos líderes como você têm buscado formas de adaptar a operação.\n\nAqui na [Empresa], ajudamos times com o perfil de ${pubNome} a superar exatamente isso usando ${pNome}.\n\nFaz sentido trocarmos uma ideia rápida sobre isso?`;
      } else {
        generated = `Olá [Nome],\n\nEm ${mNome}, empresas como a sua estão enfrentando decisões críticas — e é exatamente aí que ${pNome} se destaca.\n\nPensando especificamente no perfil de ${pubNome}, desenvolvemos uma abordagem mais ${form.tom.toLowerCase()}.\n\nQue tal agendar 20 minutos para mostrar como adaptamos isso ao contexto da [Empresa]?\n\nAtt,\n[Seu Nome]`;
      }

      setPitch(generated);
      setStep("resultado");
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const prod = produtos.find(p => p.id === form.produtoId);
    const mom = momentos.find(m => m.id === form.momentoId);
    const pub = publicos.find(p => p.id === form.publicoId);

    onSave({
      id: "pit" + Date.now(),
      produto: prod?.nome || "",
      momento: mom?.titulo || "",
      publico: pub?.nome || "",
      conteudo: pitch,
      geradoEm: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
      tom: form.tom,
      canal: form.canal,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#212A46]">
              <Sparkles size={16} className="text-[#FF5F39]" />
            </div>
            <div>
              <span className="font-bold text-gray-900 block">Gerador de Pitch</span>
              <span className="text-xs text-gray-500">Impulsionado por Inteligência Artificial</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {step === "form" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Variáveis Base</h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Produto / Serviço</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]" value={form.produtoId} onChange={e => setForm(f => Object.assign({}, f, { produtoId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Momento de Mercado</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]" value={form.momentoId} onChange={e => setForm(f => Object.assign({}, f, { momentoId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {momentos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Público</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]" value={form.publicoId} onChange={e => setForm(f => Object.assign({}, f, { publicoId: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {publicos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Direcionamento da IA</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Tom de Voz</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]" value={form.tom} onChange={e => setForm(f => Object.assign({}, f, { tom: e.target.value }))}>
                      <option>Consultivo</option>
                      <option>Agressivo (Sales)</option>
                      <option>Técnico</option>
                      <option>Inovador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Canal</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]" value={form.canal} onChange={e => setForm(f => Object.assign({}, f, { canal: e.target.value }))}>
                      <option>E-mail</option>
                      <option>LinkedIn</option>
                      <option>Cold Call (Script)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Contexto Específico (Opcional)</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] resize-none h-28" placeholder="Ex: Mencionar que vimos o post dele sobre redução de custos..." value={form.contexto} onChange={e => setForm(f => Object.assign({}, f, { contexto: e.target.value }))} />
                </div>
              </div>
            </div>
          ) : null}

          {step === "gerando" && (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#212A46] flex items-center justify-center animate-pulse mb-4">
                <Sparkles size={28} className="text-[#FF5F39]" />
              </div>
              <p className="text-gray-900 font-bold text-lg">Criando a abordagem ideal...</p>
              <p className="text-gray-500 text-sm mt-1">Cruzando os dados de Produto, Momento e Público...</p>
            </div>
          )}

          {step === "resultado" && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-green-600 flex items-center gap-1.5"><Check size={16} /> Pitch Pronto!</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors">
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} {copied ? "Copiado" : "Copiar Texto"}
                </button>
              </div>
              <textarea className="flex-1 w-full border border-gray-200 rounded-lg px-4 py-4 text-sm text-gray-800 outline-none focus:border-[#FF5F39] resize-none font-mono min-h-[250px]" value={pitch} onChange={e => setPitch(e.target.value)} />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
          {step === "form" && (
            <>
              <button onClick={onClose} className="px-5 py-2 rounded-lg font-semibold text-sm text-gray-600 hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={gerarPitch} className="px-6 py-2 rounded-lg font-bold text-sm text-white bg-[#FF5F39] hover:bg-[#E04D2A] transition-colors flex items-center gap-2 shadow-sm"><Sparkles size={16} /> Gerar Pitch</button>
            </>
          )}
          {step === "resultado" && (
            <>
              <button onClick={() => setStep("form")} className="px-5 py-2 rounded-lg font-semibold text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors">Ajustar Variáveis</button>
              <button onClick={handleSave} className="px-6 py-2 rounded-lg font-bold text-sm text-white bg-[#212A46] hover:bg-[#1a2138] transition-colors shadow-sm">Salvar na Biblioteca</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}