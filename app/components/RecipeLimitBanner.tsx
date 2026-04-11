'use client';

interface RecipeLimitBannerProps {
  count: number;
  limit: number;
  onUpgradeClick: () => void;
}

export default function RecipeLimitBanner({ count, limit, onUpgradeClick }: RecipeLimitBannerProps) {
  if (count < 10 || count >= limit) return null;

  const remaining = limit - count;
  const fillPct   = Math.round((count / limit) * 100);
  const isUrgent  = count >= 13;

  if (isUrgent) {
    return (
      <div className="bg-[var(--color-cream)] border border-orange-100 rounded-2xl px-5 py-4 mb-6">
        <div className="flex items-center justify-between gap-4 mb-2.5">
          <p className="text-sm font-semibold text-cast-iron">
            {remaining === 1 ? 'Only 1 recipe slot left' : `Only ${remaining} recipe slots left`}
          </p>
          <button
            onClick={onUpgradeClick}
            className="text-sm font-semibold text-tomato hover:opacity-75 transition-opacity whitespace-nowrap shrink-0"
          >
            Go Pro →
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-tomato rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <p className="text-xs text-steel mt-1.5">{count} of {limit} free slots used</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <p className="text-sm font-medium text-cast-iron">Recipe slots</p>
        <button
          onClick={onUpgradeClick}
          className="text-sm font-semibold text-light-green hover:text-green transition-colors whitespace-nowrap shrink-0"
        >
          Upgrade →
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-light-green rounded-full transition-all duration-500"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <p className="text-xs text-steel mt-1.5">{count} of {limit} free slots used</p>
    </div>
  );
}
