import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleAuthUser } from '../types';

// Environment variable overrides with fallback to firebase-applet-config.json
export const currentFirebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || '',
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(currentFirebaseConfig) : getApp();
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

// Subscriber system so all UI components update synchronously when tokens or auth state change
type AuthSubscriber = (user: GoogleAuthUser | null, token: string | null) => void;
const subscribers = new Set<AuthSubscriber>();

function notifySubscribers() {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    const appUser: GoogleAuthUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      accessToken: cachedAccessToken || undefined,
    };
    subscribers.forEach((cb) => {
      try {
        cb(appUser, cachedAccessToken);
      } catch (err) {
        console.error('Error in auth subscriber callback:', err);
      }
    });
  } else {
    subscribers.forEach((cb) => {
      try {
        cb(null, null);
      } catch (err) {
        console.error('Error in auth subscriber callback:', err);
      }
    });
  }
}

// Hook into Firebase auth state changes
onAuthStateChanged(auth, (_firebaseUser: User | null) => {
  if (!_firebaseUser) {
    cachedAccessToken = null;
    cachedGrantedScopes.clear();
  }
  notifySubscribers();
});

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
  subscribers.add(onUserChanged);

  // Invoke immediately with current known state
  if (auth.currentUser) {
    const appUser: GoogleAuthUser = {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
      photoURL: auth.currentUser.photoURL,
      accessToken: cachedAccessToken || undefined,
    };
    onUserChanged(appUser, cachedAccessToken);
  } else {
    onUserChanged(null, null);
  }

  return () => {
    subscribers.delete(onUserChanged);
  };
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
 * Processes redirect result on page mount if user logged in via signInWithRedirect
 */
export async function handleRedirectResult(): Promise<{ user: GoogleAuthUser; token: string } | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      cachedGrantedScopes.add(BASE_SCOPE);
      notifySubscribers();

      const appUser: GoogleAuthUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        accessToken: cachedAccessToken,
      };

      return { user: appUser, token: cachedAccessToken };
    }
    return null;
  } catch (error) {
    console.error('Redirect sign-in error:', error);
    throw error;
  }
}

/**
 * Signs in with Google using redirect flow (ideal for mobile or environments where popups are blocked)
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  const provider = createProvider([BASE_SCOPE]);
  await signInWithRedirect(auth, provider);
}

/**
 * Signs in with Google requesting base Drive appDataFolder scope.
 * Supports popup with optional direct redirect or fallback.
 */
export async function signInWithGoogle(options?: {
  preferRedirect?: boolean;
}): Promise<{ user: GoogleAuthUser; token: string } | null> {
  const provider = createProvider([BASE_SCOPE]);

  if (options?.preferRedirect) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google authorization succeeded but no access token was returned.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGrantedScopes.add(BASE_SCOPE);
    notifySubscribers();

    const appUser: GoogleAuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      accessToken: cachedAccessToken,
    };

    return { user: appUser, token: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

/**
 * Re-authenticates or reconnects the Google Drive OAuth token for the current session
 */
export async function reconnectGoogleToken(
  preferRedirect = false
): Promise<{ user: GoogleAuthUser; token: string } | null> {
  return signInWithGoogle({ preferRedirect });
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
    notifySubscribers();
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
  notifySubscribers();
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
  notifySubscribers();
}
