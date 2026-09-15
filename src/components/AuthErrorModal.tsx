import React, { useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  X,
  ArrowRight,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { currentFirebaseConfig } from '../services/firebaseAuth';

export interface AuthErrorInfo {
  code: string;
  message: string;
}

interface AuthErrorModalProps {
  isOpen: boolean;
  error: AuthErrorInfo | null;
  onClose: () => void;
  onRetryPopup: () => void;
  onRetryRedirect: () => void;
}

export const AuthErrorModal: React.FC<AuthErrorModalProps> = ({
  isOpen,
  error,
  onClose,
  onRetryPopup,
  onRetryRedirect,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !error) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain =
    error.code === 'auth/unauthorized-domain' ||
    error.message.toLowerCase().includes('unauthorized domain');
  const isPopupBlocked =
    error.code === 'auth/popup-blocked' ||
    error.code === 'auth/cancelled-popup-request' ||
    error.message.toLowerCase().includes('popup');

  const handleCopyHostname = async () => {
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  const firebaseConsoleUrl = `https://console.firebase.google.com/project/${currentFirebaseConfig.projectId}/authentication/settings`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-error-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200 transition"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with icon */}
        <div className="flex items-start gap-3">
          {isUnauthorizedDomain ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}

          <div className="space-y-1 pr-6">
            <h3 id="auth-error-title" className="text-base font-semibold text-zinc-100">
              {isUnauthorizedDomain
                ? 'Domain Authorization Required'
                : isPopupBlocked
                ? 'Sign-In Popup Blocked'
                : 'Google Sign-In Issue'}
            </h3>
            <p className="text-xs text-zinc-400">
              {isUnauthorizedDomain
                ? 'Your deployment domain must be registered in Firebase to allow Google OAuth.'
                : isPopupBlocked
                ? 'Your browser or environment blocked the authentication popup window.'
                : error.message}
            </p>
          </div>
        </div>

        {/* Content specific to Unauthorized Domain */}
        {isUnauthorizedDomain && (
          <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 text-xs">
            <div>
              <span className="text-zinc-400 block mb-1 font-medium">Current Domain to Authorize:</span>
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-indigo-300">
                <span className="truncate select-all">{currentHostname}</span>
                <button
                  onClick={handleCopyHostname}
                  className="ml-2 inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[11px] font-sans font-medium text-zinc-200 hover:bg-zinc-700 transition"
                  title="Copy domain to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 text-zinc-300">
              <span className="font-semibold text-zinc-200 block">How to resolve (1 minute):</span>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1 leading-relaxed">
                <li>
                  Open your{' '}
                  <a
                    href={firebaseConsoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-indigo-400 hover:underline"
                  >
                    Firebase Console Auth Settings
                    <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                  </a>
                </li>
                <li>Go to the <strong className="text-zinc-200">Authorized domains</strong> tab</li>
                <li>Click <strong className="text-zinc-200">Add domain</strong> and paste <code className="text-indigo-300 font-mono">{currentHostname}</code></li>
                <li>Save and try connecting Google again</li>
              </ol>
            </div>

            <div className="text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-2">
              Firebase Project ID: <code className="font-mono text-zinc-400">{currentFirebaseConfig.projectId}</code>
            </div>
          </div>
        )}

        {/* Content specific to Popup Blocked */}
        {isPopupBlocked && (
          <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 text-xs text-zinc-300">
            <p>
              Browsers like Safari, mobile browsers, or privacy extensions often restrict new popups. You can sign in using full-page redirect instead.
            </p>
            <div className="pt-1">
              <button
                onClick={() => {
                  onClose();
                  onRetryRedirect();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 transition"
              >
                <span>Continue with Redirect Sign-In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* General Error Details if not standard */}
        {!isUnauthorizedDomain && !isPopupBlocked && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400 font-mono break-all">
            Code: {error.code || 'UNKNOWN'}<br />
            Message: {error.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
          >
            Dismiss
          </button>

          {!isPopupBlocked && (
            <>
              <button
                onClick={() => {
                  onClose();
                  onRetryPopup();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry Popup</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onRetryRedirect();
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
              >
                <span>Try Redirect Flow</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
