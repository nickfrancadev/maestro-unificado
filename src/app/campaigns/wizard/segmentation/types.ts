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

// Full state of the targeting step. Keys mirror the LinkedIn facet
// names used as the values in facetTypeMap and FACET_URN_MAP.
export interface TargetingData {
  companies: FacetSelection;
  locations: FacetSelection;
  seniorities: FacetSelection;
  jobFunctions: FacetSelection;
  jobTitles: FacetSelection;
  industries: FacetSelection;
  companySizes: FacetSelection;
  yearsOfExperience: FacetSelection;
}
