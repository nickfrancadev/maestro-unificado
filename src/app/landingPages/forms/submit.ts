// Form submission handling — creates/updates a Contact linked to an Account
// from a landing-page form submission. Dedup identity is exact email
// (case-insensitive) ONLY — a shared domain never merges two people into one
// Contact (ABM buying committees are distinct contacts on the same account).
// Domain is used only to associate a new contact with a known account when no
// explicit accountId was supplied. Persists a FormSubmission via the
// tracking store.
import { saveSubmission } from '../store/tracking';
import { listAccounts } from '../store/accounts';

export interface Contact {
  email: string;
  firstName?: string;
  accountId: string | null;
}

const CK = 'maestro.landingPages.contacts.v1';

function read<T>(key: string): T[] {
  try {
    return JSON.parse(globalThis.localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}
function write<T>(key: string, rows: T[]): void {
  globalThis.localStorage.setItem(key, JSON.stringify(rows));
}

export function listContacts(): Contact[] {
  return read<Contact>(CK);
}
export function saveContacts(contacts: Contact[]): void {
  write(CK, contacts);
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

// Exact-email match ONLY — this is the sole identity key for a Contact.
function findMatch(email: string, existing: Contact[]): Contact | undefined {
  const lowerEmail = email.toLowerCase();
  return existing.find((c) => c.email.toLowerCase() === lowerEmail);
}

// Looks up a known account by the submitted email's domain, for ACCOUNT
// ASSOCIATION only — never used for contact identity/merge decisions.
function accountIdForDomain(email: string): string | null {
  const domain = emailDomain(email);
  if (!domain) return null;
  const account = listAccounts().find((a) => a.domain.toLowerCase() === domain);
  return account ? account.id : null;
}

export function handleSubmit(
  landingPageId: string,
  accountId: string | null,
  fields: Record<string, string>,
  existing: Contact[],
): { contact: Contact; deduped: boolean } {
  const email = fields.email ?? '';
  const firstName = fields.firstName ?? fields.name;
  const match = findMatch(email, existing);
  const domainAccountId = accountIdForDomain(email);

  const contact: Contact = match
    ? {
        ...match,
        firstName: firstName || match.firstName,
        accountId: accountId ?? domainAccountId ?? match.accountId,
      }
    : { email, firstName, accountId: accountId ?? domainAccountId ?? null };

  saveSubmission({ landingPageId, accountId, fields });

  return { contact, deduped: !!match };
}
