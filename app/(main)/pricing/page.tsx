'use client';

import { FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

type Currency = 'USD' | 'CAD';

interface PricingTier {
  id: string;
  name: string;
  priceUSD: number;
  priceCAD: number;
  period: string;
  description: string;
  features: {
    name: string;
    included: boolean;
    value?: string;
  }[];
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    priceUSD: 0,
    priceCAD: 0,
    period: 'forever',
    description: 'A good place to start.',
    features: [
      { name: 'Recipe Storage', included: true, value: 'Up to 15 recipes' },
      { name: 'Basic Recipe Features', included: true },
      { name: 'Recipe Sharing', included: false },
      { name: 'Friends Network', included: false },
      { name: 'Priority Support', included: false },
    ],
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    priceUSD: 24.99,
    priceCAD: 34.49,
    period: 'per year',
    description: 'Best value. About $2 a month.',
    features: [
      { name: 'Recipe Storage', included: true, value: 'Unlimited recipes' },
      { name: 'Premium Recipe Features', included: true },
      { name: 'Recipe Sharing', included: true },
      { name: 'Friends Network', included: true },
      { name: 'Priority Support', included: true },
    ],
    popular: true,
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    priceUSD: 3.49,
    priceCAD: 4.82,
    period: 'per month',
    description: 'Full access, cancel anytime.',
    features: [
      { name: 'Recipe Storage', included: true, value: 'Unlimited recipes' },
      { name: 'Premium Recipe Features', included: true },
      { name: 'Recipe Sharing', included: true },
      { name: 'Friends Network', included: true },
      { name: 'Priority Support', included: true },
    ],
  },
];

const faqItems = [
  {
    q: 'Can I change my plan anytime?',
    a: 'Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle.',
  },
  {
    q: 'What happens to my recipes if I downgrade?',
    a: "Your recipes are always safe. If you exceed the free tier limits, you'll have read-only access to extra recipes until you upgrade again.",
  },
  {
    q: 'Is there a free trial?',
    a: 'The free tier gives you full access to core features. Upgrade anytime to unlock unlimited storage and social features.',
  },
  {
    q: 'How secure is my payment information?',
    a: 'We use industry-standard encryption and never store your payment details. All transactions are processed securely through our payment partners.',
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const currentPlan = user ? 'free' : null;

  const formatPrice = (tier: PricingTier) => {
    const price = currency === 'USD' ? tier.priceUSD : tier.priceCAD;
    const symbol = currency === 'USD' ? '$' : 'C$';
    if (price === 0) return '$0';
    return `${symbol}${price.toFixed(2)}`;
  };

  const getButtonText = (tierId: string) => {
    if (checkoutLoading === tierId) return 'Redirecting...';
    if (!user) return 'Get started';
    if (currentPlan === tierId) return 'Current plan';
    switch (tierId) {
      case 'free':    return 'Downgrade to Free';
      case 'monthly': return 'Upgrade — monthly';
      case 'yearly':  return 'Upgrade — yearly';
      default:        return 'Get started';
    }
  };

  const isButtonDisabled = (tierId: string) =>
    Boolean((user && currentPlan === tierId) || checkoutLoading);

  const handleUpgrade = async (tierId: string) => {
    if (!user) { window.location.href = '/signup'; return; }
    if (tierId === 'free') return;
    setCheckoutLoading(tierId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: tierId as 'monthly' | 'yearly', currency }),
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
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-4 sm:px-6 py-16 md:py-24 max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-light-green/10 text-light-green font-semibold text-xs px-3 py-1.5 rounded-full mb-6 border border-light-green/20 uppercase tracking-wider">
            Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-cast-iron mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-steel text-lg max-w-xl mx-auto mb-10">
            Free to start. Upgrade when you&apos;re ready for more.
          </p>

          {/* Currency toggle */}
          <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {(['USD', 'CAD'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currency === c
                    ? 'bg-cast-iron text-white'
                    : 'text-steel hover:text-cast-iron'
                }`}
              >
                {c === 'USD' ? 'USD ($)' : 'CAD (C$)'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {pricingTiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 flex flex-col ${
                tier.popular
                  ? 'bg-cast-iron shadow-xl ring-1 ring-light-green/40 md:-mt-4'
                  : 'bg-white shadow-sm border border-gray-100'
              }`}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-light-green text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-8">
                <h3 className={`text-lg font-bold mb-4 ${tier.popular ? 'text-white' : 'text-cast-iron'}`}>
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-5xl font-bold ${tier.popular ? 'text-white' : 'text-cast-iron'}`}>
                    {formatPrice(tier)}
                  </span>
                  <span className={`text-sm ${tier.popular ? 'text-white/50' : 'text-steel'}`}>
                    /{tier.period}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${tier.popular ? 'text-white/55' : 'text-steel'}`}>
                  {tier.description}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3.5 mb-8 flex-1">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5">
                      {feature.included
                        ? <FiCheck className={`h-4 w-4 ${tier.popular ? 'text-light-green' : 'text-light-green'}`} />
                        : <FiX className={`h-4 w-4 ${tier.popular ? 'text-white/25' : 'text-gray-300'}`} />
                      }
                    </span>
                    <span className={`text-sm ${
                      feature.included
                        ? tier.popular ? 'text-white/85' : 'text-cast-iron'
                        : tier.popular ? 'text-white/30' : 'text-gray-400'
                    }`}>
                      {feature.value ?? feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={isButtonDisabled(tier.id)}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  tier.popular
                    ? 'bg-light-green text-white hover:bg-green'
                    : tier.id === 'free'
                      ? 'bg-eggshell text-cast-iron border border-gray-200 hover:bg-gray-100'
                      : 'bg-cast-iron text-white hover:bg-cast-iron/80'
                }`}
              >
                {getButtonText(tier.id)}
              </button>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-24"
        >
          <h2 className="text-3xl font-bold text-cast-iron text-center mb-12">
            Questions &amp; answers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-cast-iron mb-2">{item.q}</h3>
                <p className="text-steel text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-steel text-sm">
            Still have questions?{' '}
            <Link href="/contact" className="text-light-green font-semibold hover:underline">
              Get in touch →
            </Link>
          </p>
        </motion.div>

      </div>
    </div>
  );
}
