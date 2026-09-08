import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Plus,
  CalendarPlus,
  ListTodo,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { DomainRecord, DomainStatus, OwnershipType, RenewalIntention } from '../types';
import {
  formatDate,
  formatCurrency,
  getDaysUntil,
  getRenewalUrgency,
  COMMON_REGISTRARS,
} from '../utils/domainUtils';

interface DomainsViewProps {
  domains: DomainRecord[];
  onOpenAddModal: () => void;
  onSelectDomain: (domain: DomainRecord) => void;
  onEditDomain: (domain: DomainRecord) => void;
  onDeleteDomain: (domain: DomainRecord) => void;
  onToggleIntention: (domain: DomainRecord) => void;
  onOpenCalendarModal: (domain: DomainRecord) => void;
  onOpenTasksModal: (domain: DomainRecord) => void;
  initialFilterIntention?: string;
  initialFilterSoon?: boolean;
}

type SortField = 'renewalDate' | 'name' | 'cost';
type SortOrder = 'asc' | 'desc';

export const DomainsView: React.FC<DomainsViewProps> = ({
  domains,
  onOpenAddModal,
  onSelectDomain,
  onEditDomain,
  onDeleteDomain,
  onToggleIntention,
  onOpenCalendarModal,
  onOpenTasksModal,
  initialFilterIntention,
  initialFilterSoon,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegistrar, setSelectedRegistrar] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOwnership, setSelectedOwnership] = useState<string>('all');
  const [selectedIntention, setSelectedIntention] = useState<string>(
    initialFilterIntention || 'all'
  );
  const [filterSoonOnly, setFilterSoonOnly] = useState<boolean>(Boolean(initialFilterSoon));

  const [sortField, setSortField] = useState<SortField>('renewalDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Active registrars extracted from current domains
  const availableRegistrars = useMemo(() => {
    const set = new Set<string>();
    domains.forEach((d) => {
      if (d.registrar) set.add(d.registrar);
    });
    return Array.from(set).sort();
  }, [domains]);

  // Filter & Sort
  const filteredDomains = useMemo(() => {
    return domains
      .filter((d) => {
        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = d.name.toLowerCase().includes(q);
          const matchReg = d.registrar?.toLowerCase().includes(q);
          const matchNotes = d.notes?.toLowerCase().includes(q);
          if (!matchName && !matchReg && !matchNotes) return false;
        }

        // Registrar filter
        if (selectedRegistrar !== 'all' && d.registrar !== selectedRegistrar) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'all' && d.status !== selectedStatus) {
          return false;
        }

        // Ownership filter
        if (selectedOwnership !== 'all' && d.ownership !== selectedOwnership) {
          return false;
        }

        // Renewal intention filter
        if (selectedIntention !== 'all' && d.renewalIntention !== selectedIntention) {
          return false;
        }

        // Soon only filter (within 30 days)
        if (filterSoonOnly) {
          const days = getDaysUntil(d.renewalDate);
          if (days > 30) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'renewalDate') {
          comp = a.renewalDate.localeCompare(b.renewalDate);
        } else if (sortField === 'name') {
          comp = a.name.localeCompare(b.name);
        } else if (sortField === 'cost') {
          const costA = a.cost ?? -1;
          const costB = b.cost ?? -1;
          comp = costA - costB;
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [
    domains,
    searchTerm,
    selectedRegistrar,
    selectedStatus,
    selectedOwnership,
    selectedIntention,
    filterSoonOnly,
    sortField,
    sortOrder,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedRegistrar('all');
    setSelectedStatus('all');
    setSelectedOwnership('all');
    setSelectedIntention('all');
    setFilterSoonOnly(false);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedRegistrar !== 'all' ||
    selectedStatus !== 'all' ||
    selectedOwnership !== 'all' ||
    selectedIntention !== 'all' ||
    filterSoonOnly;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4">
        {/* Search and Top Action */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              id="input-search-domains"
              type="text"
              placeholder="Search domains, registrars, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                id="btn-reset-filters"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition px-2 py-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset filters</span>
              </button>
            )}
            <button
              id="btn-add-domain-domains-view"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add domain</span>
            </button>
          </div>
        </div>

        {/* Filter and Sort Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80 text-xs">
          {/* Registrar */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Registrar:</span>
            <select
              id="filter-registrar"
              value={selectedRegistrar}
              onChange={(e) => setSelectedRegistrar(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Registrars</option>
              {availableRegistrars.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Status:</span>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>

          {/* Ownership */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Ownership:</span>
            <select
              id="filter-ownership"
              value={selectedOwnership}
              onChange={(e) => setSelectedOwnership(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="Owned">Owned</option>
              <option value="Managed">Managed</option>
            </select>
          </div>

          {/* Renewal Intention */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Intention:</span>
            <select
              id="filter-intention"
              value={selectedIntention}
              onChange={(e) => setSelectedIntention(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="Renew">Renew</option>
              <option value="Let expire">Let expire</option>
            </select>
          </div>

          {/* Soon Only Toggle */}
          <button
            id="filter-soon-toggle"
            onClick={() => setFilterSoonOnly(!filterSoonOnly)}
            className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition ${
              filterSoonOnly
                ? 'border-amber-700 bg-amber-950/50 text-amber-300'
                : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>≤ 30d renewal</span>
          </button>

          <div className="ml-auto text-zinc-400 text-[11px]">
            Showing <strong className="text-zinc-200">{filteredDomains.length}</strong> of{' '}
            {domains.length}
          </div>
        </div>
      </div>

      {/* Mobile record cards keep the full domain workflow available without horizontal scrolling. */}
      <div id="mobile-domain-list" className="space-y-3 lg:hidden">
        {filteredDomains.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-12 text-center text-xs text-zinc-500">
            No matching domains found.
          </div>
        ) : (
          filteredDomains.map((domain) => {
            const days = getDaysUntil(domain.renewalDate);
            const urgency = getRenewalUrgency(days);
            const isLetExpire = domain.renewalIntention === 'Let expire';
            const mobileDomainId = domain.name.replace(/[^a-z0-9]/g, '-');

            return (
              <article
                key={domain.id}
                id={`mobile-domain-card-${mobileDomainId}`}
                className={`overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm ${
                  isLetExpire ? 'opacity-75 bg-zinc-950/30' : ''
                }`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectDomain(domain)}
                      className={`block min-w-0 max-w-full break-all text-left text-sm font-semibold text-zinc-100 transition hover:text-indigo-400 ${
                        isLetExpire ? 'line-through text-zinc-400' : ''
                      }`}
                    >
                      {domain.name}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          urgency.level === 'critical' || urgency.level === 'overdue'
                            ? 'border border-rose-800/40 bg-rose-950/50 text-rose-300'
                            : urgency.level === 'soon'
                            ? 'border border-amber-800/40 bg-amber-950/50 text-amber-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {urgency.label}
                      </span>
                      {domain.autoRenew && (
                        <span className="rounded border border-emerald-900/30 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] text-emerald-400/90">
                          Auto-renew
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-1 text-[10px] font-medium ${
                      domain.status === 'Active'
                        ? 'border border-emerald-900/40 bg-emerald-950/40 text-emerald-300'
                        : domain.status === 'Inactive'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'border border-amber-900/40 bg-amber-950/40 text-amber-300'
                    }`}
                  >
                    {domain.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-zinc-800/80 px-3 py-3 text-xs">
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Registrar</span>
                    <span className="mt-0.5 block break-words text-zinc-200">{domain.registrar || '—'}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Renewal</span>
                    <span className="mt-0.5 block break-words font-mono text-zinc-200">
                      {formatDate(domain.renewalDate)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Cost</span>
                    <span className="mt-0.5 block break-words font-mono font-medium text-zinc-200">
                      {formatCurrency(domain.cost, domain.currency)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Ownership</span>
                    <span className="mt-0.5 block break-words text-zinc-200">{domain.ownership}</span>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Renewal intention</span>
                    <button
                      type="button"
                      onClick={() => onToggleIntention(domain)}
                      title="Click to toggle renewal intention"
                      className={`mt-1 min-h-8 rounded border px-2 py-1 text-xs font-medium transition ${
                        isLetExpire
                          ? 'border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {domain.renewalIntention}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/80 p-3">
                  <button
                    id={`mobile-btn-calendar-${mobileDomainId}`}
                    type="button"
                    onClick={() => onOpenCalendarModal(domain)}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
                  >
                    <CalendarPlus className="h-3.5 w-3.5 text-indigo-400" />
                    Calendar
                  </button>
                  <button
                    id={`mobile-btn-tasks-${mobileDomainId}`}
                    type="button"
                    onClick={() => onOpenTasksModal(domain)}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
                  >
                    <ListTodo className="h-3.5 w-3.5 text-emerald-400" />
                    Task
                  </button>
                  <button
                    id={`mobile-btn-edit-${mobileDomainId}`}
                    type="button"
                    onClick={() => onEditDomain(domain)}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    id={`mobile-btn-delete-${mobileDomainId}`}
                    type="button"
                    onClick={() => onDeleteDomain(domain)}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-rose-900/60 bg-rose-950/30 px-2 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-900/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Main Dense Table */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm lg:block">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase tracking-wider text-[10px]">
              <th
                onClick={() => toggleSort('name')}
                className="cursor-pointer px-4 py-3 font-semibold hover:text-zinc-200 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Domain</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-3 py-3 font-semibold">Registrar</th>
              <th
                onClick={() => toggleSort('renewalDate')}
                className="cursor-pointer px-3 py-3 font-semibold hover:text-zinc-200 transition"
              >
                <div className="flex items-center gap-1">
                  <span>Renewal Date</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('cost')}
                className="cursor-pointer px-3 py-3 font-semibold hover:text-zinc-200 transition text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Cost</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-3 py-3 font-semibold text-center">Status</th>
              <th className="px-3 py-3 font-semibold text-center">Intention</th>
              <th className="px-3 py-3 font-semibold text-center">Ownership</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredDomains.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  No matching domains found.
                </td>
              </tr>
            ) : (
              filteredDomains.map((domain) => {
                const days = getDaysUntil(domain.renewalDate);
                const urgency = getRenewalUrgency(days);
                const isLetExpire = domain.renewalIntention === 'Let expire';

                return (
                  <tr
                    key={domain.id}
                    id={`domain-row-${domain.name.replace(/[^a-z0-9]/g, '-')}`}
                    className={`hover:bg-zinc-800/40 transition ${
                      isLetExpire ? 'opacity-75 bg-zinc-950/30' : ''
                    }`}
                  >
                    {/* Domain Name + auto-renew badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-zinc-100 hover:text-indigo-400 cursor-pointer transition ${
                            isLetExpire ? 'line-through text-zinc-400' : ''
                          }`}
                          onClick={() => onSelectDomain(domain)}
                        >
                          {domain.name}
                        </span>
                        {domain.autoRenew && (
                          <span
                            className="rounded bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.2 text-[9px] font-medium text-emerald-400"
                            title="Auto-renew enabled"
                          >
                            Auto
                          </span>
                        )}
                      </div>
                      {domain.notes && (
                        <div className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                          {domain.notes}
                        </div>
                      )}
                    </td>

                    {/* Registrar */}
                    <td className="px-3 py-3 text-zinc-300">
                      {domain.registrar || '—'}
                    </td>

                    {/* Renewal Date + Countdown Badge */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-200">
                          {formatDate(domain.renewalDate)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            urgency.level === 'critical' || urgency.level === 'overdue'
                              ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                              : urgency.level === 'soon'
                              ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {urgency.label}
                        </span>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono font-medium text-zinc-200">
                        {formatCurrency(domain.cost, domain.currency)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${
                          domain.status === 'Active'
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                            : domain.status === 'Inactive'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-amber-950/40 text-amber-300 border border-amber-900/40'
                        }`}
                      >
                        {domain.status}
                      </span>
                    </td>

                    {/* Renewal Intention */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => onToggleIntention(domain)}
                        title="Click to toggle renewal intention"
                        className={`rounded px-2 py-0.5 text-[10px] font-medium transition border ${
                          isLetExpire
                            ? 'border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {domain.renewalIntention}
                      </button>
                    </td>

                    {/* Ownership */}
                    <td className="px-3 py-3 text-center text-zinc-400 text-[11px]">
                      {domain.ownership}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`btn-calendar-${domain.name.replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => onOpenCalendarModal(domain)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-indigo-400 transition"
                          title="Schedule Google Calendar Event"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`btn-tasks-${domain.name.replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => onOpenTasksModal(domain)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition"
                          title="Create Google Task"
                        >
                          <ListTodo className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`btn-edit-${domain.name.replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => onEditDomain(domain)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
                          title="Edit Domain"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`btn-delete-${domain.name.replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => onDeleteDomain(domain)}
                          className="rounded p-1 text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400 transition"
                          title="Delete Domain"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
