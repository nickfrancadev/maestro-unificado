// Form submission handling — creates/updates a Contact linked to an Account
// from a landing-page form submission, deduping by email (case-insensitive)
// or domain, and persists a FormSubmission via the tracking store.
import { saveSubmission } from '../store/tracking';

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

function findMatch(email: string, existing: Contact[]): Contact | undefined {
  const lowerEmail = email.toLowerCase();
  const domain = emailDomain(email);
  return existing.find((c) => {
    if (c.email.toLowerCase() === lowerEmail) return true;
    if (domain && emailDomain(c.email) === domain) return true;
    return false;
  });
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

  const contact: Contact = match
    ? { ...match, firstName: firstName ?? match.firstName, accountId: accountId ?? match.accountId }
    : { email, firstName, accountId };

  saveSubmission({ landingPageId, accountId, fields });

  return { contact, deduped: !!match };
}
