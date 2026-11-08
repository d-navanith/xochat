import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Message } from '../types';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  message: Message | null;
  customerName?: string;
  isDeleting?: boolean;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  customerName,
  isDeleting = false,
}) => {
  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 p-6 shadow-2xl space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question & Description */}
        <div>
          <h3 className="text-base font-black text-gray-900 leading-snug">
            Are you sure you want to delete that message?
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Immediate recall only. The message will be completely removed from the client's screen without showing "this message was deleted". The inquiry will return to pending status so the team can re-answer.
          </p>
        </div>

        {/* Message Preview Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold">
            <span>@{message.senderUsername || 'agent'} {customerName ? `↳ ${customerName}` : ''}</span>
            <span>{message.timeFormatted}</span>
          </div>
          <div className="text-gray-800 font-medium leading-relaxed bg-white border border-gray-100 p-2.5 rounded-lg shadow-2xs break-words">
            "{message.text}"
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 text-xs font-black text-white bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Message'}
          </button>
        </div>
      </div>
    </div>
  );
};
