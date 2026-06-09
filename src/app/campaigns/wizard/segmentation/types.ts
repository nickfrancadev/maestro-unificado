// Shared types for the segmentation wizard step.

export interface FacetItem {
  id: string;
  label: string;
  urn?: string;
  subtitle?: string;
  domain?: string;
  logoUrl?: string;
  employeeCount?: string;
  industry?: string;
}

export interface FacetSelection {
  included: FacetItem[];
  excluded: FacetItem[];
}

// Facetas de pessoa — aplicadas por conjunto de anúncio (conta).
// "locations" é obrigatória: cada conta efetiva precisa de >=1.
export interface PersonTargeting {
  locations: FacetSelection;
  seniorities: FacetSelection;
  jobFunctions: FacetSelection;
  jobTitles: FacetSelection;
  yearsOfExperience: FacetSelection;
}

// Estado da segmentação. `companies` é a lista de contas; cada conta
// É um conjunto de anúncio. As facetas de pessoa vivem em `defaultTargeting`
// ("Padrão — todas as contas") e podem ser sobrescritas por conta em
// `overrides` (chave = FacetItem.id da conta).
export interface TargetingData {
  companies: FacetSelection;
  defaultTargeting: PersonTargeting;
  overrides: Record<string, PersonTargeting>;
}
