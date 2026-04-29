// 200 fictitious contacts for stress-testing a large account

const FIRST_NAMES = [
  "Ana", "Pedro", "Carlos", "Mariana", "João", "Sofia", "Lucas", "Fernanda",
  "Rafael", "Beatriz", "Guilherme", "Camila", "André", "Larissa", "Diego",
  "Juliana", "Mateus", "Gabriela", "Felipe", "Amanda", "Leonardo", "Isabela",
  "Bruno", "Carolina", "Thiago", "Letícia", "Eduardo", "Natália", "Alexandre",
  "Victor", "Patrícia", "Renato", "Cristiane", "Rodrigo", "Tatiane", "Fábio",
  "Adriana", "Henrique", "Monica", "Leandro", "Vanessa", "Marcelo", "Débora",
  "Paulo", "Simone", "Roberto", "Cláudia", "Sérgio", "Aline", "Priscila",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Costa", "Rodrigues", "Ferreira",
  "Alves", "Pereira", "Lima", "Carvalho", "Melo", "Ribeiro", "Barbosa",
  "Castro", "Gomes", "Martins", "Nunes", "Cunha", "Pinto", "Machado",
  "Moreira", "Correia", "Cardoso", "Andrade", "Freitas", "Mendes", "Campos",
  "Vieira", "Rocha", "Monteiro", "Teixeira", "Fonseca", "Guimarães", "Araújo",
  "Lopes", "Ramos", "Cruz", "Mendonça", "Borges", "Dias", "Pires", "Bastos",
];

const ROLES = [
  "CEO", "CTO", "CFO", "CMO", "COO",
  "VP de Vendas", "VP de Marketing", "VP de Produto", "VP de Tecnologia",
  "Head de Vendas", "Head de Marketing", "Head de Tecnologia", "Head de Produto",
  "Head de Operações", "Head de RH", "Head de Financeiro",
  "Diretor Comercial", "Diretor de TI", "Diretor de Projetos",
  "Gerente Comercial", "Gerente de Marketing", "Gerente de TI",
  "Gerente de Projetos", "Gerente de Produto",
  "Analista de Vendas", "Analista de Marketing", "Analista de Dados",
  "Analista de TI", "Analista Financeiro",
  "Executivo de Contas", "Executivo de Vendas",
  "Consultor de Vendas", "Consultor de Negócios",
  "Especialista de Produto", "Especialista em Dados",
  "Coordenador de Marketing", "Coordenador Comercial",
  "Desenvolvedor Senior", "Desenvolvedor Pleno",
  "Designer UX", "Designer UI",
  "Product Manager", "Product Owner",
  "Scrum Master", "Agile Coach",
  "DevOps Engineer", "Engenheiro de Software",
  "Arquiteto de Soluções", "Cientista de Dados",
  "Estrategista de Conteúdo", "SDR",
];

const ORIGINS = ["RD", "Maestro", "LinkedIn", "Indicação", "Evento", "Outbound", "HubSpot", "Inbound"];

const BIRTHDATES: (string | undefined)[] = [
  "12-03-1978", "05-07-1985", "22-11-1990", "14-02-1982", "30-09-1995",
  "01-01-1988", "17-06-1993", "08-04-1980", "25-12-1975", "11-08-1998",
  undefined, undefined, undefined, undefined, undefined,
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function genPhone(i: number) {
  const ddd = 11 + (i % 89);
  const num = 90000000 + (i * 137 % 9999999);
  return `(${ddd}) 9${pad(Math.floor(num / 1000000))}${pad(Math.floor((num % 1000000) / 10000))}-${pad(Math.floor((num % 10000) / 100))}${pad(num % 100)}`;
}

function slugify(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".");
}

function genEmail(name: string, i: number) {
  const slug = slugify(name);
  const domains = ["gmail.com", "outlook.com", "yahoo.com.br", "empresa.com.br", "hotmail.com", "corporate.com"];
  return `${slug}${i}@${domains[i % domains.length]}`;
}

export interface LargeContact {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  birthdate: string | undefined;
  linkedin: string;
  instagram: string;
  twitter: string;
  origin: string;
}

const usedNames = new Set<string>();

export const contacts200: LargeContact[] = Array.from({ length: 200 }, (_, i) => {
  const idx = i + 1;
  // Ensure unique names by appending index when collision occurs
  let firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  let lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
  let name = `${firstName} ${lastName}`;
  if (usedNames.has(name)) {
    const extra = LAST_NAMES[(Math.floor(i / FIRST_NAMES.length) + 1) % LAST_NAMES.length];
    name = `${firstName} ${extra} ${lastName}`;
  }
  usedNames.add(name);

  const slug = slugify(name).replace(/\./g, "");
  const role = ROLES[i % ROLES.length];
  const origin = ORIGINS[i % ORIGINS.length];
  const birthdate = BIRTHDATES[i % BIRTHDATES.length];

  return {
    id: 1000 + idx,
    name,
    role,
    email: genEmail(name, idx),
    phone: genPhone(idx),
    birthdate,
    linkedin: `linkedin.com/in/${slug}${idx}`,
    instagram: `instagram.com/${slug}${idx}`,
    twitter: `x.com/${slug}${idx}`,
    origin,
  };
});
