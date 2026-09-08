import { StorageData } from '../types';

export const APP_DATA_FILENAME = 'domain-expansion.json';

export interface DriveFileInfo {
  fileId: string;
  modifiedTime?: string;
  data: StorageData;
}

export const INITIAL_STORAGE_DATA: StorageData = {
  version: 1,
  appName: 'Domain Expansion',
  updatedAt: new Date().toISOString(),
  domains: [],
  settings: {
    defaultCurrency: 'USD',
    reminderOffsets: [30, 14, 7, 1],
    excludeLetExpireFromExpectedSpending: true,
  },
};

/**
 * Finds the domain-expansion.json file in appDataFolder.
 * If found, downloads and parses it.
 * If not found, creates an initial empty file in appDataFolder.
 */
export async function loadOrCreateAppDataFile(accessToken: string): Promise<DriveFileInfo> {
  const searchUrl =
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=' +
    encodeURIComponent(`name = '${APP_DATA_FILENAME}' and trashed = false`) +
    '&fields=files(id,name,modifiedTime)';

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Drive search failed (${searchRes.status}): ${errText}`);
  }

  const searchData = await searchRes.json();
  const existingFiles = searchData.files || [];

  if (existingFiles.length > 0) {
    const fileId = existingFiles[0].id;
    const modifiedTime = existingFiles[0].modifiedTime;

    // Download file content
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!downloadRes.ok) {
      throw new Error(`Failed to read domain-expansion.json from Drive: ${downloadRes.statusText}`);
    }

    const text = await downloadRes.text();
    let data: StorageData;
    try {
      data = JSON.parse(text);
      // Validate schema minimally
      if (!Array.isArray(data.domains)) {
        data.domains = [];
      }
      if (!data.settings) {
        data.settings = { ...INITIAL_STORAGE_DATA.settings };
      }
    } catch {
      console.warn('Corrupted data in Drive, using initial empty data structure');
      data = { ...INITIAL_STORAGE_DATA, updatedAt: new Date().toISOString() };
    }

    return { fileId, modifiedTime, data };
  }

  // File does not exist yet: create it in appDataFolder
  const created = await createAppDataFile(accessToken, INITIAL_STORAGE_DATA);
  return created;
}

/**
 * Creates the initial domain-expansion.json inside appDataFolder
 */
export async function createAppDataFile(
  accessToken: string,
  initialData: StorageData
): Promise<DriveFileInfo> {
  const metadata = {
    name: APP_DATA_FILENAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(initialData, null, 2) +
    closeDelim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create domain-expansion.json in appDataFolder: ${errText}`);
  }

  const result = await res.json();
  return {
    fileId: result.id,
    modifiedTime: new Date().toISOString(),
    data: initialData,
  };
}

/**
 * Updates the existing domain-expansion.json in appDataFolder
 */
export async function saveAppDataFile(
  accessToken: string,
  fileId: string,
  data: StorageData
): Promise<string> {
  const updatedData: StorageData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData, null, 2),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to write to Google Drive appDataFolder: ${err}`);
  }

  const result = await res.json();
  return result.id || fileId;
}

let cachedAppDataFileId: string | null = null;

/**
 * High-level helper to load domain data from Drive appDataFolder
 */
export async function readFromDriveAppDataFolder(accessToken: string): Promise<StorageData> {
  const info = await loadOrCreateAppDataFile(accessToken);
  cachedAppDataFileId = info.fileId;
  return info.data;
}

/**
 * High-level helper to save domain data to Drive appDataFolder
 */
export async function saveToDriveAppDataFolder(
  accessToken: string,
  data: StorageData
): Promise<void> {
  if (!cachedAppDataFileId) {
    const info = await loadOrCreateAppDataFile(accessToken);
    cachedAppDataFileId = info.fileId;
  }
  await saveAppDataFile(accessToken, cachedAppDataFileId, data);
}

/**
 * Creates an explicit visible backup file in user's Google Drive

 * Requires scope: https://www.googleapis.com/auth/drive.file
 */
export async function createDriveVisibleBackup(
  accessToken: string,
  data: StorageData
): Promise<{ id: string; name: string }> {
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const fileName = `Domain-Expansion-Backup-${timestamp}.json`;

  const metadata = {
    name: fileName,
    description: `Domain Expansion manual backup taken on ${new Date().toLocaleString()}`,
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(data, null, 2) +
    closeDelim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create visible Drive backup: ${errText}`);
  }

  const result = await res.json();
  return { id: result.id, name: fileName };
}
