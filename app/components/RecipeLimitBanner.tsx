'use client';

import { FiAlertTriangle, FiInfo } from 'react-icons/fi';

interface RecipeLimitBannerProps {
  count: number;
  limit: number;
  onUpgradeClick: () => void;
}

export default function RecipeLimitBanner({ count, limit, onUpgradeClick }: RecipeLimitBannerProps) {
  // Silent below 10, modal handles the wall at the limit
  if (count < 10 || count >= limit) return null;

  const remaining = limit - count;
  const isUrgent = count >= 13;

  if (isUrgent) {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
        <FiAlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            {remaining === 1 ? '1 recipe slot left' : `${remaining} recipe slots left`}
          </p>
          <p className="text-xs text-amber-700/80 mt-0.5">
            Using {count} of {limit} free recipes.{' '}
            <button
              onClick={onUpgradeClick}
              className="font-semibold underline underline-offset-2 hover:text-amber-900 transition-colors"
            >
              Go Pro for unlimited storage.
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-3.5 mb-6 shadow-sm">
      <FiInfo className="w-4 h-4 text-steel flex-shrink-0" />
      <p className="text-sm text-steel flex-1">
        Using <span className="font-semibold text-cast-iron">{count} of {limit}</span> free recipe slots.{' '}
        <button
          onClick={onUpgradeClick}
          className="text-light-green font-semibold hover:text-green transition-colors"
        >
          Upgrade to Pro
        </button>{' '}
        for unlimited recipes.
      </p>
    </div>
  );
}
