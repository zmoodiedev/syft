'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { FiX, FiCheck } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { logEvent } from '@/app/lib/analytics';

export type UpgradeReason = 'recipe_limit' | 'social_features' | 'recipe_sharing';

type Currency = 'USD' | 'CAD';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
}

const COPY: Record<UpgradeReason, { title: string; body: string; features: string[] }> = {
  recipe_limit: {
    title: "You've hit your recipe limit",
    body: 'Free accounts can store up to 15 recipes. Go Pro for unlimited storage and social features.',
    features: ['Unlimited recipes', 'Friends network', 'Recipe sharing'],
  },
  social_features: {
    title: 'Social features are Pro-only',
    body: 'Adding friends and building your network requires a Pro account.',
    features: ['Add unlimited friends', 'Share recipes directly', "See friends' collections"],
  },
  recipe_sharing: {
    title: 'Recipe sharing is Pro-only',
    body: 'Send and receive recipes with friends on Pro.',
    features: ['Share with anyone on Syft', 'Receive shared recipes', 'Build a friends network'],
  },
};

const PRICES = {
  yearly:  { USD: '$24.99', CAD: 'C$34.49' },
  monthly: { USD: '$3.49',  CAD: 'C$4.82'  },
};

export default function UpgradeModal({ isOpen, onClose, reason = 'recipe_limit' }: UpgradeModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<Currency>('USD');
  const copy = COPY[reason];

  useEffect(() => {
    if (isOpen && user) logEvent(user, 'upgrade_modal_opened', { reason });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleUpgrade = async (planId: 'monthly' | 'yearly') => {
    if (!user) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId, currency }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Could not start checkout. Please try again.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          as={motion.div}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-cast-iron px-6 py-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-bold text-white">
                {copy.title}
              </Dialog.Title>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">{copy.body}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors flex-shrink-0 mt-0.5"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Features + CTAs */}
          <div className="px-6 py-5">
            <ul className="space-y-2.5 mb-6">
              {copy.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-cast-iron">
                  <FiCheck className="w-4 h-4 text-light-green flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Currency toggle */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-steel/60">Currency</span>
              <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
                {(['USD', 'CAD'] as Currency[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      currency === c ? 'bg-white text-cast-iron shadow-sm' : 'text-steel hover:text-cast-iron'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleUpgrade('yearly')}
                disabled={loading}
                className="w-full bg-light-green text-white py-3 rounded-xl text-sm font-semibold hover:bg-green transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                Go Pro — {PRICES.yearly[currency]}/yr
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Best value</span>
              </button>
              <button
                onClick={() => handleUpgrade('monthly')}
                disabled={loading}
                className="w-full bg-white border border-gray-200 text-cast-iron py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Go Pro — {PRICES.monthly[currency]}/month
              </button>
            </div>

            <p className="text-xs text-steel/60 text-center mt-4">
              Cancel anytime. No commitment.
            </p>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
