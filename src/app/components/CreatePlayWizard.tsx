import { useState } from "react";
import { X, Plus, Check, ChevronDown, Building2, Users, Search, MapPin, TrendingUp, Package, Wrench, GraduationCap, Calendar, Target } from "lucide-react";
import { defaultProdutos, defaultMomentos, defaultPublicos } from "./gtmStore";
import { NewPlayData } from "./PlayDetailPage";

/* ──────────────────────────────────────────────────────────
   TYPES
────────────────────────────────────────────────────────── */
interface Conta {
  id: string;
  name: string;
  segment: string;
  healthScore: number;
  city: string;
  playsActive: number;
  initials: string;
  color: string;
}

interface Dossie {
  id: string;
  name: string;
  type: "conta" | "contato";
  contaId?: string;
  company?: string;
  role?: string;
  segment?: string;
}

interface GTMOption {
  id: string;
  label: string;
  description: string;
}

interface PublicoOption {
  id: string;
  label: string;
}

interface MercadoOption {
  id: string;
  label: string;
}

export interface CreatePlayWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlay: (play: NewPlayData) => void;
}

/* ──────────────────────────────────────────────────────────
   MOCK DATA
────────────────────────────────────────────────────────── */
const mockContas: Conta[] = [
  { id: "c1", name: "STAR BANK",       segment: "Financeiro",  healthScore: 85, city: "São Paulo",      playsActive: 3, initials: "SB", color: "#354566" },
  { id: "c2", name: "Nubank",           segment: "Fintech",     healthScore: 92, city: "São Paulo",      playsActive: 4, initials: "NU", color: "#820AD1" },
  { id: "c3", name: "Magazine Luiza",   segment: "E-commerce",  healthScore: 68, city: "Franca",         playsActive: 1, initials: "ML", color: "#E8192C" },
  { id: "c4", name: "Natura",           segment: "Varejo",      healthScore: 72, city: "São Paulo",      playsActive: 2, initials: "NA", color: "#F26800" },
  { id: "c5", name: "iFood",            segment: "Delivery",    healthScore: 58, city: "São Paulo",      playsActive: 1, initials: "IF", color: "#EA1D2C" },
  { id: "c6", name: "Embraer",          segment: "Aeronáutica", healthScore: 88, city: "São José dos Campos", playsActive: 2, initials: "EM", color: "#003B8E" },
  { id: "c7", name: "Vale",             segment: "Mineração",   healthScore: 76, city: "Rio de Janeiro", playsActive: 1, initials: "VA", color: "#00703C" },
  { id: "c8", name: "Itaú Unibanco",    segment: "Financeiro",  healthScore: 90, city: "São Paulo",      playsActive: 5, initials: "IU", color: "#003D7C" },
];

const mockDossiêsContas: Dossie[] = [
  { id: "dc1", name: "STAR BANK – Dossiê Principal", type: "conta", contaId: "c1", segment: "Financeiro" },
  { id: "dc2", name: "Nubank – Expansão Q2",         type: "conta", contaId: "c2", segment: "Fintech" },
  { id: "dc3", name: "Magazine Luiza – Digital",      type: "conta", contaId: "c3", segment: "E-commerce" },
  { id: "dc4", name: "Natura – Sul & Sudeste",        type: "conta", contaId: "c4", segment: "Varejo" },
  { id: "dc5", name: "iFood – Re-engagement",         type: "conta", contaId: "c5", segment: "Delivery" },
];

const mockDossiêsContatos: Dossie[] = [
  { id: "dt1", name: "Carlos Silva",  type: "contato", contaId: "c1", company: "STAR BANK",     role: "CTO" },
  { id: "dt2", name: "Maria Santos",  type: "contato", contaId: "c1", company: "STAR BANK",     role: "VP Comercial" },
  { id: "dt3", name: "Pedro Alves",   type: "contato", contaId: "c2", company: "Nubank",         role: "Head de Produto" },
  { id: "dt4", name: "Ana Lima",      type: "contato", contaId: "c3", company: "Magazine Luiza", role: "Diretora Digital" },
  { id: "dt5", name: "João Costa",    type: "contato", contaId: "c4", company: "Natura",         role: "Gerente Regional" },
];

const gtmOptions: GTMOption[] = [
  { id: "g1", label: "1-to-few",    description: "Abordagem semi-personalizada para segmentos específicos" },
  { id: "g2", label: "Pre-play",    description: "Sequência preparatória antes de uma play principal" },
  { id: "g3", label: "Sales-play",  description: "Movimentação direta de vendas com foco em conversão" },
  { id: "g4", label: "CS-play",     description: "Ação de customer success para retenção e expansão" },
];

const publicoOptions: PublicoOption[] = [
  { id: "p1", label: "C-Level" },
  { id: "p2", label: "VP / Diretor" },
  { id: "p3", label: "Gerente" },
  { id: "p4", label: "Analista / Técnico" },
  { id: "p5", label: "Influenciador de compra" },
];

const mercadoOptions: MercadoOption[] = [
  { id: "m1", label: "Financeiro & Fintech" },
  { id: "m2", label: "Varejo & E-commerce" },
  { id: "m3", label: "Saúde & Bem-estar" },
  { id: "m4", label: "Tecnologia & SaaS" },
  { id: "m5", label: "Indústria & Logística" },
];

const playTypes = ["Pre-play", "Sales-play", "CS-play"];

const objectives = [
  "Engajamento inicial e ativação",
  "Aumento de receita (upsell / cross-sell)",
  "Reengajamento de contatos frios",
  "Retenção e expansão de conta",
  "Prospecção e qualificação",
  "Aceleração de fechamento",
];

/* ──────────────────────────────────────────────────────────
   STEPS
────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: "Informações da Play" },
  { id: 2, label: "Selecione as Contas" },
  { id: 3, label: "Selecione os Dossiês" },
  { id: 4, label: "GTM, Público e Mercado" },
];

/* ──────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────── */
const healthColor = (score: number) =>
  score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";

const toggleSet = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

/* ──────────────────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────────────────── */
export function CreatePlayWizard({ isOpen, onClose, onCreatePlay }: CreatePlayWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [playName, setPlayName] = useState("");
  const [playType, setPlayType] = useState("");
  const [playObjective, setPlayObjective] = useState("");
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [objDropOpen, setObjDropOpen] = useState(false);

  // Step 2 – Contas
  const [contaSearch, setContaSearch] = useState("");
  const [selectedContas, setSelectedContas] = useState<Set<string>>(new Set());

  // Step 3 – Dossiês
  const [dossieTab, setDossieTab] = useState<"contas" | "contatos">("contas");
  const [selectedDossiêsContas, setSelectedDossiêsContas] = useState<Set<string>>(new Set());
  const [selectedDossiêsContatos, setSelectedDossiêsContatos] = useState<Set<string>>(new Set());

  // Step 4 – GTM
  const [selectedGTM, setSelectedGTM] = useState<Set<string>>(new Set());
  const [selectedPublico, setSelectedPublico] = useState<Set<string>>(new Set());
  const [selectedMercado, setSelectedMercado] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  /* ── navigation ── */
  const isStep1Valid = playName.trim().length > 0 && playType.length > 0 && playObjective.length > 0;
  const isStep2Valid = selectedContas.size > 0;
  const isStep3Valid = selectedContas.size > 1 || (selectedDossiêsContas.size > 0 && selectedDossiêsContatos.size > 0);
  const isStep4Valid = selectedGTM.size > 0 && selectedPublico.size > 0 && selectedMercado.size > 0;

  const isWizardComplete = isStep1Valid && isStep2Valid && isStep3Valid && isStep4Valid;

  const canGoNext = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    if (currentStep === 3) return selectedDossiêsContas.size > 0 && selectedDossiêsContatos.size > 0;
    if (currentStep === 4) return isStep4Valid;
    return true;
  };

  const handleNext = () => {
    if (currentStep === 2 && selectedContas.size > 1) {
      setCurrentStep(4);
    } else if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep === 4 && selectedContas.size > 1) {
      setCurrentStep(2);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 2 && selectedContas.size > 1) {
      setCurrentStep(4);
    } else if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = (withAI = false) => {
    if (withAI && !isWizardComplete) return;
    if (!withAI && !canGoNext() && currentStep === STEPS.length) return;

    const resolvedContas = mockContas.filter((c) => selectedContas.has(c.id));
    const resolvedDossieContas = mockDossiêsContas.filter((d) => selectedDossiêsContas.has(d.id));
    const resolvedDossieContatos = mockDossiêsContatos.filter((d) => selectedDossiêsContatos.has(d.id));
    const resolvedProdutos = defaultProdutos.filter((p) => selectedGTM.has(p.id));
    const resolvedPublicos = defaultPublicos.filter((p) => selectedPublico.has(p.id));
    const resolvedMomentos = defaultMomentos.filter((m) => selectedMercado.has(m.id));

    const today = new Date();
    const createdAt = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

    onCreatePlay({
      id: `play-${Date.now()}`,
      name: playName,
      type: playType,
      objective: playObjective,
      status: "active",
      createdAt,
      contas: resolvedContas.map((c) => ({
        id: c.id, name: c.name, segment: c.segment,
        initials: c.initials, color: c.color, healthScore: c.healthScore,
      })),
      dossiêsContas: resolvedDossieContas.map((d) => ({
        id: d.id, name: d.name, segment: d.segment,
      })),
      dossiêsContatos: resolvedDossieContatos.map((d) => ({
        id: d.id, name: d.name, role: d.role, company: d.company,
      })),
      produtos: resolvedProdutos,
      publicos: resolvedPublicos,
      momentos: resolvedMomentos,
      withAI,
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCurrentStep(1);
    setPlayName(""); setPlayType(""); setPlayObjective("");
    setContaSearch("");
    setSelectedContas(new Set());
    setDossieTab("contas");
    setSelectedDossiêsContas(new Set()); setSelectedDossiêsContatos(new Set());
    setSelectedGTM(new Set()); setSelectedPublico(new Set()); setSelectedMercado(new Set());
  };

  const handleClose = () => { handleReset(); onClose(); };

  /* ── filtered contas ── */
  const filteredContas = mockContas.filter(
    (c) =>
      c.name.toLowerCase().includes(contaSearch.toLowerCase()) ||
      c.segment.toLowerCase().includes(contaSearch.toLowerCase())
  );

  const selectedContaId = selectedContas.size === 1 ? Array.from(selectedContas)[0] : null;

  const filteredDossiêsContas = selectedContaId
    ? mockDossiêsContas.filter((d) => d.contaId === selectedContaId)
    : mockDossiêsContas;

  const filteredDossiêsContatos = selectedContaId
    ? mockDossiêsContatos.filter((d) => d.contaId === selectedContaId)
    : mockDossiêsContatos;

  /* ── shared styles ── */
  const btnOutline = (disabled = false): React.CSSProperties => ({
    padding: "10px 28px",
    borderRadius: 8,
    border: "1.5px solid #73B5F9",
    background: "transparent",
    color: "#73B5F9",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontFamily: "inherit",
    transition: "all 0.15s",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(73,73,73,0.92)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative flex overflow-hidden"
        style={{
          width: 940,
          maxWidth: "96vw",
          maxHeight: "90vh",
          background: "white",
          borderRadius: 12,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >

        {/* ═════════════════════════════════════════
            LEFT SIDEBAR
        ══════════════════════════════════════════ */}
        <div
          style={{
            width: 240,
            background: "#212A46",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            padding: "36px 0 32px",
          }}
        >
          {/* Logo + title */}
          <div style={{ padding: "0 28px 32px" }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: "#FF5F39",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <p style={{ fontSize: 11, color: "#8899BB", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Nova Play
            </p>
            <p style={{ fontSize: 17, color: "white", fontWeight: 700, marginTop: 2, lineHeight: 1.3, fontFamily: "'Inria Sans', sans-serif" }}>
              Criação de Play com GTM
            </p>
          </div>

          {/* Steps list */}
          <div style={{ flex: 1 }}>
            {STEPS.map((step) => {
              const isSkipped = selectedContas.size > 1 && step.id === 3;
              const isActive = currentStep === step.id;
              const isDone   = currentStep > step.id && !isSkipped;
              return (
                <div
                  key={step.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 28px",
                    position: "relative",
                    cursor: isDone ? "pointer" : "default",
                  }}
                  onClick={() => isDone && setCurrentStep(step.id)}
                >
                  {/* accent bar */}
                  {isActive && (
                    <div style={{
                      position: "absolute", left: 0, top: 8, bottom: 8,
                      width: 3, background: "#FF5F39", borderRadius: "0 2px 2px 0",
                    }} />
                  )}

                  {/* circle */}
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "#FF5F39" : isActive ? "rgba(255,95,57,0.2)" : "rgba(255,255,255,0.07)",
                    border: `2px solid ${isActive || isDone ? "#FF5F39" : "rgba(255,255,255,0.14)"}`,
                    transition: "all 0.2s",
                    opacity: isSkipped ? 0.35 : 1,
                  }}>
                    {isDone
                      ? <Check size={12} color="white" strokeWidth={3} />
                      : <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? "#FF5F39" : "rgba(255,255,255,0.35)" }}>{step.id}</span>
                    }
                  </div>

                  {/* label */}
                  <span style={{
                    fontSize: 11, fontWeight: isActive ? 700 : 500, lineHeight: 1.3,
                    color: isActive ? "white" : isDone ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)",
                    fontFamily: "'Inria Sans', sans-serif",
                    opacity: isSkipped ? 0.35 : 1,
                  }}>
                    {step.label}
                    {isSkipped && (
                      <span style={{ fontSize: 9, marginLeft: 5, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
                        (pulada)
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ padding: "0 28px" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
              {STEPS.map((s) => (
                <div key={s.id} style={{
                  flex: 1, height: 3, borderRadius: 9999,
                  background: currentStep >= s.id ? "#FF5F39" : "rgba(255,255,255,0.12)",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
              Etapa {currentStep} de {STEPS.length}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            RIGHT CONTENT
        ══════════════════════════════════════════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* close btn */}
          <button
            onClick={handleClose}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 30, height: 30, borderRadius: "50%",
              border: "none", background: "#F3F4F6",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 10,
            }}
          >
            <X size={14} color="#6B7280" />
          </button>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "34px 40px 24px", height: 580, minHeight: 580, maxHeight: 580 }}>

            {/* Step badge + title */}
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#FF5F39",
              letterSpacing: "0.1em", textTransform: "uppercase",
              marginBottom: 3, fontFamily: "'Inria Sans', sans-serif",
            }}>
              Etapa {currentStep}
            </p>
            <h2 style={{
              fontSize: 22, fontWeight: 700, color: "#1e1e1e",
              marginBottom: 4, fontFamily: "'Inria Sans', sans-serif",
            }}>
              {currentStep === 1 && "Informações da Play"}
              {currentStep === 2 && "Selecione as Contas"}
              {currentStep === 3 && "Selecione os Dossiês"}
              {currentStep === 4 && "GTM, Público e Mercado"}
            </h2>
            <p style={{ fontSize: 12, color: "#828282", marginBottom: 24 }}>
              {currentStep === 1 && "Defina o nome, tipo e objetivo desta play."}
              {currentStep === 2 && "Escolha as contas que participarão desta play. Você pode selecionar múltiplas contas."}
              {currentStep === 3 && "Selecione os dossiês de contas e contatos que serão utilizados nesta play."}
              {currentStep === 4 && "Selecione sua estratégia Go-to-Market, público-alvo e mercado."}
            </p>

            {/* ── STEP 1: Informações ── */}
            {currentStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Nome */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Nome da Play <span style={{ color: "#FF5F39" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Onboarding Enterprise, Expansão Q2..."
                    value={playName}
                    onChange={(e) => setPlayName(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 8,
                      border: `1.5px solid ${playName.trim() ? "#E5E7EB" : "#FECACA"}`, fontSize: 13, color: "#212A46",
                      outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#3571DE")}
                    onBlur={(e) => (e.target.style.borderColor = playName.trim() ? "#E5E7EB" : "#FECACA")}
                  />
                  {!playName.trim() && (
                    <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>Campo obrigatório</p>
                  )}
                </div>

                {/* Tipo */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Tipo de Play <span style={{ color: "#FF5F39" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => { setTypeDropOpen(!typeDropOpen); setObjDropOpen(false); }}
                      style={{
                        width: "100%", padding: "11px 14px", borderRadius: 8,
                        border: `1.5px solid ${playType ? "#E5E7EB" : "#FECACA"}`, fontSize: 13,
                        color: playType ? "#212A46" : "#9CA3AF",
                        background: "white", textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        boxSizing: "border-box", fontFamily: "inherit",
                      }}
                    >
                      {playType || "Selecione o tipo de play"}
                      <ChevronDown size={14} color="#9CA3AF" style={{ transform: typeDropOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {!playType && (
                      <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>Selecione um tipo</p>
                    )}
                    {typeDropOpen && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                        background: "white", border: "1px solid #E5E7EB", borderRadius: 8,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20, overflow: "hidden",
                      }}>
                        {playTypes.map((t) => (
                          <button
                            key={t}
                            onClick={() => { setPlayType(t); setTypeDropOpen(false); }}
                            style={{
                              width: "100%", textAlign: "left", padding: "10px 14px",
                              fontSize: 13, color: playType === t ? "#3571DE" : "#374151",
                              background: playType === t ? "#EFF6FF" : "transparent",
                              border: "none", cursor: "pointer", fontFamily: "inherit",
                              display: "flex", alignItems: "center", gap: 8,
                              borderBottom: "1px solid #F9FAFB",
                            }}
                          >
                            {playType === t && <Check size={12} color="#3571DE" />}
                            <span style={{ marginLeft: playType === t ? 0 : 20 }}>{t}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Objetivo */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Objetivo <span style={{ color: "#FF5F39" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => { setObjDropOpen(!objDropOpen); setTypeDropOpen(false); }}
                      style={{
                        width: "100%", padding: "11px 14px", borderRadius: 8,
                        border: `1.5px solid ${playObjective ? "#E5E7EB" : "#FECACA"}`, fontSize: 13,
                        color: playObjective ? "#212A46" : "#9CA3AF",
                        background: "white", textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        boxSizing: "border-box", fontFamily: "inherit",
                      }}
                    >
                      {playObjective || "Selecione o objetivo"}
                      <ChevronDown size={14} color="#9CA3AF" style={{ transform: objDropOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                    </button>
                    {!playObjective && (
                      <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>Selecione um objetivo</p>
                    )}
                    {objDropOpen && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                        background: "white", border: "1px solid #E5E7EB", borderRadius: 8,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20, overflow: "hidden",
                      }}>
                        {objectives.map((o) => (
                          <button
                            key={o}
                            onClick={() => { setPlayObjective(o); setObjDropOpen(false); }}
                            style={{
                              width: "100%", textAlign: "left", padding: "10px 14px",
                              fontSize: 13, color: playObjective === o ? "#3571DE" : "#374151",
                              background: playObjective === o ? "#EFF6FF" : "transparent",
                              border: "none", cursor: "pointer", fontFamily: "inherit",
                              display: "flex", alignItems: "center", gap: 8,
                              borderBottom: "1px solid #F9FAFB",
                            }}
                          >
                            {playObjective === o && <Check size={12} color="#3571DE" />}
                            <span style={{ marginLeft: playObjective === o ? 0 : 20 }}>{o}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tip */}
                <div style={{
                  background: "#FFF5F3", borderLeft: "3px solid #FF5F39",
                  borderRadius: 8, padding: "11px 14px", marginTop: 2,
                }}>
                  <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                    <strong style={{ color: "#FF5F39" }}>Dica:</strong> Use nomes descritivos como <em>"Onboarding Enterprise Q2"</em> ou <em>"Reativação — Clientes Inativos 60d"</em>.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Contas ── */}
            {currentStep === 2 && (
              <div>
                {/* Search */}
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                  <input
                    type="text"
                    placeholder="Buscar por conta ou segmento..."
                    value={contaSearch}
                    onChange={(e) => setContaSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px 10px 36px",
                      borderRadius: 8, border: "1.5px solid #E5E7EB",
                      fontSize: 13, color: "#212A46", outline: "none",
                      boxSizing: "border-box", fontFamily: "inherit",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#3571DE")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                  />
                </div>

                {/* Counter + select all */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "#6B7280" }}>
                    {filteredContas.length} conta{filteredContas.length !== 1 ? "s" : ""} disponíve{filteredContas.length !== 1 ? "is" : "l"}
                    {selectedContas.size > 0 && (
                      <span style={{ fontWeight: 700, color: "#3571DE", marginLeft: 6 }}>
                        • {selectedContas.size} selecionada{selectedContas.size !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  {selectedContas.size > 0 && (
                    <button
                      onClick={() => setSelectedContas(new Set())}
                      style={{
                        fontSize: 11, color: "#EF4444", fontWeight: 600,
                        background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {selectedContas.size === 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: "#FEF2F2", border: "1px solid #FECACA",
                    borderRadius: 8, padding: "9px 14px", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 15, color: "#EF4444" }}>⚠</span>
                    <p style={{ fontSize: 12, color: "#991B1B" }}>Selecione ao menos uma conta para continuar.</p>
                  </div>
                )}

                {/* Conta list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 370, overflowY: "auto" }}>
                  {filteredContas.map((conta) => {
                    const isSelected = selectedContas.has(conta.id);
                    const hc = healthColor(conta.healthScore);
                    return (
                      <button
                        key={conta.id}
                        onClick={() => setSelectedContas(toggleSet(selectedContas, conta.id))}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "12px 14px", borderRadius: 8,
                          border: `1.5px solid ${isSelected ? "#3571DE" : "#E5E7EB"}`,
                          background: isSelected ? "#EFF6FF" : "white",
                          cursor: "pointer", textAlign: "left",
                          transition: "all 0.15s", fontFamily: "inherit",
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: `2px solid ${isSelected ? "#3571DE" : "#D1D5DB"}`,
                          background: isSelected ? "#3571DE" : "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s",
                        }}>
                          {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                        </div>

                        {/* Avatar */}
                        <div style={{
                          width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                          background: conta.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontSize: 12, fontWeight: 700,
                        }}>
                          {conta.initials}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#212A46" }}>{conta.name}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "1px 7px",
                              borderRadius: 9999, background: "#F3F4F6", color: "#6B7280",
                            }}>{conta.segment}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 3 }}>
                              <MapPin size={10} /> {conta.city}
                            </span>
                            <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 3 }}>
                              <TrendingUp size={10} /> {conta.playsActive} play{conta.playsActive !== 1 ? "s" : ""} ativa{conta.playsActive !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Health score */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 3 }}>Health</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 48, height: 4, borderRadius: 9999, background: "#F3F4F6", overflow: "hidden" }}>
                              <div style={{ width: `${conta.healthScore}%`, height: "100%", background: hc, borderRadius: 9999 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: hc }}>{conta.healthScore}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredContas.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
                      <Building2 size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                      <p style={{ fontSize: 13 }}>Nenhuma conta encontrada</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: Dossiês ── */}
            {currentStep === 3 && (
              <div>
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "2px solid #E5E7EB", marginBottom: 18 }}>
                  {(["contas", "contatos"] as const).map((tab) => {
                    const isActive = dossieTab === tab;
                    const count = tab === "contas" ? selectedDossiêsContas.size : selectedDossiêsContatos.size;
                    return (
                      <button
                        key={tab}
                        onClick={() => setDossieTab(tab)}
                        style={{
                          padding: "9px 20px", fontSize: 12, fontWeight: 700,
                          color: isActive ? "#FF6D4A" : "#6B7280",
                          background: "transparent", border: "none",
                          borderBottom: isActive ? "2px solid #FF5F39" : "2px solid transparent",
                          marginBottom: -2, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 7,
                          fontFamily: "'Inria Sans', sans-serif", transition: "color 0.2s",
                        }}
                      >
                        {tab === "contas" ? <Building2 size={13} /> : <Users size={13} />}
                        Dossiês de {tab === "contas" ? "Contas" : "Contatos"}
                        {count > 0 && (
                          <span style={{
                            background: "#FF5F39", color: "white", fontSize: 10,
                            fontWeight: 700, borderRadius: 9999, padding: "1px 6px",
                          }}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {(selectedDossiêsContas.size === 0 && selectedDossiêsContatos.size === 0) && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: "#FEF2F2", border: "1px solid #FECACA",
                    borderRadius: 8, padding: "9px 14px", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 15, color: "#EF4444" }}>⚠</span>
                    <p style={{ fontSize: 12, color: "#991B1B" }}>Selecione ao menos um dossiê em <strong>cada aba</strong> (Contas e Contatos) para continuar.</p>
                  </div>
                )}
                {(selectedDossiêsContas.size === 0 && selectedDossiêsContatos.size > 0) && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: "#FEF2F2", border: "1px solid #FECACA",
                    borderRadius: 8, padding: "9px 14px", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 15, color: "#EF4444" }}>⚠</span>
                    <p style={{ fontSize: 12, color: "#991B1B" }}>Falta selecionar ao menos um <strong>Dossiê de Conta</strong>.</p>
                  </div>
                )}
                {(selectedDossiêsContas.size > 0 && selectedDossiêsContatos.size === 0) && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: "#FEF2F2", border: "1px solid #FECACA",
                    borderRadius: 8, padding: "9px 14px", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 15, color: "#EF4444" }}>⚠</span>
                    <p style={{ fontSize: 12, color: "#991B1B" }}>Falta selecionar ao menos um <strong>Dossiê de Contato</strong>.</p>
                  </div>
                )}

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "#6B7280" }}>
                    {dossieTab === "contas"
                      ? `${filteredDossiêsContas.length} dossiês de contas disponíveis`
                      : `${filteredDossiêsContatos.length} dossiês de contatos disponíveis`}
                  </p>
                  <button style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 6, border: "none",
                    background: "#3571DE", color: "white",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <Plus size={11} /> Criar novo dossiê
                  </button>
                </div>

                {/* List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                  {(dossieTab === "contas" ? filteredDossiêsContas : filteredDossiêsContatos).map((d) => {
                    const isSelected = dossieTab === "contas"
                      ? selectedDossiêsContas.has(d.id)
                      : selectedDossiêsContatos.has(d.id);

                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          if (dossieTab === "contas")
                            setSelectedDossiêsContas(toggleSet(selectedDossiêsContas, d.id));
                          else
                            setSelectedDossiêsContatos(toggleSet(selectedDossiêsContatos, d.id));
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "12px 14px", borderRadius: 8,
                          border: `1.5px solid ${isSelected ? "#3571DE" : "#E5E7EB"}`,
                          background: isSelected ? "#EFF6FF" : "white",
                          cursor: "pointer", textAlign: "left",
                          transition: "all 0.15s", fontFamily: "inherit",
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${isSelected ? "#3571DE" : "#D1D5DB"}`,
                          background: isSelected ? "#3571DE" : "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                          {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                        </div>

                        {/* Icon */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: dossieTab === "contas" ? "#FFF5F3" : "#F0F4FF",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {dossieTab === "contas"
                            ? <Building2 size={15} color="#FF5F39" />
                            : <Users size={15} color="#3571DE" />}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#212A46", marginBottom: 2 }}>{d.name}</p>
                          <p style={{ fontSize: 11, color: "#9CA3AF" }}>
                            {dossieTab === "contas" ? d.segment : `${d.role} • ${d.company}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 4: GTM ── */}
            {currentStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Produto / Serviço */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Produtos / Serviços <span style={{ color: "#FF5F39" }}>*</span>
                  </label>
                  {selectedGTM.size === 0 && (
                    <p style={{ fontSize: 11, color: "#EF4444", marginBottom: 8 }}>Selecione ao menos um produto ou serviço</p>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {defaultProdutos.map((p) => {
                      const isSelected = selectedGTM.has(p.id);
                      const tipoColor: Record<string, string> = { Produto: "#166534", Serviço: "#FF5F39", Treinamento: "#1e40af" };
                      const tipoBg: Record<string, string> = { Produto: "#dcfce7", Serviço: "#FFEDD5", Treinamento: "#dbeafe" };
                      const TipoIcon = p.tipo === "Produto" ? Package : p.tipo === "Serviço" ? Wrench : GraduationCap;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedGTM(toggleSet(selectedGTM, p.id))}
                          style={{
                            padding: "13px 16px", borderRadius: 8, textAlign: "left",
                            border: `1.5px solid ${isSelected ? "#3571DE" : "#E5E7EB"}`,
                            background: isSelected ? "#EFF6FF" : "white",
                            cursor: "pointer", transition: "all 0.15s",
                            fontFamily: "inherit", position: "relative",
                          }}
                        >
                          {isSelected && (
                            <div style={{
                              position: "absolute", top: 10, right: 10,
                              width: 17, height: 17, borderRadius: "50%",
                              background: "#3571DE", display: "flex",
                              alignItems: "center", justifyContent: "center",
                            }}>
                              <Check size={9} color="white" strokeWidth={3} />
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "2px 8px", borderRadius: 9999, fontSize: 10,
                              background: tipoBg[p.tipo] || "#f3f4f6",
                              color: tipoColor[p.tipo] || "#374151",
                            }}>
                              <TipoIcon size={10} />
                              {p.tipo}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#3571DE" : "#212A46", marginBottom: 3 }}>{p.nome}</p>
                          <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>
                            R$ {p.preco.toLocaleString("pt-BR")} / {p.unidade} · PMF {p.pmfRating.toFixed(1)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Público-alvo */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Público-alvo <span style={{ color: "#FF5F39" }}>*</span>
                  </label>
                  {selectedPublico.size === 0 && (
                    <p style={{ fontSize: 11, color: "#EF4444", marginBottom: 8 }}>Selecione ao menos um público</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {defaultPublicos.map((pub) => {
                      const isSelected = selectedPublico.has(pub.id);
                      return (
                        <button
                          key={pub.id}
                          onClick={() => setSelectedPublico(toggleSet(selectedPublico, pub.id))}
                          style={{
                            padding: "7px 14px", borderRadius: 9999,
                            border: `1.5px solid ${isSelected ? "#3571DE" : "#E5E7EB"}`,
                            background: isSelected ? "#3571DE" : "white",
                            color: isSelected ? "white" : "#374151",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                            transition: "all 0.15s", fontFamily: "inherit",
                            display: "flex", alignItems: "center", gap: 5,
                          }}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                          <Users size={11} style={{ opacity: 0.7 }} />
                          {pub.nome}
                          <span style={{ opacity: 0.6, fontSize: 10 }}>· {pub.classificacao}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Momento de Mercado */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Momento de Mercado <span style={{ color: "#FF5F39" }}>*</span>
                  </label>
                  {selectedMercado.size === 0 && (
                    <p style={{ fontSize: 11, color: "#EF4444", marginBottom: 8 }}>Selecione ao menos um momento</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {defaultMomentos.map((m) => {
                      const isSelected = selectedMercado.has(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMercado(toggleSet(selectedMercado, m.id))}
                          style={{
                            padding: "7px 14px", borderRadius: 9999,
                            border: `1.5px solid ${isSelected ? "#FF5F39" : "#E5E7EB"}`,
                            background: isSelected ? "#FF5F39" : "white",
                            color: isSelected ? "white" : "#374151",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                            transition: "all 0.15s", fontFamily: "inherit",
                            display: "flex", alignItems: "center", gap: 5,
                          }}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                          <Calendar size={11} style={{ opacity: 0.7 }} />
                          {m.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════
              FOOTER
          ══════════════════════════════════════════ */}
          <div style={{
            padding: "14px 40px",
            borderTop: "1px solid #F3F4F6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "white", flexShrink: 0,
          }}>
            {/* Voltar */}
            <button
              onClick={handleBack}
              style={btnOutline(currentStep === 1)}
              disabled={currentStep === 1}
            >
              Voltar
            </button>

            {/* Right actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {currentStep > 1 && currentStep !== 2 && (
                <button onClick={handleSkip} style={btnOutline()}>
                  Pular etapa
                </button>
              )}
              <button
                onClick={() => isWizardComplete && handleFinish(true)}
                disabled={!isWizardComplete}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: isWizardComplete ? "linear-gradient(135deg, #7C3AED, #4F46E5)" : "#D1D5DB",
                  color: "white", fontSize: 12, fontWeight: 700,
                  cursor: isWizardComplete ? "pointer" : "not-allowed",
                  fontFamily: "inherit", transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: isWizardComplete ? 1 : 0.7,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                Criar Play com IA
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                style={{
                  padding: "10px 32px", borderRadius: 8, border: "none",
                  background: canGoNext() ? "#3571DE" : "#D1D5DB",
                  color: "white", fontSize: 12, fontWeight: 700,
                  cursor: canGoNext() ? "pointer" : "not-allowed",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                {currentStep === STEPS.length ? "Criar Play" : "Próximo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}