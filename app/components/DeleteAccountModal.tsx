'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { UserProfile } from '@/app/models/User';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userProfile: UserProfile | null;
}

const DELETED_ITEMS = [
  'All your recipes and their photos',
  'Your profile and account data',
  'All friend connections',
  'All shared recipe links',
  'All notifications',
];

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  userProfile,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const hasActiveSub = userProfile?.subscriptionStatus === 'active';
  const isConfirmed = confirmText === 'DELETE';

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full bg-white rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FiAlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="text-steel/30 hover:text-steel transition-colors flex-shrink-0 mt-0.5"
                  aria-label="Close"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <Dialog.Title className="text-lg font-bold text-cast-iron mb-1">
                Delete your account
              </Dialog.Title>
              <p className="text-steel mb-4">
                This is permanent and cannot be undone. The following will be deleted immediately:
              </p>

              <ul className="space-y-1.5 mb-4">
                {DELETED_ITEMS.map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-steel">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {hasActiveSub && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
                  <p className="text-sm font-semibold text-amber-800 mb-0.5">Active Pro subscription</p>
                  <p className="text-sm text-amber-700">
                    Your subscription will be cancelled immediately. You will not receive a refund for the remaining billing period.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-cast-iron mb-1.5">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  disabled={loading}
                  placeholder="DELETE"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-cast-iron placeholder:text-steel/30 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-steel border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isConfirmed || loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete account'
                )}
              </button>
            </div>
          </motion.div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
