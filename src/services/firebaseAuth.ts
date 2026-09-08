import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleAuthUser } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// In-memory token cache (never in localStorage or sessionStorage per privacy requirement)
let cachedAccessToken: string | null = null;
let cachedGrantedScopes: Set<string> = new Set();
let isSigningIn = false;

// Standard base scope: ONLY drive.appdata for private application storage
export const BASE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export const OPTIONAL_SCOPES = {
  CALENDAR: 'https://www.googleapis.com/auth/calendar.events',
  TASKS: 'https://www.googleapis.com/auth/tasks',
  SHEETS: 'https://www.googleapis.com/auth/spreadsheets',
  GMAIL: 'https://www.googleapis.com/auth/gmail.readonly',
  DRIVE_BACKUP: 'https://www.googleapis.com/auth/drive.file',
} as const;

/**
 * Creates a GoogleAuthProvider configured with specific scopes
 */
function createProvider(scopes: string[] = [BASE_SCOPE]): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  scopes.forEach((scope) => provider.addScope(scope));
  return provider;
}

/**
 * Initializes the auth listener. Clears memory token on logout.
 */
export function initAuthListener(
  onUserChanged: (user: GoogleAuthUser | null, token: string | null) => void
): () => void {
  return onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (firebaseUser) {
      const appUser: GoogleAuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        accessToken: cachedAccessToken || undefined,
      };
      onUserChanged(appUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      cachedGrantedScopes.clear();
      onUserChanged(null, null);
    }
  });
}

export const subscribeToAuthState = (
  onUserChanged: (user: GoogleAuthUser | null) => void
): (() => void) => {
  return initAuthListener((user, token) => {
    if (user && token) {
      user.accessToken = token;
    }
    onUserChanged(user);
  });
};

export const signOutGoogle = signOutUser;
export const requestAdditionalScope = requestIncrementalScope;


/**
 * Signs in with Google requesting ONLY the base Drive appDataFolder scope
 */
export async function signInWithGoogle(): Promise<{ user: GoogleAuthUser; token: string }> {
  try {
    isSigningIn = true;
    const provider = createProvider([BASE_SCOPE]);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google authorization succeeded but no access token was returned.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGrantedScopes.add(BASE_SCOPE);

    const appUser: GoogleAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };

    return { user: appUser, token: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

/**
 * Requests an incremental scope when an optional feature is invoked
 * (Calendar, Tasks, Sheets, Gmail, Drive Backup)
 */
export async function requestIncrementalScope(additionalScope: string): Promise<string> {
  if (!auth.currentUser) {
    // If not signed in yet, sign in with base scope + additional scope
    const provider = createProvider([BASE_SCOPE, additionalScope]);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token.');
    }
    cachedAccessToken = credential.accessToken;
    cachedGrantedScopes.add(BASE_SCOPE);
    cachedGrantedScopes.add(additionalScope);
    return cachedAccessToken;
  }

  // User is already signed in, request additional scope with prompt
  const provider = new GoogleAuthProvider();
  provider.addScope(additionalScope);
  provider.setCustomParameters({ prompt: 'consent' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to obtain access token with required scope.');
  }

  cachedAccessToken = credential.accessToken;
  cachedGrantedScopes.add(additionalScope);
  return cachedAccessToken;
}

/**
 * Checks if a specific scope is known to be granted in current session
 */
export function hasGrantedScope(scope: string): boolean {
  return cachedGrantedScopes.has(scope);
}

/**
 * Returns the currently cached in-memory access token
 */
export function getCachedToken(): string | null {
  return cachedAccessToken;
}

/**
 * Signs the user out and clears the memory cache
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGrantedScopes.clear();
}
