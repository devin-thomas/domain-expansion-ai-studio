import React, { useState } from 'react';
import {
  X,
  Mail,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Check,
  Ban,
  Edit2,
} from 'lucide-react';
import { CandidateDomain, DomainRecord, SupportedCurrency } from '../types';
import { searchDomainEmails, extractCandidatesFromGmail } from '../services/gmailDiscovery';
import { normalizeDomain, formatCurrency, formatDate } from '../utils/domainUtils';

interface GmailDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDomains: DomainRecord[];
  onImportAccepted: (candidates: CandidateDomain[]) => void;
  onEnsureScope: (scope: string) => Promise<string>;
}

export const GmailDiscoveryModal: React.FC<GmailDiscoveryModalProps> = ({
  isOpen,
  onClose,
  existingDomains,
  onImportAccepted,
  onEnsureScope,
}) => {
  const [phase, setPhase] = useState<'initial' | 'searching' | 'review' | 'done'>('initial');
  const [candidates, setCandidates] = useState<CandidateDomain[]>([]);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CandidateDomain>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  if (!isOpen) return null;

  const handleStartDiscovery = async () => {
    setErrorMessage(null);
    setPhase('searching');

    try {
      // 1. Request minimal read-only Gmail scope
      const token = await onEnsureScope('https://www.googleapis.com/auth/gmail.readonly');

      // 2. Search domain messages
      const emails = await searchDomainEmails(token, 20);

      if (emails.length === 0) {
        setErrorMessage(
          'No domain receipts or renewal notices found in your recent Gmail messages.'
        );
        setPhase('initial');
        return;
      }

      // 3. Extract candidate domains using server endpoint / fallback parser
      const extracted = await extractCandidatesFromGmail(emails, existingDomains);

      if (extracted.length === 0) {
        setErrorMessage(
          'Found domain-related emails, but could not extract structured domain records automatically.'
        );
        setPhase('initial');
        return;
      }

      setCandidates(extracted);
      setPhase('review');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Failed to search Gmail. Please ensure Gmail read permission is approved.'
      );
      setPhase('initial');
    }
  };

  const handleSetStatus = (id: string, status: 'accepted' | 'ignored') => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const handleStartEdit = (candidate: CandidateDomain) => {
    setEditingCandidateId(candidate.id);
    setEditFormData({
      name: candidate.name,
      registrar: candidate.registrar,
      renewalDate: candidate.renewalDate,
      cost: candidate.cost,
      currency: candidate.currency,
    });
  };

  const handleSaveEdit = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          name: normalizeDomain(editFormData.name || c.name),
          registrar: editFormData.registrar || c.registrar,
          renewalDate: editFormData.renewalDate || c.renewalDate,
          cost: typeof editFormData.cost === 'number' ? editFormData.cost : c.cost,
          currency: (editFormData.currency as SupportedCurrency) || c.currency,
          status: 'accepted',
        };
      })
    );
    setEditingCandidateId(null);
  };

  const handleCommitReview = () => {
    const accepted = candidates.filter((c) => c.status === 'accepted');
    if (accepted.length === 0) {
      setErrorMessage('No candidates selected for import. Click "Accept" on items you wish to add.');
      return;
    }

    onImportAccepted(accepted);
    setImportedCount(accepted.length);
    setPhase('done');
  };

  return (
    <div
      id="gmail-discovery-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="gmail-discovery-content"
        className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Find Domains in Gmail</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content based on Phase */}
        <div className="p-5">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {phase === 'initial' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Privacy First & Explicit Review</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Domain Expansion will search your recent email receipts for domain registrations,
                  renewal notices, and invoices (e.g. from Namecheap, Cloudflare, Porkbun, GoDaddy).
                </p>
                <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                  <li>Requests minimum read-only permission (<code>gmail.readonly</code>).</li>
                  <li>Never sends, edits, labels, or deletes your emails.</li>
                  <li>Extracted domains are candidate proposals—never written automatically.</li>
                  <li>You review, edit, or reject every candidate before anything is saved.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-trigger-gmail-search"
                  type="button"
                  onClick={handleStartDiscovery}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Scan Gmail for Receipts</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'searching' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
              <div className="text-sm font-medium text-zinc-200">Scanning Gmail notices...</div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Searching for registrar receipts and parsing registration and renewal dates.
              </p>
            </div>
          )}

          {phase === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">
                    Discovered Candidates ({candidates.length})
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Review each candidate. Mark Accept, Edit details, or Ignore.
                  </p>
                </div>
                <div className="text-xs text-zinc-400">
                  <span className="text-emerald-400 font-semibold">
                    {candidates.filter((c) => c.status === 'accepted').length}
                  </span>{' '}
                  accepted
                </div>
              </div>

              {/* Review List */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {candidates.map((cand) => {
                  const isEditing = editingCandidateId === cand.id;

                  return (
                    <div
                      key={cand.id}
                      className={`rounded-lg border p-3 text-xs transition ${
                        cand.status === 'accepted'
                          ? 'border-emerald-800/60 bg-emerald-950/20'
                          : cand.status === 'ignored'
                          ? 'border-zinc-800/60 bg-zinc-950/40 opacity-50'
                          : 'border-zinc-800 bg-zinc-950/70'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-zinc-400">Domain Name</label>
                              <input
                                type="text"
                                value={editFormData.name || ''}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, name: e.target.value })
                                }
                                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400">Registrar</label>
                              <input
                                type="text"
                                value={editFormData.registrar || ''}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, registrar: e.target.value })
                                }
                                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-zinc-400">Renewal Date</label>
                              <input
                                type="date"
                                value={editFormData.renewalDate || ''}
                                onChange={(e) =>
                                  setEditFormData({ ...editFormData, renewalDate: e.target.value })
                                }
                                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400">Cost (Numeric)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editFormData.cost ?? ''}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    cost: e.target.value ? parseFloat(e.target.value) : undefined,
                                  })
                                }
                                className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingCandidateId(null)}
                              className="rounded px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(cand.id)}
                              className="rounded bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white"
                            >
                              Save Candidate
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-zinc-100 font-mono">
                                {cand.name}
                              </span>
                              {cand.alreadyTracked && (
                                <span className="rounded bg-amber-950/50 border border-amber-800/40 px-1.5 py-0.2 text-[10px] text-amber-300 font-medium">
                                  Already Tracked
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400">
                                ({cand.confidence} confidence)
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 text-zinc-400 text-[11px]">
                              <span>
                                Registrar:{' '}
                                <strong className="text-zinc-300">{cand.registrar}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Renews:{' '}
                                <strong className="text-zinc-300">
                                  {cand.renewalDate ? formatDate(cand.renewalDate) : 'Unknown'}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Cost:{' '}
                                <strong className="text-emerald-400">
                                  {formatCurrency(cand.cost, cand.currency)}
                                </strong>
                              </span>
                            </div>

                            {cand.sourceSnippet && (
                              <div className="text-[10px] text-zinc-400 italic truncate max-w-md">
                                "{cand.sourceSnippet}"
                              </div>
                            )}
                          </div>

                          {/* Candidate Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cand)}
                              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                              title="Edit candidate details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStatus(cand.id, 'ignored')}
                              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition border ${
                                cand.status === 'ignored'
                                  ? 'border-zinc-700 bg-zinc-800 text-zinc-400'
                                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <Ban className="h-3 w-3" />
                              <span>Ignore</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStatus(cand.id, 'accepted')}
                              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition border ${
                                cand.status === 'accepted'
                                  ? 'border-emerald-700 bg-emerald-950/60 text-emerald-300'
                                  : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                              <span>Accept</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Review Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPhase('initial')}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  Back
                </button>
                <button
                  id="btn-commit-gmail-candidates"
                  type="button"
                  onClick={handleCommitReview}
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500"
                >
                  Import Selected Domains
                </button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100">
                Imported {importedCount} {importedCount === 1 ? 'domain' : 'domains'} successfully!
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Candidate records have been added to your Domain Expansion catalog.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="rounded-md bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
