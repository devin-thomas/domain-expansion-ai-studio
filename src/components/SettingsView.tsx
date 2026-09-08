import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Clock,
  DollarSign,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AppSettings, GoogleAuthUser, SupportedCurrency, SyncState } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  user: GoogleAuthUser | null;
  syncState: SyncState;
  lastSyncedAt: string | null;
  onSignOut: () => void;
  onForceSync: () => void;
  onResetAllData: () => void;
}

const SUPPORTED_CURRENCIES: { code: SupportedCurrency; name: string }[] = [
  { code: 'USD', name: 'USD ($) - US Dollar' },
  { code: 'EUR', name: 'EUR (€) - Euro' },
  { code: 'GBP', name: 'GBP (£) - British Pound' },
  { code: 'CAD', name: 'CAD (CA$) - Canadian Dollar' },
  { code: 'INR', name: 'INR (₹) - Indian Rupee' },
  { code: 'JPY', name: 'JPY (¥) - Japanese Yen' },
  { code: 'CNY', name: 'CNY (¥) - Chinese Yuan' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  user,
  syncState,
  lastSyncedAt,
  onSignOut,
  onForceSync,
  onResetAllData,
}) => {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [offsetsInput, setOffsetsInput] = useState(settings.reminderOffsets.join(', '));
  const [offsetsError, setOffsetsError] = useState<string | null>(null);

  const handleOffsetsBlur = () => {
    try {
      const parts = offsetsInput
        .split(',')
        .map((p) => parseInt(p.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      if (parts.length === 0) {
        setOffsetsError('At least one positive day offset required.');
        return;
      }
      setOffsetsError(null);
      const uniqueSorted: number[] = Array.from(new Set<number>(parts)).sort(
        (a: number, b: number) => b - a
      );
      onUpdateSettings({ reminderOffsets: uniqueSorted });
      setOffsetsInput(uniqueSorted.join(', '));
    } catch {
      setOffsetsError('Invalid offsets. Enter comma-separated numbers (e.g. 60, 30, 14, 7, 1).');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Settings Header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-1">Preferences & Configuration</h2>
        <p className="text-xs text-zinc-400">
          Configure default presentation units, renewal calculation options, and Google account connections.
        </p>
      </div>

      {/* Currency & Financial Preferences */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Financial Calculation Rules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Default Currency for New Domains
            </label>
            <select
              id="select-default-currency"
              value={settings.defaultCurrency}
              onChange={(e) =>
                onUpdateSettings({ defaultCurrency: e.target.value as SupportedCurrency })
              }
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-zinc-400">
              Each domain retains its own currency. Currency totals are never converted or combined together.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              12-Month Expected Spending Filter
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 cursor-pointer hover:border-zinc-700 transition">
              <input
                id="checkbox-exclude-let-expire"
                type="checkbox"
                checked={settings.excludeLetExpireFromExpectedSpending}
                onChange={(e) =>
                  onUpdateSettings({
                    excludeLetExpireFromExpectedSpending: e.target.checked,
                  })
                }
                className="h-4 w-4 mt-0.5 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-medium text-zinc-200">
                  Exclude "Let expire" domains
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  When enabled, domains marked to expire intentionally will not be calculated into your upcoming 12-month budget totals.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Renewal Reminders & Alert Offsets */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Renewal Alert Offsets</h3>
        </div>

        <div className="max-w-md">
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Days Before Expiration (comma-separated)
          </label>
          <input
            id="input-reminder-offsets"
            type="text"
            value={offsetsInput}
            onChange={(e) => setOffsetsInput(e.target.value)}
            onBlur={handleOffsetsBlur}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
            placeholder="60, 30, 14, 7, 1"
          />
          {offsetsError ? (
            <p className="mt-1 text-[11px] text-rose-400">{offsetsError}</p>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-400">
              Domains within these threshold days trigger urgency indicators and filter alerts.
            </p>
          )}
        </div>
      </div>

      {/* Privacy Architecture & Storage Audit */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Privacy & Storage Architecture</h3>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-3 text-xs text-zinc-300 leading-relaxed">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-zinc-400">Database Architecture:</span>
            <span className="max-w-full break-words font-semibold text-left text-emerald-400 sm:text-right">No Central User Database</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-zinc-400">Storage Target:</span>
            <span className="max-w-full break-words font-mono text-left text-zinc-200 sm:text-right">Google Drive appDataFolder</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-zinc-400">File Signature:</span>
            <span className="max-w-full break-all font-mono text-left text-zinc-200 sm:text-right">domain-expansion.json</span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-zinc-400">Token Security:</span>
            <span className="max-w-full break-words text-left text-zinc-200 sm:text-right">In-memory ephemeral cache (Never in localStorage)</span>
          </div>
          {lastSyncedAt && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-zinc-400">Last Synced to Drive:</span>
              <span className="max-w-full break-words font-mono text-left text-zinc-200 sm:text-right">{new Date(lastSyncedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {user && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="btn-settings-force-sync"
              onClick={onForceSync}
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Force Sync Now</span>
            </button>
            <button
              id="btn-settings-sign-out"
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-md border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/50 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Disconnect Google Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-rose-950/60 bg-rose-950/10 p-5 space-y-3">
        <div className="flex items-center gap-2 text-rose-400">
          <Trash2 className="h-4 w-4" />
          <h3 className="text-sm font-semibold text-zinc-100">Danger Zone</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Clear all locally cached domain records and reset state.
        </p>

        {resetConfirmOpen ? (
          <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3.5 space-y-3">
            <p className="text-xs text-rose-300 font-medium">
              Are you sure? This will remove all domains from the current session.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-reset-all"
                onClick={() => {
                  onResetAllData();
                  setResetConfirmOpen(false);
                }}
                className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500"
              >
                Yes, Reset All Records
              </button>
            </div>
          </div>
        ) : (
          <button
            id="btn-open-reset-confirm"
            onClick={() => setResetConfirmOpen(true)}
            className="rounded-md border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/50 transition"
          >
            Clear Catalog Data
          </button>
        )}
      </div>
    </div>
  );
};
