import React from 'react';
import {
  Calendar,
  DollarSign,
  AlertTriangle,
  Globe,
  ArrowRight,
  ExternalLink,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  ListTodo,
} from 'lucide-react';
import { DomainRecord, AppSettings } from '../types';
import {
  calculateExpectedSpending,
  getNextUpcomingRenewal,
  getDaysUntil,
  formatDate,
  formatCurrency,
  getRenewalUrgency,
  CURRENCY_SYMBOLS,
} from '../utils/domainUtils';

interface DashboardViewProps {
  domains: DomainRecord[];
  settings: AppSettings;
  onSelectDomain: (domain: DomainRecord) => void;
  onOpenAddModal: () => void;
  onNavigateToDomains: (filter?: { intention?: string; soon?: boolean }) => void;
  onToggleIntention: (domain: DomainRecord) => void;
  onOpenCalendarModal: (domain: DomainRecord) => void;
  onOpenTasksModal: (domain: DomainRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  domains,
  settings,
  onSelectDomain,
  onOpenAddModal,
  onNavigateToDomains,
  onToggleIntention,
  onOpenCalendarModal,
  onOpenTasksModal,
}) => {
  const activeDomains = domains.filter((d) => d.status === 'Active');
  const { domain: nextDomain, daysUntil: nextDaysUntil } = getNextUpcomingRenewal(domains);

  const { totalsByCurrency, unpricedCount, eligibleCount } = calculateExpectedSpending(
    domains,
    settings.excludeLetExpireFromExpectedSpending
  );

  const currenciesWithTotals = Object.entries(totalsByCurrency) as [string, number][];

  // Domains renewing soon (within max reminder offset or 30 days)
  const maxOffset = Math.max(...settings.reminderOffsets, 30);
  const renewingSoonDomains = activeDomains
    .map((d) => ({ domain: d, days: getDaysUntil(d.renewalDate) }))
    .filter((x) => x.days <= maxOffset)
    .sort((a, b) => a.days - b.days);

  // If there are no domains at all, clean empty state as required:
  // "A suitable empty state is simply: No domains yet. with an Add domain action."
  if (domains.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-20 px-4 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400">
          <Globe className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-medium text-zinc-100 mb-1">No domains yet.</h2>
        <p className="text-xs text-zinc-400 mb-6 max-w-sm mx-auto">
          Add your first domain to track renewal dates, costs, and multi-registrar portfolio totals.
        </p>
        <button
          id="empty-state-add-domain"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add domain</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top metrics grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Next upcoming renewal */}
        <div
          id="metric-next-renewal"
          className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-zinc-700"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-400">Next Renewal</span>
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          {nextDomain ? (
            <div className="mt-2">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="truncate text-base font-semibold text-zinc-100 hover:text-indigo-400 cursor-pointer"
                  onClick={() => onSelectDomain(nextDomain)}
                >
                  {nextDomain.name}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    nextDaysUntil <= 7
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                      : nextDaysUntil <= 30
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {getRenewalUrgency(nextDaysUntil).label}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
                <span>{formatDate(nextDomain.renewalDate)}</span>
                <span className="font-medium text-zinc-200">
                  {formatCurrency(nextDomain.cost, nextDomain.currency)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400 truncate">
                {nextDomain.registrar || 'Unknown registrar'}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-zinc-400">No active renewals scheduled</div>
          )}
        </div>

        {/* Metric 2: Active Domains */}
        <div
          id="metric-active-domains"
          onClick={() => onNavigateToDomains()}
          className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-zinc-700"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-400">Active Domains</span>
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-zinc-100">
              {activeDomains.length}
            </span>
            <span className="text-xs text-zinc-400">
              of {domains.length} total
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
            <span>{domains.filter((d) => d.ownership === 'Owned').length} owned</span>
            <span>•</span>
            <span>{domains.filter((d) => d.ownership === 'Managed').length} managed</span>
          </div>
        </div>

        {/* Metric 3: Domains renewing soon */}
        <div
          id="metric-renewing-soon"
          onClick={() => onNavigateToDomains({ soon: true })}
          className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-zinc-700"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-400">Renewing Soon (≤{maxOffset}d)</span>
            <AlertTriangle
              className={`h-3.5 w-3.5 ${
                renewingSoonDomains.length > 0 ? 'text-amber-400' : 'text-zinc-500'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold tracking-tight ${
                renewingSoonDomains.length > 0 ? 'text-amber-300' : 'text-zinc-100'
              }`}
            >
              {renewingSoonDomains.length}
            </span>
            <span className="text-xs text-zinc-400">attention required</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            {renewingSoonDomains.filter((x) => x.days <= 7).length > 0
              ? `${renewingSoonDomains.filter((x) => x.days <= 7).length} critical within 7 days`
              : 'None within 7 days'}
          </div>
        </div>

        {/* Metric 4: Expected 12-Month Spending */}
        <div
          id="metric-expected-spending"
          className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-zinc-700"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-400">12-Month Expected Spending</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2">
            {currenciesWithTotals.length > 0 ? (
              <div className="space-y-1">
                {currenciesWithTotals.map(([cur, amount]) => (
                  <div key={cur} className="flex items-baseline justify-between">
                    <span className="text-lg font-bold tracking-tight text-zinc-100">
                      {CURRENCY_SYMBOLS[cur as any] || ''}
                      {amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400">{cur}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-lg font-bold text-zinc-400">$0.00 USD</div>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{eligibleCount} eligible renewals</span>
            {unpricedCount > 0 && (
              <span className="text-amber-400/90 font-medium" title="Domains missing a renewal price are not included in spending totals">
                {unpricedCount} unpriced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Featured next renewal banner card if nextDomain exists */}
      {nextDomain && (
        <div
          id="spotlight-next-renewal"
          className="rounded-xl border border-indigo-900/40 bg-gradient-to-r from-indigo-950/20 via-zinc-900/80 to-zinc-900/80 p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                  Next To Expire / Renew
                </span>
                <span className="text-xs text-zinc-400">
                  {nextDaysUntil === 0
                    ? 'Expires today'
                    : nextDaysUntil < 0
                    ? `${Math.abs(nextDaysUntil)} days overdue`
                    : `${nextDaysUntil} days remaining`}
                </span>
              </div>
              <h3
                className="text-xl font-bold text-zinc-100 cursor-pointer hover:text-indigo-400 transition"
                onClick={() => onSelectDomain(nextDomain)}
              >
                {nextDomain.name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-300">
                <div>
                  <span className="text-zinc-400">Registrar:</span>{' '}
                  <span className="font-medium text-zinc-200">{nextDomain.registrar}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Renewal Date:</span>{' '}
                  <span className="font-medium text-zinc-200">
                    {formatDate(nextDomain.renewalDate)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Cost:</span>{' '}
                  <span className="font-medium text-emerald-400">
                    {formatCurrency(nextDomain.cost, nextDomain.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Intention:</span>{' '}
                  <span
                    className={`font-medium ${
                      nextDomain.renewalIntention === 'Let expire'
                        ? 'text-rose-400'
                        : 'text-indigo-300'
                    }`}
                  >
                    {nextDomain.renewalIntention}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions for this next domain */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
              <button
                id="btn-spotlight-toggle-intention"
                onClick={() => onToggleIntention(nextDomain)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition border ${
                  nextDomain.renewalIntention === 'Let expire'
                    ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                    : 'border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                }`}
              >
                {nextDomain.renewalIntention === 'Let expire'
                  ? 'Restore to Renew'
                  : 'Mark Let expire'}
              </button>

              <button
                id="btn-spotlight-calendar"
                onClick={() => onOpenCalendarModal(nextDomain)}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
                title="Create Google Calendar reminder"
              >
                <CalendarPlus className="h-3.5 w-3.5 text-indigo-400" />
                <span>Calendar</span>
              </button>

              <button
                id="btn-spotlight-tasks"
                onClick={() => onOpenTasksModal(nextDomain)}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
                title="Create Google Task"
              >
                <ListTodo className="h-3.5 w-3.5 text-emerald-400" />
                <span>Task</span>
              </button>

              <button
                id="btn-spotlight-view-details"
                onClick={() => onSelectDomain(nextDomain)}
                className="flex items-center gap-1 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
              >
                <span>Details</span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewing Soon Table / List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">Upcoming Renewals</h3>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
              {renewingSoonDomains.length}
            </span>
          </div>
          <button
            id="btn-view-all-domains"
            onClick={() => onNavigateToDomains()}
            className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition"
          >
            <span>View all domains</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {renewingSoonDomains.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            No domains renewing within {maxOffset} days. All active domains are in good standing.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {renewingSoonDomains.slice(0, 8).map(({ domain, days }) => {
              const urgency = getRenewalUrgency(days, settings.reminderOffsets);
              return (
                <div
                  key={domain.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-zinc-800/30 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                        urgency.level === 'critical' || urgency.level === 'overdue'
                          ? 'border-rose-800/60 bg-rose-950/40 text-rose-300'
                          : 'border-amber-800/60 bg-amber-950/40 text-amber-300'
                      }`}
                    >
                      {days <= 0 ? '!' : `${days}d`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium text-sm text-zinc-100 hover:text-indigo-400 cursor-pointer transition"
                          onClick={() => onSelectDomain(domain)}
                        >
                          {domain.name}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                            domain.renewalIntention === 'Let expire'
                              ? 'border-rose-900/60 bg-rose-950/50 text-rose-300'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {domain.renewalIntention}
                        </span>
                        {domain.autoRenew && (
                          <span className="text-[10px] text-emerald-400/80 bg-emerald-950/30 border border-emerald-900/30 px-1.5 rounded">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-400">
                        <span>{domain.registrar}</span>
                        <span>•</span>
                        <span>Renews: {formatDate(domain.renewalDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-10 sm:pl-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-zinc-200">
                        {formatCurrency(domain.cost, domain.currency)}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {urgency.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSelectDomain(domain)}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                        title="View details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
