'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { usePushNotification } from '@/app/hooks/usePushNotification';

const PROMPTED_KEY = 'syft_push_prompted';

export default function PushNotificationPrompt() {
  const { user } = useAuth();
  const { isSupported, subscribe } = usePushNotification();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || !isSupported) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(PROMPTED_KEY)) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    setVisible(true);
  }, [user, isSupported]);

  const dismiss = () => {
    localStorage.setItem(PROMPTED_KEY, '1');
    setVisible(false);
  };

  const handleEnable = async () => {
    localStorage.setItem(PROMPTED_KEY, '1');
    setVisible(false);
    await subscribe();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-80"
        >
          <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-5">
            <p className="text-sm font-bold text-cast-iron mb-1">Stay in the loop</p>
            <p className="text-xs text-steel mb-4">
              Get notified when friends send you recipes or friend requests.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEnable}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-light-green hover:bg-green transition-colors"
              >
                Enable notifications
              </button>
              <button
                onClick={dismiss}
                className="text-sm text-steel/60 hover:text-steel transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
