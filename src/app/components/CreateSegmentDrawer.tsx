import React, { useState } from "react";
import { X, Search } from "lucide-react";

interface DossierItem {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  author: string;
}

interface ContactItem {
  id: number;
  name: string;
  role: string;
}

interface CreateSegmentDrawerProps {
  open: boolean;
  dossiers: DossierItem[];
  contactDossiers: DossierItem[];
  contacts: ContactItem[];
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    color: string;
    dossierIds: Set<number>;
    contactDossierIds: Set<number>;
    contactIds: Set<number>;
  }) => void;
}

const COLORS = [
  { label: "Azul",     value: "#2563EB" },
  { label: "Verde",    value: "#16A34A" },
  { label: "Âmbar",   value: "#D97706" },
  { label: "Laranja", value: "#FF5F39" },
  { label: "Roxo",    value: "#7C3AED" },
  { label: "Rosa",    value: "#DB2777" },
  { label: "Teal",    value: "#0D9488" },
  { label: "Cinza",   value: "#6B7280" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "#212A46",
  background: "white",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const fieldLabel = (text: string) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
    {text}
  </span>
);

function CheckboxRow({
  checked,
  onToggle,
  title,
  subtitle,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
        borderRadius: 7, cursor: "pointer",
        background: checked ? "#FFF1EC" : "white",
        border: `1px solid ${checked ? "#FF5F39" : "#E2E8F0"}`,
        transition: "all 0.12s",
      }}
    >
      <div style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0,
        border: `2px solid ${checked ? "#FF5F39" : "#CBD5E0"}`,
        background: checked ? "#FF5F39" : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#212A46", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>{subtitle}</p>
      </div>
    </label>
  );
}

function SectionSearch({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#212A46", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B" }} />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingLeft: 28, paddingTop: 6, paddingBottom: 6 }}
        />
      </div>
    </>
  );
}

export function CreateSegmentDrawer({
  open,
  dossiers,
  contactDossiers,
  contacts,
  onClose,
  onSave,
}: CreateSegmentDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0].value);

  const [searchD, setSearchD] = useState("");
  const [searchCD, setSearchCD] = useState("");
  const [searchC, setSearchC] = useState("");

  const [selDossiers, setSelDossiers] = useState<Set<number>>(new Set());
  const [selContactDossiers, setSelContactDossiers] = useState<Set<number>>(new Set());
  const [selContacts, setSelContacts] = useState<Set<number>>(new Set());

  const toggle = (set: Set<number>, setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filteredD  = dossiers.filter((d) => d.title.toLowerCase().includes(searchD.toLowerCase()));
  const filteredCD = contactDossiers.filter((d) => d.title.toLowerCase().includes(searchCD.toLowerCase()));
  const filteredC  = contacts.filter((c) => c.name.toLowerCase().includes(searchC.toLowerCase()));

  const totalLinked = selDossiers.size + selContactDossiers.size + selContacts.size;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description, color, dossierIds: selDossiers, contactDossierIds: selContactDossiers, contactIds: selContacts });
    // reset
    setName(""); setDescription(""); setColor(COLORS[0].value);
    setSearchD(""); setSearchCD(""); setSearchC("");
    setSelDossiers(new Set()); setSelContactDossiers(new Set()); setSelContacts(new Set());
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(33,42,70,0.32)", zIndex: 999, backdropFilter: "blur(1px)" }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 520, background: "white", zIndex: 1000,
        boxShadow: "-4px 0 32px rgba(33,42,70,0.14)",
        display: "flex", flexDirection: "column",
        borderRadius: "16px 0 0 16px", overflow: "hidden",
      }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 11, color: "#9B9B9B", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Novo Segmento
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#212A46", margin: "2px 0 0 0" }}>
              {name.trim() || "Sem título"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F7F8FB", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* Título + Descrição */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#212A46" }}>Informações do segmento</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                {fieldLabel("Título do segmento")}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Enterprise LATAM"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF5F39")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </div>
              <div>
                {fieldLabel("Descrição")}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo deste segmento..."
                  rows={3}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF5F39")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </div>

              {/* Cor */}
              <div>
                {fieldLabel("Cor do segmento")}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => setColor(c.value)}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", background: c.value, border: "none",
                        cursor: "pointer", outline: color === c.value ? `3px solid ${c.value}` : "none",
                        outlineOffset: 2, transition: "outline 0.1s", flexShrink: 0,
                        boxShadow: color === c.value ? "0 0 0 2px white, 0 0 0 4px " + c.value : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F1F5F9", marginBottom: 20 }} />

          {/* Dossiês de Conta */}
          <div style={{ marginBottom: 18 }}>
            <SectionSearch label="Dossiês de conta" value={searchD} onChange={setSearchD} placeholder="Buscar dossiê de conta..." />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
              {filteredD.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: "#9B9B9B", textAlign: "center", padding: "8px 0" }}>Nenhum dossiê de conta encontrado</p>
              )}
              {filteredD.map((d) => (
                <CheckboxRow
                  key={d.id}
                  checked={selDossiers.has(d.id)}
                  onToggle={() => toggle(selDossiers, setSelDossiers, d.id)}
                  title={d.title}
                  subtitle={`${d.createdAt} · ${d.author}`}
                />
              ))}
            </div>
          </div>

          {/* Dossiês de Contato */}
          <div style={{ marginBottom: 18 }}>
            <SectionSearch label="Dossiês de contato" value={searchCD} onChange={setSearchCD} placeholder="Buscar dossiê de contato..." />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
              {filteredCD.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: "#9B9B9B", textAlign: "center", padding: "8px 0" }}>Nenhum dossiê de contato encontrado</p>
              )}
              {filteredCD.map((d) => (
                <CheckboxRow
                  key={d.id}
                  checked={selContactDossiers.has(d.id)}
                  onToggle={() => toggle(selContactDossiers, setSelContactDossiers, d.id)}
                  title={d.title}
                  subtitle={`${d.createdAt} · ${d.author}`}
                />
              ))}
            </div>
          </div>

          {/* Contatos */}
          <div style={{ marginBottom: 8 }}>
            <SectionSearch label="Contatos" value={searchC} onChange={setSearchC} placeholder="Buscar contato..." />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
              {filteredC.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: "#9B9B9B", textAlign: "center", padding: "8px 0" }}>Nenhum contato encontrado</p>
              )}
              {filteredC.map((c) => (
                <CheckboxRow
                  key={c.id}
                  checked={selContacts.has(c.id)}
                  onToggle={() => toggle(selContacts, setSelContacts, c.id)}
                  title={c.name}
                  subtitle={c.role}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", background: "white", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {totalLinked > 0 && (
            <p style={{ margin: 0, fontSize: 12, color: "#9B9B9B", textAlign: "center" }}>
              {totalLinked} {totalLinked === 1 ? "item selecionado" : "itens selecionados"} para vincular
            </p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 13, fontWeight: 600, color: "#6B7280", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                flex: 2, padding: "10px 0", borderRadius: 8, border: "none",
                background: name.trim() ? "#FF5F39" : "#E2E8F0",
                color: name.trim() ? "white" : "#9B9B9B",
                fontSize: 13, fontWeight: 700,
                cursor: name.trim() ? "pointer" : "not-allowed",
                transition: "background 0.15s",
              }}
            >
              Criar segmento
            </button>
          </div>
        </div>
      </div>
    </>
  );
}