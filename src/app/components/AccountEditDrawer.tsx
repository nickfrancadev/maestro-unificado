import { useState, useEffect } from "react";
import { X, ChevronDown, Building2, Globe, FileText, Tag, MapPin } from "lucide-react";
import { AccountDetail } from "./AccountDetailPage";

interface AccountEditDrawerProps {
  account: AccountDetail | null;
  onClose: () => void;
  onSave: (data: AccountDetail) => void;
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

export function AccountEditDrawer({ account, onClose, onSave }: AccountEditDrawerProps) {
  const [form, setForm] = useState<AccountDetail | null>(null);

  useEffect(() => {
    if (account) {
      setForm({ ...account });
    }
  }, [account]);

  if (!form) return null;

  const set = (key: keyof AccountDetail, value: any) =>
    setForm((prev) => prev ? ({ ...prev, [key]: value }) : null);

  const handleSave = () => {
    if (form) {
      onSave(form);
      onClose();
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(33,42,70,0.32)", zIndex: 999,
          backdropFilter: "blur(1px)",
        }}
      />

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
            <p style={{ fontSize: 11, color: "#9B9B9B", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Editar Conta
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#212A46", margin: "2px 0 0 0" }}>
              {form.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F7F8FB", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 32 }}>
          
          {/* Informações Básicas */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <Building2 size={16} style={{ color: "#2563EB" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#212A46", margin: 0 }}>Informações Básicas</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nome da Conta">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </Field>
              <Field label="Setor / Indústria">
                <input
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </Field>
              <Field label="Tamanho da Empresa">
                <input
                  value={form.companySize}
                  onChange={(e) => set("companySize", e.target.value)}
                  placeholder="Ex: 501-1000 funcionários"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </Field>
              <Field label="Receita Anual">
                <input
                  value={form.revenue}
                  onChange={(e) => set("revenue", e.target.value)}
                  placeholder="Ex: R$ 50M - 100M"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </Field>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F1F5F9" }} />

          {/* Localização e Contato */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <Globe size={16} style={{ color: "#2563EB" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#212A46", margin: 0 }}>Localização e Contato</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Sede (Cidade/Estado)">
                    <input
                      value={form.headquarters}
                      onChange={(e) => set("headquarters", e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                    />
                  </Field>
                </div>
              </div>
              <Field label="Website">
                <input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </Field>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F1F5F9" }} />

          {/* Classificação */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <Tag size={16} style={{ color: "#2563EB" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#212A46", margin: 0 }}>Classificação</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Tier">
                    <div style={{ position: "relative" }}>
                      <select
                        value={form.tier}
                        onChange={(e) => set("tier", e.target.value)}
                        style={selectStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                      >
                        <option value="Tier 1">Tier 1</option>
                        <option value="Tier 2">Tier 2</option>
                        <option value="Tier 3">Tier 3</option>
                      </select>
                      <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
                    </div>
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Status">
                     <div style={{ position: "relative" }}>
                      <select
                        value={form.status}
                        onChange={(e) => set("status", e.target.value)}
                        style={selectStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                      >
                        <option value="Cliente">Cliente</option>
                        <option value="Prospect">Prospect</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                      <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
                    </div>
                  </Field>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="ARR">
                    <input
                      value={form.arr || ""}
                      onChange={(e) => set("arr", e.target.value)}
                      placeholder="Ex: R$ 500.000"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Data de Renovação">
                    <input
                      value={form.renewalDate || ""}
                      onChange={(e) => set("renewalDate", e.target.value)}
                      type="date"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
          
           <div style={{ borderTop: "1px solid #F1F5F9" }} />

          {/* Informações Adicionais */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <FileText size={16} style={{ color: "#2563EB" }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#212A46", margin: 0 }}>Informações Adicionais</h3>
            </div>
             <Field label="Sobre a Empresa">
                <textarea
                  value={form.about}
                  onChange={(e) => set("about", e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: "none" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </Field>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC", flexShrink: 0, display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #CBD5E0", background: "white", fontSize: 13, fontWeight: 600, color: "#6B7280", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: "10px 0", borderRadius: 8, border: "none",
              background: "#2563EB", color: "white",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "background 0.15s"
            }}
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </>
  );
}