import React, { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Check, Globe } from 'lucide-react';
import {
  DomainRecord,
  DomainStatus,
  OwnershipType,
  RenewalIntention,
  SupportedCurrency,
} from '../types';
import { normalizeDomain, isValidDomainName, COMMON_REGISTRARS } from '../utils/domainUtils';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (domainData: Partial<DomainRecord>) => void;
  initialDomain?: DomainRecord | null;
  existingDomains: DomainRecord[];
  mode: 'add' | 'edit' | 'view';
  defaultCurrency: SupportedCurrency;
}

const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  'USD',
  'GBP',
  'EUR',
  'INR',
  'CNY',
  'JPY',
  'CAD',
];

export const DomainModal: React.FC<DomainModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDomain,
  existingDomains,
  mode: initialMode,
  defaultCurrency,
}) => {
  const [currentMode, setCurrentMode] = useState<'add' | 'edit' | 'view'>(initialMode);

  // Form State
  const [name, setName] = useState('');
  const [registrar, setRegistrar] = useState('Cloudflare');
  const [ownership, setOwnership] = useState<OwnershipType>('Owned');
  const [status, setStatus] = useState<DomainStatus>('Active');
  const [registrationDate, setRegistrationDate] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [cost, setCost] = useState<string>('');
  const [currency, setCurrency] = useState<SupportedCurrency>(defaultCurrency);
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalIntention, setRenewalIntention] = useState<RenewalIntention>('Renew');
  const [notes, setNotes] = useState('');

  // Currency change warning state
  const [currencyChangedWarning, setCurrencyChangedWarning] = useState(false);
  const [initialCostEntered, setInitialCostEntered] = useState<string>('');

  // Validation
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMode(initialMode);
    if (initialDomain) {
      setName(initialDomain.name);
      setRegistrar(initialDomain.registrar || '');
      setOwnership(initialDomain.ownership || 'Owned');
      setStatus(initialDomain.status || 'Active');
      setRegistrationDate(initialDomain.registrationDate || '');
      setRenewalDate(initialDomain.renewalDate || '');
      const costStr =
        initialDomain.cost !== null && initialDomain.cost !== undefined
          ? String(initialDomain.cost)
          : '';
      setCost(costStr);
      setInitialCostEntered(costStr);
      setCurrency(initialDomain.currency || defaultCurrency);
      setAutoRenew(Boolean(initialDomain.autoRenew));
      setRenewalIntention(initialDomain.renewalIntention || 'Renew');
      setNotes(initialDomain.notes || '');
    } else {
      // Default new domain
      setName('');
      setRegistrar('Cloudflare');
      setOwnership('Owned');
      setStatus('Active');
      setRegistrationDate(new Date().toISOString().split('T')[0]);
      // Default renewal 1 year from today
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setRenewalDate(nextYear.toISOString().split('T')[0]);
      setCost('');
      setInitialCostEntered('');
      setCurrency(defaultCurrency);
      setAutoRenew(true);
      setRenewalIntention('Renew');
      setNotes('');
    }
    setCurrencyChangedWarning(false);
    setError(null);
  }, [initialDomain, initialMode, defaultCurrency, isOpen]);

  if (!isOpen) return null;

  const handleNameBlur = () => {
    if (name) {
      const normalized = normalizeDomain(name);
      setName(normalized);
    }
  };

  const handleCurrencyChange = (newCur: SupportedCurrency) => {
    if (newCur !== currency && cost.trim() !== '') {
      setCurrencyChangedWarning(true);
    } else {
      setCurrencyChangedWarning(false);
    }
    setCurrency(newCur);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedName = normalizeDomain(name);
    if (!normalizedName) {
      setError('Domain name is required.');
      return;
    }

    if (!isValidDomainName(normalizedName)) {
      setError('Please enter a valid domain name (e.g. example.com).');
      return;
    }

    // Check duplicate
    const isDuplicate = existingDomains.some(
      (d) =>
        d.name.toLowerCase() === normalizedName.toLowerCase() &&
        d.id !== initialDomain?.id
    );

    if (isDuplicate) {
      setError(`Domain "${normalizedName}" is already being tracked in your catalog.`);
      return;
    }

    if (!renewalDate) {
      setError('Renewal date is required.');
      return;
    }

    let parsedCost: number | null = null;
    if (cost.trim() !== '') {
      const num = parseFloat(cost);
      if (isNaN(num) || num < 0) {
        setError('Renewal cost must be a non-negative number.');
        return;
      }
      parsedCost = Math.round(num * 100) / 100;
    }

    onSave({
      ...(initialDomain?.id ? { id: initialDomain.id } : {}),
      name: normalizedName,
      registrar: registrar.trim() || 'Unknown',
      ownership,
      status,
      registrationDate: registrationDate || null,
      renewalDate,
      cost: parsedCost,
      currency,
      autoRenew,
      renewalIntention,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const isReadOnly = currentMode === 'view';

  return (
    <div
      id="domain-modal-backdrop"
      className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[100dvw] items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="domain-modal-content"
        className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-400" />
            <h3 className="min-w-0 break-words text-sm font-semibold text-zinc-100">
              {currentMode === 'add'
                ? 'Add Domain'
                : currentMode === 'edit'
                ? `Edit ${initialDomain?.name}`
                : `Domain: ${initialDomain?.name}`}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isReadOnly && (
              <button
                type="button"
                onClick={() => setCurrentMode('edit')}
                className="rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:bg-zinc-700 transition"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close domain dialog"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Domain name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Domain Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="input-domain-name"
              type="text"
              required
              disabled={isReadOnly || currentMode === 'edit'}
              placeholder="e.g. myproject.com"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
            {currentMode === 'add' && (
              <p className="mt-1 text-[11px] text-zinc-400">
                Normalized to lower case. Protocols and paths are stripped automatically.
              </p>
            )}
          </div>

          {/* Registrar */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Registrar / Provider
            </label>
            <input
              id="input-domain-registrar"
              type="text"
              disabled={isReadOnly}
              placeholder="e.g. Cloudflare, Namecheap, Porkbun"
              value={registrar}
              onChange={(e) => setRegistrar(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
            {!isReadOnly && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {COMMON_REGISTRARS.slice(0, 6).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegistrar(r)}
                    className="rounded bg-zinc-800/80 hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300 transition"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ownership & Status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Ownership
              </label>
              <select
                id="select-domain-ownership"
                disabled={isReadOnly}
                value={ownership}
                onChange={(e) => setOwnership(e.target.value as OwnershipType)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              >
                <option value="Owned">Owned (Personal / Company)</option>
                <option value="Managed">Managed (Third-Party / Client)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Status
              </label>
              <select
                id="select-domain-status"
                disabled={isReadOnly}
                value={status}
                onChange={(e) => setStatus(e.target.value as DomainStatus)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>
          </div>

          {/* Renewal Date & Registration Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Renewal Date <span className="text-rose-400">*</span>
              </label>
              <input
                id="input-domain-renewal-date"
                type="date"
                required
                disabled={isReadOnly}
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Registration Date (Optional)
              </label>
              <input
                id="input-domain-registration-date"
                type="date"
                disabled={isReadOnly}
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Cost & Currency */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Renewal Cost
              </label>
              <input
                id="input-domain-cost"
                type="number"
                step="0.01"
                min="0"
                disabled={isReadOnly}
                placeholder="Leave blank if unlisted"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Currency
              </label>
              <select
                id="select-domain-currency"
                disabled={isReadOnly}
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as SupportedCurrency)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Warning if currency changed when cost exists */}
          {currencyChangedWarning && (
            <div
              id="currency-warning"
              className="flex items-start gap-2 rounded-md border border-amber-900/40 bg-amber-950/30 p-2.5 text-xs text-amber-300"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Notice: Changing the currency does <strong>not</strong> automatically convert
                the numeric amount. Please adjust the cost value accordingly if needed.
              </span>
            </div>
          )}

          {/* Auto Renew & Renewal Intention */}
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <div className="flex items-center gap-2 pt-2">
              <input
                id="checkbox-domain-auto-renew"
                type="checkbox"
                disabled={isReadOnly}
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="checkbox-domain-auto-renew" className="text-xs text-zinc-200">
                Registrar Auto-Renew On
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Renewal Intention
              </label>
              <select
                id="select-domain-renewal-intention"
                disabled={isReadOnly}
                value={renewalIntention}
                onChange={(e) => setRenewalIntention(e.target.value as RenewalIntention)}
                className={`w-full rounded-md border px-3 py-1.5 text-xs focus:outline-none disabled:opacity-60 ${
                  renewalIntention === 'Let expire'
                    ? 'border-rose-800 bg-rose-950/30 text-rose-300'
                    : 'border-zinc-700 bg-zinc-950 text-zinc-100'
                }`}
              >
                <option value="Renew">Renew (Keep Active)</option>
                <option value="Let expire">Let expire (Allow Deletion)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Notes
            </label>
            <textarea
              id="textarea-domain-notes"
              rows={3}
              disabled={isReadOnly}
              placeholder="e.g. DNS hosted on Cloudflare, points to Vercel production deployment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse items-stretch gap-2 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 sm:w-auto sm:py-1.5"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>

            {!isReadOnly && (
              <button
                id="btn-save-domain"
                type="submit"
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-500 sm:w-auto sm:py-1.5"
              >
                {currentMode === 'add' ? 'Add Domain' : 'Save Changes'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
