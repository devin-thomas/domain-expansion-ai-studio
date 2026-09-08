import { CandidateDomain, DomainRecord, SupportedCurrency } from '../types';
import { normalizeDomain } from '../utils/domainUtils';

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageDetail {
  id: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  bodyText: string;
}

/**
 * Searches Gmail for domain-related receipts, registration, and renewal notices
 */
export async function searchDomainEmails(
  accessToken: string,
  maxResults: number = 20
): Promise<GmailMessageDetail[]> {
  // Queries targeting registrars and domain renewal phrases
  const query =
    'subject:(domain OR registrar OR renewal OR invoice OR receipt OR "renew your domain" OR "registration confirmed" OR namecheap OR cloudflare OR porkbun OR godaddy OR name.com OR dynadot)';

  const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}&maxResults=${maxResults}`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`Failed to query Gmail (${searchRes.status}): ${err}`);
  }

  const data = await searchRes.json();
  const messages: { id: string }[] = data.messages || [];

  if (messages.length === 0) {
    return [];
  }

  // Fetch details for each message
  const details: GmailMessageDetail[] = [];
  // Limit concurrent queries to 10
  const topMessages = messages.slice(0, 10);

  for (const m of topMessages) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!msgRes.ok) continue;
      const msgData = await msgRes.json();
      const headers: GmailMessageHeader[] = msgData.payload?.headers || [];

      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const date = getHeader('Date');
      const snippet = msgData.snippet || '';

      // Extract body text if available
      let bodyText = snippet;
      if (msgData.payload?.parts) {
        for (const part of msgData.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            try {
              bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } catch {
              // fallback to snippet
            }
            break;
          }
        }
      }

      details.push({
        id: m.id,
        snippet,
        subject,
        from,
        date,
        bodyText: bodyText.slice(0, 2500),
      });
    } catch (e) {
      console.warn('Error fetching message detail:', e);
    }
  }

  return details;
}

/**
 * Local pattern-based fallback parser if Gemini is offline or without API key
 */
function localPatternExtract(emails: GmailMessageDetail[]): CandidateDomain[] {
  const candidates: CandidateDomain[] = [];
  const seenDomains = new Set<string>();

  // Known registrars pattern
  const registrarPatterns: { name: string; regex: RegExp }[] = [
    { name: 'Cloudflare', regex: /cloudflare/i },
    { name: 'Namecheap', regex: /namecheap/i },
    { name: 'Porkbun', regex: /porkbun/i },
    { name: 'Name.com', regex: /name\.com/i },
    { name: 'GoDaddy', regex: /godaddy/i },
    { name: 'Google Domains / Squarespace', regex: /(google domains|squarespace)/i },
    { name: 'Dynadot', regex: /dynadot/i },
    { name: 'Gandi', regex: /gandi/i },
  ];

  // Regex to find domain names like domain.com, sub.domain.org
  const domainRegex = /\b([a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.(com|net|org|io|dev|app|co|ai|info|biz|me|cc|xyz|uk|ca|de|eu))\b/gi;
  // Regex to find prices: $14.98 or £12.00 or €10.50
  const priceRegex = /(?:[\$£€¥]|USD|EUR|GBP|CAD)\s*([0-9]+(?:\.[0-9]{2})?)/i;

  for (const email of emails) {
    const combinedText = `${email.subject}\n${email.from}\n${email.snippet}\n${email.bodyText}`;

    let detectedRegistrar = 'Unknown';
    for (const reg of registrarPatterns) {
      if (reg.regex.test(combinedText)) {
        detectedRegistrar = reg.name;
        break;
      }
    }

    let detectedCost: number | null = null;
    let detectedCurrency: SupportedCurrency = 'USD';
    const priceMatch = combinedText.match(priceRegex);
    if (priceMatch) {
      detectedCost = parseFloat(priceMatch[1]);
      if (combinedText.includes('£') || combinedText.includes('GBP')) detectedCurrency = 'GBP';
      else if (combinedText.includes('€') || combinedText.includes('EUR')) detectedCurrency = 'EUR';
      else if (combinedText.includes('CAD') || combinedText.includes('CA$')) detectedCurrency = 'CAD';
    }

    let match;
    while ((match = domainRegex.exec(combinedText)) !== null) {
      const rawDomain = match[1];
      const norm = normalizeDomain(rawDomain);
      if (
        norm &&
        !seenDomains.has(norm) &&
        !norm.includes('namecheap') &&
        !norm.includes('cloudflare') &&
        !norm.includes('porkbun') &&
        !norm.includes('godaddy') &&
        !norm.includes('google')
      ) {
        seenDomains.add(norm);

        // Estimate renewal date 1 year from email date if parsed
        let estRenewal: string | null = null;
        if (email.date) {
          const emailDate = new Date(email.date);
          if (!isNaN(emailDate.getTime())) {
            emailDate.setFullYear(emailDate.getFullYear() + 1);
            estRenewal = emailDate.toISOString().split('T')[0];
          }
        }

        candidates.push({
          id: 'candidate_' + Math.random().toString(36).substring(2, 9),
          name: norm,
          registrar: detectedRegistrar,
          registrationDate: null,
          renewalDate: estRenewal,
          cost: detectedCost,
          currency: detectedCurrency,
          transactionType: 'Receipt/Notice',
          confidence: 'medium',
          sourceSnippet: email.snippet.slice(0, 100),
          status: 'pending',
        });
      }
    }
  }

  return candidates;
}

/**
 * Extracts candidate domains from Gmail messages using Gemini server endpoint
 * with graceful fallback to local pattern extractor
 */
export async function extractCandidatesFromGmail(
  emails: GmailMessageDetail[],
  existingDomains: DomainRecord[]
): Promise<CandidateDomain[]> {
  const existingNames = new Map(existingDomains.map((d) => [d.name.toLowerCase(), d.id]));

  let candidates: CandidateDomain[] = [];

  try {
    const res = await fetch('/api/gemini/extract-domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.candidates) && data.candidates.length > 0) {
        candidates = data.candidates.map((c: any) => ({
          id: 'cand_' + Math.random().toString(36).substring(2, 9),
          name: normalizeDomain(c.name || ''),
          registrar: c.registrar || 'Unknown',
          registrationDate: c.registrationDate || null,
          renewalDate: c.renewalDate || null,
          cost: typeof c.cost === 'number' ? c.cost : null,
          currency: (c.currency as SupportedCurrency) || 'USD',
          transactionType: c.transactionType || 'Receipt',
          confidence: c.confidence || 'medium',
          sourceSnippet: c.sourceSnippet || '',
          status: 'pending' as const,
        }));
      }
    }
  } catch (err) {
    console.warn('Gemini extraction call failed, utilizing local pattern detection:', err);
  }

  // Fallback to pattern matcher if Gemini found nothing or was unavailable
  if (candidates.length === 0) {
    candidates = localPatternExtract(emails);
  }

  // Deduplicate and annotate existing tracking state
  const deduped: CandidateDomain[] = [];
  const seen = new Set<string>();

  for (const cand of candidates) {
    if (!cand.name || seen.has(cand.name)) continue;
    seen.add(cand.name);

    if (existingNames.has(cand.name)) {
      cand.alreadyTracked = true;
      cand.existingDomainId = existingNames.get(cand.name);
    }
    deduped.push(cand);
  }

  return deduped;
}
