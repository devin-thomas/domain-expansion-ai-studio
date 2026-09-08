import { DomainRecord, SupportedCurrency } from '../types';

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  INR: '₹',
  CNY: '¥',
  JPY: '¥',
  CAD: 'CA$',
};

export const COMMON_REGISTRARS = [
  'Cloudflare',
  'Namecheap',
  'Porkbun',
  'Name.com',
  'GoDaddy',
  'Google Domains / Squarespace',
  'Dynadot',
  'Gandi',
  'AWS Route 53',
  'Hover',
  'Hostinger',
  'OVHcloud',
];

/**
 * Normalizes a domain name:
 * - Trims whitespace
 * - Converts to lower case
 * - Strips protocol (http://, https://)
 * - Strips port numbers and URL paths/queries
 */
export function normalizeDomain(input: string): string {
  if (!input) return '';
  let domain = input.trim().toLowerCase();
  
  // Remove protocol
  domain = domain.replace(/^[a-zA-Z]+:\/\//, '');
  
  // Remove userinfo (e.g. user:pass@)
  if (domain.includes('@')) {
    domain = domain.split('@').pop() || domain;
  }
  
  // Remove path, query, hash
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  
  // Remove port if present
  domain = domain.split(':')[0];
  
  // Strip trailing dot
  domain = domain.replace(/\.+$/, '');
  
  return domain;
}

/**
 * Checks if a domain string looks syntactically plausible
 */
export function isValidDomainName(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  if (!normalized || normalized.length > 253) return false;
  // Basic domain regex allowing standard domain and subdomains: label.label
  const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return domainRegex.test(normalized);
}

/**
 * Calculates number of full calendar days until date.
 * Positive = future, 0 = today, negative = past.
 */
export function getDaysUntil(dateString: string): number {
  if (!dateString) return 0;
  const target = new Date(dateString + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats a date string (YYYY-MM-DD) into a clean display format
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const [y, m, d] = dateString.split('-');
    if (!y || !m || !d) return dateString;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats currency amount safely
 */
export function formatCurrency(amount: number | null | undefined, currency: SupportedCurrency): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/**
 * Checks if a renewal date falls within the next 12 calendar months (0 to 365 days from today)
 */
export function isWithinNext12Months(renewalDateString: string): boolean {
  const days = getDaysUntil(renewalDateString);
  return days >= 0 && days <= 365;
}

/**
 * Computes 12-month expected spending grouped strictly by currency.
 * Never sums different currencies.
 * Excludes domains marked 'Let expire' unless specified.
 */
export function calculateExpectedSpending(
  domains: DomainRecord[],
  excludeLetExpire: boolean = true
): {
  totalsByCurrency: Record<SupportedCurrency, number>;
  unpricedCount: number;
  eligibleCount: number;
} {
  const totalsByCurrency: Partial<Record<SupportedCurrency, number>> = {};
  let unpricedCount = 0;
  let eligibleCount = 0;

  for (const domain of domains) {
    if (domain.status !== 'Active') continue;
    if (excludeLetExpire && domain.renewalIntention === 'Let expire') continue;
    if (!isWithinNext12Months(domain.renewalDate)) continue;

    eligibleCount++;

    if (domain.cost === null || domain.cost === undefined || isNaN(domain.cost)) {
      unpricedCount++;
    } else {
      const cur = domain.currency || 'USD';
      totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + domain.cost;
    }
  }

  return {
    totalsByCurrency: totalsByCurrency as Record<SupportedCurrency, number>,
    unpricedCount,
    eligibleCount,
  };
}

/**
 * Finds the single next upcoming renewal.
 * Prioritizes active domains with renewal dates today or in the future,
 * or earliest upcoming renewal date.
 */
export function getNextUpcomingRenewal(domains: DomainRecord[]): {
  domain: DomainRecord | null;
  daysUntil: number;
} {
  const activeDomains = domains.filter((d) => d.status === 'Active');
  if (activeDomains.length === 0) return { domain: null, daysUntil: 0 };

  // Separate into future/today vs overdue
  const futureOrToday = activeDomains
    .map((d) => ({ domain: d, days: getDaysUntil(d.renewalDate) }))
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days);

  if (futureOrToday.length > 0) {
    return { domain: futureOrToday[0].domain, daysUntil: futureOrToday[0].days };
  }

  // If all are overdue, return the one closest to today (highest negative day)
  const overdue = activeDomains
    .map((d) => ({ domain: d, days: getDaysUntil(d.renewalDate) }))
    .sort((a, b) => b.days - a.days);

  return { domain: overdue[0].domain, daysUntil: overdue[0].days };
}

/**
 * Checks if a domain matches any configured reminder offsets (e.g. 30, 14, 7, 1 days)
 */
export function getRenewalUrgency(daysUntil: number, reminderOffsets: number[] = [30, 14, 7, 1]): {
  level: 'overdue' | 'critical' | 'soon' | 'upcoming' | 'distant';
  label: string;
} {
  if (daysUntil < 0) {
    return { level: 'overdue', label: `${Math.abs(daysUntil)}d overdue` };
  }
  if (daysUntil === 0) {
    return { level: 'critical', label: 'Renews today' };
  }
  if (daysUntil <= 1) {
    return { level: 'critical', label: 'Renews tomorrow' };
  }
  if (daysUntil <= 7) {
    return { level: 'critical', label: `In ${daysUntil} days` };
  }
  if (daysUntil <= 14) {
    return { level: 'soon', label: `In ${daysUntil} days` };
  }
  const maxOffset = Math.max(...reminderOffsets, 30);
  if (daysUntil <= maxOffset) {
    return { level: 'soon', label: `In ${daysUntil} days` };
  }
  return { level: 'distant', label: `In ${daysUntil} days` };
}
