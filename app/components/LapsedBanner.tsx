'use client';

import { FiLock } from 'react-icons/fi';

interface LapsedBannerProps {
  lockedCount: number;
  onReactivateClick: () => void;
}

export default function LapsedBanner({ lockedCount, onReactivateClick }: LapsedBannerProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <FiLock className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-cast-iron">
            {lockedCount > 0
              ? `${lockedCount} ${lockedCount === 1 ? 'recipe is' : 'recipes are'} locked`
              : 'Your Pro recipes are waiting'}
          </p>
          <p className="text-xs text-steel mt-0.5 leading-relaxed">
            {lockedCount > 0
              ? 'These were saved during your Pro subscription. Your oldest 15 are still accessible. Reactivate to unlock all of them.'
              : 'You previously had a Pro subscription. Reactivate to restore full access.'}
          </p>
        </div>
        <button
          onClick={onReactivateClick}
          className="flex-shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors whitespace-nowrap"
        >
          Reactivate →
        </button>
      </div>
    </div>
  );
}
