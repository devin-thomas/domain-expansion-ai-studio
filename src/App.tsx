import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DomainsView } from './components/DomainsView';
import { ImportExportView } from './components/ImportExportView';
import { SettingsView } from './components/SettingsView';
import { DomainModal } from './components/DomainModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CalendarTasksModal } from './components/CalendarTasksModal';
import {
  DomainRecord,
  AppSettings,
  StorageData,
  GoogleAuthUser,
  SyncState,
  SupportedCurrency,
} from './types';
import {
  subscribeToAuthState,
  signInWithGoogle,
  signOutGoogle,
  requestAdditionalScope,
} from './services/firebaseAuth';
import {
  readFromDriveAppDataFolder,
  saveToDriveAppDataFolder,
} from './services/googleDriveStorage';
import { normalizeDomain } from './utils/domainUtils';

const LOCAL_STORAGE_KEY = 'domain_expansion_data_v1';

const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: 'USD',
  reminderOffsets: [60, 30, 14, 7, 1],
  excludeLetExpireFromExpectedSpending: true,
};

const INITIAL_STORAGE: StorageData = {
  version: 1,
  domains: [],
  settings: DEFAULT_SETTINGS,
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'domains' | 'import-export' | 'settings'
  >('dashboard');

  // Navigation Filter state passed from Dashboard to Domains tab
  const [domainsFilterIntention, setDomainsFilterIntention] = useState<string | undefined>(
    undefined
  );
  const [domainsFilterSoon, setDomainsFilterSoon] = useState<boolean | undefined>(undefined);

  // Application Data State
  const [storageData, setStorageData] = useState<StorageData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          version: 1,
          domains: Array.isArray(parsed.domains) ? parsed.domains : [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (e) {
      console.warn('Failed to load local storage cache:', e);
    }
    return INITIAL_STORAGE;
  });

  // Auth & Sync State
  const [user, setUser] = useState<GoogleAuthUser | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Modals state
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [domainModalMode, setDomainModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [activeModalDomain, setActiveModalDomain] = useState<DomainRecord | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<DomainRecord | null>(null);

  const [calendarTasksModalOpen, setCalendarTasksModalOpen] = useState(false);
  const [calendarTasksMode, setCalendarTasksMode] = useState<'calendar' | 'tasks'>('calendar');
  const [domainForCalendarTasks, setDomainForCalendarTasks] = useState<DomainRecord | null>(null);

  // Ref to hold current storageData to avoid sync effect loops
  const storageDataRef = useRef(storageData);
  storageDataRef.current = storageData;

  // Save to local cache on every state change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storageData));
    } catch (e) {
      console.warn('Local storage write failed:', e);
    }
  }, [storageData]);

  // Push to Drive with debounce when user is signed in
  const syncTimeoutRef = useRef<any>(null);
  const triggerDriveSync = useCallback(
    async (dataToSync: StorageData) => {
      if (!user?.accessToken) {
        setSyncState('offline');
        return;
      }

      setSyncState('syncing');
      setSyncErrorMessage(null);

      try {
        await saveToDriveAppDataFolder(user.accessToken, dataToSync);
        setSyncState('synced');
        setLastSyncedAt(new Date().toISOString());
      } catch (err: any) {
        console.error('Drive sync failed:', err);
        setSyncState('error');
        setSyncErrorMessage(err.message || 'Drive sync error');
      }
    },
    [user?.accessToken]
  );

  // Helper to commit state changes & queue sync
  const commitStorageUpdate = useCallback(
    (updater: (prev: StorageData) => StorageData) => {
      setStorageData((prev) => {
        const next = updater(prev);
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        if (user?.accessToken) {
          setSyncState('syncing');
          syncTimeoutRef.current = setTimeout(() => {
            triggerDriveSync(next);
          }, 800);
        }
        return next;
      });
    },
    [user?.accessToken, triggerDriveSync]
  );

  // Subscribe to Auth State
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (authUser) => {
      setUser(authUser);
      if (authUser?.accessToken) {
        setSyncState('syncing');
        try {
          // Attempt to read remote domain-expansion.json from appDataFolder
          const remoteData = await readFromDriveAppDataFolder(authUser.accessToken);
          if (remoteData && Array.isArray(remoteData.domains)) {
            // Found remote data: update local state
            setStorageData({
              version: 1,
              domains: remoteData.domains,
              settings: { ...DEFAULT_SETTINGS, ...(remoteData.settings || {}) },
            });
            setSyncState('synced');
            setLastSyncedAt(new Date().toISOString());
          } else {
            // No remote data yet: push current local state to remote appDataFolder
            await saveToDriveAppDataFolder(authUser.accessToken, storageDataRef.current);
            setSyncState('synced');
            setLastSyncedAt(new Date().toISOString());
          }
        } catch (err: any) {
          console.warn('Initial Drive sync error:', err);
          setSyncState('error');
          setSyncErrorMessage(err.message || 'Failed to connect to Google Drive');
        }
      } else {
        setSyncState('offline');
      }
    });

    return () => unsubscribe();
  }, []);

  // Ensure Scope Handler (for incremental OAuth)
  const handleEnsureScope = async (scope: string): Promise<string> => {
    const token = await requestAdditionalScope(scope);
    return token;
  };

  // Sign In / Sign Out Handlers
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      alert(`Google Sign-In failed: ${err.message || err}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutGoogle();
      setUser(null);
      setSyncState('offline');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Domain CRUD Handlers
  const handleSaveDomain = (domainInput: Partial<DomainRecord>) => {
    commitStorageUpdate((prev) => {
      const normName = normalizeDomain(domainInput.name || '');
      const existingIdx = prev.domains.findIndex(
        (d) => d.id === domainInput.id || d.name.toLowerCase() === normName.toLowerCase()
      );

      const now = new Date().toISOString();

      if (existingIdx >= 0) {
        // Update existing record
        const updatedList = [...prev.domains];
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          ...domainInput,
          name: normName,
          updatedAt: now,
        } as DomainRecord;
        return { ...prev, domains: updatedList };
      } else {
        // Add new record
        const newRecord: DomainRecord = {
          id: 'dom_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
          name: normName,
          registrar: domainInput.registrar || 'Unknown',
          ownership: domainInput.ownership || 'Owned',
          status: domainInput.status || 'Active',
          registrationDate: domainInput.registrationDate || null,
          renewalDate: domainInput.renewalDate || new Date().toISOString().split('T')[0],
          cost: domainInput.cost !== undefined ? domainInput.cost : null,
          currency: domainInput.currency || prev.settings.defaultCurrency,
          autoRenew: Boolean(domainInput.autoRenew),
          renewalIntention: domainInput.renewalIntention || 'Renew',
          notes: domainInput.notes || '',
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, domains: [newRecord, ...prev.domains] };
      }
    });
  };

  const handleDeleteDomain = (domain: DomainRecord) => {
    setDomainToDelete(domain);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!domainToDelete) return;
    commitStorageUpdate((prev) => ({
      ...prev,
      domains: prev.domains.filter((d) => d.id !== domainToDelete.id),
    }));
    setDeleteModalOpen(false);
    setDomainToDelete(null);
  };

  const handleToggleIntention = (domain: DomainRecord) => {
    const nextIntention = domain.renewalIntention === 'Renew' ? 'Let expire' : 'Renew';
    commitStorageUpdate((prev) => ({
      ...prev,
      domains: prev.domains.map((d) =>
        d.id === domain.id
          ? { ...d, renewalIntention: nextIntention, updatedAt: new Date().toISOString() }
          : d
      ),
    }));
  };

  // Quick navigation from dashboard cards to domains list
  const handleNavigateToDomains = (filter?: { intention?: string; soon?: boolean }) => {
    setDomainsFilterIntention(filter?.intention);
    setDomainsFilterSoon(filter?.soon);
    setCurrentTab('domains');
  };

  // Bulk import completed from Import/Export view
  const handleImportCompleted = (updatedDomains: DomainRecord[]) => {
    commitStorageUpdate((prev) => ({
      ...prev,
      domains: updatedDomains,
    }));
  };

  // Settings update
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    commitStorageUpdate((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
  };

  // Reset all data handler
  const handleResetAllData = () => {
    const emptyStorage: StorageData = {
      version: 1,
      domains: [],
      settings: DEFAULT_SETTINGS,
    };
    setStorageData(emptyStorage);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (user?.accessToken) {
      saveToDriveAppDataFolder(user.accessToken, emptyStorage).catch(console.error);
    }
  };

  // Quick modal openers
  const openAddModal = () => {
    setActiveModalDomain(null);
    setDomainModalMode('add');
    setDomainModalOpen(true);
  };

  const openEditModal = (domain: DomainRecord) => {
    setActiveModalDomain(domain);
    setDomainModalMode('edit');
    setDomainModalOpen(true);
  };

  const openViewModal = (domain: DomainRecord) => {
    setActiveModalDomain(domain);
    setDomainModalMode('view');
    setDomainModalOpen(true);
  };

  const openCalendarModal = (domain: DomainRecord) => {
    setDomainForCalendarTasks(domain);
    setCalendarTasksMode('calendar');
    setCalendarTasksModalOpen(true);
  };

  const openTasksModal = (domain: DomainRecord) => {
    setDomainForCalendarTasks(domain);
    setCalendarTasksMode('tasks');
    setCalendarTasksModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white flex flex-col font-sans">
      {/* Header with Navigation & Sync indicators */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        syncState={syncState}
        syncErrorMessage={syncErrorMessage}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenAddModal={openAddModal}
        domainCount={storageData.domains.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 sm:px-6 max-w-7xl mx-auto w-full">
        {currentTab === 'dashboard' && (
          <DashboardView
            domains={storageData.domains}
            settings={storageData.settings}
            onSelectDomain={openViewModal}
            onOpenAddModal={openAddModal}
            onNavigateToDomains={handleNavigateToDomains}
            onToggleIntention={handleToggleIntention}
            onOpenCalendarModal={openCalendarModal}
            onOpenTasksModal={openTasksModal}
          />
        )}

        {currentTab === 'domains' && (
          <DomainsView
            domains={storageData.domains}
            onOpenAddModal={openAddModal}
            onSelectDomain={openViewModal}
            onEditDomain={openEditModal}
            onDeleteDomain={handleDeleteDomain}
            onToggleIntention={handleToggleIntention}
            onOpenCalendarModal={openCalendarModal}
            onOpenTasksModal={openTasksModal}
            initialFilterIntention={domainsFilterIntention}
            initialFilterSoon={domainsFilterSoon}
          />
        )}

        {currentTab === 'import-export' && (
          <ImportExportView
            storageData={storageData}
            onImportCompleted={handleImportCompleted}
            onEnsureScope={handleEnsureScope}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={storageData.settings}
            onUpdateSettings={handleUpdateSettings}
            user={user}
            syncState={syncState}
            lastSyncedAt={lastSyncedAt}
            onSignOut={handleSignOut}
            onForceSync={() => triggerDriveSync(storageData)}
            onResetAllData={handleResetAllData}
          />
        )}
      </main>

      {/* Footer info */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>Domain Expansion — Personal Multi-Registrar Tracking Utility</div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Storage: Google Drive appDataFolder</span>
            <span>•</span>
            <span>Zero Central User Database</span>
          </div>
        </div>
      </footer>

      {/* Domain Add/Edit/View Modal */}
      <DomainModal
        isOpen={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
        onSave={handleSaveDomain}
        initialDomain={activeModalDomain}
        existingDomains={storageData.domains}
        mode={domainModalMode}
        defaultCurrency={storageData.settings.defaultCurrency}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        domain={domainToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDomainToDelete(null);
        }}
      />

      {/* Google Calendar / Google Tasks Modal */}
      <CalendarTasksModal
        isOpen={calendarTasksModalOpen}
        onClose={() => setCalendarTasksModalOpen(false)}
        domain={domainForCalendarTasks}
        mode={calendarTasksMode}
        onEnsureScope={handleEnsureScope}
      />
    </div>
  );
}
