import { DomainRecord } from '../types';
import { formatCurrency } from '../utils/domainUtils';

/**
 * Checks if a calendar event already exists for this domain on this renewal date
 */
export async function findExistingCalendarEvent(
  accessToken: string,
  domainName: string,
  renewalDate: string
): Promise<string | null> {
  try {
    const timeMin = `${renewalDate}T00:00:00Z`;
    const timeMax = `${renewalDate}T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(
      domainName
    )}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const items = data.items || [];
    const match = items.find((item: any) =>
      item.summary?.toLowerCase().includes(domainName.toLowerCase())
    );
    return match ? match.id : null;
  } catch (err) {
    console.warn('Could not query Google Calendar events:', err);
    return null;
  }
}

/**
 * Creates an all-day renewal event in primary calendar
 */
export async function createCalendarRenewalEvent(
  accessToken: string,
  domain: DomainRecord
): Promise<{ eventId: string; htmlLink?: string; alreadyExisted: boolean }> {
  // Check for duplicate first
  const existingId = await findExistingCalendarEvent(accessToken, domain.name, domain.renewalDate);
  if (existingId) {
    return { eventId: existingId, alreadyExisted: true };
  }

  const costText =
    domain.cost !== null && domain.cost !== undefined
      ? formatCurrency(domain.cost, domain.currency)
      : 'Price unlisted';

  const summary = `Domain Renewal: ${domain.name}`;
  const description = [
    `Domain: ${domain.name}`,
    `Registrar: ${domain.registrar || 'Unspecified'}`,
    `Renewal Date: ${domain.renewalDate}`,
    `Renewal Cost: ${costText}`,
    `Ownership: ${domain.ownership}`,
    `Auto-Renew: ${domain.autoRenew ? 'Enabled' : 'Disabled'}`,
    `Renewal Intention: ${domain.renewalIntention}`,
    domain.notes ? `Notes: ${domain.notes}` : '',
    '',
    'Created by Domain Expansion',
  ]
    .filter(Boolean)
    .join('\n');

  // Next day for all-day end date
  const parts = domain.renewalDate.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const endDateObj = new Date(y, m, d + 1);
  const nextDayString = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

  const eventPayload = {
    summary,
    description,
    start: {
      date: domain.renewalDate,
    },
    end: {
      date: nextDayString,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 * 7 }, // 7 days
        { method: 'popup', minutes: 24 * 60 * 1 }, // 1 day
      ],
    },
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Calendar event (${res.status}): ${errText}`);
  }

  const result = await res.json();
  return {
    eventId: result.id,
    htmlLink: result.htmlLink,
    alreadyExisted: false,
  };
}
