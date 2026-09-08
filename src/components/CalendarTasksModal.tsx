import React, { useState } from 'react';
import { X, Calendar, ListTodo, CheckCircle2, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { DomainRecord } from '../types';
import { createCalendarRenewalEvent } from '../services/googleCalendar';
import { createRenewalTask } from '../services/googleTasks';
import { formatDate, formatCurrency } from '../utils/domainUtils';

interface CalendarTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: DomainRecord | null;
  mode: 'calendar' | 'tasks';
  onEnsureScope: (scope: string) => Promise<string>;
}

export const CalendarTasksModal: React.FC<CalendarTasksModalProps> = ({
  isOpen,
  onClose,
  domain,
  mode,
  onEnsureScope,
}) => {
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    link?: string;
    alreadyExisted?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !domain) return null;

  const isCalendar = mode === 'calendar';

  const handleAction = async () => {
    setLoading(true);
    setError(null);
    setSuccessResult(null);

    try {
      if (isCalendar) {
        // Request Google Calendar scope
        const token = await onEnsureScope('https://www.googleapis.com/auth/calendar.events');
        const res = await createCalendarRenewalEvent(token, domain);
        if (res.alreadyExisted) {
          setSuccessResult({
            message: `A renewal event for ${domain.name} already exists on your Google Calendar.`,
            link: res.htmlLink,
            alreadyExisted: true,
          });
        } else {
          setSuccessResult({
            message: `Successfully scheduled renewal event for ${domain.name} in your Google Calendar!`,
            link: res.htmlLink,
            alreadyExisted: false,
          });
        }
      } else {
        // Request Google Tasks scope
        const token = await onEnsureScope('https://www.googleapis.com/auth/tasks');
        const res = await createRenewalTask(token, domain);
        if (res.alreadyExisted) {
          setSuccessResult({
            message: `A task "Renew ${domain.name}" already exists in your Google Tasks.`,
            alreadyExisted: true,
          });
        } else {
          setSuccessResult({
            message: `Created renewal task "Renew ${domain.name}" due on ${formatDate(domain.renewalDate)}.`,
            alreadyExisted: false,
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Action failed. Ensure Google permissions are granted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="calendar-tasks-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="calendar-tasks-content"
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            {isCalendar ? (
              <Calendar className="h-4 w-4 text-indigo-400" />
            ) : (
              <ListTodo className="h-4 w-4 text-emerald-400" />
            )}
            <h3 className="text-sm font-semibold text-zinc-100">
              {isCalendar ? 'Add to Google Calendar' : 'Add to Google Tasks'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successResult ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-200">{successResult.message}</p>
                {successResult.link && (
                  <a
                    href={successResult.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-indigo-400 hover:underline"
                  >
                    <span>Open in Google Calendar</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="rounded-md bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Target Domain:</span>
                <span className="font-semibold text-zinc-200">{domain.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Registrar:</span>
                <span className="text-zinc-200">{domain.registrar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Renewal Date:</span>
                <span className="font-mono text-zinc-200">{formatDate(domain.renewalDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Renewal Cost:</span>
                <span className="font-medium text-emerald-400">
                  {formatCurrency(domain.cost, domain.currency)}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              {isCalendar
                ? 'This will create an all-day reminder event on your Google Calendar with 7-day and 1-day advance notifications.'
                : 'This will add a renewal task to your Google Tasks list with the renewal date as the due date.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-calendar-tasks"
                type="button"
                onClick={handleAction}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isCalendar ? 'Create Calendar Event' : 'Create Google Task'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
