import * as yaml from 'js-yaml';
import * as XLSX from 'xlsx';
import {
  ConflictStrategy,
  DomainRecord,
  DomainStatus,
  OwnershipType,
  RenewalIntention,
  StorageData,
  SupportedCurrency,
} from '../types';
import { normalizeDomain } from '../utils/domainUtils';

/**
 * Exports data to JSON formatted string
 */
export function exportToJSON(data: StorageData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Exports data to YAML formatted string
 */
export function exportToYAML(data: StorageData): string {
  return yaml.dump(data, { indent: 2 });
}

/**
 * Exports data to CSV string
 */
export function exportToCSV(domains: DomainRecord[]): string {
  const headers = [
    'Domain',
    'Registrar',
    'Ownership',
    'Status',
    'Renewal Intention',
    'Renewal Date',
    'Renewal Cost',
    'Currency',
    'Auto Renew',
    'Registration Date',
    'Notes',
  ];

  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '';
    const text = String(str).replace(/"/g, '""');
    return `"${text}"`;
  };

  const rows = domains.map((d) => [
    escapeCSV(d.name),
    escapeCSV(d.registrar),
    escapeCSV(d.ownership),
    escapeCSV(d.status),
    escapeCSV(d.renewalIntention),
    escapeCSV(d.renewalDate),
    d.cost !== null && d.cost !== undefined ? d.cost : '',
    escapeCSV(d.currency),
    d.autoRenew ? 'true' : 'false',
    escapeCSV(d.registrationDate || ''),
    escapeCSV(d.notes || ''),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Exports domains to XLSX binary Blob
 */
export function exportToXLSX(domains: DomainRecord[]): Blob {
  const rows = domains.map((d) => ({
    Domain: d.name,
    Registrar: d.registrar,
    Ownership: d.ownership,
    Status: d.status,
    'Renewal Intention': d.renewalIntention,
    'Renewal Date': d.renewalDate,
    'Renewal Cost': d.cost !== null && d.cost !== undefined ? d.cost : '',
    Currency: d.currency,
    'Auto Renew': d.autoRenew ? 'Yes' : 'No',
    'Registration Date': d.registrationDate || '',
    Notes: d.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Domains');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Exports to portable SQLite SQL DDL + INSERT script
 */
export function exportToSQL(domains: DomainRecord[]): string {
  const lines: string[] = [];
  lines.push('-- Domain Expansion SQLite Export');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS domains (');
  lines.push('  id TEXT PRIMARY KEY,');
  lines.push('  name TEXT NOT NULL UNIQUE,');
  lines.push('  registrar TEXT,');
  lines.push('  ownership TEXT CHECK(ownership IN ("Owned", "Managed")),');
  lines.push('  status TEXT CHECK(status IN ("Active", "Inactive", "Transferred")),');
  lines.push('  renewal_date TEXT NOT NULL,');
  lines.push('  cost REAL,');
  lines.push('  currency TEXT DEFAULT "USD",');
  lines.push('  auto_renew INTEGER DEFAULT 0,');
  lines.push('  renewal_intention TEXT CHECK(renewal_intention IN ("Renew", "Let expire")),');
  lines.push('  registration_date TEXT,');
  lines.push('  notes TEXT,');
  lines.push('  updated_at TEXT');
  lines.push(');');
  lines.push('');
  lines.push('BEGIN TRANSACTION;');

  for (const d of domains) {
    const esc = (val: any) =>
      val === null || val === undefined ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`;
    const costVal = d.cost !== null && d.cost !== undefined ? d.cost : 'NULL';
    const autoRenewVal = d.autoRenew ? 1 : 0;

    lines.push(
      `INSERT OR REPLACE INTO domains VALUES (${esc(d.id)}, ${esc(d.name)}, ${esc(
        d.registrar
      )}, ${esc(d.ownership)}, ${esc(d.status)}, ${esc(d.renewalDate)}, ${costVal}, ${esc(
        d.currency
      )}, ${autoRenewVal}, ${esc(d.renewalIntention)}, ${esc(d.registrationDate)}, ${esc(
        d.notes
      )}, ${esc(d.updatedAt)});`
    );
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

/**
 * Parses raw text or file content from JSON, YAML, CSV, or XLSX
 */
export async function parseImportFile(
  file: File
): Promise<{ domains: Partial<DomainRecord>[]; warning?: string }> {
  const fileName = file.name.toLowerCase();

  if (file.size === 0) {
    throw new Error('Selected file is empty.');
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('Excel workbook contains no sheets.');

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);
    if (rawRows.length === 0) throw new Error('Excel sheet contains no data rows.');

    const domains: Partial<DomainRecord>[] = rawRows
      .map((row): Partial<DomainRecord> | null => {
        const rawName = row['Domain'] || row['domain'] || row['Name'] || row['domain_name'] || '';
        const name = normalizeDomain(String(rawName));
        if (!name) return null;

        const rawCost = row['Renewal Cost'] ?? row['cost'] ?? row['Cost'] ?? null;
        let cost: number | null = null;
        if (rawCost !== null && rawCost !== undefined && rawCost !== '') {
          const num = parseFloat(String(rawCost).replace(/[^0-9.-]/g, ''));
          cost = isNaN(num) ? null : num;
        }

        const rawAuto = row['Auto Renew'] ?? row['autoRenew'] ?? row['auto_renew'];
        const autoRenew =
          rawAuto === true ||
          rawAuto === 1 ||
          String(rawAuto).toLowerCase() === 'yes' ||
          String(rawAuto).toLowerCase() === 'true';

        const ownership: OwnershipType =
          String(row['Ownership'] || row['ownership'] || 'Owned').trim() === 'Managed'
            ? 'Managed'
            : 'Owned';

        const rawStatus = row['Status'] || row['status'];
        const status: DomainStatus = ['Active', 'Inactive', 'Transferred'].includes(rawStatus)
          ? (rawStatus as DomainStatus)
          : 'Active';

        const renewalIntention: RenewalIntention = String(
          row['Renewal Intention'] || row['renewalIntention'] || ''
        )
          .toLowerCase()
          .includes('expire')
          ? 'Let expire'
          : 'Renew';

        return {
          name,
          registrar: String(row['Registrar'] || row['registrar'] || 'Unknown').trim(),
          ownership,
          status,
          renewalIntention,
          renewalDate:
            String(row['Renewal Date'] || row['renewalDate'] || row['renewal_date'] || '').trim() ||
            new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          cost,
          currency: (row['Currency'] || row['currency'] || 'USD') as SupportedCurrency,
          autoRenew,
          registrationDate: String(row['Registration Date'] || row['registrationDate'] || '').trim() || null,
          notes: String(row['Notes'] || row['notes'] || '').trim() || undefined,
        };
      })
      .filter((d): d is Partial<DomainRecord> => d !== null);

    return { domains };
  }

  // Text-based parsing (JSON, YAML, CSV, SQL)
  const text = await file.text();
  if (!text.trim()) throw new Error('Selected file is empty.');

  if (fileName.endsWith('.json')) {
    const parsed = JSON.parse(text);
    let list: any[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && Array.isArray(parsed.domains)) {
      list = parsed.domains;
    } else {
      throw new Error('JSON format not recognized. Expected an array or object with "domains" array.');
    }

    const domains = list
      .map((item) => {
        const name = normalizeDomain(item.name || item.domain || '');
        if (!name) return null;
        return {
          ...item,
          name,
          cost: typeof item.cost === 'number' ? item.cost : null,
          currency: item.currency || 'USD',
          ownership: item.ownership === 'Managed' ? 'Managed' : 'Owned',
          status: item.status || 'Active',
          renewalIntention: item.renewalIntention === 'Let expire' ? 'Let expire' : 'Renew',
          renewalDate: item.renewalDate || new Date().toISOString().split('T')[0],
          autoRenew: Boolean(item.autoRenew),
        };
      })
      .filter((d): d is Partial<DomainRecord> => d !== null);

    return { domains };
  }

  if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
    const parsed: any = yaml.load(text);
    let list: any[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && Array.isArray(parsed.domains)) {
      list = parsed.domains;
    } else {
      throw new Error('YAML format not recognized. Expected a list or object with "domains" list.');
    }

    const domains = list
      .map((item) => {
        const name = normalizeDomain(item.name || item.domain || '');
        if (!name) return null;
        return {
          ...item,
          name,
          cost: typeof item.cost === 'number' ? item.cost : null,
          currency: item.currency || 'USD',
          ownership: item.ownership === 'Managed' ? 'Managed' : 'Owned',
          status: item.status || 'Active',
          renewalIntention: item.renewalIntention === 'Let expire' ? 'Let expire' : 'Renew',
          renewalDate: item.renewalDate || new Date().toISOString().split('T')[0],
          autoRenew: Boolean(item.autoRenew),
        };
      })
      .filter((d): d is Partial<DomainRecord> => d !== null);

    return { domains };
  }

  if (fileName.endsWith('.csv')) {
    // Simple CSV parser
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error('CSV has no data rows.');

    const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const domainIdx = headers.findIndex((h) => h.includes('domain') || h.includes('name'));
    if (domainIdx === -1) throw new Error('Could not find a "Domain" column in CSV.');

    const regIdx = headers.findIndex((h) => h.includes('registrar'));
    const dateIdx = headers.findIndex((h) => h.includes('renew') && h.includes('date'));
    const costIdx = headers.findIndex((h) => h.includes('cost') || h.includes('price'));
    const curIdx = headers.findIndex((h) => h.includes('currency'));
    const statusIdx = headers.findIndex((h) => h.includes('status'));
    const intentionIdx = headers.findIndex((h) => h.includes('intention') || h.includes('expire'));

    const domains: Partial<DomainRecord>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      const rawName = cols[domainIdx];
      const name = normalizeDomain(rawName);
      if (!name) continue;

      const rawCost = costIdx !== -1 ? cols[costIdx] : null;
      let cost: number | null = null;
      if (rawCost) {
        const num = parseFloat(rawCost.replace(/[^0-9.-]/g, ''));
        cost = isNaN(num) ? null : num;
      }

      domains.push({
        name,
        registrar: regIdx !== -1 ? cols[regIdx] || 'Unknown' : 'Unknown',
        ownership: 'Owned',
        status: statusIdx !== -1 && ['Active', 'Inactive', 'Transferred'].includes(cols[statusIdx])
          ? (cols[statusIdx] as any)
          : 'Active',
        renewalIntention:
          intentionIdx !== -1 && cols[intentionIdx].toLowerCase().includes('expire')
            ? 'Let expire'
            : 'Renew',
        renewalDate: dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split('T')[0],
        cost,
        currency: (curIdx !== -1 ? cols[curIdx] : 'USD') as SupportedCurrency,
        autoRenew: false,
      });
    }

    return { domains };
  }

  throw new Error('Unsupported file extension. Please upload .json, .yaml, .yml, .xlsx, or .csv.');
}

/**
 * Merges imported domains into current domain list according to selected conflict strategy:
 * - 'skip': Existing domains are unchanged, only new domains are added (safest non-destructive default)
 * - 'replace': Imported record completely replaces existing record
 * - 'merge': Non-null incoming fields overwrite existing record
 */
export function applyImportStrategy(
  existingDomains: DomainRecord[],
  importedDomains: Partial<DomainRecord>[],
  strategy: ConflictStrategy
): {
  updatedDomains: DomainRecord[];
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
} {
  const currentMap = new Map<string, DomainRecord>();
  existingDomains.forEach((d) => currentMap.set(d.name.toLowerCase(), { ...d }));

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of importedDomains) {
    if (!item.name) continue;
    const key = item.name.toLowerCase();
    const existing = currentMap.get(key);

    if (!existing) {
      // New record
      const newDomain: DomainRecord = {
        id: 'dom_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        name: key,
        registrar: item.registrar || 'Unknown',
        ownership: item.ownership || 'Owned',
        status: item.status || 'Active',
        registrationDate: item.registrationDate || null,
        renewalDate: item.renewalDate || new Date().toISOString().split('T')[0],
        cost: item.cost !== undefined ? item.cost : null,
        currency: item.currency || 'USD',
        autoRenew: Boolean(item.autoRenew),
        renewalIntention: item.renewalIntention || 'Renew',
        notes: item.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentMap.set(key, newDomain);
      addedCount++;
    } else {
      // Conflict
      if (strategy === 'skip') {
        skippedCount++;
      } else if (strategy === 'replace') {
        const replaced: DomainRecord = {
          ...existing,
          ...item,
          name: key, // preserve normalized
          id: existing.id,
          updatedAt: new Date().toISOString(),
        } as DomainRecord;
        currentMap.set(key, replaced);
        updatedCount++;
      } else if (strategy === 'merge') {
        const merged: DomainRecord = {
          ...existing,
          registrar: item.registrar || existing.registrar,
          ownership: item.ownership || existing.ownership,
          status: item.status || existing.status,
          registrationDate: item.registrationDate ?? existing.registrationDate,
          renewalDate: item.renewalDate || existing.renewalDate,
          cost: item.cost !== undefined && item.cost !== null ? item.cost : existing.cost,
          currency: item.currency || existing.currency,
          autoRenew: item.autoRenew !== undefined ? item.autoRenew : existing.autoRenew,
          renewalIntention: item.renewalIntention || existing.renewalIntention,
          notes: item.notes ? (existing.notes ? `${existing.notes}\n${item.notes}` : item.notes) : existing.notes,
          updatedAt: new Date().toISOString(),
        };
        currentMap.set(key, merged);
        updatedCount++;
      }
    }
  }

  return {
    updatedDomains: Array.from(currentMap.values()),
    addedCount,
    updatedCount,
    skippedCount,
  };
}

/**
 * Triggers a browser file download
 */
export function triggerDownload(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
