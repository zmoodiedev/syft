'use client';

import Button from '@/app/components/Button';
import { FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { useState } from 'react';

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
    description: 'Perfect for getting started with recipe management',
    features: [
      { name: 'Recipe Storage', included: true, value: 'Up to 20 recipes' },
      { name: 'Basic Recipe Features', included: true },
      { name: 'Recipe Sharing', included: false },
      { name: 'Friends Network', included: false },
      { name: 'Priority Support', included: false },
    ],
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    priceUSD: 4.99,
    priceCAD: 6.99,
    period: 'per month',
    description: 'Full access to all features with monthly flexibility',
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
    id: 'yearly',
    name: 'Pro Yearly',
    priceUSD: 23.00,
    priceCAD: 32.00,
    period: 'per year',
    description: 'Best value - save 17% with annual billing',
    features: [
      { name: 'Recipe Storage', included: true, value: 'Unlimited recipes' },
      { name: 'Premium Recipe Features', included: true },
      { name: 'Recipe Sharing', included: true },
      { name: 'Friends Network', included: true },
      { name: 'Priority Support', included: true },
    ],
  }
];

export default function PricingPage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>('USD');
  
  // For now, assume all authenticated users are on the free plan
  // In the future, this would come from user profile or subscription data
  const currentPlan = user ? 'free' : null;

  const formatPrice = (tier: PricingTier) => {
    const price = currency === 'USD' ? tier.priceUSD : tier.priceCAD;
    const symbol = currency === 'USD' ? '$' : 'C$';
    
    if (price === 0) {
      return '$0';
    }
    
    return `${symbol}${price.toFixed(2)}`;
  };

  const getButtonText = (tierId: string) => {
    if (!user) {
      return 'Choose Plan';
    }
    
    if (currentPlan === tierId) {
      return 'Current Plan';
    }
    
    switch (tierId) {
      case 'free':
        return 'Downgrade to Free';
      case 'monthly':
        return 'Upgrade to Monthly';
      case 'yearly':
        return 'Upgrade to Yearly';
      default:
        return 'Choose Plan';
    }
  };

  const getButtonVariant = (tierId: string): 'primary' | 'secondary' | 'outline' => {
    if (!user) {
      // For unauthenticated users, make paid plans primary and free plan outline
      return tierId === 'free' ? 'outline' : 'primary';
    }
    
    if (currentPlan === tierId) {
      return 'outline';
    }
    
    // For authenticated users, make monthly primary and others outline
    return tierId === 'monthly' ? 'primary' : 'outline';
  };

  const isButtonDisabled = (tierId: string) => {
    return Boolean(user && currentPlan === tierId);
  };

  const handleUpgrade = (tierId: string) => {
    if (!user) {
      // Redirect to sign up if not authenticated
      window.location.href = '/login';
      return;
    }
    
    // TODO: Implement payment processing
    console.log(`Upgrading to ${tierId}`);
    // This would typically integrate with Stripe or another payment processor
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header for Public Page */}

      <div className="container mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Unlock the full potential of your recipe collection with our flexible pricing options
          </p>
          
          {/* Currency Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currency === 'USD'
                    ? 'bg-light-green text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('CAD')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currency === 'CAD'
                    ? 'bg-light-green text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                CAD (C$)
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
                tier.popular 
                  ? 'border-light-green scale-105' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-light-green text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Tier Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {tier.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(tier)}
                    </span>
                    <span className="text-gray-600 ml-2">
                      {tier.period}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    {tier.description}
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {feature.included ? (
                          <FiCheck className="h-5 w-5 text-green-500" />
                        ) : (
                          <FiX className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="ml-3">
                        <span className={`text-sm ${
                          feature.included ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {feature.name}
                        </span>
                        {feature.value && (
                          <span className={`block text-xs ${
                            feature.included ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {feature.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  variant={getButtonVariant(tier.id)}
                  className="w-full"
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={isButtonDisabled(tier.id)}
                >
                  {getButtonText(tier.id)}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time. 
                Changes take effect at your next billing cycle.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens to my recipes if I downgrade?
              </h3>
              <p className="text-gray-600">
                Your recipes are always safe. If you exceed the free tier limits, 
                you&apos;ll have read-only access to extra recipes until you upgrade again.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                The free tier gives you full access to core features. You can upgrade 
                anytime to unlock additional storage and social features.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How secure is my payment information?
              </h3>
              <p className="text-gray-600">
                We use industry-standard encryption and never store your payment details. 
                All transactions are processed securely through our payment partners.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 