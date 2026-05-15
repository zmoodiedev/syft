'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const STORAGE_KEY = 'syft_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 z-50 w-72 bg-white rounded-2xl shadow-lg border border-gray-100 p-4"
        >
          <p className="text-sm font-semibold text-cast-iron mb-1">Cookies</p>
          <p className="text-xs text-steel leading-relaxed mb-4">
            We use cookies to keep you signed in and understand how Syft is used. No ads, ever.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={accept}
              className="flex-1 bg-light-green text-white text-xs font-semibold py-2 rounded-xl hover:bg-green transition-colors"
            >
              Got it
            </button>
            <Link
              href="/cookie-preferences"
              className="text-xs text-steel hover:text-cast-iron transition-colors whitespace-nowrap"
            >
              Learn more
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
