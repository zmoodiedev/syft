'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import {
  doc, updateDoc, deleteField,
  collection, query, where, getDocs, writeBatch,
} from 'firebase/firestore';
import DevOnlyRoute from '@/app/components/DevOnlyRoute';

const FREE_RECIPE_LIMIT = 15;

type State = 'pro-active' | 'pro-past-due' | 'lapsed' | 'free-never-paid';

const STATES: { id: State; label: string; description: string; color: string }[] = [
  {
    id: 'pro-active',
    label: 'Pro — active',
    description: 'Normal paying subscriber. No banners.',
    color: 'bg-light-green/10 border-light-green/30 text-light-green',
  },
  {
    id: 'pro-past-due',
    label: 'Pro — past due',
    description: 'Payment failed, Stripe retrying. Amber warning on billing page. Tier stays Pro.',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    id: 'lapsed',
    label: 'Lapsed (canceled)',
    description: 'Subscription ended. Tier drops to Free. Lapsed banners shown. Overflow recipes locked.',
    color: 'bg-red-50 border-red-200 text-red-700',
  },
  {
    id: 'free-never-paid',
    label: 'Free — never paid',
    description: 'Genuine free user. Standard recipe-limit nudge banner.',
    color: 'bg-stone-50 border-stone-200 text-steel',
  },
];

export default function TestSubscriptionPage() {
  return (
    <DevOnlyRoute>
      <TestSubscriptionPanel />
    </DevOnlyRoute>
  );
}

function TestSubscriptionPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev]);

  const applyState = async (state: State) => {
    if (!user) return;
    setLoading(state);
    const userRef = doc(db, 'users', user.uid);

    try {
      switch (state) {
        case 'pro-active':
          await updateDoc(userRef, {
            tier: 'Pro',
            subscriptionStatus: 'active',
            subscriptionLapsedAt: deleteField(),
          });
          await unlockAllRecipes();
          addLog('Set to Pro — active. All recipes unlocked.');
          break;

        case 'pro-past-due':
          await updateDoc(userRef, {
            tier: 'Pro',
            subscriptionStatus: 'past_due',
            subscriptionLapsedAt: deleteField(),
          });
          addLog('Set to Pro — past_due. Billing page should show payment warning.');
          break;

        case 'lapsed':
          await updateDoc(userRef, {
            tier: 'Free',
            subscriptionStatus: 'canceled',
            subscriptionLapsedAt: new Date(),
          });
          const locked = await lockOverflowRecipes();
          addLog(`Set to lapsed. ${locked} recipe(s) locked beyond the free limit.`);
          break;

        case 'free-never-paid':
          await updateDoc(userRef, {
            tier: 'Free',
            subscriptionStatus: deleteField(),
            subscriptionLapsedAt: deleteField(),
          });
          await unlockAllRecipes();
          addLog('Set to Free (never paid). All recipes unlocked. Standard limit nudge applies.');
          break;
      }
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(null);
    }
  };

  const lockOverflowRecipes = async (): Promise<number> => {
    if (!user) return 0;
    // Fetch without orderBy to avoid needing a composite index in local dev.
    // Sort by createdAt client-side so the oldest recipes stay unlocked.
    const snap = await getDocs(
      query(collection(db, 'recipes'), where('userId', '==', user.uid))
    );
    if (snap.size <= FREE_RECIPE_LIMIT) return 0;
    const sorted = snap.docs.slice().sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() ?? 0;
      const bTime = b.data().createdAt?.toMillis?.() ?? 0;
      return aTime - bTime;
    });
    const overflow = sorted.slice(FREE_RECIPE_LIMIT);
    const batch = writeBatch(db);
    for (const d of overflow) batch.update(d.ref, { locked: true });
    await batch.commit();
    return overflow.length;
  };

  const unlockAllRecipes = async () => {
    if (!user) return;
    const snap = await getDocs(
      query(collection(db, 'recipes'), where('userId', '==', user.uid), where('locked', '==', true))
    );
    if (snap.empty) return;
    const batch = writeBatch(db);
    for (const d of snap.docs) batch.update(d.ref, { locked: deleteField() });
    await batch.commit();
  };

  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-6 py-10 max-w-2xl">

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            DEV ONLY
          </div>
          <h1 className="text-2xl font-bold text-cast-iron">Subscription state tester</h1>
          <p className="text-sm text-steel mt-1">
            Writes directly to your Firestore user doc. Reload the app after switching states to see the changes.
          </p>
          {user && (
            <p className="text-xs text-steel/50 mt-2 font-mono">uid: {user.uid}</p>
          )}
        </div>

        <div className="space-y-3 mb-8">
          {STATES.map(state => (
            <button
              key={state.id}
              onClick={() => applyState(state.id)}
              disabled={!!loading}
              className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-opacity ${state.color} ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{state.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{state.description}</p>
              </div>
              {loading === state.id ? (
                <div className="flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <span className="flex-shrink-0 text-xs opacity-50 mt-0.5">Apply →</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
          <p className="text-sm font-semibold text-cast-iron mb-3">Pages to check</p>
          <div className="space-y-2">
            {[
              { path: '/recipes', note: 'LapsedBanner vs RecipeLimitBanner vs nothing' },
              { path: '/billing', note: 'Past-due warning, lapsed banner, reactivate copy' },
              { path: `/profile/${user?.uid}?tab=friends`, note: '"Your friends are waiting" vs "Friends is a Pro feature"' },
            ].map(({ path, note }) => (
              <a
                key={path}
                href={path}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 group"
              >
                <span className="text-xs font-mono text-light-green group-hover:underline flex-shrink-0">{path}</span>
                <span className="text-xs text-steel/60">{note}</span>
              </a>
            ))}
          </div>
        </div>

        {log.length > 0 && (
          <div className="bg-cast-iron rounded-2xl p-4">
            <p className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Log</p>
            <div className="space-y-1">
              {log.map((entry, i) => (
                <p key={i} className="text-xs font-mono text-white/80">{entry}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
