'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-eggshell flex items-center justify-center px-4 py-16">
      <motion.div
        className="w-full max-w-md text-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-cast-iron flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl select-none">🍳</span>
        </div>

        <h1 className="text-2xl font-bold text-cast-iron mb-2">
          Something went wrong
        </h1>
        <p className="text-steel text-sm mb-8 max-w-xs mx-auto leading-relaxed">
          An unexpected error occurred. Try again, or head back home if the problem persists.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-light-green text-white text-sm font-semibold rounded-xl hover:bg-green transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-white border border-gray-200 text-steel text-sm font-semibold rounded-xl hover:border-gray-300 transition-colors"
          >
            Go home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
