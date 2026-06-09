import { useState, useEffect } from "react";
import { X, Package, Calendar, Users } from "lucide-react";
import { GtmProduto, GtmMomento, GtmPublico } from "../gtmStore";

// --- Helpers ---
const inputStyle = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] transition-colors";
const selectStyle = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] transition-colors appearance-none";

function DrawerOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[#212a46]/30 backdrop-blur-[1px] z-[999] transition-opacity"
    />
  );
}

function DrawerLayout({ children, onClose, title, subtitle, icon: Icon, color }: { children: React.ReactNode, onClose: () => void, title: string, subtitle: string, icon: any, color: string }) {
  return (
    <>
      <DrawerOverlay onClose={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[500px] bg-white z-[1000] shadow-[-4px_0_32px_rgba(33,42,70,0.14)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: color }}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">{title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// --- Modals converted to Drawers ---

export function ProdutoDrawer({ onClose, onSave, produtos, momentos, publicos, initialData }: { onClose: () => void, onSave: (p: GtmProduto) => void, produtos: GtmProduto[], momentos: GtmMomento[], publicos: GtmPublico[], initialData?: GtmProduto | null }) {
  const [form, setForm] = useState<Partial<GtmProduto>>({
    tipo: "Produto",
    nome: "",
    descricao: "",
    preco: 0,
    unidade: "mês",
    status: "Ativo",
    momentosIds: [],
    publicosIds: []
  });

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const toggleList = (list: string[] = [], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  return (
    <DrawerLayout title={initialData ? "Editar Solução" : "Novo Produto/Serviço"} subtitle="Cadastro" icon={Package} color="#3571de" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Tipo</label>
          <div className="flex gap-2">
            {(["Produto", "Serviço", "Treinamento"] as const).map(t => (
              <button key={t} onClick={() => setForm(f => Object.assign({}, f, { tipo: t }))} className={"flex-1 py-2 rounded-lg border text-sm font-semibold transition-all " + (form.tipo === t ? 'border-[#3571de] bg-blue-50 text-[#3571de]' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {t}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Nome da Solução</label>
          <input className={inputStyle} value={form.nome} onChange={e => setForm(f => Object.assign({}, f, {nome: e.target.value}))} placeholder="Ex: Plataforma de CRM" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Descrição</label>
          <textarea className={inputStyle} rows={3} value={form.descricao} onChange={e => setForm(f => Object.assign({}, f, {descricao: e.target.value}))} placeholder="Descreva de forma clara..." />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Preço (R$)</label>
            <input type="number" className={inputStyle} value={form.preco || ""} onChange={e => setForm(f => Object.assign({}, f, {preco: Number(e.target.value)}))} placeholder="0,00" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Cobrança</label>
            <select className={selectStyle} value={form.unidade} onChange={e => setForm(f => Object.assign({}, f, {unidade: e.target.value}))}>
              {["mês", "ano", "projeto", "hora", "pessoa", "uso"].map(u => <option key={u} value={u}>Por {u}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Momentos Alvo</label>
          <div className="space-y-2">
            {momentos.map(m => (
              <label key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" checked={form.momentosIds?.includes(m.id) || false} onChange={() => setForm(f => Object.assign({}, f, {momentosIds: toggleList(f.momentosIds, m.id)}))} />
                <span className="text-sm text-gray-700">{m.titulo}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 pb-4">
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Públicos Alvo</label>
          <div className="space-y-2">
            {publicos.map(p => (
              <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" checked={form.publicosIds?.includes(p.id) || false} onChange={() => setForm(f => Object.assign({}, f, {publicosIds: toggleList(f.publicosIds, p.id)}))} />
                <span className="text-sm text-gray-700">{p.nome}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-5 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
        <button onClick={() => { if(form.nome) { onSave(Object.assign({}, form, { id: initialData?.id || "p"+Date.now(), pmfRating: initialData?.pmfRating || 0 }) as GtmProduto); onClose(); } }} className="flex-[2] py-2.5 rounded-xl bg-[#3571de] text-white text-sm font-bold hover:bg-blue-700 transition-colors">{initialData ? "Salvar Alterações" : "Salvar Produto"}</button>
      </div>
    </DrawerLayout>
  );
}

export function MomentoDrawer({ onClose, onSave, initialData }: { onClose: () => void, onSave: (m: GtmMomento) => void, initialData?: GtmMomento | null }) {
  const [form, setForm] = useState<Partial<GtmMomento>>({
    titulo: "", dataInicio: "", dataFim: "", motivacao: "", descricao: "", percepcao: ""
  });

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  return (
    <DrawerLayout title={initialData ? "Editar Momento" : "Momento de Mercado"} subtitle="Contexto Temporal" icon={Calendar} color="#FF5F39" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Título do Momento</label>
          <input className={inputStyle} value={form.titulo} onChange={e => setForm(f => Object.assign({}, f, {titulo: e.target.value}))} placeholder="Ex: Q2 2026 – Expansão para Mid-Market" />
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Data Início</label>
            <input type="date" className={inputStyle} value={form.dataInicio} onChange={e => setForm(f => Object.assign({}, f, {dataInicio: e.target.value}))} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Data Fim</label>
            <input type="date" className={inputStyle} value={form.dataFim} onChange={e => setForm(f => Object.assign({}, f, {dataFim: e.target.value}))} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Motivação</label>
          <textarea className={inputStyle} rows={2} value={form.motivacao} onChange={e => setForm(f => Object.assign({}, f, {motivacao: e.target.value}))} placeholder="Por que esse é um bom momento para agir?" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Descrição</label>
          <textarea className={inputStyle} rows={3} value={form.descricao} onChange={e => setForm(f => Object.assign({}, f, {descricao: e.target.value}))} placeholder="Explique o contexto geral deste momento..." />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Percepção do Cliente</label>
          <textarea className={inputStyle} rows={3} value={form.percepcao} onChange={e => setForm(f => Object.assign({}, f, {percepcao: e.target.value}))} placeholder="Como as empresas enxergam esse desafio agora?" />
        </div>
      </div>
      
      <div className="p-5 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
        <button onClick={() => { if(form.titulo) { onSave(Object.assign({}, form, { id: initialData?.id || "m"+Date.now(), expanded: false }) as GtmMomento); onClose(); } }} className="flex-[2] py-2.5 rounded-xl bg-[#FF5F39] text-white text-sm font-bold hover:bg-[#e04d2a] transition-colors">{initialData ? "Salvar Alterações" : "Salvar Momento"}</button>
      </div>
    </DrawerLayout>
  );
}

export function PublicoDrawer({ onClose, onSave, initialData }: { onClose: () => void, onSave: (p: GtmPublico) => void, initialData?: GtmPublico | null }) {
  const [form, setForm] = useState<Partial<GtmPublico>>({
    nome: "", classificacao: "Decisor Econômico", desafios: [], motivacoes: [], jornada: "", contasVinculadas: [], mercadoAlvo: ""
  });

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  return (
    <DrawerLayout title={initialData ? "Editar Público" : "Público / Persona"} subtitle="Mapeamento" icon={Users} color="#10B981" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Nome / Cargo</label>
          <input className={inputStyle} value={form.nome} onChange={e => setForm(f => Object.assign({}, f, {nome: e.target.value}))} placeholder="Ex: VP de Vendas" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Classificação</label>
          <select className={selectStyle} value={form.classificacao} onChange={e => setForm(f => Object.assign({}, f, {classificacao: e.target.value}))}>
            {["Decisor Econômico", "Influenciador Técnico", "Usuário Final", "Champion", "Bloqueador"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Desafios (separados por linha)</label>
          <textarea className={inputStyle} rows={3} value={form.desafios?.join('\n') || ""} onChange={e => setForm(f => Object.assign({}, f, {desafios: e.target.value.split('\n')}))} placeholder="Desafio 1&#10;Desafio 2" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Motivações (separadas por linha)</label>
          <textarea className={inputStyle} rows={3} value={form.motivacoes?.join('\n') || ""} onChange={e => setForm(f => Object.assign({}, f, {motivacoes: e.target.value.split('\n')}))} placeholder="Motivação 1&#10;Motivação 2" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Jornada de Compra</label>
          <textarea className={inputStyle} rows={2} value={form.jornada} onChange={e => setForm(f => Object.assign({}, f, {jornada: e.target.value}))} placeholder="Como essa pessoa avalia soluções?" />
        </div>
      </div>
      
      <div className="p-5 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
        <button onClick={() => { if(form.nome) { onSave(Object.assign({}, form, { id: initialData?.id || "pub"+Date.now(), expanded: false }) as GtmPublico); onClose(); } }} className="flex-[2] py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-bold hover:bg-[#059669] transition-colors">{initialData ? "Salvar Alterações" : "Salvar Público"}</button>
      </div>
    </DrawerLayout>
  );
}