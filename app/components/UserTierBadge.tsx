import { UserTier } from "@/app/lib/tiers";

interface UserTierBadgeProps {
  tier: UserTier;
  showLabel?: boolean;
  className?: string;
}

export default function UserTierBadge({ 
  tier, 
  showLabel = true,
  className = ""
}: UserTierBadgeProps) {
  const tierColors = {
    'Free': 'bg-gray-100 text-gray-800',
    'Pro': 'bg-light-green text-white',
    'Beta Tester': 'bg-purple-100 text-purple-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierColors[tier]} ${className}`}>
      {showLabel && 'Tier: '}
      {tier}
    </span>
  );
} 