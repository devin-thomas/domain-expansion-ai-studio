import React from 'react';
import {
  Globe,
  Cloud,
  CloudCheck,
  CloudAlert,
  Loader2,
  Plus,
  LogOut,
  LayoutDashboard,
  ListFilter,
  FileSpreadsheet,
  Settings as SettingsIcon,
} from 'lucide-react';
import { GoogleAuthUser, SyncState } from '../types';

interface HeaderProps {
  currentTab: 'dashboard' | 'domains' | 'import-export' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'domains' | 'import-export' | 'settings') => void;
  syncState: SyncState;
  syncErrorMessage?: string | null;
  user: GoogleAuthUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenAddModal: () => void;
  domainCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  syncState,
  syncErrorMessage,
  user,
  onSignIn,
  onSignOut,
  onOpenAddModal,
  domainCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 lg:flex-nowrap lg:gap-0 lg:px-6">
        {/* Left: Brand + Sync status */}
        <div className="flex min-w-0 items-center gap-4">
          <div
            id="brand-logo"
            className="flex min-w-0 cursor-pointer items-center gap-2 text-zinc-100 transition hover:opacity-90"
            onClick={() => onSelectTab('dashboard')}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Globe className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-zinc-100">
                Domain Expansion
              </span>
              <span className="whitespace-nowrap text-[10px] text-zinc-400">
                {domainCount} {domainCount === 1 ? 'domain' : 'domains'} tracked
              </span>
            </div>
          </div>

          {/* Sync indicator */}
          <div className="hidden items-center lg:flex">
            {syncState === 'syncing' && (
              <div
                id="sync-indicator-syncing"
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-400"
              >
                <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                <span>Syncing to Drive</span>
              </div>
            )}
            {syncState === 'synced' && (
              <div
                id="sync-indicator-synced"
                className="flex items-center gap-1.5 rounded-full border border-emerald-900/40 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-400"
                title="Persisted in your private Google Drive appDataFolder"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Drive Synced</span>
              </div>
            )}
            {syncState === 'offline' && (
              <div
                id="sync-indicator-offline"
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-400"
                title="Operating in local mode. Connect Google Drive to persist in your personal account."
              >
                <Cloud className="h-3 w-3 text-zinc-400" />
                <span>Local Mode</span>
              </div>
            )}
            {syncState === 'error' && (
              <div
                id="sync-indicator-error"
                className="flex items-center gap-1.5 rounded-full border border-rose-900/50 bg-rose-950/40 px-2.5 py-1 text-xs text-rose-400"
                title={syncErrorMessage || 'Failed to sync to Drive'}
              >
                <CloudAlert className="h-3 w-3" />
                <span>Sync Error</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="order-3 flex w-full items-center justify-between gap-1 border-t border-zinc-900/80 pt-2 lg:order-none lg:w-auto lg:border-t-0 lg:pt-0">
          <button
            id="nav-tab-dashboard"
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition lg:flex-none lg:justify-start lg:px-3 ${
              currentTab === 'dashboard'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Dashboard</span>
          </button>
          <button
            id="nav-tab-domains"
            onClick={() => onSelectTab('domains')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition lg:flex-none lg:justify-start lg:px-3 ${
              currentTab === 'domains'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Domains</span>
          </button>
          <button
            id="nav-tab-import-export"
            onClick={() => onSelectTab('import-export')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition lg:flex-none lg:justify-start lg:px-3 ${
              currentTab === 'import-export'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Import / Export</span>
          </button>
          <button
            id="nav-tab-settings"
            onClick={() => onSelectTab('settings')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition lg:flex-none lg:justify-start lg:px-3 ${
              currentTab === 'settings'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Settings</span>
          </button>
        </nav>

        {/* Right: Add Domain + Auth controls */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            id="btn-quick-add-domain"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-zinc-950"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add domain</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <div
                id="user-account-badge"
                className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1"
                title={`Connected as ${user.email || user.displayName}`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-indigo-900/60 text-[10px] font-semibold text-indigo-300 flex items-center justify-center">
                    {(user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden max-w-[110px] truncate text-xs text-zinc-300 lg:inline">
                  {user.email || user.displayName}
                </span>
                <button
                  id="btn-sign-out"
                  onClick={onSignOut}
                  title="Disconnect Google account"
                  aria-label="Disconnect Google account"
                  className="text-zinc-500 hover:text-zinc-300 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              id="btn-header-sign-in"
              onClick={onSignIn}
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span className="hidden lg:inline">Connect Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
