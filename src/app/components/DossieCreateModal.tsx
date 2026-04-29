import { useState, useRef, useEffect } from "react";
import { X, Plus, Paperclip, Zap, ChevronDown, Info, Trash2, GripVertical } from "lucide-react";

type DossieType = "conta" | "contato";

interface DossieCreateModalProps {
  accountName?: string;
  onClose: () => void;
  onSave?: (data: DossieFormData) => void;
  defaultType?: DossieType;
  account?: { name: string };
}

export interface DossieFormData {
  tipo: DossieType;
  titulo: string;
  localizacaoSede: string;
  oportunidade: string;
  diferenciais: string;
  pitch: string;
  culturaEmpresa: string;
  eventosPatrocinar: string;
  eventoSetor: string;
  faseNegociacao: string;
  novidades: string;
  statusConta: string;
  notas: string;
  anexos: File[];
  // Campos exclusivos de dossiê de contato
  relacionamento?: string;
  doresDesafios?: string;
  objetivosPessoais?: string;
  tomComunicacao?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "#212A46",
  background: "#FAFBFD",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "none",
  resize: "vertical",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
  paddingRight: 32,
};

const FASES = [
  "Prospecção",
  "Qualificação",
  "Proposta enviada",
  "Negociação",
  "Fechado – ganho",
  "Fechado – perdido",
];

const CULTURAS = [
  "Innovative",
  "Conservative",
  "Collaborative",
  "Competitive",
  "Hierarchical",
];

const TOM_COMUNICACAO = [
  "Formal",
  "Informal",
  "Técnico",
  "Consultivo",
  "Assertivo",
];

function SectionLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <Info size={14} style={{ color: "#FF5F39", flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}>{label}</span>
      {hint && (
        <span style={{ fontSize: 11, color: "#9B9B9B", marginLeft: "auto", fontStyle: "italic" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
      <SectionLabel label={label} hint={hint} />
      {children}
    </div>
  );
}

function FaseNegociacaoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [fases, setFases] = useState<string[]>([...FASES]);
  const [open, setOpen] = useState(false);
  const [newFase, setNewFase] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addFase = () => {
    const trimmed = newFase.trim();
    if (trimmed && !fases.includes(trimmed)) {
      setFases((prev) => [...prev, trimmed]);
    }
    setNewFase("");
  };

  const deleteFase = (fase: string) => {
    setFases((prev) => prev.filter((f) => f !== fase));
    if (value === fase) onChange("");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inputStyle,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", textAlign: "left", resize: "none",
        }}
      >
        <span style={{ color: value ? "#212A46" : "#9B9B9B" }}>{value || "Selecionar"}</span>
        <ChevronDown size={14} style={{ color: "#9B9B9B", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "white", border: "1px solid #E2E8F0", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(33,42,70,0.14)", zIndex: 2000, overflow: "hidden",
        }}>
          {/* Existing stages */}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {fases.length === 0 && (
              <p style={{ margin: 0, padding: "10px 14px", fontSize: 12, color: "#9B9B9B" }}>Nenhum estágio cadastrado</p>
            )}
            {fases.map((fase, index) => (
              <div
                key={fase}
                draggable
                onDragStart={() => { dragIndex.current = index; }}
                onDragEnter={() => { dragOverIndex.current = index; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex.current === null || dragOverIndex.current === null) return;
                  if (dragIndex.current === dragOverIndex.current) return;
                  setFases((prev) => {
                    const next = [...prev];
                    const [moved] = next.splice(dragIndex.current!, 1);
                    next.splice(dragOverIndex.current!, 0, moved);
                    return next;
                  });
                  dragIndex.current = null;
                  dragOverIndex.current = null;
                }}
                onDragEnd={() => { dragIndex.current = null; dragOverIndex.current = null; }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 14px",
                  background: value === fase ? "#FFF4F1" : "transparent",
                  cursor: "default",
                  borderBottom: "1px solid #F4F6FB",
                }}
              >
                {/* Drag handle */}
                <span
                  style={{ display: "flex", alignItems: "center", color: "#CBD5E0", cursor: "grab", marginRight: 6, flexShrink: 0 }}
                  title="Arrastar para reordenar"
                >
                  <GripVertical size={14} />
                </span>
                <span
                  onClick={() => { onChange(fase); setOpen(false); }}
                  style={{ flex: 1, fontSize: 13, color: value === fase ? "#FF5F39" : "#212A46", fontWeight: value === fase ? 600 : 400, cursor: "pointer" }}
                >
                  {fase}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFase(fase); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E0", padding: "2px 4px", boxShadow: "none", display: "flex" }}
                  title="Excluir estágio"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new stage */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 6 }}>
            <input
              value={newFase}
              onChange={(e) => setNewFase(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFase(); } }}
              placeholder="Novo estágio..."
              style={{ ...inputStyle, flex: 1, padding: "7px 10px", fontSize: 12, minHeight: "unset", resize: "none" }}
            />
            <button
              onClick={addFase}
              disabled={!newFase.trim()}
              style={{
                padding: "7px 12px", borderRadius: 7, border: "none",
                background: newFase.trim() ? "#FF5F39" : "#E2E8F0",
                color: newFase.trim() ? "white" : "#9B9B9B",
                fontSize: 12, fontWeight: 700, cursor: newFase.trim() ? "pointer" : "default",
                boxShadow: "none", display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <Plus size={12} />
              Criar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DossieCreateModal({ accountName, onClose, onSave, defaultType = "conta", account }: DossieCreateModalProps) {
  const [tipo, setTipo] = useState<DossieType>(defaultType);
  const [form, setForm] = useState<DossieFormData>({
    tipo,
    titulo: "",
    localizacaoSede: "",
    oportunidade: "",
    diferenciais: "",
    pitch: "",
    culturaEmpresa: "",
    eventosPatrocinar: "",
    eventoSetor: "",
    faseNegociacao: "",
    novidades: "",
    statusConta: "",
    notas: "",
    anexos: [],
    relacionamento: "",
    doresDesafios: "",
    objetivosPessoais: "",
    tomComunicacao: "",
  });

  const set = (key: keyof DossieFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleTipoChange = (t: DossieType) => {
    setTipo(t);
    setForm((prev) => ({ ...prev, tipo: t }));
  };

  const handleSave = () => {
    onSave?.({ ...form, tipo });
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(33,42,70,0.4)", zIndex: 1100, backdropFilter: "blur(2px)" }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 680,
          maxWidth: "95vw",
          maxHeight: "90vh",
          background: "white",
          borderRadius: 16,
          zIndex: 1200,
          boxShadow: "0 24px 64px rgba(33,42,70,0.22)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {(account?.name || accountName) ? `Conta: ${account?.name || accountName}` : "Novo Dossiê"}
            </p>
            <h2 style={{ margin: "3px 0 0 0", fontSize: 18, fontWeight: 700, color: "#212A46" }}>Criar Dossiê</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F7F8FB", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex", color: "#6B7280" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tipo selector ── */}
        {/* removed — this modal is for accounts only */}
        {/* <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "16px 28px 0", flexShrink: 0 }}>
          <p style={{ margin: "0 16px 0 0", fontSize: 12, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo de dossiê</p>
          {(["conta", "contato"] as DossieType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTipoChange(t)}
              style={{
                padding: "6px 18px",
                borderRadius: t === "conta" ? "8px 0 0 8px" : "0 8px 8px 0",
                border: "1px solid",
                borderColor: tipo === t ? "#FF5F39" : "#E2E8F0",
                background: tipo === t ? "#FF5F39" : "white",
                color: tipo === t ? "white" : "#9B9B9B",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "none",
                transition: "all 0.15s",
              }}
            >
              {t === "conta" ? "Dossiê de Conta" : "Dossiê de Contato"}
            </button>
          ))}
        </div> */}

        {/* ── Título ── */}
        <div style={{ padding: "16px 28px 0", flexShrink: 0 }}>
          <input
            style={{ ...inputStyle, fontSize: 15, fontWeight: 600, padding: "10px 14px", background: "#F7F8FB" }}
            value={form.titulo}
            onChange={(e) => set("titulo", e.target.value)}
            placeholder="Título do dossiê"
          />
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 8px" }}>

          {/* ── Campos comuns (conta + contato) ── */}
          {tipo === "conta" && (
            <>
              <Field label="Localização da Sede">
                <input style={inputStyle} value={form.localizacaoSede} onChange={(e) => set("localizacaoSede", e.target.value)} placeholder="Localização" />
              </Field>

              <Field label="Qual oportunidade vou trabalhar na conta?">
                <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.oportunidade} onChange={(e) => set("oportunidade", e.target.value)} placeholder="Informe oferta que será trabalhada" />
              </Field>

              <Field label="Quais os diferenciais da sua oferta?">
                <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.diferenciais} onChange={(e) => set("diferenciais", e.target.value)} placeholder="Oferta" />
              </Field>

              <Field label="Cultura da Empresa" hint="(Inovadora/Reservada)">
                <div style={{ position: "relative" }}>
                  <select style={selectStyle} value={form.culturaEmpresa} onChange={(e) => set("culturaEmpresa", e.target.value)}>
                    <option value="">Selecione</option>
                    {CULTURAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
                </div>
              </Field>

              <Field label="Eventos que vão patrocinar">
                <textarea style={{ ...inputStyle, minHeight: 56 }} value={form.eventosPatrocinar} onChange={(e) => set("eventosPatrocinar", e.target.value)} placeholder="Eventos a serem patrocinados" />
              </Field>

              <Field label="Eventos do setor" hint="(Sem patrocínio necessariamente)">
                <textarea style={{ ...inputStyle, minHeight: 56 }} value={form.eventoSetor} onChange={(e) => set("eventoSetor", e.target.value)} placeholder="Eventos do setor" />
              </Field>

              <Field label="Fase atual da negociação">
                <FaseNegociacaoSelect value={form.faseNegociacao} onChange={(v) => set("faseNegociacao", v)} />
              </Field>

              <Field label="Novidades / Ações publicadas">
                <textarea style={{ ...inputStyle, minHeight: 56 }} value={form.novidades} onChange={(e) => set("novidades", e.target.value)} placeholder="Novidades" />
              </Field>

              <Field label="Status da conta">
                <textarea style={{ ...inputStyle, minHeight: 56 }} value={form.statusConta} onChange={(e) => set("statusConta", e.target.value)} placeholder="Descreva o status da conta" />
              </Field>
            </>
          )}

          {/* ── Campos exclusivos dossiê de CONTATO ── */}
          {tipo === "contato" && (
            <>
              <Field label="Qual oportunidade vou trabalhar com este contato?">
                <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.oportunidade} onChange={(e) => set("oportunidade", e.target.value)} placeholder="Informe a oferta que será trabalhada" />
              </Field>

              <Field label="Relacionamento com o contato">
                <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.relacionamento ?? ""} onChange={(e) => set("relacionamento", e.target.value)} placeholder="Descreva o tipo de relacionamento e histórico com o contato" />
              </Field>

              <Field label="Dores e desafios">
                <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.doresDesafios ?? ""} onChange={(e) => set("doresDesafios", e.target.value)} placeholder="Principais problemas e desafios que o contato enfrenta" />
              </Field>

              <Field label="Objetivos pessoais e profissionais">
                <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.objetivosPessoais ?? ""} onChange={(e) => set("objetivosPessoais", e.target.value)} placeholder="O que motiva este contato?" />
              </Field>

              <Field label="Tom de comunicação">
                <div style={{ position: "relative" }}>
                  <select style={selectStyle} value={form.tomComunicacao ?? ""} onChange={(e) => set("tomComunicacao", e.target.value)}>
                    <option value="">Selecionar</option>
                    {TOM_COMUNICACAO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
                </div>
              </Field>

              <Field label="Fase atual da negociação">
                <FaseNegociacaoSelect value={form.faseNegociacao} onChange={(v) => set("faseNegociacao", v)} />
              </Field>
            </>
          )}

          {/* ── Notas (comum) ── */}
          <Field label="Notas">
            <textarea style={{ ...inputStyle, minHeight: 64 }} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Anotações livres" />
          </Field>

          {/* ── Anexos ── */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel label="Anexos" />
            <p style={{ fontSize: 11, color: "#9B9B9B", margin: "0 0 10px 0" }}>*Até 6 arquivos, com até 2MB cada um</p>
            <label
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                border: "1.5px dashed #CBD5E0", borderRadius: 8,
                padding: "8px 18px", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: "#2563EB",
                background: "transparent",
              }}
            >
              <Plus size={14} />
              <span>Adicionar Anexo</span>
              <input type="file" multiple style={{ display: "none" }} />
            </label>
            {form.anexos.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {form.anexos.map((f, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#EFF6FF", color: "#2563EB", borderRadius: 6, padding: "3px 10px", fontSize: 11 }}>
                    <Paperclip size={11} />
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Novo Bloco ── */}
          <button
            style={{
              width: "100%",
              padding: "11px",
              border: "1.5px dashed #CBD5E0",
              borderRadius: 10,
              background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 13, fontWeight: 600, color: "#9B9B9B",
              cursor: "pointer", boxShadow: "none", marginBottom: 12,
            }}
          >
            <Plus size={14} />
            <span>Novo Bloco</span>
          </button>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            gap: 10, padding: "16px 28px",
            borderTop: "1px solid #E2E8F0", background: "#FAFBFD", flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #CBD5E0", background: "white", fontSize: 13, fontWeight: 600, color: "#6B7280", cursor: "pointer", boxShadow: "none" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "#FF5F39", fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "none" }}
          >
            Salvar dossiê
          </button>
        </div>
      </div>
    </>
  );
}