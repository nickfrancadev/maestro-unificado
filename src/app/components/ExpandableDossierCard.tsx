import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Paperclip,
  Info,
} from "lucide-react";
import type { AccountDetail } from "./AccountDetailPage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dossier {
  id: number;
  kind: string;
  title: string;
  date: string;
  author: string;
  type: string;
  stage?: string;
  contacts: string[];
  excerpt: string;
  // Conta-dossier fields
  localizacaoSede?: string;
  oportunidade?: string;
  diferenciais?: string;
  culturaEmpresa?: string;
  eventosPatrocinar?: string;
  eventoSetor?: string;
  faseNegociacao?: string;
  novidades?: string;
  statusConta?: string;
  notas?: string;
}

interface ContactData {
  funcaoCompra: string;
  cidade: string;
  experiencia: string;
  novidades: string;
  dor: string;
  envolvimento: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Reunião: "#2563EB",
  Proposta: "#16A34A",
  "Follow-up": "#D97706",
  Sale: "#FF5F39",
  Relacionamento: "#6B7280",
};

const FUNCOES_COMPRA = [
  "Decisor", "Influenciador", "Usuário Final",
  "Técnico", "Financeiro", "Campeão", "Bloqueador",
];
const ENVOLVIMENTOS = ["Alto", "Médio", "Baixo", "Neutro"];
const TIPOS = ["Sale", "Reunião", "Proposta", "Follow-up", "Relacionamento", "Renovação", "Expansão"];
const STAGES = ["Descoberta", "Qualificação", "Proposta", "Negociação", "Fechado"];
const CULTURAS = ["Innovative", "Conservative", "Collaborative", "Competitive", "Hierarchical"];
const FASES_DEFAULT = ["Prospecção", "Qualificação", "Proposta enviada", "Negociação", "Fechado – ganho", "Fechado – perdido"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 26, color }: { name: string; size?: number; color?: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div
      title={name}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: color ?? "#FF5F39",
        color: "white", fontSize: size * 0.34, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

const AVATAR_COLORS = ["#FF5F39", "#7C3AED", "#0369A1", "#16A34A", "#D97706"];

function StackedAvatars({ names }: { names: string[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex" }}>
        {names.slice(0, 4).map((name, i) => (
          <div key={i} style={{ marginLeft: i > 0 ? -6 : 0, position: "relative", zIndex: 4 - i }}>
            <div
              title={name}
              style={{
                width: 24, height: 24, borderRadius: "50%",
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                color: "white", fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid white",
              }}
            >
              {name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </div>
          </div>
        ))}
        {names.length > 4 && (
          <div style={{
            width: 24, height: 24, borderRadius: "50%", background: "#E2E8F0",
            color: "#6B7280", fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid white", marginLeft: -6,
          }}>
            +{names.length - 4}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: "#9B9B9B" }}>
        {names.length} contato{names.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 4px 0", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </p>
  );
}

function SectionLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
      <Info size={13} style={{ color: "#FF5F39", flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "#212A46" }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: "#9B9B9B", marginLeft: "auto", fontStyle: "italic" }}>{hint}</span>}
    </div>
  );
}

function Field({ label, hint, children, fullWidth }: { label: string; hint?: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <SectionLabel label={label} hint={hint} />
      {children}
    </div>
  );
}

function FaseSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [fases, setFases] = useState([...FASES_DEFAULT]);
  const [open, setOpen] = useState(false);
  const [newFase, setNewFase] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addFase = () => {
    const t = newFase.trim();
    if (t && !fases.includes(t)) setFases((p) => [...p, t]);
    setNewFase("");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", resize: "none" }}
      >
        <span style={{ color: value ? "#212A46" : "#9B9B9B" }}>{value || "Selecionar"}</span>
        <ChevronDown size={13} style={{ color: "#9B9B9B", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(33,42,70,0.14)", zIndex: 2000, overflow: "hidden" }}>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {fases.map((fase, i) => (
              <div
                key={fase}
                draggable
                onDragStart={() => { dragIdx.current = i; }}
                onDragEnter={() => { dragOverIdx.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx.current === null || dragOverIdx.current === null || dragIdx.current === dragOverIdx.current) return;
                  setFases((p) => {
                    const n = [...p];
                    const [m] = n.splice(dragIdx.current!, 1);
                    n.splice(dragOverIdx.current!, 0, m);
                    return n;
                  });
                  dragIdx.current = null; dragOverIdx.current = null;
                }}
                style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: value === fase ? "#FFF4F1" : "transparent", borderBottom: "1px solid #F4F6FB", cursor: "default" }}
              >
                <GripVertical size={13} style={{ color: "#CBD5E0", cursor: "grab", marginRight: 6 }} />
                <span onClick={() => { onChange(fase); setOpen(false); }} style={{ flex: 1, fontSize: 12, color: value === fase ? "#FF5F39" : "#212A46", fontWeight: value === fase ? 600 : 400, cursor: "pointer" }}>{fase}</span>
                <button onClick={(e) => { e.stopPropagation(); setFases((p) => p.filter((f) => f !== fase)); if (value === fase) onChange(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E0", padding: "2px 4px", boxShadow: "none", display: "flex" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ padding: "8px 10px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 6 }}>
            <input value={newFase} onChange={(e) => setNewFase(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFase(); } }} placeholder="Novo estágio..." style={{ ...inputStyle, flex: 1, padding: "6px 8px", fontSize: 12 }} />
            <button onClick={addFase} disabled={!newFase.trim()} style={{ padding: "6px 10px", borderRadius: 7, border: "none", background: newFase.trim() ? "#FF5F39" : "#E2E8F0", color: newFase.trim() ? "white" : "#9B9B9B", fontSize: 12, fontWeight: 700, cursor: newFase.trim() ? "pointer" : "default", boxShadow: "none", display: "flex", alignItems: "center", gap: 3 }}>
              <Plus size={11} />Criar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #E2E8F0", borderRadius: 7,
  padding: "7px 10px", fontSize: 13, color: "#212A46",
  background: "white", outline: "none", boxSizing: "border-box", boxShadow: "none",
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: "vertical", minHeight: 64,
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer", paddingRight: 28,
};

// ─── Account-dossier inline form ──────────────────────────────────────────────

function AccountDossierForm({ dossier }: { dossier: Dossier }) {
  const [title, setTitle] = useState(dossier.title);
  const [type, setType] = useState(dossier.type);
  const [localizacaoSede, setLocalizacaoSede] = useState(dossier.localizacaoSede ?? "");
  const [oportunidade, setOportunidade] = useState(dossier.oportunidade ?? "");
  const [diferenciais, setDiferenciais] = useState(dossier.diferenciais ?? "");
  const [culturaEmpresa, setCulturaEmpresa] = useState(dossier.culturaEmpresa ?? "");
  const [eventosPatrocinar, setEventosPatrocinar] = useState(dossier.eventosPatrocinar ?? "");
  const [eventoSetor, setEventoSetor] = useState(dossier.eventoSetor ?? "");
  const [faseNegociacao, setFaseNegociacao] = useState(dossier.faseNegociacao ?? dossier.stage ?? "");
  const [novidades, setNovidades] = useState(dossier.novidades ?? "");
  const [statusConta, setStatusConta] = useState(dossier.statusConta ?? "");
  const [notas, setNotas] = useState(dossier.notas ?? dossier.excerpt ?? "");

  return (
    <div style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFD" }}>
      {/* Meta row: Título + Tipo */}
      <div style={{ padding: "16px 20px 0", display: "grid", gridTemplateColumns: "1fr auto", gap: "0 14px", alignItems: "end" }}>
        <Field label="Título">
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Título do dossiê" />
        </Field>
        <Field label="Tipo">
          <div style={{ position: "relative", width: 150 }}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
          </div>
        </Field>
      </div>

      {/* All dossier fields in 2-col grid */}
      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>

        <Field label="Localização da Sede">
          <input value={localizacaoSede} onChange={(e) => setLocalizacaoSede(e.target.value)} placeholder="Cidade / Estado" style={inputStyle} />
        </Field>

        <Field label="Fase Atual da Negociação">
          <FaseSelect value={faseNegociacao} onChange={setFaseNegociacao} />
        </Field>

        <Field label="Qual oportunidade vou trabalhar?" fullWidth>
          <textarea value={oportunidade} onChange={(e) => setOportunidade(e.target.value)} placeholder="Informe a oferta que será trabalhada" rows={2} style={textareaStyle} />
        </Field>

        <Field label="Quais os diferenciais da sua oferta?" fullWidth>
          <textarea value={diferenciais} onChange={(e) => setDiferenciais(e.target.value)} placeholder="Oferta" rows={2} style={textareaStyle} />
        </Field>

        <Field label="Cultura da Empresa" hint="(Inovadora / Reservada)">
          <div style={{ position: "relative" }}>
            <select value={culturaEmpresa} onChange={(e) => setCulturaEmpresa(e.target.value)} style={selectStyle}>
              <option value="">Selecione</option>
              {CULTURAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
          </div>
        </Field>

        <Field label="Status da Conta">
          <textarea value={statusConta} onChange={(e) => setStatusConta(e.target.value)} placeholder="Descreva o status atual da conta" rows={2} style={textareaStyle} />
        </Field>

        <Field label="Eventos que vão patrocinar">
          <textarea value={eventosPatrocinar} onChange={(e) => setEventosPatrocinar(e.target.value)} placeholder="Eventos a serem patrocinados" rows={2} style={textareaStyle} />
        </Field>

        <Field label="Eventos do setor" hint="(Sem patrocínio necessariamente)">
          <textarea value={eventoSetor} onChange={(e) => setEventoSetor(e.target.value)} placeholder="Eventos do setor" rows={2} style={textareaStyle} />
        </Field>

        <Field label="Novidades / Ações publicadas" fullWidth>
          <textarea value={novidades} onChange={(e) => setNovidades(e.target.value)} placeholder="Novidades" rows={2} style={textareaStyle} />
        </Field>

        <Field label="Notas" fullWidth>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Anotações livres" rows={3} style={textareaStyle} />
        </Field>

        {/* Anexos */}
        <div style={{ gridColumn: "1 / -1" }}>
          <SectionLabel label="Anexos" />
          <p style={{ fontSize: 11, color: "#9B9B9B", margin: "0 0 8px 0" }}>*Até 6 arquivos, com até 2MB cada um</p>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1.5px dashed #CBD5E0", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#2563EB", background: "transparent" }}>
            <Paperclip size={13} />
            <span>Adicionar Anexo</span>
            <input type="file" multiple style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 20px 16px", gap: 8 }}>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 7, border: "none", background: "#FF5F39", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "none" }}>
          <Save size={13} />
          Salvar dossiê
        </button>
      </div>
    </div>
  );
}

// ─── Contact-dossier inline form ──────────────────────────────────────────────

function ContactDossierForm({ dossier, account }: { dossier: Dossier; account: AccountDetail }) {
  const [title, setTitle] = useState(dossier.title);
  const [type, setType] = useState(dossier.type);
  const [stage, setStage] = useState(dossier.stage ?? "");
  const [activeContactName, setActiveContactName] = useState<string | null>(
    dossier.contacts[0] ?? null
  );
  const [contactData, setContactData] = useState<Record<string, Partial<ContactData>>>({});

  const getField = (name: string, field: keyof ContactData): string =>
    (contactData[name]?.[field] as string) ?? "";

  const setField = (name: string, field: keyof ContactData, value: string) => {
    setContactData((prev) => ({
      ...prev,
      [name]: { ...(prev[name] ?? {}), [field]: value },
    }));
  };

  return (
    <div style={{ borderTop: "1px solid #F1F5F9" }}>
      {/* Header fields */}
      <div style={{ padding: "16px 20px 0", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 12px", alignItems: "end" }}>
        <div>
          <FieldLabel>Título</FieldLabel>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Tipo</FieldLabel>
          <div style={{ position: "relative" }}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...selectStyle, width: 140 }}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
          </div>
        </div>
        <div>
          <FieldLabel>Estágio</FieldLabel>
          <div style={{ position: "relative" }}>
            <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ ...selectStyle, width: 130 }}>
              <option value="">—</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
          </div>
        </div>
      </div>

      {/* Contact tabs */}
      {dossier.contacts.length > 0 && (
        <div style={{ borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "stretch", paddingLeft: 20, marginTop: 14, background: "#FAFBFD", overflowX: "auto" }}>
          {dossier.contacts.map((name, i) => {
            const isActive = activeContactName === name;
            return (
              <button
                key={name}
                onClick={() => setActiveContactName(name)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 14px",
                  background: "none", border: "none",
                  borderBottom: isActive ? "2px solid #FF5F39" : "2px solid transparent",
                  cursor: "pointer", fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#FF5F39" : "#6B7280",
                  whiteSpace: "nowrap", flexShrink: 0, marginBottom: -1, boxShadow: "none",
                }}
              >
                <Avatar name={name} size={20} color={isActive ? "#FF5F39" : AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                {name.split(" ")[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Active contact fields */}
      {activeContactName && (
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px" }}>
          <div>
            <FieldLabel>Função de Compra</FieldLabel>
            <div style={{ position: "relative" }}>
              <select
                value={getField(activeContactName, "funcaoCompra")}
                onChange={(e) => setField(activeContactName, "funcaoCompra", e.target.value)}
                style={selectStyle}
              >
                <option value="">Selecionar</option>
                {FUNCOES_COMPRA.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
            </div>
          </div>
          <div>
            <FieldLabel>Cidade</FieldLabel>
            <input
              value={getField(activeContactName, "cidade")}
              onChange={(e) => setField(activeContactName, "cidade", e.target.value)}
              placeholder="Cidade do contato"
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Experiência Profissional</FieldLabel>
            <textarea
              value={getField(activeContactName, "experiencia")}
              onChange={(e) => setField(activeContactName, "experiencia", e.target.value)}
              placeholder="Trajetória profissional do contato"
              rows={2}
              style={textareaStyle}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Novidades / Atualizações</FieldLabel>
            <textarea
              value={getField(activeContactName, "novidades")}
              onChange={(e) => setField(activeContactName, "novidades", e.target.value)}
              placeholder="Novidades recentes sobre o contato"
              rows={2}
              style={textareaStyle}
            />
          </div>
          <div>
            <FieldLabel>Hipótese de Dor / KPI</FieldLabel>
            <textarea
              value={getField(activeContactName, "dor")}
              onChange={(e) => setField(activeContactName, "dor", e.target.value)}
              placeholder="Desafios e métricas de sucesso"
              rows={2}
              style={textareaStyle}
            />
          </div>
          <div>
            <FieldLabel>Envolvimento no Projeto</FieldLabel>
            <div style={{ position: "relative" }}>
              <select
                value={getField(activeContactName, "envolvimento")}
                onChange={(e) => setField(activeContactName, "envolvimento", e.target.value)}
                style={selectStyle}
              >
                <option value="">Selecionar</option>
                {ENVOLVIMENTOS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 20px 16px", gap: 8 }}>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 7, border: "none", background: "#FF5F39", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "none" }}>
          <Save size={13} />
          Salvar
        </button>
      </div>
    </div>
  );
}

// ─── Main expandable card ─────────────────────────────────────────────────────

export function ExpandableDossierCard({
  dossier,
  account,
  onDelete,
}: {
  dossier: Dossier;
  account: AccountDetail;
  onDelete?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isContato = dossier.kind === "contato";

  return (
    <div
      style={{
        background: "white",
        borderRadius: 10,
        border: `1px solid ${isOpen ? "#FF5F39" : "#E2E8F0"}`,
        overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: isOpen ? "0 4px 16px rgba(255,95,57,0.1)" : "none",
      }}
    >
      {/* ── Card header (always visible, click to toggle) ── */}
      <div
        onClick={() => setIsOpen((o) => !o)}
        style={{ padding: "14px 18px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}
      >
        {/* Row 1: badges + title + chevron */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
            <span style={{
              borderRadius: 5,
              background: isContato ? "#EDE9FE" : "#E0F2FE",
              color: isContato ? "#7C3AED" : "#0369A1",
              fontSize: 10, fontWeight: 700, padding: "2px 7px", letterSpacing: "0.03em",
            }}>
              {isContato ? "Dossiê de Contato" : "Dossiê de Conta"}
            </span>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#212A46" }}>{dossier.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: "#9B9B9B" }}>{dossier.date}</span>

            {/* ── Three-dot menu ── */}
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); setConfirmDelete(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9B9B", boxShadow: "none", padding: 2, display: "flex" }}
              >
                <MoreVertical size={14} />
              </button>

              {menuOpen && (
                <>
                  <div onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200,
                      background: "white", borderRadius: 10, border: "1px solid #E2E8F0",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden",
                    }}
                  >
                    {!confirmDelete ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%",
                          padding: "10px 16px", background: "none", border: "none",
                          fontSize: 13, color: "#EF4444", cursor: "pointer", textAlign: "left",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <Trash2 size={14} />
                        Excluir dossiê
                      </button>
                    ) : (
                      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#212A46", fontWeight: 600 }}>Confirmar exclusão?</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>Esta ação não pode ser desfeita.</p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(false); onDelete?.(); }}
                            style={{ flex: 1, background: "#EF4444", color: "white", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          >
                            Excluir
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                            style={{ flex: 1, background: "#F1F5F9", color: "#6B7280", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 12, cursor: "pointer" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <span style={{ color: isOpen ? "#FF5F39" : "#9B9B9B", display: "flex", transition: "color 0.15s" }}>
              {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </div>
        </div>

        {/* Row 2: excerpt */}
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.5 }}>{dossier.excerpt}</p>

        {/* Row 3: contacts/author */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #F7F8FB" }}>
          <div>
            {isContato && dossier.contacts.length > 0 ? (
              <StackedAvatars names={dossier.contacts} />
            ) : (
              <span style={{ fontSize: 11, color: "#9B9B9B" }}>por {dossier.author}</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: isOpen ? "#FF5F39" : "#CBD5E0", fontWeight: 600 }}>
            {isOpen ? "Fechar" : "Editar"}
          </span>
        </div>
      </div>

      {/* ── Expanded edit area ── */}
      {isOpen && (
        isContato
          ? <ContactDossierForm dossier={dossier} account={account} />
          : <AccountDossierForm dossier={dossier} />
      )}
    </div>
  );
}