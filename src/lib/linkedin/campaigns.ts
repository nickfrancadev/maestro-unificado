// Campaign lifecycle: 7 discrete server actions + the orchestrator
// that runs them in sequence. Each action POSTs /linkedin/campaigns
// with an action discriminator; the server handles retry, idempotency
// and audit logging.

import { SERVER_BASE, headers } from './client';

export type CampaignAction =
  | 'create-campaign-group'
  | 'create-campaign'
  | 'upload-image'
  | 'create-creative'
  | 'activate'
  | 'pause'
  | 'archive';

export type CampaignStepStatus = 'pending' | 'running' | 'success' | 'error';

export interface CampaignStepResult {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  // returned ids vary by action
  campaign_group_id?: string;
  linkedin_campaign_id?: string;
  asset_urn?: string;
  creative_id?: string;
}

// Generic dispatcher — every action posts to the same endpoint.
async function campaignAction(
  action: CampaignAction,
  payload: Record<string, any>,
): Promise<CampaignStepResult> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/campaigns`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action, ...payload }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[LinkedIn] ${action} failed (${response.status}):`, data);
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return { success: true, ...data };
  } catch (err: any) {
    console.error(`[LinkedIn] ${action} network error:`, err);
    return { success: false, error: err.message };
  }
}

// --- Action 1: Create Campaign Group ---
export interface CreateCampaignGroupParams {
  campaign_id: string;
  ad_account_id: string;
  name: string;
  budget_type?: 'daily' | 'total';
  budget_amount?: number;
  currency?: string;
  start_date?: string;
}

export async function createCampaignGroup(
  params: CreateCampaignGroupParams,
): Promise<CampaignStepResult> {
  return campaignAction('create-campaign-group', params);
}

// --- Action 2: Create Campaign (with full targeting) ---
export interface CreateCampaignParams {
  campaign_id: string;
  campaign_group_id: string;
  ad_account_id: string;
  name: string;
  objective?: string;
  // Full targetingCriteria from SegmentationStep.buildTargetingCriteria()
  targeting_criteria: any;
  budget_type?: 'daily' | 'total';
  budget_amount?: number;
  currency?: string;
  cost_type?: 'CPM' | 'CPC' | 'CPV';
  bid_amount?: number;
  unit_cost?: { amount: string; currency_code: string };
  start_date?: string;
  end_date?: string;
  auto_activate?: boolean;
  bidding_strategy?: string;
}

export async function createCampaign(params: CreateCampaignParams): Promise<CampaignStepResult> {
  return campaignAction('create-campaign', params);
}

// --- Action 3a: Upload Image ---
export interface UploadImageParams {
  campaign_id: string;
  image_url: string;
  ad_account_id: string;
}

export async function uploadCreativeImage(
  params: UploadImageParams,
): Promise<CampaignStepResult> {
  return campaignAction('upload-image', params);
}

// --- Action 3b: Create Creative ---
export interface CreateCreativeParams {
  campaign_id: string;
  linkedin_campaign_id: string;
  ad_account_id: string;
  asset_urn?: string;
  headline?: string;
  description?: string;
  cta?: string;
  landing_page_url?: string;
}

export async function createCreative(params: CreateCreativeParams): Promise<CampaignStepResult> {
  return campaignAction('create-creative', params);
}

// --- Action 4: Activate Campaign ---
export interface ActivateCampaignParams {
  campaign_id: string;
  linkedin_campaign_id: string;
}

export async function activateCampaign(
  params: ActivateCampaignParams,
): Promise<CampaignStepResult> {
  return campaignAction('activate', params);
}

// --- Action 5: Pause Campaign ---
export interface PauseCampaignParams {
  campaign_id: string;
  linkedin_campaign_id: string;
}

export async function pauseCampaign(params: PauseCampaignParams): Promise<CampaignStepResult> {
  return campaignAction('pause', params);
}

// --- Action 6: Archive (Delete) Campaign ---
export interface ArchiveCampaignParams {
  campaign_id: string;
  linkedin_campaign_id: string;
}

export async function archiveCampaign(
  params: ArchiveCampaignParams,
): Promise<CampaignStepResult> {
  return campaignAction('archive', params);
}

// --- Full pipeline orchestrator (calls all steps in sequence) ---
export interface CampaignPipelineParams {
  campaign_id: string;
  ad_account_id: string;
  group_name: string;
  campaign_name: string;
  objective: string;
  targeting_criteria: any;
  budget_type: 'daily' | 'total';
  budget_amount: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  cost_type?: 'CPM' | 'CPC' | 'CPV';
  campaign_type?: string;
  unit_cost?: { amount: string; currency_code: string };
  bidding_strategy?: string;
  bid_amount?: number;
  image_url?: string;
  headline?: string;
  description?: string;
  cta?: string;
  landing_page_url?: string;
  auto_activate?: boolean;
  // If provided, skip Campaign Group creation and reuse this ID.
  existing_campaign_group_id?: string;
}

export type PipelineStep = {
  action: CampaignAction;
  label: string;
  status: CampaignStepStatus;
  result?: CampaignStepResult;
};

export async function runCampaignPipeline(
  params: CampaignPipelineParams,
  onProgress: (steps: PipelineStep[]) => void,
): Promise<{ success: boolean; steps: PipelineStep[] }> {
  const campaignId = params.campaign_id;
  const steps: PipelineStep[] = [
    { action: 'create-campaign-group', label: 'Criar Campaign Group', status: 'pending' },
    { action: 'create-campaign', label: 'Criar Campanha com Targeting', status: 'pending' },
  ];

  if (params.image_url) {
    steps.push({ action: 'upload-image', label: 'Upload de Imagem', status: 'pending' });
    steps.push({ action: 'create-creative', label: 'Criar Criativo', status: 'pending' });
  }

  if (params.auto_activate) {
    steps.push({ action: 'activate', label: 'Ativar Campanha', status: 'pending' });
  }

  const notify = () => onProgress([...steps]);
  notify();

  // Step 1: Campaign Group
  let resolvedGroupId = params.existing_campaign_group_id || '';

  if (!params.existing_campaign_group_id) {
    steps[0].status = 'running';
    notify();
    const cgResult = await createCampaignGroup({
      campaign_id: campaignId,
      ad_account_id: params.ad_account_id,
      name: params.group_name,
      budget_type: params.budget_type,
      budget_amount: params.budget_amount,
      currency: params.currency,
      start_date: params.start_date,
    });
    steps[0].result = cgResult;
    steps[0].status = cgResult.success ? 'success' : 'error';
    notify();
    if (!cgResult.success) return { success: false, steps };
    resolvedGroupId = cgResult.campaign_group_id!;
  } else {
    steps[0].status = 'success';
    steps[0].result = { success: true, campaign_group_id: params.existing_campaign_group_id };
    notify();
  }

  // Step 2: Campaign
  steps[1].status = 'running';
  notify();
  const campResult = await createCampaign({
    campaign_id: campaignId,
    campaign_group_id: resolvedGroupId,
    ad_account_id: params.ad_account_id,
    name: params.campaign_name,
    objective: params.objective,
    targeting_criteria: params.targeting_criteria,
    budget_type: params.budget_type,
    budget_amount: params.budget_amount,
    currency: params.currency,
    cost_type: params.cost_type,
    bid_amount: params.bid_amount,
    unit_cost: params.unit_cost,
    start_date: params.start_date,
    end_date: params.end_date,
    auto_activate: params.auto_activate,
    bidding_strategy: params.bidding_strategy,
  });
  steps[1].result = campResult;
  steps[1].status = campResult.success ? 'success' : 'error';
  notify();
  if (!campResult.success) return { success: false, steps };

  let stepIdx = 2;

  // Step 3a: Upload Image (optional)
  if (params.image_url) {
    steps[stepIdx].status = 'running';
    notify();
    const imgResult = await uploadCreativeImage({
      campaign_id: campaignId,
      image_url: params.image_url,
      ad_account_id: params.ad_account_id,
    });
    steps[stepIdx].result = imgResult;
    steps[stepIdx].status = imgResult.success ? 'success' : 'error';
    notify();
    if (!imgResult.success) return { success: false, steps };
    stepIdx++;

    // Step 3b: Create Creative
    steps[stepIdx].status = 'running';
    notify();
    const crResult = await createCreative({
      campaign_id: campaignId,
      linkedin_campaign_id: campResult.linkedin_campaign_id!,
      ad_account_id: params.ad_account_id,
      asset_urn: imgResult.asset_urn,
      headline: params.headline,
      description: params.description,
      cta: params.cta,
      landing_page_url: params.landing_page_url,
    });
    steps[stepIdx].result = crResult;
    steps[stepIdx].status = crResult.success ? 'success' : 'error';
    notify();
    if (!crResult.success) return { success: false, steps };
    stepIdx++;
  }

  // Step 4: Activate (optional)
  if (params.auto_activate) {
    steps[stepIdx].status = 'running';
    notify();
    const actResult = await activateCampaign({
      campaign_id: campaignId,
      linkedin_campaign_id: campResult.linkedin_campaign_id!,
    });
    steps[stepIdx].result = actResult;
    steps[stepIdx].status = actResult.success ? 'success' : 'error';
    notify();
    if (!actResult.success) return { success: false, steps };
  }

  return { success: true, steps };
}
