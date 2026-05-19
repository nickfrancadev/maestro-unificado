import { DossieContatoModal } from "./DossieContatoModal";
import { ExpandableDossierCard } from "./ExpandableDossierCard";
import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  Plus,
  Download,
  Trash2,
  MoreVertical,
  Pencil,
  Users,
  Zap,
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
  X,
} from "lucide-react";
import { AccountDetailPage, type AccountDetail } from "./AccountDetailPage";
import { ContactEditDrawer } from "./ContactEditDrawer";
import { AccountEditDrawer } from "./AccountEditDrawer";
import { AccountCreateModal } from "./AccountCreateModal";
import { DossieCreateModal } from "./DossieCreateModal";
import { OrgChart } from "./OrgChart";
import { PlaysTab } from "./PlaysTab";
import { contacts200 } from "./mockData200";

const mockAccounts: AccountDetail[] = [
  {
    id: 1,
    name: "Empresa teste",
    playsCreated: 11,
    contacts: 25,
    industry: "",
    website: "",
    origin: "RD",
    playsAtivas: 3,
    dossierCount: 4,
    registeredBy: "Admin",
    contactsList: [
      { id: 1,  name: "Alexandra Gutmann",   role: "Global Usability R...",    email: "mer133@gmail.com",           phone: "598-572-9096", birthdate: "15-07-2025", linkedin: "linkedin.com/in/alexandra",  instagram: "instagram.com/alexandra",  twitter: "x.com/alexandra",  origin: "RD", registeredBy: "Admin" },
      { id: 2,  name: "Anna Rosenbaum I",     role: "Senior Branding T...",    email: "ellis_cormier@yahoo.com",    phone: "592-204-6928", birthdate: undefined,      linkedin: "linkedin.com/in/anna",        instagram: "instagram.com/anna",        twitter: "x.com/anna",        origin: "RD", registeredBy: "Admin" },
      { id: 3,  name: "April Johnston",       role: "Forward Commu...",        email: "zlta16@gmail.com",           phone: "328-712-2279", birthdate: undefined,      linkedin: "linkedin.com/in/april",       instagram: "instagram.com/april",       twitter: "x.com/april",       origin: "RD", registeredBy: "Editor" },
      { id: 4,  name: "Arlene Mann",          role: "Forward Identity...",     email: "velda21@yahoo.com",          phone: "248-246-2319", birthdate: undefined,      linkedin: "linkedin.com/in/arlene",      instagram: "instagram.com/arlene",      twitter: "x.com/arlene",      origin: "RD", registeredBy: "Admin" },
      { id: 5,  name: "Ashley Conroy",        role: "Direct Brand Rep...",     email: "kattie_stracke39@gmail.com", phone: "564-863-8371", birthdate: undefined,      linkedin: "linkedin.com/in/ashley",      instagram: "instagram.com/ashley",      twitter: "x.com/ashley",      origin: "RD", registeredBy: "Admin" },
      { id: 6,  name: "Bernard Herzog I",     role: "Legacy Paradigm...",      email: "eric.balistrer@hotmail.com", phone: "522-837-6806", birthdate: undefined,      linkedin: "linkedin.com/in/bernard",     instagram: "instagram.com/bernard",     twitter: "x.com/bernard",     origin: "RD", registeredBy: "Editor" },
      { id: 7,  name: "Billie Sanford",       role: "Dynamic Security...",     email: "aurelia3@yahoo.com",         phone: "404-511-4890", birthdate: undefined,      linkedin: "linkedin.com/in/billie",      instagram: "instagram.com/billie",      twitter: "x.com/billie",      origin: "RD", registeredBy: "Admin" },
      { id: 8,  name: "Christina Jacobi",     role: "Corporate Functi...",     email: "kyra_koepp@gmail.com",       phone: "850-480-3470", birthdate: "17-07-2025",   linkedin: "linkedin.com/in/christina",   instagram: "instagram.com/christina",   twitter: "x.com/christina",   origin: "RD", registeredBy: "Admin" },
      { id: 9,  name: "Claude Nicolas",       role: "International Crea...",   email: "lon.gaylord18@hotmail.com",  phone: "966-395-0794", birthdate: "22-07-2025",   linkedin: "linkedin.com/in/claude",      instagram: "instagram.com/claude",      twitter: "x.com/claude",      origin: "RD", registeredBy: "Editor" },
      { id: 10, name: "Courtney Bogisich DVM",role: "Senior Response...",      email: "leopold.kreiger56@gmail.com",phone: "757-748-6509", birthdate: undefined,      linkedin: "linkedin.com/in/courtney",    instagram: "instagram.com/courtney",    twitter: "x.com/courtney",    origin: "RD", registeredBy: "Admin" },
      { id: 11, name: "Daisy Hartmann",       role: "Product Manager",         email: "daisy.h@gmail.com",          phone: "312-555-0101", birthdate: "05-03-1990",   linkedin: "linkedin.com/in/daisy",       instagram: "instagram.com/daisy",       twitter: "x.com/daisy",       origin: "RD", registeredBy: "Admin" },
      { id: 12, name: "Eduardo Ferreira",     role: "VP de Vendas",            email: "edu.ferreira@gmail.com",     phone: "11-98765-4321", birthdate: undefined,     linkedin: "linkedin.com/in/eduardo",     instagram: "instagram.com/eduardo",     twitter: "x.com/eduardo",     origin: "RD", registeredBy: "Editor" },
    ],
  },
  {
    id: 2,
    name: "H9J",
    playsCreated: 5,
    contacts: 0,
    industry: "",
    website: "http://h9j.com.br",
    origin: "RD",
    playsAtivas: 1,
    dossierCount: 2,
    registeredBy: "Editor",
    contactsList: [],
  },
  {
    id: 3,
    name: "Maestro ABM",
    playsCreated: 1,
    contacts: 4,
    industry: "Tecnologia",
    website: "www.maestroabm.com",
    origin: "Maestro",
    playsAtivas: 5,
    dossierCount: 3,
    registeredBy: "Admin",
    contactsList: [
      { id: 13, name: "Pedro Alves",    role: "CEO",                email: "pedro@maestroabm.com",  phone: "(11) 8888-0001", birthdate: "10-01-1985", linkedin: "linkedin.com/in/pedroalves",  instagram: "instagram.com/pedroalves",  twitter: "x.com/pedroalves",  origin: "Maestro", registeredBy: "Admin" },
      { id: 14, name: "Sofia Ramos",    role: "Head de Marketing",  email: "sofia@maestroabm.com",  phone: "(11) 8888-0002", birthdate: undefined,    linkedin: "linkedin.com/in/sofiaramos",  instagram: "instagram.com/sofiaramos",  twitter: "x.com/sofiaramos",  origin: "Maestro", registeredBy: "Admin" },
      { id: 15, name: "Thiago Costa",   role: "CTO",                email: "thiago@maestroabm.com", phone: "(11) 8888-0003", birthdate: "22-06-1990", linkedin: "linkedin.com/in/thiagocosta", instagram: "instagram.com/thiagocosta", twitter: "x.com/thiagocosta", origin: "Maestro", registeredBy: "Admin" },
      { id: 16, name: "Laura Neves",    role: "Analista de Vendas", email: "laura@maestroabm.com",  phone: "(11) 8888-0004", birthdate: undefined,    linkedin: "linkedin.com/in/lauraneves",  instagram: "instagram.com/lauraneves",  twitter: "x.com/lauraneves",  origin: "Maestro", registeredBy: "Admin" },
    ],
  },
  {
    id: 4,
    name: "Nubank",
    playsCreated: 8,
    contacts: 37,
    industry: "Fintech",
    website: "www.nubank.com.br",
    origin: "Maestro",
    playsAtivas: 2,
    dossierCount: 4,
    registeredBy: "Admin",
    contactsList: [
      { id: 17, name: "Miguel Salabarez",   role: "CEO",                       email: "miguel.salabarez@nubank.com.br",    phone: "(11) 9 9001-0001", birthdate: "12-03-1978", linkedin: "linkedin.com/in/miguelsalabarez",   instagram: "instagram.com/miguels",    twitter: "x.com/miguels",    origin: "Maestro", registeredBy: "Admin"   },
      { id: 18, name: "Carlos Henrique",    role: "Head de Marketing",         email: "carlos.henrique@nubank.com.br",     phone: "(11) 9 9001-0002", birthdate: undefined,    linkedin: "linkedin.com/in/carloshenrique",   instagram: "instagram.com/carlosh",    twitter: "x.com/carlosh",    origin: "Maestro", registeredBy: "Admin"   },
      { id: 19, name: "Mariana Oliveira",   role: "CFO",                       email: "mariana.oliveira@nubank.com.br",    phone: "(11) 9 9001-0003", birthdate: "30-11-1985", linkedin: "linkedin.com/in/marianaoli",        instagram: "instagram.com/marianao",   twitter: "x.com/marianao",   origin: "Maestro", registeredBy: "Editor"   },
      { id: 20, name: "Lucas Fontanelli",   role: "Analista de Vendas",        email: "lucas.fontanelli@nubank.com.br",    phone: "(11) 9 9001-0004", birthdate: undefined,    linkedin: "linkedin.com/in/lucasfont",         instagram: "instagram.com/lucasf",     twitter: "x.com/lucasf",     origin: "Maestro", registeredBy: "Admin"   },
      { id: 21, name: "Aline Macedo",       role: "Executivo de Vendas",       email: "aline.macedo@nubank.com.br",        phone: "(11) 9 9001-0005", birthdate: undefined,    linkedin: "linkedin.com/in/alinemacedo",       instagram: "instagram.com/alinem",     twitter: "x.com/alinem",     origin: "Maestro", registeredBy: "Admin"   },
      { id: 22, name: "Gustavo Silva",      role: "Executivo de Vendas",       email: "gustavo.silva@nubank.com.br",       phone: "(11) 9 9001-0006", birthdate: undefined,    linkedin: "linkedin.com/in/gustavosilva",      instagram: "instagram.com/gustavos",   twitter: "x.com/gustavos",   origin: "Maestro", registeredBy: "Admin"   },
      { id: 23, name: "Silmara Vieira",     role: "Analista de Marketing",     email: "silmara.vieira@nubank.com.br",      phone: "(11) 9 9001-0007", birthdate: "04-09-1992", linkedin: "linkedin.com/in/silmarav",          instagram: "instagram.com/silmarav",   twitter: "x.com/silmarav",   origin: "Maestro", registeredBy: "Editor"   },
      { id: 24, name: "Fernanda Garcia",    role: "Pré-vendas",                email: "fernanda.garcia@nubank.com.br",     phone: "(11) 9 9001-0008", birthdate: undefined,    linkedin: "linkedin.com/in/fernandagarcia",    instagram: "instagram.com/fernandg",   twitter: "x.com/fernandg",   origin: "Maestro", registeredBy: "Admin"   },
      { id: 25, name: "Rafael Brito",       role: "VP de Produto",             email: "rafael.brito@nubank.com.br",        phone: "(11) 9 9001-0009", birthdate: "15-06-1983", linkedin: "linkedin.com/in/rafaelbrito",        instagram: "instagram.com/rafaelb",    twitter: "x.com/rafaelb",    origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 26, name: "Camila Teixeira",    role: "Product Manager",           email: "camila.teixeira@nubank.com.br",     phone: "(11) 9 9001-0010", birthdate: undefined,    linkedin: "linkedin.com/in/camilateixeira",    instagram: "instagram.com/camilat",    twitter: "x.com/camilat",    origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 27, name: "Bruno Castilho",     role: "Engenheiro de Software",    email: "bruno.castilho@nubank.com.br",      phone: "(11) 9 9001-0011", birthdate: "22-01-1990", linkedin: "linkedin.com/in/brunocastilho",      instagram: "instagram.com/brunoc",     twitter: "x.com/brunoc",     origin: "Indicação", registeredBy: "Editor" },
      { id: 28, name: "Patrícia Munhoz",    role: "Head de RH",                email: "patricia.munhoz@nubank.com.br",     phone: "(11) 9 9001-0012", birthdate: undefined,    linkedin: "linkedin.com/in/patriciamunhoz",    instagram: "instagram.com/patriciam",  twitter: "x.com/patriciam",  origin: "Maestro", registeredBy: "Admin"   },
      { id: 29, name: "Diego Saraiva",      role: "Cientista de Dados",        email: "diego.saraiva@nubank.com.br",       phone: "(11) 9 9001-0013", birthdate: "07-04-1994", linkedin: "linkedin.com/in/diegosaraiva",       instagram: "instagram.com/diegos",     twitter: "x.com/diegos",     origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 30, name: "Juliana Prado",      role: "Coordenadora Comercial",    email: "juliana.prado@nubank.com.br",       phone: "(11) 9 9001-0014", birthdate: undefined,    linkedin: "linkedin.com/in/julianaprado",       instagram: "instagram.com/julianap",   twitter: "x.com/julianap",   origin: "Inbound", registeredBy: "Editor"   },
      { id: 31, name: "André Roque",        role: "DevOps Engineer",           email: "andre.roque@nubank.com.br",         phone: "(11) 9 9001-0015", birthdate: "19-09-1988", linkedin: "linkedin.com/in/andreroque",         instagram: "instagram.com/andrer",     twitter: "x.com/andrer",     origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 32, name: "Isabela Fonseca",    role: "Designer UX",               email: "isabela.fonseca@nubank.com.br",     phone: "(11) 9 9001-0016", birthdate: undefined,    linkedin: "linkedin.com/in/isabelafonseca",    instagram: "instagram.com/isabelaf",   twitter: "x.com/isabelaf",   origin: "Indicação", registeredBy: "Admin" },
      { id: 33, name: "Mateus Loureiro",    role: "Arquiteto de Soluções",     email: "mateus.loureiro@nubank.com.br",     phone: "(11) 9 9001-0017", birthdate: "03-12-1986", linkedin: "linkedin.com/in/mateusloureiro",    instagram: "instagram.com/mateusl",    twitter: "x.com/mateusl",    origin: "Maestro", registeredBy: "Admin"   },
      { id: 34, name: "Larissa Campos",     role: "Analista Financeiro",       email: "larissa.campos@nubank.com.br",      phone: "(11) 9 9001-0018", birthdate: undefined,    linkedin: "linkedin.com/in/larissacampos",     instagram: "instagram.com/larissac",   twitter: "x.com/larissac",   origin: "Inbound", registeredBy: "Editor"   },
      { id: 35, name: "Felipe Neto",        role: "COO",                       email: "felipe.neto@nubank.com.br",         phone: "(11) 9 9001-0019", birthdate: "28-07-1980", linkedin: "linkedin.com/in/felipeneto",         instagram: "instagram.com/felipen",    twitter: "x.com/felipen",    origin: "Maestro", registeredBy: "Admin"   },
      { id: 36, name: "Vanessa Correia",    role: "Gerente de Projetos",       email: "vanessa.correia@nubank.com.br",     phone: "(11) 9 9001-0020", birthdate: undefined,    linkedin: "linkedin.com/in/vanessacorreia",    instagram: "instagram.com/vanessac",   twitter: "x.com/vanessac",   origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 37, name: "Rodrigo Mendes",     role: "Gerente Comercial",         email: "rodrigo.mendes@nubank.com.br",      phone: "(11) 9 9001-0021", birthdate: "11-02-1987", linkedin: "linkedin.com/in/rodrigomendes",      instagram: "instagram.com/rodrigom",   twitter: "x.com/rodrigom",   origin: "Maestro", registeredBy: "Admin"   },
      { id: 38, name: "Amanda Rocha",       role: "Especialista de Produto",   email: "amanda.rocha@nubank.com.br",        phone: "(11) 9 9001-0022", birthdate: undefined,    linkedin: "linkedin.com/in/amandarocha",        instagram: "instagram.com/amandar",    twitter: "x.com/amandar",    origin: "Indicação", registeredBy: "Editor" },
      { id: 39, name: "Leandro Pinheiro",   role: "Scrum Master",              email: "leandro.pinheiro@nubank.com.br",    phone: "(11) 9 9001-0023", birthdate: "25-05-1991", linkedin: "linkedin.com/in/leandropinheiro",    instagram: "instagram.com/leandrop",   twitter: "x.com/leandrop",   origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 40, name: "Débora Azevedo",     role: "SDR",                       email: "debora.azevedo@nubank.com.br",      phone: "(11) 9 9001-0024", birthdate: undefined,    linkedin: "linkedin.com/in/deboraazevedo",      instagram: "instagram.com/debora.a",   twitter: "x.com/debora.a",   origin: "Inbound", registeredBy: "Admin"   },
      { id: 41, name: "Henrique Bastos",    role: "Diretor de TI",             email: "henrique.bastos@nubank.com.br",     phone: "(11) 9 9001-0025", birthdate: "14-08-1979", linkedin: "linkedin.com/in/henriquebastos",    instagram: "instagram.com/henriqueb",  twitter: "x.com/henriqueb",  origin: "Maestro", registeredBy: "Admin"   },
      { id: 42, name: "Natália Freitas",    role: "Estrategista de Conteúdo",  email: "natalia.freitas@nubank.com.br",     phone: "(11) 9 9001-0026", birthdate: undefined,    linkedin: "linkedin.com/in/nataliafreitas",    instagram: "instagram.com/nataliaf",   twitter: "x.com/nataliaf",   origin: "Inbound", registeredBy: "Editor"   },
      { id: 43, name: "Paulo Albuquerque",  role: "Consultor de Negócios",     email: "paulo.albuquerque@nubank.com.br",   phone: "(11) 9 9001-0027", birthdate: "09-10-1984", linkedin: "linkedin.com/in/pauloalbuquerque",  instagram: "instagram.com/pauloa",     twitter: "x.com/pauloa",     origin: "Evento", registeredBy: "Admin"    },
      { id: 44, name: "Simone Tavares",     role: "Gerente de Marketing",      email: "simone.tavares@nubank.com.br",      phone: "(11) 9 9001-0028", birthdate: undefined,    linkedin: "linkedin.com/in/simonetavares",     instagram: "instagram.com/simonet",    twitter: "x.com/simonet",    origin: "Maestro", registeredBy: "Admin"   },
      { id: 45, name: "Roberto Cunha",      role: "Agile Coach",               email: "roberto.cunha@nubank.com.br",       phone: "(11) 9 9001-0029", birthdate: "17-03-1989", linkedin: "linkedin.com/in/robertocunha",       instagram: "instagram.com/robertoc",   twitter: "x.com/robertoc",   origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 46, name: "Cláudia Vargas",     role: "Product Owner",             email: "claudia.vargas@nubank.com.br",      phone: "(11) 9 9001-0030", birthdate: undefined,    linkedin: "linkedin.com/in/claudiavargas",     instagram: "instagram.com/claudiav",   twitter: "x.com/claudiav",   origin: "Indicação", registeredBy: "Editor" },
      { id: 47, name: "Sérgio Monteiro",    role: "VP de Tecnologia",          email: "sergio.monteiro@nubank.com.br",     phone: "(11) 9 9001-0031", birthdate: "06-06-1977", linkedin: "linkedin.com/in/sergiomonteiro",    instagram: "instagram.com/sergiom",    twitter: "x.com/sergiom",    origin: "Maestro", registeredBy: "Admin"   },
      { id: 48, name: "Priscila Barbosa",   role: "Analista de TI",            email: "priscila.barbosa@nubank.com.br",    phone: "(11) 9 9001-0032", birthdate: undefined,    linkedin: "linkedin.com/in/priscilabarbosa",  instagram: "instagram.com/priscilb",   twitter: "x.com/priscilb",   origin: "Inbound", registeredBy: "Admin"   },
      { id: 49, name: "Marcelo Andrade",    role: "Diretor Comercial",         email: "marcelo.andrade@nubank.com.br",     phone: "(11) 9 9001-0033", birthdate: "23-11-1981", linkedin: "linkedin.com/in/marceloandrade",    instagram: "instagram.com/marceloa",   twitter: "x.com/marceloa",   origin: "Maestro", registeredBy: "Admin"   },
      { id: 50, name: "Adriana Melo",       role: "Consultora de Vendas",      email: "adriana.melo@nubank.com.br",        phone: "(11) 9 9001-0034", birthdate: undefined,    linkedin: "linkedin.com/in/adrianamelo",        instagram: "instagram.com/adrianam",   twitter: "x.com/adrianam",   origin: "Evento", registeredBy: "Editor"    },
      { id: 51, name: "Fábio Carvalho",     role: "Desenvolvedor Senior",      email: "fabio.carvalho@nubank.com.br",      phone: "(11) 9 9001-0035", birthdate: "01-04-1993", linkedin: "linkedin.com/in/fabiocarvalho",     instagram: "instagram.com/fabioc",     twitter: "x.com/fabioc",     origin: "LinkedIn", registeredBy: "Admin"  },
      { id: 52, name: "Tatiane Ribeiro",    role: "Coordenadora de Marketing", email: "tatiane.ribeiro@nubank.com.br",     phone: "(11) 9 9001-0036", birthdate: undefined,    linkedin: "linkedin.com/in/tatianeribeiro",    instagram: "instagram.com/tatianer",   twitter: "x.com/tatianer",   origin: "Inbound", registeredBy: "Admin"   },
      { id: 53, name: "Leonardo Pires",     role: "CTO",                       email: "leonardo.pires@nubank.com.br",      phone: "(11) 9 9001-0037", birthdate: "30-08-1975", linkedin: "linkedin.com/in/leonardopires",     instagram: "instagram.com/leonardop",  twitter: "x.com/leonardop",  origin: "Maestro", registeredBy: "Admin"   },
    ],
  },
  {
    id: 5,
    name: "Itaú Unibanco S.A.",
    playsCreated: 34,
    contacts: 200,
    industry: "Financeiro",
    website: "www.itau.com.br",
    origin: "LinkedIn",
    playsAtivas: 12,
    dossierCount: 8,
    registeredBy: "Editor",
    contactsList: contacts200,
  },
];

// ─── Contacts inline panel (quick-view inside table) ─────────────────────────

const mockDossiers = [
  {
    id: 1,
    kind: "conta",
    title: "Reunião de alinhamento Q1",
    createdAt: "10/01/2026",
    updatedAt: "10/01/2026",
    author: "Pedro Alves",
    type: "Reunião",
    stage: "Descoberta",
    contacts: [],
    excerpt: "Discutimos metas de expansão para o primeiro trimestre e definimos os KPIs principais.",
  },
  {
    id: 2,
    kind: "contato",
    title: "Mapeamento de stakeholders",
    createdAt: "22/01/2026",
    updatedAt: "23/01/2026",
    author: "Sofia Ramos",
    type: "Sale",
    stage: "Qualificação",
    contacts: ["Pedro Alves", "Sofia Ramos", "Thiago Costa"],
    excerpt: "Levantamento dos decisores e influenciadores envolvidos no processo de compra.",
  },
  {
    id: 3,
    kind: "conta",
    title: "Follow-up pós-demo",
    createdAt: "05/02/2026",
    updatedAt: "06/02/2026",
    author: "Thiago Costa",
    type: "Follow-up",
    stage: "Proposta",
    contacts: [],
    excerpt: "Cliente solicitou ajustes no escopo e pediu nova demonstração da funcionalidade de relatórios.",
  },
  {
    id: 4,
    kind: "contato",
    title: "Análise de compradores",
    createdAt: "18/02/2026",
    updatedAt: "18/02/2026",
    author: "Laura Neves",
    type: "Relacionamento",
    stage: undefined,
    contacts: ["Laura Neves", "Pedro Alves"],
    excerpt: "Avaliação do papel de cada contato na decisão e hipóteses de dor mapeadas.",
  },
];

const TYPE_COLORS: Record<string, string> = {
  "Reunião":    "#2563EB",
  "Proposta":   "#16A34A",
  "Follow-up":  "#D97706",
  "Sale":       "#FF5F39",
  "Relacionamento": "#6B7280",
};

// ─── Contact row actions menu ─────────────────────────────────────────────────
const defaultContactSegments = [
  { id: 1, name: "Enterprise LATAM", color: "#2563EB" },
  { id: 2, name: "Fintech Brasil",    color: "#16A34A" },
  { id: 3, name: "Alto potencial Q2", color: "#D97706" },
];

function ContactActionsMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [showSegments, setShowSegments] = useState(false);
  const [segments, setSegments] = useState(defaultContactSegments);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newSegName, setNewSegName] = useState("");
  const [newSegColor, setNewSegColor] = useState("#FF5F39");
  const [creatingNew, setCreatingNew] = useState(false);
  const ref = useState<HTMLDivElement | null>(null);

  const toggleSeg = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAddNew = () => {
    if (!newSegName.trim()) return;
    const id = Date.now();
    setSegments((prev) => [...prev, { id, name: newSegName.trim(), color: newSegColor }]);
    setSelected((prev) => { const n = new Set(prev); n.add(id); return n; });
    setNewSegName("");
    setCreatingNew(false);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        title="Opções"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setShowSegments(false); }}
        style={{ color: "#848484", background: "none", border: "none", cursor: "pointer", boxShadow: "none", padding: 0 }}
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            onClick={() => { setOpen(false); setShowSegments(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
          />

          {/* main dropdown */}
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
            background: "white", borderRadius: 10, border: "1px solid #E2E8F0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden",
          }}>
            {/* Editar */}
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 16px", background: "none", border: "none",
                fontSize: 13, color: "#212A46", cursor: "pointer", textAlign: "left",
                borderBottom: "1px solid #F1F5F9",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar contato
            </button>

            {/* Adicionar a segmento */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowSegments((s) => !s); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%",
                padding: "10px 16px", background: showSegments ? "#FFF7F5" : "none", border: "none",
                fontSize: 13, color: showSegments ? "#FF5F39" : "#212A46", cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!showSegments) e.currentTarget.style.background = "#F7F8FB"; }}
              onMouseLeave={(e) => { if (!showSegments) e.currentTarget.style.background = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                Adicionar a segmento
              </div>
              <ChevronDown size={12} style={{ transform: showSegments ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {/* Segment sub-panel */}
            {showSegments && (
              <div style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFD", padding: "8px 0" }}>
                {segments.map((seg) => (
                  <label
                    key={seg.id}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                      cursor: "pointer", fontSize: 13, color: "#212A46",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(seg.id)}
                      onChange={() => toggleSeg(seg.id)}
                      style={{ accentColor: seg.color, cursor: "pointer" }}
                    />
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
                    {seg.name}
                  </label>
                ))}

                {/* Create new segment */}
                {creatingNew ? (
                  <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={newSegName}
                      onChange={(e) => setNewSegName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
                      placeholder="Nome do segmento"
                      style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none", color: "#212A46" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="color" value={newSegColor} onChange={(e) => setNewSegColor(e.target.value)} style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                      <button
                        onClick={handleAddNew}
                        style={{ flex: 1, background: "#FF5F39", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        Criar
                      </button>
                      <button
                        onClick={() => setCreatingNew(false)}
                        style={{ background: "#F1F5F9", color: "#6B7280", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCreatingNew(true); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "8px 16px", background: "none", border: "none",
                      fontSize: 12, color: "#FF5F39", fontWeight: 600, cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF7F5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <Plus size={12} />
                    Criar novo segmento
                  </button>
                )}

                {selected.size > 0 && (
                  <div style={{ padding: "8px 16px 4px", borderTop: "1px solid #F1F5F9" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpen(false); setShowSegments(false); }}
                      style={{
                        width: "100%", background: "#FF5F39", color: "white", border: "none",
                        borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Confirmar ({selected.size})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Segment expanded body (needs own state for search/selection) ──────────────
function SegmentBody({
  seg,
  dossiers,
  contacts,
  linkedDossiers,
  linkedContactDossiers,
  linkedContacts,
  onConfirm,
  onUpdate,
}: {
  seg: { id: number; name: string; color: string; count: number; description?: string };
  dossiers: typeof mockDossiers;
  contacts: { id: number; name: string; role: string }[];
  linkedDossiers: Set<number>;
  linkedContactDossiers: Set<number>;
  linkedContacts: Set<number>;
  onConfirm: (dossierIds: Set<number>, contactDossierIds: Set<number>, contactIds: Set<number>) => void;
  onUpdate: (name: string, description: string) => void;
}) {
  const [searchD, setSearchD] = useState("");
  const [searchCD, setSearchCD] = useState("");
  const [searchC, setSearchC] = useState("");
  const [selDossiers, setSelDossiers] = useState<Set<number>>(new Set(linkedDossiers));
  const [selContactDossiers, setSelContactDossiers] = useState<Set<number>>(new Set(linkedContactDossiers));
  const [selContacts, setSelContacts] = useState<Set<number>>(new Set(linkedContacts));
  const [editName, setEditName] = useState(seg.name);
  const [editDesc, setEditDesc] = useState(seg.description ?? "");

  const accountDossiers = dossiers.filter((d) => d.kind === "conta");
  const contactDossiers = dossiers.filter((d) => d.kind === "contato");
  const filteredD = accountDossiers.filter((d) => d.title.toLowerCase().includes(searchD.toLowerCase()));
  const filteredCD = contactDossiers.filter((d) => d.title.toLowerCase().includes(searchCD.toLowerCase()));
  const filteredC = contacts.filter((c) => c.name.toLowerCase().includes(searchC.toLowerCase()));

  const toggleD = (id: number) =>
    setSelDossiers((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCD = (id: number) =>
    setSelContactDossiers((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleC = (id: number) =>
    setSelContacts((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalSelected = selDossiers.size + selContactDossiers.size + selContacts.size;

  const sectionLabel = (text: string) => (
    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#212A46", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {text}
    </p>
  );

  const searchInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9B9B9B" }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6,
          fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 7, outline: "none", background: "white", color: "#212A46",
        }}
      />
    </div>
  );

  const checkboxRow = (checked: boolean, onToggle: () => void, title: string, subtitle: string, key: number) => (
    <label
      key={key}
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
        borderRadius: 7, cursor: "pointer", background: checked ? "#FFF1EC" : "white",
        border: `1px solid ${checked ? "#FF5F39" : "#E2E8F0"}`, transition: "all 0.12s",
      }}
    >
      <div style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0,
        border: `2px solid ${checked ? "#FF5F39" : "#CBD5E0"}`,
        background: checked ? "#FF5F39" : "white",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#212A46", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>{subtitle}</p>
      </div>
    </label>
  );

  return (
    <div style={{ padding: "16px 18px 18px", borderTop: "1px solid #FDE8E1", background: "#FFFAF9" }}>
      {/* ── Editable title + description ── */}
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
            Título do segmento
          </label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nome do segmento"
            style={{
              width: "100%", boxSizing: "border-box", padding: "7px 10px",
              fontSize: 13, fontWeight: 600, color: "#212A46",
              border: "1px solid #E2E8F0", borderRadius: 7, outline: "none",
              background: "white", transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#FF5F39")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
            Descrição
          </label>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Descreva o objetivo deste segmento..."
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", padding: "7px 10px",
              fontSize: 12, color: "#6B7280", lineHeight: 1.6,
              border: "1px solid #E2E8F0", borderRadius: 7, outline: "none",
              background: "white", resize: "none", fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#FF5F39")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          />
        </div>
      </div>

      {/* ── Dossiês de Conta ── */}
      {sectionLabel("Dossiês de conta")}
      {searchInput(searchD, setSearchD, "Buscar dossiê de conta...")}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18, maxHeight: 120, overflowY: "auto" }}>
        {filteredD.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "#9B9B9B", textAlign: "center", padding: "8px 0" }}>Nenhum dossiê de conta encontrado</p>
        )}
        {filteredD.map((d) => checkboxRow(selDossiers.has(d.id), () => toggleD(d.id), d.title, `${d.createdAt} · ${d.author}`, d.id))}
      </div>

      {/* ── Dossiês de Contato ── */}
      {sectionLabel("Dossiês de contato")}
      {searchInput(searchCD, setSearchCD, "Buscar dossiê de contato...")}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18, maxHeight: 120, overflowY: "auto" }}>
        {filteredCD.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "#9B9B9B", textAlign: "center", padding: "8px 0" }}>Nenhum dossiê de contato encontrado</p>
        )}
        {filteredCD.map((d) => checkboxRow(selContactDossiers.has(d.id), () => toggleCD(d.id), d.title, `${d.createdAt} · ${d.author}`, d.id))}
      </div>

      {/* ── Contatos ── */}
      {sectionLabel("Contatos")}
      {searchInput(searchC, setSearchC, "Buscar contato...")}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18, maxHeight: 120, overflowY: "auto" }}>
        {filteredC.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: "#9B9B9B", textAlign: "center", padding: "8px 0" }}>Nenhum contato encontrado</p>
        )}
        {filteredC.map((c) => checkboxRow(selContacts.has(c.id), () => toggleC(c.id), c.name, c.role, c.id))}
      </div>

      {/* ── Save button ── */}
      <button
        onClick={() => { onUpdate(editName.trim() || seg.name, editDesc); onConfirm(selDossiers, selContactDossiers, selContacts); }}
        style={{
          width: "100%", padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
          background: "#FF5F39", color: "white",
          fontSize: 13, fontWeight: 700, transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#e04e2a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FF5F39")}
      >
        Salvar
      </button>
    </div>
  );
}

// ─── Account row actions menu ─────────────────────────────────────────────────

function AccountActionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        title="Opções"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ color: "#848484", background: "none", border: "none", cursor: "pointer", boxShadow: "none", padding: 0 }}
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
            background: "white", borderRadius: 10, border: "1px solid #E2E8F0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden",
          }}>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 16px", background: "none", border: "none",
                fontSize: 13, color: "#212A46", cursor: "pointer", textAlign: "left",
                borderBottom: "1px solid #F1F5F9",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <Pencil size={14} style={{ color: "#6B7280" }} />
              Editar conta
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); alert('Exportação em desenvolvimento'); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 16px", background: "none", border: "none",
                fontSize: 13, color: "#212A46", cursor: "pointer", textAlign: "left",
                borderBottom: "1px solid #F1F5F9",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <Download size={14} style={{ color: "#6B7280" }} />
              Exportar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 16px", background: "none", border: "none",
                fontSize: 13, color: "#EF4444", cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <Trash2 size={14} />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ContactsPanel({ account, onContactSelectionChange, onOpenPlay }: { account: AccountDetail; onContactSelectionChange?: (ids: Set<number>) => void; onOpenPlay?: (accountId: string, playId: string) => void }) {
  const [activeTab, setActiveTab] = useState<"contatos" | "dossie" | "plays" | "organograma">("contatos");
  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [editingContact, setEditingContact] = useState<(typeof account.contactsList)[0] | null>(null);
  const [showDossieModal, setShowDossieModal] = useState(false);
  const [showDossieContatoModal, setShowDossieContatoModal] = useState(false);
  const [editingDossie, setEditingDossie] = useState<(typeof mockDossiers)[0] | null>(null);
  const [dossiers, setDossiers] = useState(mockDossiers);

  const [contactPage, setContactPage] = useState(1);
  const CONTACT_PAGE_SIZE = 25;

  const filtered = account.contactsList.filter((c) => {
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
  });

  const totalContactPages = Math.max(1, Math.ceil(filtered.length / CONTACT_PAGE_SIZE));
  const pagedContacts = filtered.slice((contactPage - 1) * CONTACT_PAGE_SIZE, contactPage * CONTACT_PAGE_SIZE);

  // Reset to page 1 when search changes
  const handleSearch = (v: string) => { setSearch(v); setContactPage(1); };

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedContacts.has(c.id));
  const someFilteredSelected = filtered.some((c) => selectedContacts.has(c.id)) && !allFilteredSelected;

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedContacts((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        onContactSelectionChange?.(next);
        return next;
      });
    } else {
      setSelectedContacts((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
        onContactSelectionChange?.(next);
        return next;
      });
    }
  };

  const toggleOne = (id: number) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      onContactSelectionChange?.(next);
      return next;
    });
  };

  const tabs = [
    { key: "contatos", label: "Contatos" },
    { key: "dossie",   label: "Dossiês" },
    { key: "plays",    label: "Plays" },
    { key: "organograma", label: "Organograma" },
  ] as const;

  return (
    <tr>
      <td colSpan={10} style={{ padding: 0 }}>
        <div
          style={{ background: "#F7F8FB", borderTop: "1px solid #E2E8F0", borderLeft: "4px solid #FF5F39" }}
        >
          {/* Tab bar */}
          <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #E2E8F0", background: "white", paddingLeft: 68 }}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#FF5F39" : "#6B7280",
                    background: "none",
                    border: "none",
                    borderBottom: active ? "2px solid #FF5F39" : "2px solid transparent",
                    cursor: "pointer",
                    boxShadow: "none",
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                  {tab.key === "contatos" && (
                    <span style={{ marginLeft: 6, borderRadius: 9999, background: active ? "#FFEBE5" : "#F1F5F9", color: active ? "#FF5F39" : "#6B7280", fontSize: 11, fontWeight: 700, padding: "1px 6px" }}>
                      {account.contacts}
                    </span>
                  )}
                  {tab.key === "dossie" && (
                    <span style={{ marginLeft: 6, borderRadius: 9999, background: active ? "#FFEBE5" : "#F1F5F9", color: active ? "#FF5F39" : "#6B7280", fontSize: 11, fontWeight: 700, padding: "1px 6px" }}>
                      {mockDossiers.length}
                    </span>
                  )}
                  {tab.key === "plays" && (
                    <span style={{ marginLeft: 6, borderRadius: 9999, background: active ? "#FFEBE5" : "#F1F5F9", color: active ? "#FF5F39" : "#6B7280", fontSize: 11, fontWeight: 700, padding: "1px 6px" }}>
                      3
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Contatos tab ── */}
          {activeTab === "contatos" && (
            <>
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid #E2E8F0", boxShadow: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, boxShadow: "none" }}>
                  <Users size={16} style={{ color: "#FF5F39" }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#212A46", boxShadow: "none" }}>
                    Contatos de {account.name}
                  </span>
                  <span
                    style={{ borderRadius: 9999, background: "rgba(255,95,57,0.1)", color: "#FF5F39", fontSize: 12, fontWeight: 700, padding: "2px 8px", boxShadow: "none" }}
                  >
                    {account.contacts}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, boxShadow: "none" }}>
                  <button
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "#D5D9E6", fontSize: 12, fontWeight: 700, color: "#212A46", border: "none", cursor: "pointer", boxShadow: "none" }}
                  >
                    <Download size={14} />
                    <span>Exportar</span>
                  </button>
                  <button
                    onClick={() => setEditingContact({ id: 0, name: "", role: "", email: "", phone: "", birthdate: undefined, linkedin: "", instagram: "", twitter: "", origin: "" })}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "#FF5F39", fontSize: 12, fontWeight: 700, color: "white", border: "none", cursor: "pointer", boxShadow: "none" }}
                  >
                    <Plus size={14} />
                    <span>Adicionar contato</span>
                  </button>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, border: "1px solid #9B9B9B", background: "white", boxShadow: "none" }}
                  >
                    <Search size={14} style={{ color: "#9B9B9B" }} />
                    <input
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Buscar"
                      style={{ outline: "none", background: "transparent", fontSize: 12, width: 100, color: "#333", boxShadow: "none" }}
                    />
                  </div>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "#9B9B9B", fontSize: 13 }}>
                  {account.contacts === 0
                    ? "Nenhum contato cadastrado para esta conta."
                    : "Nenhum contato encontrado."}
                </div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: "auto", overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 800, tableLayout: "fixed" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                        <th style={{ paddingLeft: 44, paddingRight: 8, paddingTop: 8, paddingBottom: 8, textAlign: "left", width: 44 }}>
                          <input
                            type="checkbox"
                            style={{ borderRadius: 4 }}
                            checked={allFilteredSelected}
                            ref={(el) => { if (el) el.indeterminate = someFilteredSelected; }}
                            onChange={toggleAll}
                          />
                        </th>
                        <th style={{ padding: "8px 12px", width: "15%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>NOME</th>
                        <th style={{ padding: "8px 12px", width: "15%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>CARGO</th>
                        <th style={{ padding: "8px 12px", width: "15%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>E-MAIL</th>
                        <th style={{ padding: "8px 12px", width: "10%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>TELEFONE</th>
                        <th style={{ padding: "8px 12px", width: "10%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>DATA DE NASC.</th>
                        <th style={{ padding: "8px 12px", width: "10%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>SOCIAL</th>
                        <th style={{ padding: "8px 12px", width: "15%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>CADASTRADO POR</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>ORIGEM</th>
                        <th style={{ padding: "8px 12px", width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {pagedContacts.map((c, i) => (
                        <tr
                          key={c.id}
                          style={{ borderBottom: i < pagedContacts.length - 1 ? "1px solid #E2E8F0" : "none", background: "white" }}
                        >
                          <td style={{ paddingLeft: 44, paddingRight: 8, paddingTop: 10, paddingBottom: 10, width: 44 }}>
                            <div style={{ flexShrink: 0, width: 16, height: 16 }} />
                          </td>
                          <td style={{ padding: "10px 12px", width: "15%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input
                                type="checkbox"
                                style={{ borderRadius: 4 }}
                                checked={selectedContacts.has(c.id)}
                                onChange={() => toggleOne(c.id)}
                              />
                              <span
                                onClick={() => setEditingContact(c)}
                                style={{ color: "#FF5F39", fontWeight: 600, cursor: "pointer" }}
                              >
                                {c.name}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#333", width: "15%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.role}</td>
                          <td style={{ padding: "10px 12px", color: "#555", width: "15%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</td>
                          <td style={{ padding: "10px 12px", color: "#555", width: "10%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.phone}</td>
                          <td style={{ padding: "10px 12px", color: "#555", width: "10%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.birthdate || "—"}</td>
                          <td style={{ padding: "10px 12px", width: "10%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {[
                                { title: "LinkedIn", href: c.linkedin },
                                { title: "Instagram", href: c.instagram },
                                { title: "X", href: c.twitter },
                              ].map(({ title, href }) => (
                                <a
                                  key={title}
                                  href={href ? `https://${href}` : "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={title}
                                  onClick={(e) => !href && e.preventDefault()}
                                  style={{ color: href ? "#FF5F39" : "#A0AEC0", opacity: 1, transition: "opacity 0.15s", display: "inline-flex" }}
                                >
                                  {title === "LinkedIn" && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <rect x="1" y="1" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                      <path d="M7 10v7M7 7.5v.01M11 17v-4c0-1.1.9-2 2-2s2 .9 2 2v4M11 10v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                  {title === "Instagram" && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                                    </svg>
                                  )}
                                  {title === "X" && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                      <path d="M4 4l16 16M4 20L20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    </svg>
                                  )}
                                </a>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#555", width: "15%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.registeredBy || "—"}</td>
                          <td style={{ padding: "10px 12px", color: "#555" }}>{c.origin}</td>
                          <td style={{ padding: "10px 12px", width: 40 }}>
                            <ContactActionsMenu onEdit={() => setEditingContact(c)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination footer */}
              {filtered.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderTop: "1px solid #E2E8F0", background: "white" }}>
                  <span style={{ fontSize: 12, color: "#9B9B9B" }}>
                    Mostrando {(contactPage - 1) * CONTACT_PAGE_SIZE + 1}–{Math.min(contactPage * CONTACT_PAGE_SIZE, filtered.length)} de {filtered.length} contatos
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      onClick={() => setContactPage((p) => Math.max(1, p - 1))}
                      disabled={contactPage === 1}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: contactPage === 1 ? "#F7F8FB" : "white", color: contactPage === 1 ? "#CBD5E0" : "#212A46", cursor: contactPage === 1 ? "default" : "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      ‹ Anterior
                    </button>
                    {Array.from({ length: Math.min(totalContactPages, 7) }, (_, i) => {
                      let pg = i + 1;
                      if (totalContactPages > 7) {
                        if (contactPage <= 4) pg = i + 1;
                        else if (contactPage >= totalContactPages - 3) pg = totalContactPages - 6 + i;
                        else pg = contactPage - 3 + i;
                      }
                      return (
                        <button
                          key={pg}
                          onClick={() => setContactPage(pg)}
                          style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #E2E8F0", background: contactPage === pg ? "#FF5F39" : "white", color: contactPage === pg ? "white" : "#212A46", cursor: "pointer", fontSize: 12, fontWeight: contactPage === pg ? 700 : 500 }}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setContactPage((p) => Math.min(totalContactPages, p + 1))}
                      disabled={contactPage === totalContactPages}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: contactPage === totalContactPages ? "#F7F8FB" : "white", color: contactPage === totalContactPages ? "#CBD5E0" : "#212A46", cursor: contactPage === totalContactPages ? "default" : "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      Próxima ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Dossiê tab ── */}
          {activeTab === "dossie" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid #E2E8F0" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#212A46" }}>Dossiê de {account.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setShowDossieContatoModal(true)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "#212A46", fontSize: 12, fontWeight: 700, color: "white", border: "none", cursor: "pointer", boxShadow: "none" }}
                  >
                    <Plus size={14} />
                    <span>Dossiê de Contato</span>
                  </button>
                  <button
                    onClick={() => setShowDossieModal(true)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "#FF5F39", fontSize: 12, fontWeight: 700, color: "white", border: "none", cursor: "pointer", boxShadow: "none" }}
                  >
                    <Plus size={14} />
                    <span>Dossiê de Conta</span>
                  </button>
                </div>
              </div>
              <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
                {dossiers.map((d) => (
                  <ExpandableDossierCard
                    key={d.id}
                    dossier={d}
                    account={account}
                    onDelete={() => setDossiers((prev) => prev.filter((x) => x.id !== d.id))}
                  />
                ))}
                {dossiers.length === 0 && (
                  <p style={{ textAlign: "center", color: "#9B9B9B", fontSize: 13, padding: "24px 0" }}>
                    Nenhum dossiê cadastrado para esta conta.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Organograma tab ── */}
          {activeTab === "organograma" && (
            <OrgChart contacts={account.contactsList} onEditContact={(c) => setEditingContact(c)} />
          )}

          {/* ── Plays tab ── */}
          {activeTab === "plays" && (
            <PlaysTab account={account} onOpenPlay={onOpenPlay} />
          )}

        </div>
        {editingContact && (
          <ContactEditDrawer
            contact={editingContact}
            onClose={() => setEditingContact(null)}
            onSave={() => setEditingContact(null)}
          />
        )}
        {showDossieModal && (
          <DossieCreateModal
            account={account}
            onClose={() => setShowDossieModal(false)}
          />
        )}
        {showDossieContatoModal && (
          <DossieContatoModal
            accountName={account.name}
            availableContacts={account.contactsList.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              email: c.email,
            }))}
            onClose={() => setShowDossieContatoModal(false)}
          />
        )}
        {editingDossie && editingDossie.kind === "contato" && (
          <DossieContatoModal
            accountName={account.name}
            availableContacts={account.contactsList.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              email: c.email,
            }))}
            onClose={() => setEditingDossie(null)}
          />
        )}
        {editingDossie && editingDossie.kind === "conta" && (
          <DossieCreateModal
            account={account}
            onClose={() => setEditingDossie(null)}
          />
        )}
      </td>
    </tr>
  );
}

// ─── Account row in main table ────────────────────────────────────────────────

function AccountRow({
  account,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onContactSelectionChange,
  onOpenPlay,
  onSelectAccount,
  onEditAccount,
  onDeleteAccount,
}: {
  account: AccountDetail;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onContactSelectionChange?: (ids: Set<number>) => void;
  onOpenPlay?: (accountId: string, playId: string) => void;
  onSelectAccount: (account: AccountDetail) => void;
  onEditAccount: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <>
      <tr
        onClick={() => onSelectAccount(account)}
        style={{
          borderBottom: "1px solid #E2E8F0",
          background: isExpanded ? "#FFF7F5" : "white",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >        <td style={{ padding: "12px 8px 12px 24px", width: 44 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: 4, cursor: "pointer" }}
          />
        </td>
        <td style={{ padding: "12px", width: "20%" }} onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: isExpanded ? "#FF5F39" : "#9B9B9B", transition: "color 0.15s" }}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
            <span style={{ fontWeight: 600, color: "#212A46", fontSize: 13 }}>{account.name}</span>
          </div>
        </td>
        <td style={{ padding: "12px", fontSize: 13, color: "#555" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={13} style={{ color: "#9B9B9B" }} />
            <span>{account.contacts}</span>
          </div>
        </td>
        <td style={{ padding: "12px", fontSize: 13, color: "#555" }}>
          <span style={{ fontWeight: 600, color: "#212A46" }}>{(account as any).dossierCount ?? "—"}</span>
        </td>
        <td style={{ padding: "12px", fontSize: 13, color: "#555" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={13} style={{ color: "#F59E0B" }} />
            <span style={{ fontWeight: 600, color: "#212A46" }}>{(account as any).playsAtivas ?? account.playsCreated}</span>
          </div>
        </td>
        <td style={{ padding: "12px", fontSize: 13, color: "#555" }}>
          {account.industry || <span style={{ color: "#CBD5E0" }}>—</span>}
        </td>
        <td style={{ padding: "12px", fontSize: 13 }}>
          {account.website ? (
            <a
              href={account.website.startsWith("http") ? account.website : `https://${account.website}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#2563EB", display: "flex", alignItems: "center", gap: 4 }}
            >
              <ExternalLink size={12} />
              <span style={{ fontSize: 12 }}>{account.website}</span>
            </a>
          ) : (
            <span style={{ color: "#CBD5E0" }}>—</span>
          )}
        </td>
        <td style={{ padding: "12px", fontSize: 13, color: "#555" }}>
          {account.registeredBy || "—"}
        </td>
        <td style={{ padding: "12px", fontSize: 13, color: "#555" }}>
          <span
            style={{
              borderRadius: 6,
              background: account.origin === "RD" ? "#EFF6FF" : "#F0FDF4",
              color: account.origin === "RD" ? "#2563EB" : "#16A34A",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
            }}
          >
            {account.origin}
          </span>
        </td>
        <td style={{ padding: "12px", width: 40 }} onClick={(e) => e.stopPropagation()}>
          <AccountActionsMenu onEdit={onEditAccount} onDelete={onDeleteAccount} />
        </td>
      </tr>
      {isExpanded && <ContactsPanel account={account} onContactSelectionChange={onContactSelectionChange} onOpenPlay={onOpenPlay} />}
    </>
  );
}

// ─── Segments section mock data ───────────────────────────────────────────────

type SegmentContact = {
  id: number;
  name: string;
  role: string;
  company: string;
  email: string;
  registeredBy?: string;
};

type Segment = {
  id: number;
  name: string;
  color: string;
  description: string;
  contacts: SegmentContact[];
};

const mockSegments: Segment[] = [
  {
    id: 1,
    name: "Enterprise LATAM",
    color: "#2563EB",
    description: "Contas enterprise da América Latina com alto potencial de expansão.",
    contacts: [
      { id: 17, name: "Miguel Salabarez",  role: "CEO",               company: "Nubank",        email: "miguel.salabarez@nubank.com.br", registeredBy: "Admin" },
      { id: 35, name: "Felipe Neto",       role: "COO",               company: "Nubank",        email: "felipe.neto@nubank.com.br", registeredBy: "Admin" },
      { id: 13, name: "Pedro Alves",       role: "CEO",               company: "Maestro ABM",   email: "pedro@maestroabm.com", registeredBy: "Admin" },
      { id: 15, name: "Thiago Costa",      role: "CTO",               company: "Maestro ABM",   email: "thiago@maestroabm.com", registeredBy: "Admin" },
      { id: 1,  name: "Alexandra Gutmann", role: "Global Usability R.", company: "Empresa teste", email: "mer133@gmail.com", registeredBy: "Admin" },
    ],
  },
  {
    id: 2,
    name: "Fintech Brasil",
    color: "#16A34A",
    description: "Empresas do setor financeiro com atuação no mercado brasileiro.",
    contacts: [
      { id: 19, name: "Mariana Oliveira",  role: "CFO",               company: "Nubank",        email: "mariana.oliveira@nubank.com.br", registeredBy: "Editor" },
      { id: 47, name: "Sérgio Monteiro",   role: "VP de Tecnologia",  company: "Nubank",        email: "sergio.monteiro@nubank.com.br", registeredBy: "Admin" },
      { id: 49, name: "Marcelo Andrade",   role: "Diretor Comercial", company: "Nubank",        email: "marcelo.andrade@nubank.com.br", registeredBy: "Admin" },
      { id: 12, name: "Eduardo Ferreira",  role: "VP de Vendas",      company: "Empresa teste", email: "edu.ferreira@gmail.com", registeredBy: "Editor" },
    ],
  },
  {
    id: 3,
    name: "Alto potencial Q2",
    color: "#D97706",
    description: "Contas priorizadas para fechamento no segundo trimestre.",
    contacts: [
      { id: 25, name: "Rafael Brito",      role: "VP de Produto",     company: "Nubank",        email: "rafael.brito@nubank.com.br", registeredBy: "Admin" },
      { id: 26, name: "Camila Teixeira",   role: "Product Manager",   company: "Nubank",        email: "camila.teixeira@nubank.com.br", registeredBy: "Admin" },
      { id: 14, name: "Sofia Ramos",       role: "Head de Marketing", company: "Maestro ABM",   email: "sofia@maestroabm.com", registeredBy: "Admin" },
      { id: 16, name: "Laura Neves",       role: "Analista de Vendas", company: "Maestro ABM",  email: "laura@maestroabm.com", registeredBy: "Admin" },
      { id: 11, name: "Daisy Hartmann",    role: "Product Manager",   company: "Empresa teste", email: "daisy.h@gmail.com", registeredBy: "Admin" },
    ],
  },
];

// ─── Segment row actions menu ──────────────────────────────────────────────────

function SegmentActionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        title="Opções"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setShowConfirmDelete(false); }}
        style={{ color: "#848484", background: "none", border: "none", cursor: "pointer", boxShadow: "none", padding: 0 }}
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <>
          <div
            onClick={() => { setOpen(false); setShowConfirmDelete(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
            background: "white", borderRadius: 10, border: "1px solid #E2E8F0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden",
          }}>
            {!showConfirmDelete ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 16px", background: "none", border: "none",
                    fontSize: 13, color: "#212A46", cursor: "pointer", textAlign: "left",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FB")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <Pencil size={14} style={{ color: "#6B7280" }} />
                  Editar segmento
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); alert('Exportação em desenvolvimento'); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 16px", background: "none", border: "none",
                    fontSize: 13, color: "#212A46", cursor: "pointer", textAlign: "left",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FB")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <Download size={14} style={{ color: "#6B7280" }} />
                  Exportar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(true); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 16px", background: "none", border: "none",
                    fontSize: 13, color: "#EF4444", cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </>
            ) : (
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#212A46", fontWeight: 600 }}>Confirmar exclusão?</p>
                <p style={{ margin: 0, fontSize: 11, color: "#9B9B9B" }}>Esta ação não pode ser desfeita.</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
                    style={{ flex: 1, background: "#EF4444", color: "white", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Excluir
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); }}
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
  );
}

// ─── SegmentTableRows: isolated component to avoid React.Fragment + injected props ───
function SegmentTableRows({
  seg,
  isExpanded,
  isSelected,
  onToggleSelect,
  onToggleExpand,
  onConfirmDelete,
  onEditContact,
  onEditSegment,
}: {
  seg: Segment;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onConfirmDelete: () => void;
  onEditContact: (contact: SegmentContact) => void;
  onEditSegment: () => void;
}) {
  const companies = Array.from(new Set(seg.contacts.map((c) => c.company)));

  return (
    <>
      <tr
        style={{ borderBottom: isExpanded ? "none" : "1px solid #E2E8F0", background: isSelected ? "#FFF7F5" : isExpanded ? "#FFF7F5" : "white", cursor: "pointer", transition: "background 0.15s" }}
        onClick={onToggleExpand}
      >
        <td style={{ padding: "12px 8px 12px 24px", width: 44 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            style={{ borderRadius: 4, cursor: "pointer" }}
          />
        </td>
        <td style={{ padding: "12px", width: "15%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: isExpanded ? "#FF5F39" : "#9B9B9B", display: "flex", transition: "color 0.15s" }}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: "#212A46", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seg.name}</span>
          </div>
        </td>
        <td style={{ padding: "12px", color: "#6B7280", fontSize: 12, width: "20%" }}>
          <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {seg.description || <span style={{ color: "#CBD5E0" }}>—</span>}
          </span>
        </td>
        <td style={{ padding: "12px", width: "15%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={13} style={{ color: "#9B9B9B" }} />
            <span style={{ fontWeight: 600, color: "#212A46" }}>{seg.contacts.length}</span>
          </div>
        </td>
        <td style={{ padding: "12px", width: "40%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {companies.map((c) => (
              <span key={c} style={{ borderRadius: 6, background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: "2px 7px" }}>{c}</span>
            ))}
            {companies.length === 0 && <span style={{ color: "#CBD5E0", fontSize: 12 }}>—</span>}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            <div style={{ background: "#F7F8FB", borderTop: "1px solid #FDE8E1", borderLeft: "4px solid " + seg.color }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderBottom: "1px solid #E2E8F0", background: "white" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#212A46" }}>{seg.name}</span>
                  <span style={{ borderRadius: 9999, background: "rgba(255,95,57,0.1)", color: "#FF5F39", fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{seg.contacts.length} contatos</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {companies.map((c) => (
                    <span key={c} style={{ borderRadius: 6, background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: "2px 7px" }}>{c}</span>
                  ))}
                </div>
              </div>
              {seg.contacts.length === 0 ? (
                <div style={{ padding: "28px 0", textAlign: "center", color: "#9B9B9B", fontSize: 13 }}>
                  Nenhum contato neste segmento ainda.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", minWidth: 600, tableLayout: "fixed" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                        <th style={{ padding: "8px 12px 8px 44px", width: "15%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>NOME</th>
                        <th style={{ padding: "8px 12px", width: "20%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>CARGO</th>
                        <th style={{ padding: "8px 12px", width: "15%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>EMPRESA</th>
                        <th style={{ padding: "8px 12px", width: "25%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>E-MAIL</th>
                        <th style={{ padding: "8px 12px", width: "20%", textAlign: "left", color: "#212A46", fontWeight: 700, fontSize: 12 }}>CADASTRADO POR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seg.contacts.map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: i < seg.contacts.length - 1 ? "1px solid #E2E8F0" : "none", background: "white" }}>
                          <td style={{ padding: "10px 12px 10px 44px", width: "15%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <span
                              onClick={(e) => { e.stopPropagation(); onEditContact(c); }}
                              style={{ color: "#FF5F39", fontWeight: 600, cursor: "pointer" }}
                            >
                              {c.name}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#555", width: "20%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.role}</td>
                          <td style={{ padding: "10px 12px", width: "15%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            <span style={{ borderRadius: 6, background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: "2px 7px" }}>{c.company}</span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#555", width: "25%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</td>
                          <td style={{ padding: "10px 12px", color: "#555", width: "20%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.registeredBy || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SegmentsSection({
  segments,
  setSegments,
  onOpenPlay,
  onDeleteTarget,
}: {
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  onOpenPlay?: (accountId: string, playId: string) => void;
  onDeleteTarget: (target: { type: "segments"; ids: number[] } | { type: "segment"; id: number }) => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#FF5F39");
  const [segSearch, setSegSearch] = useState("");
  const [selectedSegIds, setSelectedSegIds] = useState<Set<number>>(new Set());
  const [segPage, setSegPage] = useState(1);
  const [segPageSize, setSegPageSize] = useState(10);
  const [editingContact, setEditingContact] = useState<any | null>(null);

  // ── Filter & Sort State ──
  type SegSortKey = "name-asc" | "name-desc" | "contacts-desc" | "contacts-asc" | "companies-desc";
  const [sortKey, setSortKey] = useState<SegSortKey>("name-asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterHasContacts, setFilterHasContacts] = useState<boolean | null>(null);

  const filteredSegs = segments.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(segSearch.toLowerCase()) || s.description?.toLowerCase().includes(segSearch.toLowerCase());
    if (!matchSearch) return false;
    if (filterHasContacts === true && s.contacts.length === 0) return false;
    if (filterHasContacts === false && s.contacts.length > 0) return false;
    return true;
  }).sort((a, b) => {
    switch (sortKey) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "contacts-desc": return b.contacts.length - a.contacts.length;
      case "contacts-asc": return a.contacts.length - b.contacts.length;
      case "companies-desc": return new Set(b.contacts.map(c => c.company)).size - new Set(a.contacts.map(c => c.company)).size;
      default: return 0;
    }
  });

  const activeFilterCount = filterHasContacts !== null ? 1 : 0;

  const segTotalPages = Math.max(1, Math.ceil(filteredSegs.length / segPageSize));
  const pagedSegs = filteredSegs.slice((segPage - 1) * segPageSize, segPage * segPageSize);

  const allFilteredSelected = pagedSegs.length > 0 && pagedSegs.every((s) => selectedSegIds.has(s.id));
  const someFilteredSelected = pagedSegs.some((s) => selectedSegIds.has(s.id)) && !allFilteredSelected;

  const toggleAllSegs = () => {
    if (allFilteredSelected) {
      setSelectedSegIds((prev) => {
        const next = new Set(prev);
        pagedSegs.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedSegIds((prev) => {
        const next = new Set(prev);
        pagedSegs.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const toggleOneSeg = (id: number) => {
    setSelectedSegIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = (id: number) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    setSelectedSegIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    if (expandedId === id) setExpandedId(null);
  };

  const handleDeleteSelected = () => {
    setSegments((prev) => prev.filter((s) => !selectedSegIds.has(s.id)));
    if (expandedId !== null && selectedSegIds.has(expandedId)) setExpandedId(null);
    setSelectedSegIds(new Set());
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    setSegments((prev) => [
      ...prev,
      { id: Date.now(), name: newName.trim(), color: newColor, description: newDesc.trim(), contacts: [] },
    ]);
    setNewName(""); setNewDesc(""); setNewColor("#FF5F39");
    setShowCreate(false);
  };

  return (
    <div style={{ marginTop: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#212A46", margin: 0 }}>Segmentos</h2>
          <p style={{ fontSize: 13, color: "#9B9B9B", margin: "4px 0 0 0" }}>
            {filteredSegs.length} segmento{filteredSegs.length !== 1 ? "s" : ""} encontrado{filteredSegs.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && (
              <span style={{ color: "#FF5F39", marginLeft: 6 }}>
                ({activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""} ativo{activeFilterCount !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white" }}>
            <Search size={13} style={{ color: "#9B9B9B" }} />
            <input
              value={segSearch}
              onChange={(e) => setSegSearch(e.target.value)}
              placeholder="Buscar segmento..."
              style={{ outline: "none", background: "transparent", fontSize: 12, width: 140, color: "#333" }}
            />
          </div>

          {/* ── FILTROS button + dropdown ── */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setFilterOpen((o) => !o); setSortOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8,
                border: `1px solid ${filterOpen || activeFilterCount > 0 ? "#FF5F39" : "#CBD5E0"}`,
                background: filterOpen || activeFilterCount > 0 ? "#FFF1EC" : "white",
                fontSize: 13, fontWeight: 600,
                color: filterOpen || activeFilterCount > 0 ? "#FF5F39" : "#6B7280",
                cursor: "pointer", boxShadow: "none", transition: "all 0.15s",
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span style={{
                  background: "#FF5F39", color: "white", borderRadius: 9999,
                  fontSize: 11, fontWeight: 700, padding: "1px 6px", marginLeft: 2,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setFilterOpen(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                  background: "white", borderRadius: 12, border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.13)", width: 280, padding: "16px 0 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 12px", borderBottom: "1px solid #F1F5F9" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#212A46" }}>Filtros</span>
                    {activeFilterCount > 0 && (
                      <button onClick={() => { setFilterHasContacts(null); setSegPage(1); }} style={{ fontSize: 12, color: "#FF5F39", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                        Limpar tudo
                      </button>
                    )}
                  </div>

                  <div style={{ padding: "12px 16px 8px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status de Contatos</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {([true, false] as const).map((v) => (
                        <button
                          key={String(v)}
                          onClick={() => { setFilterHasContacts(filterHasContacts === v ? null : v); setSegPage(1); }}
                          style={{
                            flex: 1, padding: "6px 0", borderRadius: 7,
                            border: `1px solid ${filterHasContacts === v ? "#FF5F39" : "#E2E8F0"}`,
                            background: filterHasContacts === v ? "#FFF1EC" : "white",
                            color: filterHasContacts === v ? "#FF5F39" : "#6B7280",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
                          }}
                        >
                          {v ? "Com contatos" : "Vazio"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: "12px 16px 0", borderTop: "1px solid #F1F5F9" }}>
                    <button
                      onClick={() => setFilterOpen(false)}
                      style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", background: "#FF5F39", color: "white", fontSize: 13, fontWeight: 700 }}
                    >
                      Aplicar filtros
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── ORDENAR button + dropdown ── */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setSortOpen((o) => !o); setFilterOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8,
                border: `1px solid ${sortOpen || sortKey !== "name-asc" ? "#FF5F39" : "#CBD5E0"}`,
                background: sortOpen || sortKey !== "name-asc" ? "#FFF1EC" : "white",
                fontSize: 13, fontWeight: 600,
                color: sortOpen || sortKey !== "name-asc" ? "#FF5F39" : "#6B7280",
                cursor: "pointer", boxShadow: "none", transition: "all 0.15s",
              }}
            >
              <ArrowUpDown size={14} />
              <span>
                {sortKey === "name-asc" ? "Ordenar" :
                 sortKey === "name-desc" ? "Nome Z → A" :
                 sortKey === "contacts-desc" ? "Mais contatos" :
                 sortKey === "contacts-asc" ? "Menos contatos" :
                 "Mais empresas"}
              </span>
            </button>

            {sortOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setSortOpen(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                  background: "white", borderRadius: 12, border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.13)", width: 220, padding: "8px 0",
                }}>
                  <p style={{ margin: "0", padding: "4px 16px 10px", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F1F5F9" }}>
                    Ordenar por
                  </p>
                  {[
                    { key: "name-asc", label: "Nome A → Z" },
                    { key: "name-desc", label: "Nome Z → A" },
                    { key: "contacts-desc", label: "Mais contatos" },
                    { key: "contacts-asc", label: "Menos contatos" },
                    { key: "companies-desc", label: "Mais empresas" }
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortKey(opt.key as SegSortKey); setSortOpen(false); setSegPage(1); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "9px 16px",
                        background: sortKey === opt.key ? "#FFF1EC" : "white",
                        border: "none", cursor: "pointer", fontSize: 13,
                        color: sortKey === opt.key ? "#FF5F39" : "#212A46",
                        fontWeight: sortKey === opt.key ? 700 : 400,
                        textAlign: "left", transition: "background 0.1s",
                      }}
                    >
                      <span>{opt.label}</span>
                      {sortKey === opt.key && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5F39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#D5D9E6", fontSize: 13, fontWeight: 700, color: "#212A46", border: "none", cursor: "pointer", boxShadow: "none" }}
          >
            <Download size={14} />
            <span>Exportar</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#FF5F39", fontSize: 13, fontWeight: 700, color: "white", border: "none", cursor: "pointer", boxShadow: "none" }}
          >
            <Plus size={14} />
            <span>Novo segmento</span>
          </button>
          {(() => {
            const hasAny = selectedSegIds.size > 0;
            const label = hasAny ? `Excluir (${selectedSegIds.size})` : "Excluir";
            const tip = hasAny ? label : "Selecione ao menos um segmento para excluir";
            return (
              <button
                disabled={!hasAny}
                title={tip}
                onClick={() => onDeleteTarget({ type: "segments", ids: Array.from(selectedSegIds) })}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8,
                  border: "none", fontSize: 13, fontWeight: 700, boxShadow: "none",
                  background: hasAny ? "#EF4444" : "#F1F3F9",
                  color: hasAny ? "white" : "#B0BAD3",
                  cursor: hasAny ? "pointer" : "not-allowed",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Trash2 size={14} />
                <span>{label}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Create modal inline */}
      {showCreate && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 299, background: "rgba(0,0,0,0.25)" }} onClick={() => setShowCreate(false)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 300, background: "white", borderRadius: 14, padding: 28, width: 420, boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#212A46" }}>Novo segmento</h3>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Nome *</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Decisores Fintech"
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13, border: "1px solid #E2E8F0", borderRadius: 7, outline: "none", marginBottom: 14, color: "#212A46" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#FF5F39")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
            />
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Descrição</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Objetivo deste segmento..."
              rows={2}
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 7, outline: "none", resize: "none", fontFamily: "inherit", color: "#6B7280", marginBottom: 14 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#FF5F39")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
            />
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Cor</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
              {["#FF5F39","#2563EB","#16A34A","#D97706","#7C3AED","#DB2777"].map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: newColor === c ? "3px solid #212A46" : "2px solid transparent", cursor: "pointer", padding: 0, boxShadow: "none" }}
                />
              ))}
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} style={{ width: 22, height: 22, border: "none", borderRadius: "50%", cursor: "pointer", padding: 0, background: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", fontSize: 13, color: "#6B7280", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleCreate} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "#FF5F39", fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer" }}>
                Criar segmento
              </button>
            </div>
          </div>
        </>
      )}

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#FAFBFD" }}>
              <th style={{ padding: "12px 8px 12px 24px", width: 44, textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={(el) => { if (el) el.indeterminate = someFilteredSelected; }}
                  onChange={toggleAllSegs}
                  style={{ borderRadius: 4, cursor: "pointer" }}
                />
              </th>
              <th style={{ padding: "12px", width: "15%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>SEGMENTO</th>
              <th style={{ padding: "12px", width: "20%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>DESCRIÇÃO</th>
              <th style={{ padding: "12px", width: "15%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>CONTATOS</th>
              <th style={{ padding: "12px", width: "40%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>EMPRESAS</th>
            </tr>
          </thead>
          <tbody>
            {filteredSegs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "32px 0", textAlign: "center", color: "#9B9B9B", fontSize: 13 }}>
                  {segSearch ? "Nenhum segmento encontrado." : "Nenhum segmento cadastrado."}
                </td>
              </tr>
            )}
            {pagedSegs.map((seg) => (
              <SegmentTableRows
                key={seg.id}
                seg={seg}
                isExpanded={expandedId === seg.id}
                isSelected={selectedSegIds.has(seg.id)}
                onToggleSelect={() => toggleOneSeg(seg.id)}
                onToggleExpand={() => setExpandedId(expandedId === seg.id ? null : seg.id)}
                onConfirmDelete={() => onDeleteTarget({ type: "segment", id: seg.id })}
                onEditContact={(c) => setEditingContact(c)}
                onEditSegment={() => alert('Edição de segmento em desenvolvimento')}
              />
            ))}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #E2E8F0", background: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#9B9B9B" }}>Linhas por página:</span>
            <select
              value={segPageSize}
              onChange={(e) => { setSegPageSize(Number(e.target.value)); setSegPage(1); }}
              style={{
                border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 24px 4px 8px",
                fontSize: 12, color: "#212A46", background: "white", cursor: "pointer",
                outline: "none", boxShadow: "none",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center",
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#9B9B9B" }}>
              Mostrando {filteredSegs.length === 0 ? 0 : (segPage - 1) * segPageSize + 1}–{Math.min(segPage * segPageSize, filteredSegs.length)} de {filteredSegs.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setSegPage((p) => Math.max(1, p - 1))}
              disabled={segPage === 1}
              style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px", background: "white", cursor: segPage === 1 ? "not-allowed" : "pointer", color: segPage === 1 ? "#CBD5E0" : "#212A46", boxShadow: "none" }}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: segTotalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setSegPage(p)}
                style={{
                  border: p === segPage ? "none" : "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: "4px 10px",
                  background: p === segPage ? "#FF5F39" : "white",
                  color: p === segPage ? "white" : "#212A46",
                  fontWeight: p === segPage ? 700 : 400,
                  cursor: "pointer",
                  fontSize: 12,
                  boxShadow: "none",
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setSegPage((p) => Math.min(segTotalPages, p + 1))}
              disabled={segPage === segTotalPages}
              style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px", background: "white", cursor: segPage === segTotalPages ? "not-allowed" : "pointer", color: segPage === segTotalPages ? "#CBD5E0" : "#212A46", boxShadow: "none" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      {editingContact && (
        <ContactEditDrawer
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={() => setEditingContact(null)}
        />
      )}
    </div>
  );
}

// ─── Main AccountsPage component ──────────────────────────────────────────────

type SortKey = "name-asc" | "name-desc" | "contacts-desc" | "contacts-asc" | "plays-desc" | "dossiers-desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name-asc",       label: "Nome A → Z" },
  { key: "name-desc",      label: "Nome Z → A" },
  { key: "contacts-desc",  label: "Mais contatos" },
  { key: "contacts-asc",   label: "Menos contatos" },
  { key: "plays-desc",     label: "Mais plays ativas" },
  { key: "dossiers-desc",  label: "Mais dossiês" },
];

function applySortAndFilter(
  accounts: AccountDetail[],
  industries: Set<string>,
  origins: Set<string>,
  hasPlays: boolean | null,
  searchQuery: string,
  sortKey: SortKey,
) {
  let list = [...accounts];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter((a) => a.name.toLowerCase().includes(q));
  }
  if (industries.size) list = list.filter((a) => a.industry && industries.has(a.industry));
  if (origins.size)    list = list.filter((a) => a.origin && origins.has(a.origin));
  if (hasPlays === true)  list = list.filter((a) => ((a as any).playsAtivas ?? a.playsCreated) > 0);
  if (hasPlays === false) list = list.filter((a) => ((a as any).playsAtivas ?? a.playsCreated) === 0);
  list.sort((a, b) => {
    switch (sortKey) {
      case "name-asc":      return a.name.localeCompare(b.name);
      case "name-desc":     return b.name.localeCompare(a.name);
      case "contacts-desc": return b.contacts - a.contacts;
      case "contacts-asc":  return a.contacts - b.contacts;
      case "plays-desc":    return ((b as any).playsAtivas ?? b.playsCreated) - ((a as any).playsAtivas ?? a.playsCreated);
      case "dossiers-desc": return ((b as any).dossierCount ?? 0) - ((a as any).dossierCount ?? 0);
      default:              return 0;
    }
  });
  return list;
}

function ConfirmDeleteModal({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: "fixed", inset: 0, background: "rgba(33,42,70,0.4)", zIndex: 1100, backdropFilter: "blur(2px)" }}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 400, maxWidth: "90vw", background: "white", borderRadius: 16, zIndex: 1200,
          boxShadow: "0 24px 64px rgba(33,42,70,0.22)", padding: 24,
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "#212A46" }}>{title}</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6B7280", lineHeight: 1.5 }}>{description}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #CBD5E0", background: "white", color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#EF4444", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Excluir
          </button>
        </div>
      </div>
    </>
  );
}

export function AccountsPage({ onOpenPlay }: { onOpenPlay?: (accountId: string, playId: string) => void }) {
  const [accounts, setAccounts] = useState<AccountDetail[]>(mockAccounts);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<AccountDetail | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountDetail | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: "account"; id: number } | { type: "bulk" } | { type: "segments"; ids: number[] } | { type: "segment"; id: number } | null>(null);

  const handleUpdateAccount = (updatedAccount: AccountDetail) => {
    setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
    if (selectedAccountForDetail && selectedAccountForDetail.id === updatedAccount.id) {
      setSelectedAccountForDetail(updatedAccount);
    }
    setEditingAccount(null);
  };

  const confirmDelete = () => {
    if (deleteTarget?.type === "account") {
      const id = deleteTarget.id;
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      setSelectedAccounts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (expandedId === id) setExpandedId(null);
    } else if (deleteTarget?.type === "bulk") {
      setAccounts(prev => prev.filter(acc => !selectedAccounts.has(acc.id)));
      setSelectedAccounts(new Set());
      setSelectedContacts(new Set());
    } else if (deleteTarget?.type === "segment") {
      setSegments(prev => prev.filter(s => s.id !== deleteTarget.id));
    } else if (deleteTarget?.type === "segments") {
      const ids = new Set(deleteTarget.ids);
      setSegments(prev => prev.filter(s => !ids.has(s.id)));
    }
    setDeleteTarget(null);
  };

  if (selectedAccountForDetail) {
    return (
      <AccountDetailPage
        account={selectedAccountForDetail}
        onBack={() => setSelectedAccountForDetail(null)}
        onUpdate={handleUpdateAccount}
      />
    );
  }

  const ALL_INDUSTRIES = Array.from(new Set(accounts.map((a) => a.industry).filter(Boolean))).sort() as string[];
  const ALL_ORIGINS    = Array.from(new Set(accounts.map((a) => a.origin).filter(Boolean))).sort() as string[];

  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [segments, setSegments] = useState<Segment[]>(mockSegments);
  
  const [activeTab, setActiveTab] = useState<"contas" | "segmentos">("contas");
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSaveAccount = (data: any) => {
    const newAccount: AccountDetail = {
      id: Math.max(0, ...accounts.map(a => a.id)) + 1,
      name: data.name,
      industry: data.industry,
      website: data.website,
      origin: data.origin,
      playsCreated: 0,
      contacts: 0,
      contactsList: [],
      ...({
        playsAtivas: 0,
        dossierCount: 0,
        registeredBy: "Admin",
      } as any)
    };
    setAccounts([newAccount, ...accounts]);
    setIsCreateModalOpen(false);
  };

  // ── Filter state ──
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterIndustries, setFilterIndustries] = useState<Set<string>>(new Set());
  const [filterOrigins, setFilterOrigins]       = useState<Set<string>>(new Set());
  const [filterHasPlays, setFilterHasPlays]     = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery]           = useState("");

  // ── Sort state ──
  const [sortOpen, setSortOpen] = useState(false);
  const [sortKey, setSortKey]   = useState<SortKey>("name-asc");

  const activeFilterCount =
    filterIndustries.size + filterOrigins.size + (filterHasPlays !== null ? 1 : 0);

  const clearFilters = () => {
    setFilterIndustries(new Set());
    setFilterOrigins(new Set());
    setFilterHasPlays(null);
    setPage(1);
  };

  const toggleIndustry = (v: string) => {
    setFilterIndustries((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
    setPage(1);
  };
  const toggleOrigin = (v: string) => {
    setFilterOrigins((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });
    setPage(1);
  };

  const filteredSorted = applySortAndFilter(
    accounts, filterIndustries, filterOrigins, filterHasPlays, searchQuery, sortKey,
  );

  const totalPages = Math.ceil(filteredSorted.length / pageSize);
  const paged = filteredSorted.slice((page - 1) * pageSize, page * pageSize);

  const allSelected = paged.length > 0 && paged.every((a) => selectedAccounts.has(a.id));
  const someSelected = paged.some((a) => selectedAccounts.has(a.id)) && !allSelected;

  const toggleAllAccounts = () => {
    if (allSelected) {
      setSelectedAccounts((prev) => {
        const next = new Set(prev);
        paged.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedAccounts((prev) => {
        const next = new Set(prev);
        paged.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const toggleOneAccount = (id: number) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Ordenar";

  return (
    <div style={{ padding: "24px 32px 24px 18px", flex: 1, overflowY: "auto", background: "#F7F8FB" }}>
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Confirmar exclusão?"
          description={
            deleteTarget.type === "account" || deleteTarget.type === "segment"
              ? "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
              : "Tem certeza que deseja excluir os itens selecionados? Esta ação não pode ser desfeita."
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {/* Tabs */}
      <div style={{ display: "flex", gap: 24, marginBottom: 24, borderBottom: "1px solid #E2E8F0" }}>
        <button
          onClick={() => setActiveTab("contas")}
          style={{
            padding: "0 4px 12px", background: "none", border: "none",
            borderBottom: activeTab === "contas" ? "2px solid #FF5F39" : "2px solid transparent",
            color: activeTab === "contas" ? "#212A46" : "#6B7280",
            fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
          }}
        >
          Contas ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab("segmentos")}
          style={{
            padding: "0 4px 12px", background: "none", border: "none",
            borderBottom: activeTab === "segmentos" ? "2px solid #FF5F39" : "2px solid transparent",
            color: activeTab === "segmentos" ? "#212A46" : "#6B7280",
            fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
          }}
        >
          Segmentos ({segments.length})
        </button>
      </div>

      {activeTab === "contas" ? (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#212A46", margin: 0 }}>Contas</h1>
          <p style={{ fontSize: 13, color: "#9B9B9B", margin: "4px 0 0 0" }}>
            {filteredSorted.length} conta{filteredSorted.length !== 1 ? "s" : ""} encontrada{filteredSorted.length !== 1 ? "s" : ""}
            {activeFilterCount > 0 && (
              <span style={{ color: "#FF5F39", marginLeft: 6 }}>
                ({activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""} ativo{activeFilterCount !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          {/* ── SEARCH ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white" }}>
            <Search size={13} style={{ color: "#9B9B9B" }} />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Buscar conta..."
              style={{ outline: "none", background: "transparent", fontSize: 12, width: 140, color: "#333" }}
            />
          </div>

          {/* ── FILTROS button + dropdown ── */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setFilterOpen((o) => !o); setSortOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8,
                border: `1px solid ${filterOpen || activeFilterCount > 0 ? "#FF5F39" : "#CBD5E0"}`,
                background: filterOpen || activeFilterCount > 0 ? "#FFF1EC" : "white",
                fontSize: 13, fontWeight: 600,
                color: filterOpen || activeFilterCount > 0 ? "#FF5F39" : "#6B7280",
                cursor: "pointer", boxShadow: "none", transition: "all 0.15s",
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span style={{
                  background: "#FF5F39", color: "white", borderRadius: 9999,
                  fontSize: 11, fontWeight: 700, padding: "1px 6px", marginLeft: 2,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setFilterOpen(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                  background: "white", borderRadius: 12, border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.13)", width: 280, padding: "16px 0 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 12px", borderBottom: "1px solid #F1F5F9" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#212A46" }}>Filtros</span>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} style={{ fontSize: 12, color: "#FF5F39", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                        Limpar tudo
                      </button>
                    )}
                  </div>

                  {ALL_INDUSTRIES.length > 0 && (
                    <div style={{ padding: "12px 16px 8px" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Setor</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {ALL_INDUSTRIES.map((ind) => (
                          <label
                            key={ind}
                            onClick={() => toggleIndustry(ind)}
                            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "5px 8px", borderRadius: 7, background: filterIndustries.has(ind) ? "#FFF1EC" : "transparent", transition: "background 0.12s" }}
                          >
                            <div style={{
                              width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${filterIndustries.has(ind) ? "#FF5F39" : "#CBD5E0"}`,
                              background: filterIndustries.has(ind) ? "#FF5F39" : "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {filterIndustries.has(ind) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span style={{ fontSize: 13, color: "#212A46" }}>{ind}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ padding: "12px 16px 8px", borderTop: ALL_INDUSTRIES.length > 0 ? "1px solid #F1F5F9" : undefined }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Origem</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {ALL_ORIGINS.map((orig) => (
                        <label
                          key={orig}
                          onClick={() => toggleOrigin(orig)}
                          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "5px 8px", borderRadius: 7, background: filterOrigins.has(orig) ? "#FFF1EC" : "transparent", transition: "background 0.12s" }}
                        >
                          <div style={{
                            width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                            border: `2px solid ${filterOrigins.has(orig) ? "#FF5F39" : "#CBD5E0"}`,
                            background: filterOrigins.has(orig) ? "#FF5F39" : "white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {filterOrigins.has(orig) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ fontSize: 13, color: "#212A46" }}>{orig}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: "12px 16px 8px", borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Plays ativas</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {([true, false] as const).map((v) => (
                        <button
                          key={String(v)}
                          onClick={() => { setFilterHasPlays(filterHasPlays === v ? null : v); setPage(1); }}
                          style={{
                            flex: 1, padding: "6px 0", borderRadius: 7,
                            border: `1px solid ${filterHasPlays === v ? "#FF5F39" : "#E2E8F0"}`,
                            background: filterHasPlays === v ? "#FFF1EC" : "white",
                            color: filterHasPlays === v ? "#FF5F39" : "#6B7280",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.12s",
                          }}
                        >
                          {v ? "Com plays" : "Sem plays"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: "12px 16px 0", borderTop: "1px solid #F1F5F9" }}>
                    <button
                      onClick={() => setFilterOpen(false)}
                      style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", background: "#FF5F39", color: "white", fontSize: 13, fontWeight: 700 }}
                    >
                      Aplicar filtros
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── ORDENAR button + dropdown ── */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setSortOpen((o) => !o); setFilterOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8,
                border: `1px solid ${sortOpen || sortKey !== "name-asc" ? "#FF5F39" : "#CBD5E0"}`,
                background: sortOpen || sortKey !== "name-asc" ? "#FFF1EC" : "white",
                fontSize: 13, fontWeight: 600,
                color: sortOpen || sortKey !== "name-asc" ? "#FF5F39" : "#6B7280",
                cursor: "pointer", boxShadow: "none", transition: "all 0.15s",
              }}
            >
              <ArrowUpDown size={14} />
              <span>{sortKey !== "name-asc" ? currentSortLabel : "Ordenar"}</span>
            </button>

            {sortOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setSortOpen(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                  background: "white", borderRadius: 12, border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.13)", width: 220, padding: "8px 0",
                }}>
                  <p style={{ margin: "0", padding: "4px 16px 10px", fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F1F5F9" }}>
                    Ordenar por
                  </p>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortKey(opt.key); setSortOpen(false); setPage(1); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "9px 16px",
                        background: sortKey === opt.key ? "#FFF1EC" : "white",
                        border: "none", cursor: "pointer", fontSize: 13,
                        color: sortKey === opt.key ? "#FF5F39" : "#212A46",
                        fontWeight: sortKey === opt.key ? 700 : 400,
                        textAlign: "left", transition: "background 0.1s",
                      }}
                    >
                      <span>{opt.label}</span>
                      {sortKey === opt.key && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5F39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#D5D9E6", fontSize: 13, fontWeight: 700, color: "#212A46", border: "none", cursor: "pointer", boxShadow: "none" }}
          >
            <Download size={14} />
            <span>Exportar</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#FF5F39", fontSize: 13, fontWeight: 700, color: "white", border: "none", cursor: "pointer", boxShadow: "none" }}
          >
            <Plus size={14} />
            <span>Nova conta</span>
          </button>
          {(() => {
            const hasAny = selectedAccounts.size > 0 || selectedContacts.size > 0;
            const parts: string[] = [];
            if (selectedAccounts.size > 0) parts.push(`${selectedAccounts.size} empresa${selectedAccounts.size !== 1 ? "s" : ""}`);
            if (selectedContacts.size > 0) parts.push(`${selectedContacts.size} contato${selectedContacts.size !== 1 ? "s" : ""}`);
            const label = hasAny ? `Excluir (${parts.join(", ")})` : "Excluir";
            const tip = hasAny ? label : "Selecione ao menos uma empresa ou contato para excluir";
            return (
              <button
                disabled={!hasAny}
                title={tip}
                onClick={() => setDeleteTarget({ type: "bulk" })}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8,
                  border: "none", fontSize: 13, fontWeight: 700, boxShadow: "none",
                  background: hasAny ? "#EF4444" : "#F1F3F9",
                  color: hasAny ? "white" : "#B0BAD3",
                  cursor: hasAny ? "pointer" : "not-allowed",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Trash2 size={14} />
                <span>{label}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#FAFBFD" }}>
              <th style={{ padding: "12px 8px 12px 24px", width: 44, textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAllAccounts}
                  style={{ borderRadius: 4, cursor: "pointer" }}
                />
              </th>
              <th style={{ padding: "12px", width: "15%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>EMPRESA</th>
              <th style={{ padding: "12px", width: "8%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>CONTATOS</th>
              <th style={{ padding: "12px", width: "8%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>DOSSIÊS</th>
              <th style={{ padding: "12px", width: "10%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>PLAYS ATIVAS</th>
              <th style={{ padding: "12px", width: "15%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>SETOR</th>
              <th style={{ padding: "12px", width: "15%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>WEBSITE</th>
              <th style={{ padding: "12px", width: "15%", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>CADASTRADO POR</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: 700, color: "#212A46", fontSize: 12 }}>ORIGEM</th>
              <th style={{ padding: "12px", width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "32px 0", textAlign: "center", color: "#9B9B9B", fontSize: 13 }}>
                  Nenhuma conta encontrada.
                </td>
              </tr>
            ) : (
              paged.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  isExpanded={expandedId === account.id}
                  isSelected={selectedAccounts.has(account.id)}
                  onToggleExpand={() => {
                    const closing = expandedId === account.id;
                    if (closing) setSelectedContacts(new Set());
                    setExpandedId(closing ? null : account.id);
                  }}
                  onToggleSelect={() => toggleOneAccount(account.id)}
                  onContactSelectionChange={(ids) => setSelectedContacts(new Set(ids))}
                  onOpenPlay={onOpenPlay}
                  onSelectAccount={setSelectedAccountForDetail}
                  onEditAccount={() => setEditingAccount(account)}
                  onDeleteAccount={() => setDeleteTarget({ type: "account", id: account.id })}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #E2E8F0", background: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#9B9B9B" }}>Linhas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{
                border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 24px 4px 8px",
                fontSize: 12, color: "#212A46", background: "white", cursor: "pointer",
                outline: "none", boxShadow: "none",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center",
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#9B9B9B" }}>
              Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredSorted.length)} de {filteredSorted.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px", background: "white", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#CBD5E0" : "#212A46", boxShadow: "none" }}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  border: p === page ? "none" : "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: "4px 10px",
                  background: p === page ? "#FF5F39" : "white",
                  color: p === page ? "white" : "#212A46",
                  fontWeight: p === page ? 700 : 400,
                  cursor: "pointer",
                  fontSize: 12,
                  boxShadow: "none",
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 10px", background: "white", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#CBD5E0" : "#212A46", boxShadow: "none" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      </div>
      ) : (
        <SegmentsSection
          segments={segments}
          setSegments={setSegments}
          onOpenPlay={onOpenPlay}
          onDeleteTarget={setDeleteTarget}
        />
      )}

      {isCreateModalOpen && (
        <AccountCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleSaveAccount}
        />
      )}

      {editingAccount && (
        <AccountEditDrawer
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleUpdateAccount}
        />
      )}
    </div>
  );
}