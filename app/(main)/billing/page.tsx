'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { auth } from '@/app/lib/firebase';
import { getUserProfile } from '@/app/lib/user';
import { UserProfile } from '@/app/models/User';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Button from '@/app/components/Button';
import UserTierBadge from '@/app/components/UserTierBadge';
import UpgradeModal from '@/app/components/UpgradeModal';
import { FiCheck, FiX, FiExternalLink, FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Billing fields stored in Firestore alongside the UserProfile
interface BillingProfile extends UserProfile {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingCycle?: 'monthly' | 'yearly';
  currentPeriodEnd?: { toDate?: () => Date } | Date;
  subscriptionStatus?: string;
  pendingTier?: string;
  pendingBillingCycle?: string;
}

const PRO_FEATURES = [
  'Unlimited recipes',
  'Friends network',
  'Recipe sharing',
  'Priority support',
];

const FREE_LIMITS = [
  'Up to 15 recipes',
  'No friends network',
  'Limited sharing',
];

function formatDate(raw: BillingProfile['currentPeriodEnd']): string {
  if (!raw) return '—';
  const date = typeof (raw as { toDate?: () => Date }).toDate === 'function'
    ? (raw as { toDate: () => Date }).toDate()
    : raw as Date;
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BillingPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [upgradePolling, setUpgradePolling] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccess(true);
      setUpgradePolling(true);
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    if (!upgradePolling) {
      // Normal load — fetch once
      getUserProfile(user.uid).then(data => {
        setProfile(data as BillingProfile);
        setLoading(false);
      });
      return;
    }

    // After a Stripe checkout, the webhook fires async. Poll until the tier
    // updates to Pro (up to ~15 s) so we never show contradictory UI.
    let attempts = 0;
    const MAX_ATTEMPTS = 8;

    const poll = async () => {
      const data = await getUserProfile(user.uid) as BillingProfile;
      attempts += 1;

      if (data?.tier === 'Pro') {
        setProfile(data);
        setLoading(false);
        setUpgradePolling(false);
      } else if (attempts >= MAX_ATTEMPTS) {
        setProfile(data);
        setLoading(false);
        setUpgradePolling(false);
        setPollingTimedOut(true);
        setShowSuccess(false);
      } else {
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, [user, upgradePolling]);

  const handleManageSubscription = async () => {
    if (!auth.currentUser) return;
    setPortalLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Could not open billing portal.');
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setPortalLoading(false);
    }
  };

  const isPro      = profile?.tier === 'Pro';
  const hasPending = !!profile?.pendingTier;
  const isPastDue  = profile?.subscriptionStatus === 'past_due';
  const isLapsed   = profile?.tier === 'Free' && !!profile?.subscriptionLapsedAt;

  return (
    <ProtectedRoute>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="recipe_limit"
      />
      <div className="min-h-screen bg-eggshell">
        <div className="container mx-auto px-4 sm:px-6 py-10 md:py-14 max-w-2xl">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-cast-iron">Billing</h1>
            <p className="text-sm text-steel mt-1">Manage your plan and subscription.</p>
          </div>

          {isPastDue && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-cast-iron">Payment failed</p>
                <p className="text-xs text-steel mt-0.5 leading-relaxed">
                  Your last payment didn&apos;t go through. Stripe will retry automatically — update your payment method to avoid losing access.
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex-shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors whitespace-nowrap"
              >
                {portalLoading ? 'Opening…' : 'Update payment →'}
              </button>
            </div>
          )}

          {isLapsed && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-cast-iron">Your Pro subscription ended</p>
                <p className="text-xs text-steel mt-0.5 leading-relaxed">
                  Your recipes and friends are still here, waiting for you. Reactivate Pro to unlock everything.
                </p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex-shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors whitespace-nowrap"
              >
                Reactivate →
              </button>
            </div>
          )}

          {showSuccess && (
            <div className="mb-5 flex items-start gap-3 bg-light-green/10 border border-light-green/20 rounded-2xl px-5 py-4">
              <FiCheck className="w-5 h-5 text-light-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-cast-iron">You&apos;re on Pro!</p>
                <p className="text-xs text-steel mt-0.5">Your subscription is active. All Pro features are now unlocked.</p>
              </div>
            </div>
          )}

          {pollingTimedOut && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-cast-iron">Subscription processing</p>
                <p className="text-xs text-steel mt-0.5">Your payment went through. It can take a minute or two for your plan to activate. Refresh the page shortly.</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-light-green" />
              {upgradePolling && (
                <p className="text-sm text-steel">Activating your subscription...</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-cast-iron px-5 py-4">
                  <p className="text-sm font-semibold text-white">Current plan</p>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-base font-bold text-cast-iron">
                          {isPro ? 'Pro' : 'Free'}
                        </p>
                        {profile?.tier && <UserTierBadge tier={profile.tier} />}
                      </div>

                      {isPro && profile?.billingCycle && (
                        <p className="text-sm text-steel">
                          Billed {profile.billingCycle === 'yearly' ? 'annually' : 'monthly'}
                          {profile.currentPeriodEnd && (
                            <> · renews {formatDate(profile.currentPeriodEnd)}</>
                          )}
                        </p>
                      )}

                      {!isPro && (
                        <ul className="mt-3 space-y-1.5">
                          {FREE_LIMITS.map(l => (
                            <li key={l} className="flex items-center gap-2 text-xs text-steel">
                              <FiX className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              {l}
                            </li>
                          ))}
                        </ul>
                      )}

                      {isPro && (
                        <ul className="mt-3 space-y-1.5">
                          {PRO_FEATURES.map(f => (
                            <li key={f} className="flex items-center gap-2 text-xs text-steel">
                              <FiCheck className="w-3.5 h-3.5 text-light-green flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {isPro && profile?.subscriptionStatus && (
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        profile.subscriptionStatus === 'active'
                          ? 'bg-light-green/10 text-light-green'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {profile.subscriptionStatus === 'active' ? 'Active' : profile.subscriptionStatus}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {isPro && profile?.stripeCustomerId ? (
                      <Button
                        variant="outline"
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                        className="flex items-center gap-2"
                      >
                        <FiCreditCard className="w-3.5 h-3.5" />
                        {portalLoading ? 'Opening portal...' : 'Manage subscription'}
                        <FiExternalLink className="w-3 h-3 opacity-50" />
                      </Button>
                    ) : !isPro && !hasPending ? (
                      <Button variant="primary" onClick={() => setShowUpgradeModal(true)} className="flex items-center gap-2">
                        Upgrade to Pro
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {hasPending && !isPro && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-amber-500 px-5 py-4">
                    <p className="text-sm font-semibold text-white">Pro upgrade pending</p>
                  </div>
                  <div className="p-5 flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-cast-iron mb-1">
                        You selected{' '}
                        <span className="font-bold">
                          Pro {profile?.pendingBillingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                        </span>{' '}
                        during signup.
                      </p>
                      <p className="text-xs text-steel leading-relaxed">
                        Pro billing isn&apos;t fully live yet. You&apos;re currently on Free. We&apos;ll email you as soon as payment is available so you can complete your upgrade.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isPro && !hasPending && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-cast-iron px-5 py-4">
                    <p className="text-sm font-semibold text-white">{isLapsed ? 'Reactivate Pro' : 'Go Pro'}</p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {isLapsed ? 'Your data is safe. Pick up right where you left off.' : 'Unlock the full Syft experience.'}
                    </p>
                  </div>
                  <div className="p-5">
                    <ul className="space-y-2 mb-5">
                      {PRO_FEATURES.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-steel">
                          <FiCheck className="w-4 h-4 text-light-green flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-3 items-center">
                      <Button variant="primary" onClick={() => setShowUpgradeModal(true)} className="flex items-center gap-2">
                        {isLapsed ? 'Reactivate Pro' : 'Upgrade to Pro'}
                      </Button>
                      <Link href="/pricing" className="text-sm text-steel hover:text-cast-iron transition-colors">
                        View pricing →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-steel/50 text-center pt-2">
                Questions about billing?{' '}
                <Link href="/contact" className="hover:text-cast-iron transition-colors underline">
                  Contact us
                </Link>
              </p>

            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
