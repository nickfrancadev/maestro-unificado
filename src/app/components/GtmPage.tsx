import { useState } from "react";
import {
  Megaphone,
  Plus,
  ChevronDown,
  ChevronUp,
  Star,
  X,
  Sparkles,
  Package,
  Wrench,
  GraduationCap,
  Calendar,
  Users,
  Target,
  TrendingUp,
  FileText,
  Copy,
  Check,
  AlertCircle,
  Zap,
} from "lucide-react";
import {
  GtmProduto,
  GtmMomento,
  GtmPublico,
  defaultProdutos,
  defaultMomentos,
  defaultPublicos,
} from "./gtmStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "produto" | "momento" | "publico" | "pitches";

type Produto = GtmProduto;
type Momento = GtmMomento;
type Publico = GtmPublico;

interface Pitch {
  id: string;
  produto: string;
  momento: string;
  publico: string;
  conteudo: string;
  geradoEm: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const initialProdutos: Produto[] = defaultProdutos;
const initialMomentos: Momento[] = defaultMomentos;
const initialPublicos: Publico[] = defaultPublicos;
const initialPitches: Pitch[] = [
  {
    id: "pit1",
    produto: "Plataforma de Analytics B2B",
    momento: "Q2 2026 – Expansão para Mid-Market",
    publico: "VP de Vendas – Mid-Market",
    conteudo: `Olá [Nome],

Empresas como a sua passam por um momento crítico de revisão de stack após processos de M&A — e é exatamente nesse cenário que nossa Plataforma de Analytics B2B faz a diferença.

Com ela, seu time tem visibilidade total do pipeline em tempo real, sem depender de planilhas ou relatórios manuais. VPs de Vendas que adotaram nossa solução reduziram o ciclo de vendas em até 23% no primeiro trimestre.

Que tal uma conversa de 20 minutos para mostrar como adaptamos isso ao contexto da [Empresa]?`,
    geradoEm: "22 abr 2026",
  },
];

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= Math.round(value) ? "text-[#FF5F39]" : "text-gray-200"}
          fill={s <= Math.round(value) ? "#FF5F39" : "transparent"}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{value.toFixed(1)} / 5.0</span>
    </div>
  );
}

// ─── Tipo Badge ───────────────────────────────────────────────────────────────

const tipoConfig: Record<string, { color: string; bg: string; icon: any }> = {
  Produto: { color: "#166534", bg: "#dcfce7", icon: Package },
  Serviço: { color: "#FF5F39", bg: "#FFEDD5", icon: Wrench },
  Treinamento: { color: "#1e40af", bg: "#dbeafe", icon: GraduationCap },
};

function TipoBadge({ tipo }: { tipo: string }) {
  const cfg = tipoConfig[tipo] || tipoConfig["Produto"];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={12} />
      {tipo}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Ativo: { bg: "#dcfce7", color: "#166534" },
    Inativo: { bg: "#f3f4f6", color: "#6b7280" },
    "Em desenvolvimento": { bg: "#fef9c3", color: "#854d0e" },
  };
  const s = map[status] || map["Inativo"];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

// Modal – Novo Produto/Serviço
function NovoProdutoModal({ onClose, onSave }: { onClose: () => void; onSave: (p: Produto) => void }) {
  const [form, setForm] = useState({
    tipo: "Produto" as Produto["tipo"],
    nome: "",
    descricao: "",
    preco: "",
    unidade: "mês",
    status: "Ativo" as Produto["status"],
  });

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onSave({
      id: `p${Date.now()}`,
      tipo: form.tipo,
      nome: form.nome,
      descricao: form.descricao,
      preco: Number(form.preco) || 0,
      unidade: form.unidade,
      status: form.status,
      pmfRating: 3.0,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#3571de] rounded-lg flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">Adicionar Produto/Serviço</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Tipo</label>
            <div className="flex gap-2">
              {(["Produto", "Serviço", "Treinamento"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                  className="flex-1 py-2 rounded-lg border text-sm transition-all"
                  style={{
                    borderColor: form.tipo === t ? "#FF5F39" : "#e5e7eb",
                    background: form.tipo === t ? "#FFEDD5" : "white",
                    color: form.tipo === t ? "#FF5F39" : "#374151",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Nome</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] transition-colors"
              placeholder="Ex: Plataforma de CRM"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Descrição</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] transition-colors resize-none"
              rows={3}
              placeholder="Descreva o produto ou serviço..."
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          {/* Preço e Unidade */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1.5">Preço (R$)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] transition-colors"
                placeholder="0,00"
                type="number"
                value={form.preco}
                onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
              />
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-600 mb-1.5">Unidade</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] transition-colors"
                value={form.unidade}
                onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
              >
                {["mês", "ano", "projeto", "hora", "pessoa", "uso"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Status</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] transition-colors"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Produto["status"] }))}
            >
              {["Ativo", "Inativo", "Em desenvolvimento"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm text-white transition-colors"
            style={{ background: "#3571de" }}
          >
            Salvar produto
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// Modal – Novo Momento de Mercado
function NovoMomentoModal({ onClose, onSave }: { onClose: () => void; onSave: (m: Momento) => void }) {
  const [form, setForm] = useState({
    titulo: "",
    dataInicio: "",
    dataFim: "",
    motivacao: "",
    descricao: "",
    percepcao: "",
  });

  const handleSave = () => {
    if (!form.titulo.trim()) return;
    onSave({
      id: `m${Date.now()}`,
      ...form,
      expanded: false,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#3571de] rounded-lg flex items-center justify-center">
              <Calendar size={16} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">Novo Momento de Mercado</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Título do Momento</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
              placeholder="Ex: Q2 2026 – Expansão para Mid-Market"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1.5">Data de Início</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
                value={form.dataInicio}
                onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1.5">Data de Fim</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
                value={form.dataFim}
                onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Motivação</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
              placeholder="Por que esse é um bom momento?"
              value={form.motivacao}
              onChange={(e) => setForm((f) => ({ ...f, motivacao: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Descrição do Momento</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] resize-none"
              rows={3}
              placeholder="Descreva o contexto desse momento..."
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Percepção do Cliente</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] resize-none"
              rows={2}
              placeholder="Como o cliente percebe esse problema?"
              value={form.percepcao}
              onChange={(e) => setForm((f) => ({ ...f, percepcao: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg text-sm text-white" style={{ background: "#3571de" }}>
            Salvar momento
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// Modal – Novo Público
function NovoPublicoModal({ onClose, onSave }: { onClose: () => void; onSave: (p: Publico) => void }) {
  const [form, setForm] = useState({
    nome: "",
    classificacao: "Decisor Econômico",
    desafios: "",
    motivacoes: "",
    jornada: "",
    contasVinculadas: "",
    mercadoAlvo: "",
  });

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onSave({
      id: `pub${Date.now()}`,
      nome: form.nome,
      classificacao: form.classificacao,
      desafios: form.desafios.split("\n").filter(Boolean),
      motivacoes: form.motivacoes.split("\n").filter(Boolean),
      jornada: form.jornada,
      contasVinculadas: form.contasVinculadas.split(",").map((s) => s.trim()).filter(Boolean),
      mercadoAlvo: form.mercadoAlvo,
      expanded: false,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FFEDD5] rounded-lg flex items-center justify-center">
              <Users size={16} className="text-[#FF5F39]" />
            </div>
            <span className="font-semibold text-gray-900">Novo Público</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Nome / Cargo</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
              placeholder="Ex: VP de Vendas – Mid-Market"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Classificação</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
              value={form.classificacao}
              onChange={(e) => setForm((f) => ({ ...f, classificacao: e.target.value }))}
            >
              {["Decisor Econômico", "Influenciador Técnico", "Usuário Final", "Champion", "Bloqueador"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Desafios <span className="text-gray-400">(um por linha)</span></label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] resize-none"
              rows={3}
              placeholder={"Desafio 1\nDesafio 2"}
              value={form.desafios}
              onChange={(e) => setForm((f) => ({ ...f, desafios: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Motivações <span className="text-gray-400">(uma por linha)</span></label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] resize-none"
              rows={3}
              placeholder={"Motivação 1\nMotivação 2"}
              value={form.motivacoes}
              onChange={(e) => setForm((f) => ({ ...f, motivacoes: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Jornada de Compra</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] resize-none"
              rows={2}
              placeholder="Como esse público toma decisões?"
              value={form.jornada}
              onChange={(e) => setForm((f) => ({ ...f, jornada: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Contas Vinculadas <span className="text-gray-400">(separadas por vírgula)</span></label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
              placeholder="Conta A, Conta B"
              value={form.contasVinculadas}
              onChange={(e) => setForm((f) => ({ ...f, contasVinculadas: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Mercado-Alvo</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
              placeholder="Ex: B2B SaaS, 200–1000 funcionários"
              value={form.mercadoAlvo}
              onChange={(e) => setForm((f) => ({ ...f, mercadoAlvo: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg text-sm text-white" style={{ background: "#3571de" }}>
            Salvar público
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// Modal – Gerador de Pitch
function GeradorDePitchModal({
  produtos,
  momentos,
  publicos,
  onClose,
  onSave,
}: {
  produtos: Produto[];
  momentos: Momento[];
  publicos: Publico[];
  onClose: () => void;
  onSave: (p: Pitch) => void;
}) {
  const [step, setStep] = useState<"form" | "gerando" | "resultado">("form");
  const [form, setForm] = useState({ produto: "", momento: "", publico: "", contexto: "" });
  const [pitch, setPitch] = useState("");
  const [copied, setCopied] = useState(false);

  const gerarPitch = () => {
    setStep("gerando");
    setTimeout(() => {
      const produtoNome = form.produto || "nosso produto";
      const momentoNome = form.momento || "este momento";
      const publicoNome = form.publico || "seu time";

      const generated = `Olá [Nome],

Em ${momentoNome}, empresas como a sua estão enfrentando decisões críticas sobre suas operações — e é exatamente aí que ${produtoNome} se destaca.

Pensando especificamente no perfil de ${publicoNome}, desenvolvemos uma abordagem que reduz o tempo de implementação em até 40% e garante ROI mensurável nos primeiros 60 dias.

${form.contexto ? `Contexto adicional que reforça nossa proposta: ${form.contexto}\n\n` : ""}Que tal agendar 20 minutos para mostrar como adaptamos isso ao contexto da [Empresa]? Tenho um slot disponível ainda esta semana.

Att,
[Seu Nome]`;

      setPitch(generated);
      setStep("resultado");
    }, 2200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave({
      id: `pit${Date.now()}`,
      produto: form.produto,
      momento: form.momento,
      publico: form.publico,
      conteudo: pitch,
      geradoEm: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#212A46" }}>
              <Sparkles size={16} className="text-[#FF5F39]" />
            </div>
            <span className="font-semibold text-gray-900">Gerador de Pitch com IA</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === "form" && (
          <>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Produto / Serviço</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
                  value={form.produto}
                  onChange={(e) => setForm((f) => ({ ...f, produto: e.target.value }))}
                >
                  <option value="">Selecione um produto...</option>
                  {produtos.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Momento de Mercado</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
                  value={form.momento}
                  onChange={(e) => setForm((f) => ({ ...f, momento: e.target.value }))}
                >
                  <option value="">Selecione um momento...</option>
                  {momentos.map((m) => <option key={m.id} value={m.titulo}>{m.titulo}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Persona / Cluster</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39]"
                  value={form.publico}
                  onChange={(e) => setForm((f) => ({ ...f, publico: e.target.value }))}
                >
                  <option value="">Selecione um público...</option>
                  {publicos.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Contexto Adicional <span className="text-gray-400">(opcional)</span></label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5F39] resize-none"
                  rows={3}
                  placeholder="Informações extras sobre a conta, o contato ou o momento..."
                  value={form.contexto}
                  onChange={(e) => setForm((f) => ({ ...f, contexto: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={gerarPitch}
                className="px-5 py-2 rounded-lg text-sm text-white flex items-center gap-2 transition-colors"
                style={{ background: "#212A46" }}
              >
                <Sparkles size={15} />
                Gerar Pitch
              </button>
            </div>
          </>
        )}

        {step === "gerando" && (
          <div className="px-6 py-16 flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
                style={{ background: "#212A46" }}
              >
                <Sparkles size={28} className="text-[#FF5F39]" />
              </div>
            </div>
            <p className="text-gray-700 font-medium">Gerando seu pitch personalizado...</p>
            <p className="text-sm text-gray-400">Analisando produto, momento e persona</p>
          </div>
        )}

        {step === "resultado" && (
          <>
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Check size={14} className="text-green-500" />
                  Pitch gerado com sucesso
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#FF5F39] resize-none font-mono"
                rows={12}
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
              />
            </div>
            <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setStep("form")}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Gerar novamente
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                  Fechar
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg text-sm text-white"
                  style={{ background: "#3571de" }}
                >
                  Salvar no Pitches
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalOverlay>
  );
}

// ─── Tab: Produto ─────────────────────────────────────────────────────────────

function TabProduto({
  produtos,
  onAdd,
}: {
  produtos: Produto[];
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white transition-colors"
          style={{ background: "#3571de" }}
        >
          <Plus size={15} />
          Cadastrar Produto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {produtos.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="flex items-start justify-between gap-2 mb-2">
                <TipoBadge tipo={p.tipo} />
                <StatusBadge status={p.status} />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3 mb-1">{p.nome}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{p.descricao}</p>
            </div>

            {/* Card body */}
            <div className="px-5 py-4 flex flex-col gap-3">
              {/* PMF Rating */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Product Market-Fit Rating</p>
                <StarRating value={p.pmfRating} />
              </div>

              {/* Preço */}
              <div className="flex items-end justify-between pt-1 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400">Preço</p>
                  <p className="font-semibold text-gray-800">
                    R$ {p.preco.toLocaleString("pt-BR")}
                    <span className="text-xs text-gray-400 font-normal"> / {p.unidade}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <FileText size={15} />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <TrendingUp size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Momento ─────────────────────────────────────────────────────────────

function TabMomento({
  momentos,
  onToggle,
  onAdd,
}: {
  momentos: Momento[];
  onToggle: (id: string) => void;
  onAdd: () => void;
}) {
  const fmt = (d: string) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white"
          style={{ background: "#3571de" }}
        >
          <Plus size={15} />
          Cadastrar Momento
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {momentos.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header row */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
              onClick={() => onToggle(m.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#FFEDD5" }}
                >
                  <Calendar size={16} className="text-[#FF5F39]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{m.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmt(m.dataInicio)} → {fmt(m.dataFim)}
                  </p>
                </div>
              </div>
              {m.expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {/* Expanded */}
            {m.expanded && (
              <div className="px-5 pb-5 border-t border-gray-50 pt-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-medium text-[#FF5F39] uppercase tracking-wider mb-1">Motivação</p>
                  <p className="text-sm text-gray-700">{m.motivacao}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#FF5F39] uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm text-gray-700">{m.descricao}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#FF5F39] uppercase tracking-wider mb-1">Percepção do Cliente</p>
                  <p className="text-sm text-gray-700">{m.percepcao}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Público ─────────────────────────────────────────────────────────────

function TabPublico({
  publicos,
  onToggle,
  onAdd,
}: {
  publicos: Publico[];
  onToggle: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white"
          style={{ background: "#3571de" }}
        >
          <Plus size={15} />
          Cadastrar Público
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {publicos.map((pub) => (
          <div key={pub.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
              onClick={() => onToggle(pub.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#FFEDD5" }}
                >
                  <Users size={16} className="text-[#FF5F39]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{pub.nome}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs mt-0.5" style={{ background: "#f3f4f6", color: "#374151" }}>
                    {pub.classificacao}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{pub.contasVinculadas.length} contas</span>
                {pub.expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </div>
            </button>

            {/* Expanded */}
            {pub.expanded && (
              <div className="px-5 pb-5 border-t border-gray-50 pt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-medium text-[#FF5F39] uppercase tracking-wider mb-2">Desafios</p>
                  <ul className="flex flex-col gap-1.5">
                    {pub.desafios.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle size={13} className="text-[#FF5F39] mt-0.5 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#FF5F39] uppercase tracking-wider mb-2">Motivações</p>
                  <ul className="flex flex-col gap-1.5">
                    {pub.motivacoes.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Zap size={13} className="text-yellow-500 mt-0.5 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#FF5F39] uppercase tracking-wider mb-2">Jornada de Compra</p>
                  <p className="text-sm text-gray-700">{pub.jornada}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#FF5F39] uppercase tracking-wider mb-2">Contas Vinculadas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pub.contasVinculadas.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{c}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{pub.mercadoAlvo}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Pitches ─────────────────────────────────────────────────────────────

function TabPitches({
  pitches,
  produtos,
  momentos,
  publicos,
  onAdd,
}: {
  pitches: Pitch[];
  produtos: Produto[];
  momentos: Momento[];
  publicos: Publico[];
  onAdd: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(pitches[0]?.id || null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white"
          style={{ background: "#212A46" }}
        >
          <Sparkles size={15} />
          Gerar Pitch com IA
        </button>
      </div>

      {pitches.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum pitch gerado ainda</p>
          <p className="text-sm mt-1">Clique em "Gerar Pitch com IA" para começar</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {pitches.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#212A46" }}>
                  <Sparkles size={15} className="text-[#FF5F39]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{p.produto}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.momento && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={11} /> {p.momento}
                      </span>
                    )}
                    {p.publico && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Target size={11} /> {p.publico}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-400">{p.geradoEm}</span>
                {expanded === p.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </div>
            </button>

            {/* Expanded */}
            {expanded === p.id && (
              <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => handleCopy(p.id, p.conteudo)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {copied === p.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                    {copied === p.id ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-4 font-sans border border-gray-100">
                  {p.conteudo}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function GtmPage() {
  const [activeTab, setActiveTab] = useState<Tab>("produto");

  // State
  const [produtos, setProdutos] = useState<Produto[]>(initialProdutos);
  const [momentos, setMomentos] = useState<Momento[]>(initialMomentos);
  const [publicos, setPublicos] = useState<Publico[]>(initialPublicos);
  const [pitches, setPitches] = useState<Pitch[]>(initialPitches);

  // Modal state
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [showNovoMomento, setShowNovoMomento] = useState(false);
  const [showNovoPublico, setShowNovoPublico] = useState(false);
  const [showGeradorPitch, setShowGeradorPitch] = useState(false);

  const tabs: { key: Tab; label: string }[] = [
    { key: "produto", label: "Produto" },
    { key: "momento", label: "Momento" },
    { key: "publico", label: "Público" },
    { key: "pitches", label: "Pitches" },
  ];

  const toggleMomento = (id: string) =>
    setMomentos((ms) => ms.map((m) => (m.id === id ? { ...m, expanded: !m.expanded } : m)));

  const togglePublico = (id: string) =>
    setPublicos((ps) => ps.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)));

  return (
    <div className="min-h-screen" style={{ background: "#EEF0F5" }}>
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#212A46" }}
          >
            <Megaphone size={24} className="text-[#FF5F39]" />
          </div>
          <div>
            <h1 className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
              GTM – Go to Market
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gerencie produtos, momentos de mercado, públicos-alvo e pitches personalizados
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0 border-b border-gray-200 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-8 py-3.5 text-sm transition-all relative"
              style={{
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? "#FF5F39" : "#6b7280",
                borderBottom: activeTab === tab.key ? "3px solid #FF5F39" : "3px solid transparent",
                background: activeTab === tab.key ? "#fef6f3" : "transparent",
                borderRadius: activeTab === tab.key ? "8px 8px 0 0" : undefined,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-8 py-6">
        {activeTab === "produto" && (
          <TabProduto produtos={produtos} onAdd={() => setShowNovoProduto(true)} />
        )}
        {activeTab === "momento" && (
          <TabMomento momentos={momentos} onToggle={toggleMomento} onAdd={() => setShowNovoMomento(true)} />
        )}
        {activeTab === "publico" && (
          <TabPublico publicos={publicos} onToggle={togglePublico} onAdd={() => setShowNovoPublico(true)} />
        )}
        {activeTab === "pitches" && (
          <TabPitches
            pitches={pitches}
            produtos={produtos}
            momentos={momentos}
            publicos={publicos}
            onAdd={() => setShowGeradorPitch(true)}
          />
        )}
      </div>

      {/* Modals */}
      {showNovoProduto && (
        <NovoProdutoModal
          onClose={() => setShowNovoProduto(false)}
          onSave={(p) => setProdutos((ps) => [...ps, p])}
        />
      )}
      {showNovoMomento && (
        <NovoMomentoModal
          onClose={() => setShowNovoMomento(false)}
          onSave={(m) => setMomentos((ms) => [...ms, m])}
        />
      )}
      {showNovoPublico && (
        <NovoPublicoModal
          onClose={() => setShowNovoPublico(false)}
          onSave={(p) => setPublicos((ps) => [...ps, p])}
        />
      )}
      {showGeradorPitch && (
        <GeradorDePitchModal
          produtos={produtos}
          momentos={momentos}
          publicos={publicos}
          onClose={() => setShowGeradorPitch(false)}
          onSave={(p) => setPitches((ps) => [...ps, p])}
        />
      )}
    </div>
  );
}