'use client';

import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          as={motion.div}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-tomato/10 flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-tomato" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <Dialog.Title className="text-base font-bold text-cast-iron">
                {title}
              </Dialog.Title>
              <p className="text-sm text-steel mt-1 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-steel/40 hover:text-steel transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-steel border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-tomato hover:bg-tomato/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Deleting...' : confirmLabel}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
