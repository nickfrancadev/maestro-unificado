// LinkedIn Marketing API — barrel re-export.
//
// All implementation lives in src/lib/linkedin/<domain>.ts. This file
// preserves the original import surface so existing callers
// (`import { ... } from '../lib/linkedin'`) keep working.

export * from './linkedin/oauth';
export * from './linkedin/targeting';
export * from './linkedin/campaigns';
export * from './linkedin/analytics';
export * from './linkedin/adAccounts';
export * from './linkedin/maestroCampaigns';
export * from './linkedin/creativeUpload';
