import { useState } from "react";
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
}

export interface AccountDetail {
  id: number;
  name: string;
  playsCreated: number;
  contacts: number;
  industry: string;
  website: string;
  origin: string;
  playsAtivas?: number;
  dossierCount?: number;
  contactsList: Contact[];
}

const PAGE_SIZE = 10;

type Tab = "contatos" | "dossie" | "plays" | "detalhes";

function SocialIcons({ linkedin, instagram, twitter }: { linkedin?: string; instagram?: string; twitter?: string }) {
  return (
    <div className="flex items-center gap-1">
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
          <rect x="1" y="1" width="22" height="22" rx="4" stroke="#A0AEC0" strokeWidth="1.5" fill="none" />
          <path d="M7 10v7M7 7.5v.01M11 17v-4c0-1.1.9-2 2-2s2 .9 2 2v4M11 10v7" stroke="#A0AEC0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <rect x="2" y="2" width="20" height="20" rx="5" stroke="#A0AEC0" strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="12" r="4" stroke="#A0AEC0" strokeWidth="1.5" fill="none" />
          <circle cx="17.5" cy="6.5" r="1" fill="#A0AEC0" />
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
          <path d="M4 4l16 16M4 20L20 4" stroke="#A0AEC0" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </a>
    </div>
  );
}

interface AccountDetailPageProps {
  account: AccountDetail;
  onBack: () => void;
}

export function AccountDetailPage({ account, onBack }: AccountDetailPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("contatos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

  const tabs: { key: Tab; label: string }[] = [
    { key: "contatos", label: "Contatos" },
    { key: "dossie", label: "Dossiê" },
    { key: "plays", label: "Plays ativas" },
    { key: "detalhes", label: "Detalhes da conta" },
  ];

  const filtered = account.contactsList
    .filter((c) => {
      const s = search.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(s) ||
        c.role.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s);
      const matchRole = roleFilter ? c.role.toLowerCase().includes(roleFilter.toLowerCase()) : true;
      return matchSearch && matchRole;
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
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#212A46" }}>{account.name}</h1>
          <span
            className="rounded-md px-3 py-0.5"
            style={{ background: "#2563EB", color: "white", fontSize: 12, fontWeight: 700 }}
          >
            Editor
          </span>
        </div>

        {/* Dossiê card */}
        <div
          className="flex items-center gap-4 rounded-xl px-5 py-3"
          style={{ background: "white", boxShadow: "0 2px 12px rgba(33,42,70,0.08)", minWidth: 380 }}
        >
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 48, height: 48, background: "#FFF0EC" }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <rect x="3" y="8" width="24" height="18" rx="2" stroke="#FF5F39" strokeWidth="1.8" fill="none" />
              <path d="M10 8V6a2 2 0 012-2h6a2 2 0 012 2v2" stroke="#FF5F39" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 16h12M9 21h8" stroke="#FF5F39" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p style={{ fontWeight: 700, fontSize: 13, color: "#212A46" }}>Construção de Dossiês</p>
            <p style={{ fontSize: 11, color: "#666" }}>
              Criação de dossiê de 1 Conta e Dossiê de até 20 contatos desta conta
            </p>
          </div>
          <button
            className="rounded-lg px-4 py-2 shrink-0"
            style={{ border: "2px solid #FF5F39", color: "#FF5F39", fontWeight: 700, fontSize: 12, background: "transparent" }}
          >
            Quero ajuda da Maestro
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="mx-8 mb-8 rounded-xl overflow-hidden" style={{ background: "white", boxShadow: "0 2px 16px rgba(33,42,70,0.07)" }}>
        {/* Tabs */}
        <div className="flex items-end border-b" style={{ borderColor: "#E2E8F0", paddingLeft: 24 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative px-6 py-4 transition-colors"
                style={{
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#212A46" : "#727272",
                  fontSize: 15,
                  borderBottom: isActive ? "3px solid #FF5F39" : "3px solid transparent",
                  marginBottom: -1,
                  background: "transparent",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "contatos" && (
          <>
            {/* Action bar */}
            <div className="flex items-center gap-3 px-6 py-4 border-b flex-wrap" style={{ borderColor: "#E2E8F0" }}>
              <button
                className="flex items-center gap-2 rounded-xl px-4 py-2"
                style={{ background: "#FF5F39", color: "white", fontWeight: 700, fontSize: 13 }}
              >
                <Plus size={16} />
                Adicionar contato
              </button>
              <button
                className="flex items-center gap-2 rounded-xl px-4 py-2"
                style={{ background: "#2563EB", color: "white", fontWeight: 700, fontSize: 13 }}
              >
                <SlidersHorizontal size={16} />
                Campos personalizados
              </button>

              {/* A-Z sort */}
              <button
                className="flex items-center gap-2 rounded-xl px-4 py-2 border"
                style={{ borderColor: "#CBD5E0", background: "white", fontWeight: 700, fontSize: 13, color: "#212A46" }}
                onClick={() => { setSortAsc((v) => !v); setPage(1); }}
              >
                {sortAsc ? "A-Z" : "Z-A"}
                <ChevronDown size={14} />
              </button>

              {/* Filter by role */}
              <div
                className="flex items-center gap-2 rounded-xl border px-4 py-2 cursor-pointer"
                style={{ borderColor: "#CBD5E0", background: "white", fontSize: 13, color: "#9B9B9B", minWidth: 180 }}
              >
                <span className="flex-1">{roleFilter || "Filtrar por cargo"}</span>
                <ChevronDown size={14} />
              </div>

              <div className="flex-1" />

              {/* Search */}
              <div
                className="flex items-center gap-2 rounded-xl border px-4 py-2"
                style={{ borderColor: "#CBD5E0", background: "white", minWidth: 200 }}
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
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                    <th className="pl-6 pr-2 py-3 text-left" style={{ width: 32 }}>
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      Nome
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      Cargo
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      E-mail
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      Telefone
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      Data de Nascimento
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      Social
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }}>
                      Origem
                    </th>
                    <th className="px-3 py-3 text-left" style={{ color: "#212A46", fontWeight: 700, fontSize: 12 }} />
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center" style={{ color: "#9B9B9B", fontSize: 13 }}>
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
                            <span style={{ color: "#FF5F39", fontWeight: 600 }}>{c.name}</span>
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
                        <td className="px-3 py-3">
                          <button
                            className="hover:opacity-70 transition-opacity"
                            title="Editar"
                            style={{ color: "#848484" }}
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

            {/* Pagination */}
            <div
              className="flex items-center justify-center gap-4 py-4 border-t"
              style={{ borderColor: "#E2E8F0" }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-gray-100 transition-colors"
                style={{ width: 34, height: 34, border: "1.5px solid #CBD5E0" }}
              >
                <ChevronLeft size={16} style={{ color: "#555" }} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-gray-100 transition-colors"
                style={{ width: 34, height: 34, border: "1.5px solid #CBD5E0" }}
              >
                <ChevronRight size={16} style={{ color: "#555" }} />
              </button>
            </div>
          </>
        )}

        {activeTab !== "contatos" && (
          <div className="flex items-center justify-center py-20" style={{ color: "#9B9B9B", fontSize: 15 }}>
            <div className="text-center">
              <p style={{ fontWeight: 700, color: "#212A46", fontSize: 18, marginBottom: 6 }}>
                {activeTab === "dossie" && "Dossiê"}
                {activeTab === "plays" && "Plays ativas"}
                {activeTab === "detalhes" && "Detalhes da conta"}
              </p>
              <p>Esta seção será implementada em breve.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
