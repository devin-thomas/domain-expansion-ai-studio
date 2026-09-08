import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { DomainRecord } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  domain: DomainRecord | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  domain,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !domain) return null;

  return (
    <div
      id="delete-confirm-backdrop"
      className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[100dvw] items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        id="delete-confirm-content"
        className="my-auto w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-rose-400 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-950/60 border border-rose-800/40">
            <Trash2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Confirm Deletion</h3>
            <p className="text-xs text-zinc-400">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed my-4">
          Are you sure you want to permanently delete the domain{' '}
          <strong className="break-all font-mono font-semibold text-zinc-100">{domain.name}</strong> from
          your Domain Expansion records?
        </p>

        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-zinc-800 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onCancel}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 sm:w-auto sm:py-1.5"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            className="w-full rounded-md bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-rose-500 sm:w-auto sm:py-1.5"
          >
            Delete Domain
          </button>
        </div>
      </div>
    </div>
  );
};
