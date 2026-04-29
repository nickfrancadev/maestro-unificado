import { useState, useRef, useEffect } from "react";
import { X, Plus, ChevronDown, Info, UserPlus, Check, Trash2, GripVertical } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContatoDossie {
  id: number;
  name: string;
  role: string;
  email: string;
}

interface ContatoData {
  funcaoCompra: string;
  cidade: string;
  experiencia: string;
  novidades: string;
  dor: string;
  envolvimento: string;
}

interface DossieContatoFormData {
  titulo: string;
  tipo: string;
  contatoIds: number[];
  contatoData: Record<number, Partial<ContatoData>>;
}

interface DossieContatoModalProps {
  accountName: string;
  availableContacts: ContatoDossie[];
  onClose: () => void;
  onSave?: (data: DossieContatoFormData) => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const TIPOS = ["Sale", "Relacionamento", "Renovação", "Expansão", "Parceria"];

const FUNCOES_COMPRA = [
  "Decisor",
  "Influenciador",
  "Usuário Final",
  "Técnico",
  "Financeiro",
  "Campeão",
  "Bloqueador",
];

const ENVOLVIMENTOS = [
  "Alto",
  "Médio",
  "Baixo",
  "Neutro",
];

// ─── Helper: avatar initials ──────────────────────────────────────────────────

function Avatar({ name, size = 28, active }: { name: string; size?: number; active?: boolean }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: active ? "#FF5F39" : "#E2E8F0",
        color: active ? "white" : "#6B7280",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        flexShrink: 0,
        border: active ? "2px solid #FF5F39" : "2px solid transparent",
        transition: "all 0.15s",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Contact Picker Popover ───────────────────────────────────────────────────

function ContactPicker({
  available,
  selected,
  onToggle,
  onClose,
}: {
  available: ContatoDossie[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = available.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        width: 320,
        background: "white",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(33,42,70,0.18)",
        zIndex: 3000,
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #F1F5F9" }}>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar contato..."
          style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
        />
      </div>

      {/* List */}
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <p style={{ margin: 0, padding: "14px", fontSize: 12, color: "#9B9B9B", textAlign: "center" }}>
            Nenhum contato encontrado
          </p>
        )}
        {filtered.map((c) => {
          const isSelected = selected.has(c.id);
          return (
            <div
              key={c.id}
              onClick={() => onToggle(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                cursor: "pointer",
                background: isSelected ? "#FFF4F1" : "transparent",
                borderBottom: "1px solid #F7F8FB",
                transition: "background 0.1s",
              }}
            >
              <Avatar name={c.name} size={30} active={isSelected} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#212A46", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.name}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>{c.role}</p>
              </div>
              {isSelected && <Check size={14} style={{ color: "#FF5F39", flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "#FF5F39", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "none" }}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

// ─── Select helper ────────────────────────────────────────────────────────────

function SelectField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Info size={13} style={{ color: "#FF5F39" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#212A46" }}>{label}</span>
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputStyle,
            appearance: "none",
            WebkitAppearance: "none",
            cursor: "pointer",
            paddingRight: 32,
          }}
        >
          <option value="">Selecionar</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
      </div>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, rows = 3 }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <Info size={13} style={{ color: "#FF5F39" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#212A46" }}>{label}</span>
      </div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, minHeight: rows * 22 + 16 }}
      />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function DossieContatoModal({ accountName, availableContacts, onClose, onSave }: DossieContatoModalProps) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [contatoIds, setContatoIds] = useState<number[]>([]);
  const [activeContatoId, setActiveContatoId] = useState<number | null>(null);
  const [contatoData, setContatoData] = useState<Record<number, Partial<ContatoData>>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const pickerAnchorRef = useRef<HTMLDivElement>(null);

  const selectedSet = new Set(contatoIds);

  const filteredContacts = availableContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const toggleContato = (id: number) => {
    setContatoIds((prev) => {
      if (prev.includes(id)) {
        // Remove
        const next = prev.filter((x) => x !== id);
        if (activeContatoId === id) setActiveContatoId(next[0] ?? null);
        return next;
      } else {
        // Add
        if (activeContatoId === null) setActiveContatoId(id);
        return [...prev, id];
      }
    });
  };

  const removeContato = (id: number) => {
    setContatoIds((prev) => {
      const next = prev.filter((x) => x !== id);
      if (activeContatoId === id) setActiveContatoId(next[0] ?? null);
      return next;
    });
  };

  const setContactField = (id: number, field: keyof ContatoData, value: string) => {
    setContatoData((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [field]: value },
    }));
  };

  const getContactField = (id: number, field: keyof ContatoData): string =>
    (contatoData[id]?.[field] as string) ?? "";

  const activeContact = availableContacts.find((c) => c.id === activeContatoId) ?? null;

  const handleSave = () => {
    onSave?.({ titulo, tipo, contatoIds, contatoData });
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
          width: 720,
          maxWidth: "96vw",
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
              Conta: {accountName}
            </p>
            <h2 style={{ margin: "3px 0 0 0", fontSize: 18, fontWeight: 700, color: "#212A46" }}>
              Novo Dossiê de Contato
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F7F8FB", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex", color: "#6B7280", boxShadow: "none" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>

          {/* Título */}
          <div style={{ marginBottom: 16 }}>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do dossiê"
              style={{ ...inputStyle, fontSize: 15, fontWeight: 600, padding: "10px 14px", background: "#F7F8FB" }}
            />
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 24 }}>
            <SelectField label="Tipo" value={tipo} options={TIPOS} onChange={setTipo} />
          </div>

          {/* ── Contatos ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Info size={13} style={{ color: "#FF5F39" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#212A46" }}>Contatos do Dossiê</span>
              {contatoIds.length > 0 && (
                <span style={{ borderRadius: 9999, background: "rgba(255,95,57,0.1)", color: "#FF5F39", fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>
                  {contatoIds.length}
                </span>
              )}
            </div>

            {/* ── Inline contact list with search ── */}
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", background: "white" }}>
              {/* Search bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: "1px solid #F1F5F9", background: "#FAFBFD" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar contato por nome ou cargo..."
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12, color: "#212A46" }}
                />
                {contactSearch && (
                  <button onClick={() => setContactSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B9B9B", padding: 0, display: "flex", boxShadow: "none" }}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Contact rows */}
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {filteredContacts.length === 0 && (
                  <p style={{ margin: 0, padding: "16px", textAlign: "center", fontSize: 12, color: "#9B9B9B" }}>Nenhum contato encontrado</p>
                )}
                {filteredContacts.map((c, idx) => {
                  const isChecked = selectedSet.has(c.id);
                  const isActive = activeContatoId === c.id;
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderBottom: idx < filteredContacts.length - 1 ? "1px solid #F7F8FB" : "none",
                        background: isActive ? "#FFF4F1" : isChecked ? "#FFFAF9" : "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleContato(c.id)}
                        style={{ cursor: "pointer", accentColor: "#FF5F39", width: 15, height: 15, flexShrink: 0 }}
                      />
                      {/* Avatar */}
                      <Avatar name={c.name} size={30} active={isActive} />
                      {/* Name + role */}
                      <div
                        style={{ flex: 1, minWidth: 0, cursor: isChecked ? "pointer" : "default" }}
                        onClick={() => isChecked && setActiveContatoId(c.id)}
                      >
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isActive ? "#FF5F39" : "#212A46", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.name}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>{c.role}</p>
                      </div>
                      {/* "Editar info" pill — only when checked */}
                      {isChecked && (
                        <button
                          onClick={() => setActiveContatoId(isActive ? null : c.id)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 9999,
                            border: `1px solid ${isActive ? "#FF5F39" : "#E2E8F0"}`,
                            background: isActive ? "#FF5F39" : "white",
                            color: isActive ? "white" : "#6B7280",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "none",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {isActive ? "Editando" : "Preencher info"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer count */}
              {contatoIds.length > 0 && (
                <div style={{ padding: "7px 14px", borderTop: "1px solid #F1F5F9", background: "#FAFBFD", fontSize: 11, color: "#9B9B9B" }}>
                  {contatoIds.length} contato{contatoIds.length > 1 ? "s" : ""} selecionado{contatoIds.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          {/* ── Per-contact fields ── */}
          {activeContact ? (
            <div
              style={{
                background: "#F7F8FB",
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                overflow: "hidden",
                marginTop: 4,
              }}
            >
              {/* ── Tab bar: one tab per selected contact ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderBottom: "1px solid #E2E8F0",
                  background: "white",
                  overflowX: "auto",
                  paddingLeft: 4,
                }}
              >
                {contatoIds.map((id) => {
                  const c = availableContacts.find((x) => x.id === id);
                  if (!c) return null;
                  const isTab = activeContatoId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveContatoId(id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        borderBottom: isTab ? "2px solid #FF5F39" : "2px solid transparent",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: isTab ? 700 : 500,
                        color: isTab ? "#FF5F39" : "#6B7280",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        marginBottom: -1,
                        boxShadow: "none",
                        transition: "color 0.15s",
                      }}
                    >
                      <Avatar name={c.name} size={20} active={isTab} />
                      {c.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>

              {/* ── Active contact form ── */}
              <div style={{ padding: "20px 22px" }}>
                {/* Name + role header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #E2E8F0" }}>
                  <Avatar name={activeContact.name} size={38} active />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#212A46" }}>{activeContact.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>{activeContact.role} · {activeContact.email}</p>
                  </div>
                </div>

                {/* Two-column grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                  <SelectField
                    label="Função de Compra"
                    value={getContactField(activeContact.id, "funcaoCompra")}
                    options={FUNCOES_COMPRA}
                    onChange={(v) => setContactField(activeContact.id, "funcaoCompra", v)}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <Info size={13} style={{ color: "#FF5F39" }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#212A46" }}>Cidade</span>
                    </div>
                    <input
                      value={getContactField(activeContact.id, "cidade")}
                      onChange={(e) => setContactField(activeContact.id, "cidade", e.target.value)}
                      placeholder="Cidade do contato"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <TextAreaField
                  label="Experiência Profissional"
                  value={getContactField(activeContact.id, "experiencia")}
                  onChange={(v) => setContactField(activeContact.id, "experiencia", v)}
                  placeholder="Descreva a trajetória profissional do contato"
                />
                <TextAreaField
                  label="Novidades / Atualizações"
                  value={getContactField(activeContact.id, "novidades")}
                  onChange={(v) => setContactField(activeContact.id, "novidades", v)}
                  placeholder="Novidades recentes sobre o contato"
                />
                <TextAreaField
                  label="Hipótese de Dor / KPI"
                  value={getContactField(activeContact.id, "dor")}
                  onChange={(v) => setContactField(activeContact.id, "dor", v)}
                  placeholder="Quais os principais desafios e métricas de sucesso deste contato?"
                />
                <SelectField
                  label="Envolvimento no Projeto"
                  value={getContactField(activeContact.id, "envolvimento")}
                  options={ENVOLVIMENTOS}
                  onChange={(v) => setContactField(activeContact.id, "envolvimento", v)}
                />
              </div>
            </div>
          ) : (
            contatoIds.length === 0 && (
              <div
                style={{
                  background: "#F7F8FB",
                  borderRadius: 12,
                  border: "1.5px dashed #CBD5E0",
                  padding: "32px",
                  textAlign: "center",
                  color: "#9B9B9B",
                  fontSize: 13,
                }}
              >
                <UserPlus size={24} style={{ color: "#CBD5E0", marginBottom: 8 }} />
                <p style={{ margin: 0 }}>Adicione contatos ao dossiê para preencher as informações individuais</p>
              </div>
            )
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "16px 28px",
            borderTop: "1px solid #E2E8F0",
            background: "#FAFBFD",
            flexShrink: 0,
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