import { loadAccounts } from './accounts';

/** Looks up a registered person's name by email (accounts are stored in this browser). */
export function makeNameLookup(): (email: string) => string | undefined {
  const names = new Map<string, string>();
  for (const a of loadAccounts()) names.set(a.email.toLowerCase(), a.name);
  return (email) => names.get(email.toLowerCase());
}
