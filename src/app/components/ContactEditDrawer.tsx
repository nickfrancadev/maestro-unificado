import { useState, useEffect } from "react";
import { X, Search, ChevronDown } from "lucide-react";

interface ContactData {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  birthdate?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  origin: string;
}

interface ExtendedContactData extends ContactData {
  geolocation?: string;
  cep?: string;
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  complement?: string;
  description?: string;
  customFields?: Record<string, string>;
}

interface ContactEditDrawerProps {
  contact: ContactData | null;
  onClose: () => void;
  onSave: (data: ExtendedContactData) => void;
}

const fieldLabel = (text: string) => (
  <span style={{ fontSize: 10, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "block" }}>
    {text}
  </span>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "#212A46",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "none",
  transition: "border-color 0.15s",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
  paddingRight: 32,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {fieldLabel(label)}
      {children}
    </div>
  );
}

export function ContactEditDrawer({ contact, onClose, onSave }: ContactEditDrawerProps) {
  const [form, setForm] = useState<ExtendedContactData>({
    id: 0,
    name: "",
    role: "",
    email: "",
    phone: "",
    birthdate: "",
    linkedin: "",
    instagram: "",
    twitter: "",
    origin: "",
    geolocation: "",
    cep: "",
    country: "Brasil",
    state: "",
    city: "",
    street: "",
    number: "",
    complement: "",
    description: "",
    customFields: { teste: "" },
  });

  useEffect(() => {
    if (contact) {
      setForm({
        ...contact,
        geolocation: (contact as ExtendedContactData).geolocation ?? "",
        cep: (contact as ExtendedContactData).cep ?? "",
        country: (contact as ExtendedContactData).country ?? "Brasil",
        state: (contact as ExtendedContactData).state ?? "",
        city: (contact as ExtendedContactData).city ?? "",
        street: (contact as ExtendedContactData).street ?? "",
        number: (contact as ExtendedContactData).number ?? "",
        complement: (contact as ExtendedContactData).complement ?? "",
        description: (contact as ExtendedContactData).description ?? "",
        customFields: (contact as ExtendedContactData).customFields ?? { teste: "" },
      });
    }
  }, [contact]);

  if (!contact) return null;

  const set = (key: keyof ExtendedContactData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setCustom = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, customFields: { ...prev.customFields, [key]: value } }));

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(33,42,70,0.32)", zIndex: 999,
          backdropFilter: "blur(1px)",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 520, background: "white",
          zIndex: 1000,
          boxShadow: "-4px 0 32px rgba(33,42,70,0.14)",
          display: "flex", flexDirection: "column",
          borderRadius: "16px 0 0 16px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 11, color: "#9B9B9B", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Novo Contato</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#212A46", margin: "2px 0 0 0" }}>{contact.name}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F7F8FB", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* ── Campos principais ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Nome">
              <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" />
            </Field>
            <Field label="Cargo">
              <input style={inputStyle} value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Cargo" />
            </Field>
            <Field label="Geolocalização">
              <input style={inputStyle} value={form.geolocation ?? ""} onChange={(e) => set("geolocation", e.target.value)} placeholder="Endereço de geolocalização" />
            </Field>
            <Field label="E-mail">
              <input style={inputStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" />
            </Field>
            <Field label="Telefone">
              <input style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="Data de Nascimento">
              <input style={inputStyle} type="date" value={form.birthdate ?? ""} onChange={(e) => set("birthdate", e.target.value)} />
            </Field>
          </div>

          {/* Divider + Localização */}
          <div style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#212A46", margin: "0 0 14px 0" }}>Localização</p>
          </div>

          {/* CEP + País */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="CEP">
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 36 }}
                  value={form.cep ?? ""}
                  onChange={(e) => set("cep", e.target.value)}
                  placeholder="00000-000"
                />
                <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
              </div>
            </Field>
            <Field label="País">
              <div style={{ position: "relative" }}>
                <select
                  style={selectStyle}
                  value={form.country ?? "Brasil"}
                  onChange={(e) => set("country", e.target.value)}
                >
                  <option>Brasil</option>
                  <option>Argentina</option>
                  <option>Chile</option>
                  <option>México</option>
                  <option>Colômbia</option>
                  <option>Outro</option>
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
              </div>
            </Field>
            <Field label="Estado">
              <div style={{ position: "relative" }}>
                <select
                  style={selectStyle}
                  value={form.state ?? ""}
                  onChange={(e) => set("state", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
              </div>
            </Field>
            <Field label="Cidade">
              <input style={inputStyle} value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Cidade" />
            </Field>
          </div>

          {/* Logradouro + Número + Complemento */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 16, marginBottom: 24 }}>
            <Field label="Logradouro">
              <input style={inputStyle} value={form.street ?? ""} onChange={(e) => set("street", e.target.value)} placeholder="Rua / Av." />
            </Field>
            <Field label="Número">
              <input style={inputStyle} value={form.number ?? ""} onChange={(e) => set("number", e.target.value)} placeholder="Nº" />
            </Field>
            <Field label="Complemento">
              <input style={inputStyle} value={form.complement ?? ""} onChange={(e) => set("complement", e.target.value)} placeholder="Apto, sala..." />
            </Field>
          </div>

          {/* Redes Sociais */}
          <p style={{ fontSize: 13, fontWeight: 700, color: "#212A46", margin: "0 0 14px 0" }}>Redes Sociais</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Field label="LinkedIn">
              <input
                style={inputStyle}
                value={form.linkedin ?? ""}
                onChange={(e) => set("linkedin", e.target.value)}
                placeholder="https://www.linkedin.com/in/..."
              />
            </Field>
            <Field label="Instagram (URL)">
              <input
                style={inputStyle}
                value={form.instagram ?? ""}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="Digite aqui"
              />
            </Field>
            <Field label="X (URL)">
              <input
                style={inputStyle}
                value={form.twitter ?? ""}
                onChange={(e) => set("twitter", e.target.value)}
                placeholder="Digite aqui"
              />
            </Field>
          </div>

          {/* Descrição */}
          <Field label="Descrição">
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 88 }}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Descrição do contato..."
            />
          </Field>

          {/* Campos Personalizados */}
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#212A46", margin: "0 0 14px 0" }}>Campos Personalizados</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.entries(form.customFields ?? {}).map(([key, value]) => (
                <Field key={key} label={key}>
                  <input
                    style={inputStyle}
                    value={value}
                    onChange={(e) => setCustom(key, e.target.value)}
                    placeholder="Digite aqui"
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid #E2E8F0", flexShrink: 0, background: "#FAFBFD" }}>
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
            Salvar alterações
          </button>
        </div>
      </div>
    </>
  );
}