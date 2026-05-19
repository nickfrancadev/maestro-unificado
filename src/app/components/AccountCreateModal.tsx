import { useState } from "react";
import { X, Info, ChevronDown, MapPin, Building2, Tags, Laptop, ArrowRight, Filter, Globe, FileSpreadsheet, Download } from "lucide-react";
import spreadsheetTemplate from "../../assets/modelo_importacao_contas.csv";

interface AccountCreateModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
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
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
  paddingRight: 32,
};

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      <Info size={14} style={{ color: "#FF5F39", flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "#212A46" }}>{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
      <SectionLabel label={label} />
      {children}
    </div>
  );
}

const KEYWORD_SUGGESTIONS = [
  "Marketing", "Vendas", "SaaS", "B2B", "B2C", "Fintech", "Edtech", 
  "Healthtech", "E-commerce", "Logística", "Agronegócio", 
  "Inteligência Artificial", "Cloud", "ERP", "CRM", "RH", "Jurídico", 
  "Consultoria", "Varejo", "Indústria", "Telecom"
];

const TECH_SUGGESTIONS = [
  "React", "Angular", "Vue", "Node.js", "Python", "Java", "C#", "Ruby", 
  "AWS", "Azure", "Google Cloud", "Salesforce", "HubSpot", "Zendesk", 
  "WordPress", "Shopify", "Vtex", "SAP", "Oracle", "MySQL", "PostgreSQL", 
  "MongoDB", "Docker", "Kubernetes", "Figma", "Tailwind CSS"
];

function TagsInput({ tags, onChange, placeholder, suggestions = [] }: { tags: string[], onChange: (tags: string[]) => void, placeholder: string, suggestions?: string[] }) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue("");
      setShowDropdown(false);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const addTag = (tagToAdd: string) => {
    if (!tags.includes(tagToAdd)) {
      onChange([...tags, tagToAdd]);
    }
    setInputValue("");
    setShowDropdown(false);
  };

  const filteredSuggestions = suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s));

  return (
    <div style={{ position: "relative" }}>
      <div 
        style={{ ...inputStyle, minHeight: 42, height: "auto", display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 10px" }}
        onClick={() => setShowDropdown(true)}
      >
        {tags.map((tag, index) => (
          <span key={index} style={{ display: "flex", alignItems: "center", gap: 4, background: "#FFF4F1", color: "#FF5F39", padding: "2px 8px", borderRadius: 16, fontSize: 12, fontWeight: 600 }}>
            {tag}
            <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }} style={{ background: "none", border: "none", color: "#FF5F39", cursor: "pointer", padding: 0, display: "flex" }}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          style={{ border: "none", outline: "none", background: "transparent", flex: 1, minWidth: 120, fontSize: 13, color: "#212A46" }}
        />
      </div>
      
      {showDropdown && filteredSuggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 10,
          background: "white", border: "1px solid #E2E8F0", borderRadius: 8,
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          maxHeight: 180, overflowY: "auto"
        }}>
          {filteredSuggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => addTag(s)}
              style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#212A46",
                borderBottom: i < filteredSuggestions.length - 1 ? "1px solid #F1F5F9" : "none"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


type RegistrationMode = "selection" | "manual" | "filters" | "website" | "spreadsheet";

const OPTIONS = [
  { id: "manual", title: "Cadastro Manual", desc: "Insira os dados da empresa manualmente", icon: Building2 },
  { id: "filters", title: "Por Filtros Gerais", desc: "Localização, Porte, Palavras-chave e Tecnologias", icon: Filter },
  { id: "website", title: "Por Website", desc: "Insira o domínio para enriquecimento automático", icon: Globe },
  { id: "spreadsheet", title: "Importar Planilha", desc: "Faça upload de um arquivo CSV ou Excel", icon: FileSpreadsheet },
];

export function AccountCreateModal({ onClose, onSave }: AccountCreateModalProps) {
  const [mode, setMode] = useState<RegistrationMode>("selection");
  
  // Form states for different modes
  const [manualForm, setManualForm] = useState({ name: "", industry: "", website: "", linkedin: "", cnpj: "" });
  
  const [filtersForm, setFiltersForm] = useState({
    state: "", city: "",
    revenue: "", employees: "",
    keywords: [] as string[],
    technologies: [] as string[]
  });
  
  const [websiteForm, setWebsiteForm] = useState({ url: "" });
  const [spreadsheetForm, setSpreadsheetForm] = useState<{ file: File | null }>({ file: null });

  const setManual = (key: string, value: string) => setManualForm((prev) => ({ ...prev, [key]: value }));
  const setFilter = (key: string, value: any) => setFiltersForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (mode === "manual") {
      if (!manualForm.name) return;
      onSave({ ...manualForm, origin: "Manual" });
    } else if (mode === "filters") {
       let accountName = "Nova Conta via Filtros";
       if (filtersForm.state) accountName += ` (${filtersForm.state})`;
       onSave({
         name: accountName,
         industry: "Busca",
         website: "",
         origin: "Sistema"
       });
    } else if (mode === "website") {
        onSave({
         name: `Conta via ${websiteForm.url}`,
         industry: "Busca",
         website: websiteForm.url,
         origin: "Enriquecimento"
       });
    } else if (mode === "spreadsheet") {
         onSave({
         name: `Importação: ${spreadsheetForm.file?.name}`,
         industry: "Importação",
         website: "",
         origin: "Planilha"
       });
    }
    onClose();
  };

  const isFormValid = () => {
    if (mode === "manual") return !!manualForm.name;
    if (mode === "filters") return !!filtersForm.state || !!filtersForm.city || !!filtersForm.revenue || !!filtersForm.employees || filtersForm.keywords.length > 0 || filtersForm.technologies.length > 0;
    if (mode === "website") return !!websiteForm.url;
    if (mode === "spreadsheet") return !!spreadsheetForm.file;
    return false;
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(33,42,70,0.4)", zIndex: 1100, backdropFilter: "blur(2px)" }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: mode === "selection" ? 600 : 500,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
             {mode !== "selection" && (
                <button
                  onClick={() => setMode("selection")}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#6B7280" }}
                >
                   <ArrowRight size={18} style={{ transform: "rotate(180deg)" }} />
                </button>
             )}
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#212A46" }}>
              {mode === "selection" ? "Adicionar Nova Conta" : 
               mode === "manual" ? "Cadastro Manual" :
               mode === "filters" ? "Por Filtros Gerais" :
               mode === "website" ? "Por Website" :
               "Importar Planilha"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F7F8FB", border: "none", borderRadius: 8, cursor: "pointer", padding: 8, display: "flex", color: "#6B7280" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "24px 28px", overflowY: "auto" }}>
          {mode === "selection" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setMode(opt.id as RegistrationMode)}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px", borderRadius: 12,
                      border: "1px solid #E2E8F0", background: "white",
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.2s",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#FF5F39";
                      e.currentTarget.style.background = "#FFF4F1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E2E8F0";
                      e.currentTarget.style.background = "white";
                    }}
                  >
                    <div style={{ padding: "10px", background: "white", borderRadius: "10px", border: "1px solid #E2E8F0", color: "#FF5F39" }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 700, color: "#212A46" }}>{opt.title}</p>
                      <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>{opt.desc}</p>
                    </div>
                    <ArrowRight size={18} style={{ color: "#CBD5E0" }} />
                  </button>
                )
              })}
            </div>
          )}

          {mode === "manual" && (
             <>
                <Field label="Nome da Empresa">
                  <input
                    style={inputStyle}
                    value={manualForm.name}
                    onChange={(e) => setManual("name", e.target.value)}
                    placeholder="Ex: Apple Inc."
                  />
                </Field>

                <Field label="Setor / Indústria">
                  <input
                    style={inputStyle}
                    value={manualForm.industry}
                    onChange={(e) => setManual("industry", e.target.value)}
                    placeholder="Ex: Tecnologia"
                  />
                </Field>

                <Field label="Website">
                  <input
                    style={inputStyle}
                    value={manualForm.website}
                    onChange={(e) => setManual("website", e.target.value)}
                    placeholder="Ex: www.apple.com"
                  />
                </Field>

                <Field label="LinkedIn">
                  <input
                    style={inputStyle}
                    value={manualForm.linkedin}
                    onChange={(e) => setManual("linkedin", e.target.value)}
                    placeholder="Ex: linkedin.com/company/apple"
                  />
                </Field>

                <Field label="CNPJ">
                  <input
                    style={inputStyle}
                    value={manualForm.cnpj}
                    onChange={(e) => setManual("cnpj", e.target.value)}
                    placeholder="Ex: 00.000.000/0000-00"
                  />
                </Field>
             </>
          )}

          {mode === "filters" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Busque empresas combinando diferentes critérios de filtro.</p>
              
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#212A46", marginBottom: 16 }}>Localização</h3>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Estado">
                      <div style={{ position: "relative" }}>
                        <select
                          style={selectStyle}
                          value={filtersForm.state}
                          onChange={(e) => setFilter("state", e.target.value)}
                        >
                          <option value="">Todos</option>
                          <option value="SP">São Paulo</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="MG">Minas Gerais</option>
                          <option value="PR">Paraná</option>
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
                      </div>
                    </Field>
                  </div>
                  <div style={{ flex: 2 }}>
                    <Field label="Cidade">
                      <input
                        style={inputStyle}
                        value={filtersForm.city}
                        onChange={(e) => setFilter("city", e.target.value)}
                        placeholder="Nome da cidade"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#212A46", marginBottom: 16 }}>Porte da Empresa</h3>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Faturamento Anual (Estimado)">
                      <div style={{ position: "relative" }}>
                        <select
                          style={selectStyle}
                          value={filtersForm.revenue}
                          onChange={(e) => setFilter("revenue", e.target.value)}
                        >
                          <option value="">Qualquer</option>
                          <option value="ate-1m">Até R$ 1 Milhão</option>
                          <option value="1m-10m">R$ 1M a R$ 10M</option>
                          <option value="10m-50m">R$ 10M a R$ 50M</option>
                          <option value="mais-50m">Acima de R$ 50M</option>
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
                      </div>
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Número de Funcionários">
                       <div style={{ position: "relative" }}>
                        <select
                          style={selectStyle}
                          value={filtersForm.employees}
                          onChange={(e) => setFilter("employees", e.target.value)}
                        >
                          <option value="">Qualquer</option>
                          <option value="1-10">1 a 10</option>
                          <option value="11-50">11 a 50</option>
                          <option value="51-200">51 a 200</option>
                          <option value="201-500">201 a 500</option>
                          <option value="mais-500">Acima de 500</option>
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", pointerEvents: "none" }} />
                      </div>
                    </Field>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#212A46", marginBottom: 16 }}>Palavras-chave e Tecnologias</h3>
                <Field label="Palavras-chave">
                  <TagsInput
                    tags={filtersForm.keywords}
                    onChange={(tags) => setFilter("keywords", tags)}
                    placeholder="Digite e pressione Enter (ex: marketing, SaaS)..."
                    suggestions={KEYWORD_SUGGESTIONS}
                  />
                </Field>
                <Field label="Tecnologias Identificadas no Site">
                  <TagsInput
                    tags={filtersForm.technologies}
                    onChange={(tags) => setFilter("technologies", tags)}
                    placeholder="Digite e pressione Enter (ex: React, AWS)..."
                    suggestions={TECH_SUGGESTIONS}
                  />
                </Field>
              </div>
            </div>
          )}

          {mode === "website" && (
            <>
              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>Insira o website da empresa para buscarmos os dados e enriquecermos o cadastro automaticamente.</p>
              <Field label="Website URL">
                <input
                  style={inputStyle}
                  value={websiteForm.url}
                  onChange={(e) => setWebsiteForm({ url: e.target.value })}
                  placeholder="Ex: www.apple.com"
                />
              </Field>
            </>
          )}

          {mode === "spreadsheet" && (
            <>
              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
                Faça o upload de uma planilha contendo os dados das empresas para importação em massa.
                <a 
                  href={spreadsheetTemplate} 
                  download="modelo_importacao_contas.csv"
                  style={{ color: "#2563EB", textDecoration: "none", marginLeft: 8, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Download size={14} />
                  Baixar modelo
                </a>
              </p>
              <Field label="Arquivo (CSV ou Excel)">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                      border: "1.5px dashed #CBD5E0", borderRadius: 8,
                      padding: "32px 18px", cursor: "pointer",
                      fontSize: 13, fontWeight: 600, color: "#2563EB",
                      background: "#FAFBFD",
                    }}
                  >
                    <FileSpreadsheet size={24} style={{ color: "#9B9B9B" }} />
                    <span style={{ color: "#212A46" }}>Clique para selecionar ou arraste o arquivo aqui</span>
                    <span style={{ fontSize: 11, color: "#9B9B9B", fontWeight: 400 }}>Suporta .csv, .xls, .xlsx</span>
                    <input
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setSpreadsheetForm({ file: e.target.files[0] });
                        }
                      }}
                    />
                  </label>
                  {spreadsheetForm.file && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "#EFF6FF", borderRadius: 8, border: "1px solid #BFDBFE" }}>
                      <span style={{ fontSize: 13, color: "#1E3A8A", fontWeight: 600 }}>{spreadsheetForm.file.name}</span>
                      <button
                        onClick={() => setSpreadsheetForm({ file: null })}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "#1E3A8A", padding: 4 }}
                      >
                         <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </Field>
            </>
          )}
        </div>

        {mode !== "selection" && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              gap: 10, padding: "16px 28px",
              borderTop: "1px solid #E2E8F0", background: "#FAFBFD",
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
              disabled={!isFormValid()}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 24px", borderRadius: 8, border: "none",
                background: isFormValid() ? "#FF5F39" : "#E2E8F0",
                fontSize: 13, fontWeight: 700, color: "white",
                cursor: isFormValid() ? "pointer" : "default",
                boxShadow: "none"
              }}
            >
              {mode === "manual" ? "Criar Conta" : "Buscar Contas"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
