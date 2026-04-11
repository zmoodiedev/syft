'use client';

import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

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
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-tomato/10 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-tomato text-lg" />
              </div>
              <button
                onClick={onClose}
                className="text-steel/30 hover:text-steel transition-colors flex-shrink-0 mt-0.5"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <Dialog.Title className="text-lg font-bold text-cast-iron mb-1">
              {title}
            </Dialog.Title>
            <p className="text-sm text-steel leading-relaxed">{message}</p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-steel border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-tomato hover:bg-tomato/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Working...
                </>
              ) : confirmLabel}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
