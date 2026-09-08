import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileCode,
  FileSpreadsheet,
  Database,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ConflictStrategy, DomainRecord, StorageData } from '../types';
import {
  exportToJSON,
  exportToYAML,
  exportToCSV,
  exportToXLSX,
  exportToSQL,
  parseImportFile,
  applyImportStrategy,
  triggerDownload,
} from '../services/importExport';
import { createDriveVisibleBackup } from '../services/googleDriveStorage';
import { exportToGoogleSheets } from '../services/googleSheets';

interface ImportExportViewProps {
  storageData: StorageData;
  onImportCompleted: (updatedDomains: DomainRecord[]) => void;
  onEnsureScope: (scope: string) => Promise<string>;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  storageData,
  onImportCompleted,
  onEnsureScope,
}) => {
  // Local Import State
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Partial<DomainRecord>[] | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<{
    added: number;
    updated: number;
    skipped: number;
  } | null>(null);

  // Cloud Export states
  const [driveBackupLoading, setDriveBackupLoading] = useState(false);
  const [driveBackupSuccess, setDriveBackupSuccess] = useState<string | null>(null);
  const [driveBackupError, setDriveBackupError] = useState<string | null>(null);

  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsSuccessUrl, setSheetsSuccessUrl] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  // Handle local export downloads
  const handleExportJSON = () => {
    const json = exportToJSON(storageData);
    triggerDownload(json, `domain-expansion-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleExportYAML = () => {
    const yaml = exportToYAML(storageData);
    triggerDownload(yaml, `domain-expansion-${new Date().toISOString().split('T')[0]}.yaml`, 'text/yaml');
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(storageData.domains);
    triggerDownload(csv, `domain-expansion-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const handleExportXLSX = () => {
    const blob = exportToXLSX(storageData.domains);
    triggerDownload(blob, `domain-expansion-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const handleExportSQL = () => {
    const sql = exportToSQL(storageData.domains);
    triggerDownload(sql, `domain-expansion-${new Date().toISOString().split('T')[0]}.sql`, 'text/plain');
  };

  // Handle local file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportError(null);
    setImportSuccess(null);
    setImportLoading(true);

    try {
      const { domains } = await parseImportFile(file);
      if (domains.length === 0) {
        setImportError('No valid domain records could be found in the uploaded file.');
        setImportPreview(null);
      } else {
        setImportPreview(domains);
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to read file.');
      setImportPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  // Commit Import
  const handleCommitImport = () => {
    if (!importPreview || importPreview.length === 0) return;

    const result = applyImportStrategy(storageData.domains, importPreview, conflictStrategy);
    onImportCompleted(result.updatedDomains);
    setImportSuccess({
      added: result.addedCount,
      updated: result.updatedCount,
      skipped: result.skippedCount,
    });
    setImportPreview(null);
    setSelectedFile(null);
  };

  // Trigger Visible Drive Backup
  const handleDriveBackup = async () => {
    setDriveBackupLoading(true);
    setDriveBackupError(null);
    setDriveBackupSuccess(null);

    try {
      const token = await onEnsureScope('https://www.googleapis.com/auth/drive.file');
      const backup = await createDriveVisibleBackup(token, storageData);
      setDriveBackupSuccess(`Successfully saved visible backup "${backup.name}" to your Google Drive!`);
    } catch (err: any) {
      console.error(err);
      setDriveBackupError(err.message || 'Drive backup failed.');
    } finally {
      setDriveBackupLoading(false);
    }
  };

  // Trigger Google Sheets Export
  const handleSheetsExport = async () => {
    setSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccessUrl(null);

    try {
      const token = await onEnsureScope('https://www.googleapis.com/auth/spreadsheets');
      const result = await exportToGoogleSheets(token, storageData.domains);
      setSheetsSuccessUrl(result.spreadsheetUrl);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Google Sheets export failed.');
    } finally {
      setSheetsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-1">Portable Data Ownership</h2>
        <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
          Your domain records belong to you. Export your catalog at any time in industry-standard
          formats, restore from backups, or sync to Google Drive and Google Sheets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Local Exports & Cloud Exports */}
        <div className="space-y-6">
          {/* Local Exports Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Export Locally</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Download your entire {storageData.domains.length}-domain registry directly to your device:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                id="btn-export-json"
                onClick={handleExportJSON}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-center hover:border-zinc-500 transition group"
              >
                <FileCode className="h-5 w-5 text-indigo-400 mb-1 group-hover:scale-105 transition" />
                <span className="text-xs font-medium text-zinc-200">JSON</span>
                <span className="text-[10px] text-zinc-400">Full schema</span>
              </button>

              <button
                id="btn-export-yaml"
                onClick={handleExportYAML}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-center hover:border-zinc-500 transition group"
              >
                <FileCode className="h-5 w-5 text-amber-400 mb-1 group-hover:scale-105 transition" />
                <span className="text-xs font-medium text-zinc-200">YAML</span>
                <span className="text-[10px] text-zinc-400">Readable</span>
              </button>

              <button
                id="btn-export-xlsx"
                onClick={handleExportXLSX}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-center hover:border-zinc-500 transition group"
              >
                <FileSpreadsheet className="h-5 w-5 text-emerald-400 mb-1 group-hover:scale-105 transition" />
                <span className="text-xs font-medium text-zinc-200">Excel (XLSX)</span>
                <span className="text-[10px] text-zinc-400">Spreadsheet</span>
              </button>

              <button
                id="btn-export-csv"
                onClick={handleExportCSV}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-center hover:border-zinc-500 transition group"
              >
                <FileSpreadsheet className="h-5 w-5 text-cyan-400 mb-1 group-hover:scale-105 transition" />
                <span className="text-xs font-medium text-zinc-200">CSV</span>
                <span className="text-[10px] text-zinc-400">Tabular</span>
              </button>

              <button
                id="btn-export-sql"
                onClick={handleExportSQL}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-center hover:border-zinc-500 transition group"
              >
                <Database className="h-5 w-5 text-purple-400 mb-1 group-hover:scale-105 transition" />
                <span className="text-xs font-medium text-zinc-200">SQLite (SQL)</span>
                <span className="text-[10px] text-zinc-400">DDL + Inserts</span>
              </button>
            </div>
          </div>

          {/* Cloud Export Integrations */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CloudUpload className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Google Cloud Exports</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Export visible snapshots directly to your personal Google Drive or Google Sheets on demand.
            </p>

            {/* Drive Backup Action */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200">Back up to Google Drive</div>
                  <div className="text-[11px] text-zinc-400">
                    Creates a timestamped snapshot file in your personal Drive
                  </div>
                </div>
                <button
                  id="btn-backup-drive"
                  onClick={handleDriveBackup}
                  disabled={driveBackupLoading}
                  className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50 sm:w-auto sm:py-1.5"
                >
                  {driveBackupLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>Create Backup</span>
                </button>
              </div>

              {driveBackupSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{driveBackupSuccess}</span>
                </div>
              )}
              {driveBackupError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{driveBackupError}</span>
                </div>
              )}
            </div>

            {/* Sheets Export Action */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200">Export to Google Sheets</div>
                  <div className="text-[11px] text-zinc-400">
                    Generates a formatted Google Spreadsheet with domain columns
                  </div>
                </div>
                <button
                  id="btn-export-sheets"
                  onClick={handleSheetsExport}
                  disabled={sheetsLoading}
                  className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50 sm:w-auto sm:py-1.5"
                >
                  {sheetsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  )}
                  <span>Create Sheet</span>
                </button>
              </div>

              {sheetsSuccessUrl && (
                <div className="flex flex-col items-start gap-2 pt-1 text-xs text-emerald-400 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Spreadsheet created!</span>
                  </div>
                  <a
                    href={sheetsSuccessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {sheetsError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{sheetsError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Local Import & Conflict Management */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Import Domains</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Upload files in <strong>JSON, YAML, XLSX, or CSV</strong> format. Records will be
            validated and checked against existing domains before merging into your database.
          </p>

          {/* Conflict Strategy Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Conflict Resolution Strategy:
            </label>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <label
                className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition ${
                  conflictStrategy === 'skip'
                    ? 'border-indigo-600 bg-indigo-950/30 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <input
                    type="radio"
                    name="conflict"
                    value="skip"
                    checked={conflictStrategy === 'skip'}
                    onChange={() => setConflictStrategy('skip')}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-zinc-200">Skip</span>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1">
                  Safest default. Preserves existing data untouched.
                </span>
              </label>

              <label
                className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition ${
                  conflictStrategy === 'merge'
                    ? 'border-indigo-600 bg-indigo-950/30 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <input
                    type="radio"
                    name="conflict"
                    value="merge"
                    checked={conflictStrategy === 'merge'}
                    onChange={() => setConflictStrategy('merge')}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-zinc-200">Merge</span>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1">
                  Updates fields from incoming file.
                </span>
              </label>

              <label
                className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition ${
                  conflictStrategy === 'replace'
                    ? 'border-indigo-600 bg-indigo-950/30 text-indigo-200'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <input
                    type="radio"
                    name="conflict"
                    value="replace"
                    checked={conflictStrategy === 'replace'}
                    onChange={() => setConflictStrategy('replace')}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-zinc-200">Replace</span>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1">
                  Overwrites conflicting domains completely.
                </span>
              </label>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center hover:border-zinc-700 transition">
            <Upload className="mx-auto h-8 w-8 text-zinc-500 mb-2" />
            <p className="text-xs font-medium text-zinc-200">
              Drag and drop file here, or browse
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Supports .json, .yaml, .xlsx, .csv
            </p>

            <label className="mt-3 inline-block">
              <span className="cursor-pointer rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition">
                Choose File
              </span>
              <input
                id="file-import-input"
                type="file"
                accept=".json,.yaml,.yml,.xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {selectedFile && (
              <div className="mt-2 text-xs text-zinc-300 font-mono">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {importLoading && (
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Parsing file contents...</span>
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-2 rounded-md border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-900/40 bg-emerald-950/30 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Import complete: {importSuccess.added} added, {importSuccess.updated} updated,{' '}
                {importSuccess.skipped} skipped.
              </span>
            </div>
          )}

          {/* Import Preview Table */}
          {importPreview && importPreview.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="flex flex-col items-start gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-zinc-200">
                  Preview ({importPreview.length} records detected)
                </span>
                <button
                  id="btn-commit-import"
                  onClick={handleCommitImport}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500 sm:w-auto sm:py-1.5"
                >
                  Confirm & Import
                </button>
              </div>

              <div className="max-h-48 overflow-x-auto overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
                <table className="w-full min-w-[32rem] text-left text-[11px]">
                  <thead className="sticky top-0 bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="px-3 py-2">Domain</th>
                      <th className="px-3 py-2">Registrar</th>
                      <th className="px-3 py-2">Renewal Date</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {importPreview.slice(0, 10).map((d, i) => (
                      <tr key={i} className="hover:bg-zinc-900/50">
                        <td className="max-w-xs break-all px-3 py-1.5 font-medium text-zinc-200">{d.name}</td>
                        <td className="max-w-xs break-words px-3 py-1.5 text-zinc-400">{d.registrar}</td>
                        <td className="px-3 py-1.5 text-zinc-400">{d.renewalDate}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-zinc-300">
                          {d.cost !== null && d.cost !== undefined
                            ? `${d.currency || 'USD'} ${d.cost}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importPreview.length > 10 && (
                <div className="text-[11px] text-zinc-400 text-center">
                  + {importPreview.length - 10} more records in file
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
