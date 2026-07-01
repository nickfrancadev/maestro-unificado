export interface PageEvent {
  id: string; landingPageId: string; accountId: string | null;
  type: 'page_view' | 'scroll_depth' | 'cta_click' | 'form_start' | 'form_submit';
  value?: number; ts: string;
}
export interface FormSubmission {
  id: string; landingPageId: string; accountId: string | null;
  fields: Record<string, string>; ts: string;
}
export interface IntentAlert {
  id: string; landingPageId: string; accountId: string; reason: string; ts: string;
}

function read<T>(key: string): T[] {
  try { return JSON.parse(globalThis.localStorage.getItem(key) ?? '[]'); } catch { return []; }
}
function write<T>(key: string, rows: T[]): void { globalThis.localStorage.setItem(key, JSON.stringify(rows)); }
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(performance.now())}`;

const EK = 'maestro.landingPages.events.v1';
const SK = 'maestro.landingPages.submissions.v1';
const AK = 'maestro.landingPages.alerts.v1';

export function logEvent(e: Omit<PageEvent, 'id' | 'ts'>): void {
  const rows = read<PageEvent>(EK);
  rows.push({ ...e, id: uid('ev'), ts: new Date().toISOString() });
  write(EK, rows);
}
export function listEvents(landingPageId?: string): PageEvent[] {
  const rows = read<PageEvent>(EK);
  return landingPageId ? rows.filter((r) => r.landingPageId === landingPageId) : rows;
}
export function saveSubmission(s: Omit<FormSubmission, 'id' | 'ts'>): void {
  const rows = read<FormSubmission>(SK);
  rows.push({ ...s, id: uid('sub'), ts: new Date().toISOString() });
  write(SK, rows);
}
export function listSubmissions(): FormSubmission[] { return read<FormSubmission>(SK); }
export function saveAlert(a: Omit<IntentAlert, 'id' | 'ts'>): void {
  const rows = read<IntentAlert>(AK);
  rows.push({ ...a, id: uid('al'), ts: new Date().toISOString() });
  write(AK, rows);
}
export function listAlerts(): IntentAlert[] { return read<IntentAlert>(AK); }
