import { useState } from "react";
import { ContactEditDrawer } from "./ContactEditDrawer";
import { AccountEditDrawer } from "./AccountEditDrawer";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  SlidersHorizontal,
  MoreVertical,
  Pencil,
} from "lucide-react";

export interface Contact {
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
  registeredBy?: string;
}

export interface AccountDetail {
  id: number;
  name: string;
  playsCreated: number;
  contacts: number;
  industry: string;
  website: string;
  origin: string;
  contactsList: Contact[];
  companySize?: string;
  revenue?: string;
  headquarters?: string;
  tier?: string;
  status?: string;
  arr?: string;
  renewalDate?: string;
  about?: string;
}

const PAGE_SIZE = 10;

type Tab = "contatos" | "dossie" | "plays" | "organograma";

function SocialIcons({ linkedin, instagram, twitter }: { linkedin?: string; instagram?: string; twitter?: string }) {
  return (
    <div className="flex items-center gap-2">
      {/* LinkedIn */}
      <a
        href={linkedin ? `https://${linkedin}` : "#"}
        target="_blank"
        rel="noreferrer"
        title="LinkedIn"
        className="hover:opacity-70 transition-opacity"
        onClick={e => !linkedin && e.preventDefault()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="1" width="22" height="22" rx="4" stroke={linkedin ? "#FF5F39" : "#A0AEC0"} strokeWidth="1.5" fill="none" />
          <path d="M7 10v7M7 7.5v.01M11 17v-4c0-1.1.9-2 2-2s2 .9 2 2v4M11 10v7" stroke={linkedin ? "#FF5F39" : "#A0AEC0"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      {/* Instagram */}
      <a
        href={instagram ? `https://${instagram}` : "#"}
        target="_blank"
        rel="noreferrer"
        title="Instagram"
        className="hover:opacity-70 transition-opacity"
        onClick={e => !instagram && e.preventDefault()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" stroke={instagram ? "#FF5F39" : "#A0AEC0"} strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="12" r="4" stroke={instagram ? "#FF5F39" : "#A0AEC0"} strokeWidth="1.5" fill="none" />
          <circle cx="17.5" cy="6.5" r="1" fill={instagram ? "#FF5F39" : "#A0AEC0"} />
        </svg>
      </a>
      {/* X / Twitter */}
      <a
        href={twitter ? `https://${twitter}` : "#"}
        target="_blank"
        rel="noreferrer"
        title="X"
        className="hover:opacity-70 transition-opacity"
        onClick={e => !twitter && e.preventDefault()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M4 4l16 16M4 20L20 4" stroke={twitter ? "#FF5F39" : "#A0AEC0"} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </a>
    </div>
  );
}

interface AccountDetailPageProps {
  account: AccountDetail;
  onBack: () => void;
  onUpdate?: (updatedAccount: AccountDetail) => void;
}

export function AccountDetailPage({ account, onBack, onUpdate }: AccountDetailPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("contatos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const tabs: { key: Tab; label: string }[] = [
    { key: "contatos", label: "Contatos" },
    { key: "dossie", label: "Dossiês" },
    { key: "plays", label: "Plays" },
    { key: "organograma", label: "Organograma" },
  ];

  const filtered = account.contactsList
    .filter((c) => {
      const s = search.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(s) ||
        c.role.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.phone.toLowerCase().includes(s) ||
        (c.birthdate || "").toLowerCase().includes(s) ||
        c.origin.toLowerCase().includes(s) ||
        (c.registeredBy || "").toLowerCase().includes(s) ||
        (c.linkedin || "").toLowerCase().includes(s) ||
        (c.instagram || "").toLowerCase().includes(s) ||
        (c.twitter || "").toLowerCase().includes(s);
      return matchSearch;
    })
    .sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EEF0F5" }}>
      {/* Top bar */}
      <div className="flex items-start justify-between px-8 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
            style={{ width: 36, height: 36 }}
          >
            <ArrowLeft size={20} style={{ color: "#212A46" }} />
          </button>
          <div className="flex items-center gap-3 relative">
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#212A46" }}>{account.name}</h1>
            <button
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              style={{
                width: 32, height: 32,
                background: "white", border: "1px solid #CBD5E0", borderRadius: 8,
                color: "#4B5563", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, zIndex: 10
              }}
              title="Opções da Conta"
            >
              <MoreVertical size={18} />
            </button>
            {isAccountMenuOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setIsAccountMenuOpen(false)} />
                <div style={{
                  position: "absolute", top: "100%", left: 0,
                  zIndex: 100, background: "white", borderRadius: 8,
                  border: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 160, overflow: "hidden", marginTop: 4
                }}>
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      setIsEditingAccount(true);
                    }}
                    style={{
                      width: "100%", textAlign: "left", padding: "10px 14px",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 13, color: "#212A46", fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 8
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <Pencil size={14} style={{ color: "#6B7280" }} />
                    Editar Conta
                  </button>
                </div>
              </>
            )}
          </div>
          <span
            className="rounded-md px-3 py-0.5"
            style={{
              background: account.origin === "RD" ? "#EFF6FF" : "#F0FDF4",
              color: account.origin === "RD" ? "#2563EB" : "#16A34A",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {account.origin}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#CBD5E0", color: "#6B7280", fontSize: 13, fontWeight: 600 }}
          >
            Ações
            <ChevronDown size={16} />
          </button>
          <button
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: "#FF5F39", fontSize: 13, fontWeight: 700 }}
          >
            <Plus size={18} />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-gray-200 bg-white">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="py-4 relative text-sm font-semibold transition-colors"
              style={{
                color: activeTab === tab.key ? "#FF5F39" : "#6B7280",
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "#FF5F39" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === "contatos" && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white focus-within:ring-1 focus-within:ring-orange-400"
                  style={{ borderColor: "#E2E8F0", width: 280 }}
                >
                  <Search size={16} style={{ color: "#9B9B9B" }} />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Busca"
                    className="outline-none bg-transparent flex-1"
                    style={{ fontSize: 13, color: "#333" }}
                  />
                </div>
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#E2E8F0", color: "#6B7280", fontSize: 13, fontWeight: 600 }}
                >
                  <SlidersHorizontal size={16} />
                  Filtros
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
              <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E2E8F0", background: "#FAFBFD" }}>
                    <th className="pl-6 pr-2 py-3 text-left" style={{ width: 32 }}>
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      NOME
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      CARGO
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      E-MAIL
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      TELEFONE
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      DATA DE NASCIMENTO
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      SOCIAL
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      ORIGEM
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      CADASTRADO POR
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }} />
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center" style={{ color: "#9B9B9B", fontSize: 13 }}>
                        Nenhum contato encontrado.
                      </td>
                    </tr>
                  ) : (
                    paged.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50 transition-colors"
                        style={{ borderBottom: "1px solid #F1F5F9" }}
                      >
                        <td className="pl-6 pr-2 py-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="rounded-full shrink-0"
                              style={{ width: 18, height: 18, border: "1.5px solid #707070" }}
                            />
                            <span
                              onClick={() => setEditingContact(c)}
                              style={{ color: "#FF5F39", fontWeight: 600, cursor: "pointer" }}
                            >
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <span style={{ color: "#333" }} className="truncate max-w-[140px]">{c.role}</span>
                            <MoreVertical size={13} style={{ color: "#9B9B9B", flexShrink: 0 }} />
                          </div>
                        </td>
                        <td className="px-3 py-3" style={{ color: "#555" }}>{c.email}</td>
                        <td className="px-3 py-3" style={{ color: "#555" }}>{c.phone}</td>
                        <td className="px-3 py-3" style={{ color: "#555" }}>
                          {c.birthdate || ""}
                        </td>
                        <td className="px-3 py-3">
                          <SocialIcons linkedin={c.linkedin} instagram={c.instagram} twitter={c.twitter} />
                        </td>
                        <td className="px-3 py-3" style={{ color: "#555" }}>{c.origin}</td>
                        <td className="px-3 py-3" style={{ color: "#555" }}>{c.registeredBy || "—"}</td>
                        <td className="px-3 py-3">
                          <button
                            className="hover:opacity-70 transition-opacity"
                            title="Editar"
                            style={{ color: "#848484" }}
                            onClick={() => setEditingContact(c)}
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-xs text-gray-500 font-medium">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} contatos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-gray-100 transition-colors"
                  style={{ width: 34, height: 34, border: "1.5px solid #CBD5E0" }}
                >
                  <ChevronLeft size={16} style={{ color: "#555" }} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-gray-100 transition-colors"
                  style={{ width: 34, height: 34, border: "1.5px solid #CBD5E0" }}
                >
                  <ChevronRight size={16} style={{ color: "#555" }} />
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab !== "contatos" && (
          <div className="flex items-center justify-center py-20" style={{ color: "#9B9B9B", fontSize: 15 }}>
            <div className="text-center">
              <p style={{ fontWeight: 700, color: "#212A46", fontSize: 18, marginBottom: 6 }}>
                {activeTab === "dossie" && "Dossiês"}
                {activeTab === "plays" && "Plays"}
                {activeTab === "organograma" && "Organograma"}
              </p>
              <p>Esta seção será implementada em breve.</p>
            </div>
          </div>
        )}
      </div>

      {editingContact && (
        <ContactEditDrawer
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={() => setEditingContact(null)}
        />
      )}

      {isEditingAccount && (
        <AccountEditDrawer
          account={account}
          onClose={() => setIsEditingAccount(false)}
          onSave={(updatedAccount) => {
            if (onUpdate) {
              onUpdate(updatedAccount);
            }
            setIsEditingAccount(false);
          }}
        />
      )}
    </div>
  );
}
