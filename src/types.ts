export type OwnershipType = 'Owned' | 'Managed';
export type DomainStatus = 'Active' | 'Inactive' | 'Transferred';
export type RenewalIntention = 'Renew' | 'Let expire';
export type SupportedCurrency = 'USD' | 'GBP' | 'EUR' | 'INR' | 'CNY' | 'JPY' | 'CAD';

export interface DomainRecord {
  id: string;
  name: string; // normalized lowercased domain, e.g. "example.com"
  registrar: string;
  ownership: OwnershipType;
  status: DomainStatus;
  registrationDate?: string | null; // YYYY-MM-DD
  renewalDate: string; // YYYY-MM-DD
  cost: number | null;
  currency: SupportedCurrency;
  autoRenew: boolean;
  renewalIntention: RenewalIntention;
  notes?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  calendarEventId?: string | null;
  tasksTaskId?: string | null;
}

export interface AppSettings {
  defaultCurrency: SupportedCurrency;
  reminderOffsets: number[]; // e.g. [30, 14, 7, 1]
  excludeLetExpireFromExpectedSpending: boolean;
}

export interface StorageData {
  version: number;
  appName?: string;
  updatedAt?: string;
  domains: DomainRecord[];
  settings: AppSettings;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CandidateDomain {
  id: string;
  name: string;
  registrar: string | null;
  registrationDate: string | null;
  renewalDate: string | null;
  cost: number | null;
  currency: SupportedCurrency;
  transactionType: string;
  confidence: 'high' | 'medium' | 'low';
  sourceSnippet?: string;
  status: 'pending' | 'accepted' | 'ignored';
  alreadyTracked?: boolean;
  existingDomainId?: string;
}

export interface GoogleAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken?: string;
}

export type ConflictStrategy = 'skip' | 'replace' | 'merge';
