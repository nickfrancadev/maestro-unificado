// Static option lists from the LinkedIn ad-targeting taxonomy.
// These are stable IDs/URNs assigned by LinkedIn, not mock data —
// they identify the seniority levels, job functions, company sizes
// and experience ranges available for campaign targeting.
//
// Labels are the user-visible Portuguese display names (UI lives in PT).

import type { FacetItem } from './types';

export const SENIORITY_OPTIONS: FacetItem[] = [
  { id: '1', label: 'Unpaid', urn: 'urn:li:seniority:1' },
  { id: '2', label: 'Training', urn: 'urn:li:seniority:2' },
  { id: '3', label: 'Entry', urn: 'urn:li:seniority:3' },
  { id: '4', label: 'Senior', urn: 'urn:li:seniority:4' },
  { id: '5', label: 'Manager', urn: 'urn:li:seniority:5' },
  { id: '6', label: 'Director', urn: 'urn:li:seniority:6' },
  { id: '7', label: 'VP', urn: 'urn:li:seniority:7' },
  { id: '8', label: 'CXO', urn: 'urn:li:seniority:8' },
  { id: '9', label: 'Partner', urn: 'urn:li:seniority:9' },
  { id: '10', label: 'Owner', urn: 'urn:li:seniority:10' },
];

export const JOB_FUNCTION_OPTIONS: FacetItem[] = [
  { id: '1', label: 'Contabilidade', urn: 'urn:li:function:1' },
  { id: '2', label: 'Administração', urn: 'urn:li:function:2' },
  { id: '3', label: 'Artes e Design', urn: 'urn:li:function:3' },
  { id: '4', label: 'Desenvolvimento de Negócios', urn: 'urn:li:function:4' },
  { id: '5', label: 'Serviços Comunitários e Sociais', urn: 'urn:li:function:5' },
  { id: '6', label: 'Consultoria', urn: 'urn:li:function:6' },
  { id: '7', label: 'Educação', urn: 'urn:li:function:7' },
  { id: '8', label: 'Engenharia', urn: 'urn:li:function:8' },
  { id: '9', label: 'Empreendedorismo', urn: 'urn:li:function:9' },
  { id: '10', label: 'Finanças', urn: 'urn:li:function:10' },
  { id: '11', label: 'Saúde', urn: 'urn:li:function:11' },
  { id: '12', label: 'Recursos Humanos', urn: 'urn:li:function:12' },
  { id: '13', label: 'Tecnologia da Informação', urn: 'urn:li:function:13' },
  { id: '14', label: 'Jurídico', urn: 'urn:li:function:14' },
  { id: '15', label: 'Marketing', urn: 'urn:li:function:15' },
  { id: '16', label: 'Mídia e Comunicação', urn: 'urn:li:function:16' },
  { id: '17', label: 'Militar e Serviços de Proteção', urn: 'urn:li:function:17' },
  { id: '18', label: 'Operações', urn: 'urn:li:function:18' },
  { id: '19', label: 'Product Management', urn: 'urn:li:function:19' },
  { id: '20', label: 'Gestão de Programas e Projetos', urn: 'urn:li:function:20' },
  { id: '21', label: 'Compras', urn: 'urn:li:function:21' },
  { id: '22', label: 'Qualidade', urn: 'urn:li:function:22' },
  { id: '23', label: 'Imobiliário', urn: 'urn:li:function:23' },
  { id: '24', label: 'Pesquisa', urn: 'urn:li:function:24' },
  { id: '25', label: 'Vendas', urn: 'urn:li:function:25' },
  { id: '26', label: 'Suporte', urn: 'urn:li:function:26' },
];

export const EXPERIENCE_OPTIONS: FacetItem[] = [
  { id: '1', label: '1 ano', urn: 'urn:li:yearsOfExperience:1' },
  { id: '2', label: '2 anos', urn: 'urn:li:yearsOfExperience:2' },
  { id: '3', label: '3 anos', urn: 'urn:li:yearsOfExperience:3' },
  { id: '4', label: '4 anos', urn: 'urn:li:yearsOfExperience:4' },
  { id: '5', label: '5 anos', urn: 'urn:li:yearsOfExperience:5' },
  { id: '6', label: '6 anos', urn: 'urn:li:yearsOfExperience:6' },
  { id: '7', label: '7 anos', urn: 'urn:li:yearsOfExperience:7' },
  { id: '8', label: '8 anos', urn: 'urn:li:yearsOfExperience:8' },
  { id: '9', label: '9 anos', urn: 'urn:li:yearsOfExperience:9' },
  { id: '10', label: '10 anos', urn: 'urn:li:yearsOfExperience:10' },
  { id: '11', label: '11 anos', urn: 'urn:li:yearsOfExperience:11' },
  { id: '12', label: '12+ anos', urn: 'urn:li:yearsOfExperience:12' },
];
