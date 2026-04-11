'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiCheck, FiArrowLeft, FiArrowRight, FiLock, FiCreditCard, FiX } from 'react-icons/fi';
import { useAuth } from '@/app/context/AuthContext';
import { auth } from '@/app/lib/firebase';
import { toast } from 'react-hot-toast';

type PlanId = 'free' | 'monthly' | 'yearly';
type Currency = 'USD' | 'CAD';
type Step = 1 | 2 | 3;

const PLANS = [
    {
        id: 'free' as PlanId,
        name: 'Free',
        priceUSD: 0,
        priceCAD: 0,
        period: 'forever',
        tagline: 'No credit card needed.',
        features: ['Up to 15 recipes', 'Import from URL, photo, or text', 'Custom categories', 'Private by default'],
        badge: null,
        savings: null,
    },
    {
        id: 'monthly' as PlanId,
        name: 'Pro',
        label: 'Monthly',
        priceUSD: 4.99,
        priceCAD: 6.99,
        period: '/month',
        tagline: 'Cancel anytime.',
        features: ['Unlimited recipes', 'Friends network', 'Recipe sharing', 'Priority support'],
        badge: 'Most popular',
        badgeColor: 'bg-light-green',
        savings: null,
    },
    {
        id: 'yearly' as PlanId,
        name: 'Pro',
        label: 'Yearly',
        priceUSD: 23.00,
        priceCAD: 32.00,
        period: '/year',
        tagline: 'Best value.',
        features: ['Unlimited recipes', 'Friends network', 'Recipe sharing', 'Priority support'],
        badge: 'Best value',
        badgeColor: 'bg-cast-iron',
        savings: 'Save ~62% vs monthly',
    },
];

const panelEmojis = [
    { emoji: '🍅', style: { top: '12%', right: '11%' },   rotate: 12,  size: 'text-7xl', blur: 0,   opacity: 0.18 },
    { emoji: '🥦', style: { top: '55%', right: '8%' },    rotate: -8,  size: 'text-6xl', blur: 0,   opacity: 0.15 },
    { emoji: '🫙', style: { top: '30%', left: '10%' },    rotate: -14, size: 'text-5xl', blur: 1,   opacity: 0.12 },
    { emoji: '🧅', style: { bottom: '18%', right: '20%'}, rotate: 9,   size: 'text-4xl', blur: 0.5, opacity: 0.12 },
    { emoji: '🍯', style: { bottom: '10%', left: '12%' }, rotate: -6,  size: 'text-3xl', blur: 2,   opacity: 0.1  },
];

const slideVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit:   { opacity: 0, x: -20 },
};

export default function SignUpPage() {
    const { user, signUp, signInWithGoogle } = useAuth();
    const router = useRouter();

    const [step, setStep]               = useState<Step>(1);
    const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
    const [currency, setCurrency]       = useState<Currency>('CAD');

    // Step 2 form
    const [displayName, setDisplayName]         = useState('');
    const [email, setEmail]                     = useState('');
    const [password, setPassword]               = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError]                     = useState('');
    const [submitting, setSubmitting]           = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    useEffect(() => {
        if (user) router.push('/recipes');
    }, [user, router]);

    const formatPrice = (planId: PlanId) => {
        const p = PLANS.find(pl => pl.id === planId)!;
        const price = currency === 'USD' ? p.priceUSD : p.priceCAD;
        const symbol = currency === 'USD' ? '$' : 'C$';
        if (price === 0) return 'Free';
        return `${symbol}${price.toFixed(2)}`;
    };

    const planLabel = () => {
        if (selectedPlan === 'free') return 'Free';
        return `Pro ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} · ${formatPrice(selectedPlan)}${selectedPlan === 'monthly' ? '/mo' : '/yr'}`;
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!displayName.trim()) { setError('Please enter your name.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

        setSubmitting(true);
        try {
            await signUp(
                email,
                password,
                displayName.trim(),
                selectedPlan === 'free' ? 'Free' : 'Pro',
                selectedPlan !== 'free' ? selectedPlan : undefined
            );
            if (selectedPlan === 'free') {
                router.push('/recipes');
            } else {
                setStep(3);
            }
        } catch (err) {
            if (err instanceof Error) {
                const msg = err.message;
                if (msg.includes('Access denied'))             setError(msg);
                else if (msg.includes('email-already-in-use')) setError('An account with this email already exists.');
                else if (msg.includes('weak-password'))        setError('Password must be at least 6 characters.');
                else if (msg.includes('invalid-email'))        setError('Invalid email address.');
                else setError('Failed to create account. Please try again.');
            } else {
                setError('Failed to create account. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            await signInWithGoogle();
            if (selectedPlan !== 'free') {
                setStep(3);
            } else {
                router.push('/recipes');
            }
        } catch (err) {
            if ((err as { code?: string }).code === 'auth/cancelled-popup-request') return;
            if (err instanceof Error && err.message.includes('Access denied')) {
                setError(err.message);
            } else {
                setError('Failed to sign up with Google. Please try again.');
            }
        }
    };

    const handleStartSubscription = async () => {
        if (!auth.currentUser) return;
        setCheckoutLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ planId: selectedPlan, currency }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error('Could not start checkout. Please try again.');
            }
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">

            {/* Left panel — branding */}
            <div className="hidden lg:flex lg:w-[44%] bg-cast-iron flex-col justify-between p-12 relative overflow-hidden">
                {panelEmojis.map((item, i) => (
                    <div key={i} className="absolute select-none pointer-events-none" style={{ ...item.style, opacity: item.opacity }}>
                        <span
                            className={`block ${item.size}`}
                            style={{ transform: `rotate(${item.rotate}deg)`, filter: item.blur > 0 ? `blur(${item.blur}px)` : undefined }}
                        >
                            {item.emoji}
                        </span>
                    </div>
                ))}

                <Link href="/">
                    <Image src="/logo_syft.svg" alt="Syft" width={0} height={0} priority className="h-[36px] w-auto brightness-0 invert" />
                </Link>

                <div>
                    <h2 className="text-4xl font-bold text-white leading-tight mb-8">
                        Start cooking<br />smarter.
                    </h2>
                    <ul className="space-y-4">
                        {[
                            { icon: '✨', text: 'Free to start, no card needed' },
                            { icon: '📚', text: 'Import recipes from anywhere' },
                            { icon: '🔒', text: 'Private by default, share when ready' },
                        ].map(item => (
                            <li key={item.icon} className="flex items-center gap-3 text-white/65 text-sm">
                                <span className="text-xl">{item.icon}</span>
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-white/20 text-xs">© {new Date().getFullYear()} Syft. All rights reserved.</p>
            </div>

            {/* Right panel — steps */}
            <div className="flex-1 bg-eggshell flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto">

                {/* Mobile logo */}
                <Link href="/" className="lg:hidden mb-8">
                    <Image src="/logo_syft.svg" alt="Syft" width={0} height={0} priority className="h-[36px] w-auto" />
                </Link>

                <AnimatePresence mode="wait">

                    {/* ── Step 1: Plan selection ── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={slideVariants}
                            initial="enter" animate="center" exit="exit"
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-lg"
                        >
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-cast-iron">Choose your plan</h2>
                                    <p className="text-steel text-sm mt-1">Start free. Upgrade anytime.</p>
                                </div>
                                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex-shrink-0">
                                    {(['USD', 'CAD'] as Currency[]).map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setCurrency(c)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                currency === c ? 'bg-cast-iron text-white' : 'text-steel hover:text-cast-iron'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                {PLANS.map(plan => (
                                    <button
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id)}
                                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all relative ${
                                            selectedPlan === plan.id
                                                ? 'border-light-green bg-white shadow-md'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        {plan.badge && (
                                            <div className="absolute -top-2.5 left-4">
                                                <span className={`${plan.badgeColor} text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide`}>
                                                    {plan.badge}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-base font-bold text-cast-iron">{plan.name}</span>
                                                    {'label' in plan && (
                                                        <span className="text-xs text-steel">{plan.label}</span>
                                                    )}
                                                    {plan.savings && (
                                                        <span className="text-[10px] font-semibold text-light-green bg-light-green/10 border border-light-green/20 px-2 py-0.5 rounded-full">
                                                            {plan.savings}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-baseline gap-1 mb-2.5">
                                                    <span className="text-2xl font-bold text-cast-iron">{formatPrice(plan.id)}</span>
                                                    {plan.priceUSD > 0 && (
                                                        <span className="text-xs text-steel">{plan.period}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                    {plan.features.map(f => (
                                                        <span key={f} className="text-xs text-steel flex items-center gap-1">
                                                            <FiCheck className="w-3 h-3 text-light-green flex-shrink-0" />
                                                            {f}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Radio indicator */}
                                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                                                selectedPlan === plan.id ? 'border-light-green bg-light-green' : 'border-gray-300'
                                            }`}>
                                                {selectedPlan === plan.id && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-light-green text-white py-3 px-4 rounded-xl font-semibold hover:bg-green transition-colors flex items-center justify-center gap-2"
                            >
                                Continue with {selectedPlan === 'free' ? 'Free' : `Pro ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}`}
                                <FiArrowRight className="w-4 h-4" />
                            </button>

                            <p className="text-center mt-5 text-sm text-steel">
                                Already have an account?{' '}
                                <Link href="/login" className="font-semibold text-light-green hover:underline">Sign in</Link>
                            </p>
                        </motion.div>
                    )}

                    {/* ── Step 2: Account creation ── */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={slideVariants}
                            initial="enter" animate="center" exit="exit"
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-md"
                        >
                            {/* Step header */}
                            <div className="flex items-center justify-between mb-6">
                                <button
                                    onClick={() => { setStep(1); setError(''); }}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-cast-iron transition-colors"
                                >
                                    <FiArrowLeft className="w-4 h-4" />
                                    Change plan
                                </button>
                                <span className="inline-flex items-center gap-1.5 bg-light-green/10 text-light-green border border-light-green/20 rounded-full px-3 py-1 text-xs font-semibold">
                                    {planLabel()}
                                </span>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                <h2 className="text-2xl font-bold text-cast-iron mb-1">Create your account</h2>
                                <p className="text-steel text-sm mb-7">
                                    {selectedPlan === 'free' ? 'No credit card needed.' : 'Payment details on the next step.'}
                                </p>

                                {error && (
                                    <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
                                        <FiX className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleCreateAccount} className="space-y-4">
                                    <div>
                                        <label htmlFor="displayName" className="block text-sm font-medium text-cast-iron mb-1.5">
                                            Your name
                                        </label>
                                        <input
                                            type="text"
                                            id="displayName"
                                            value={displayName}
                                            onChange={e => setDisplayName(e.target.value)}
                                            placeholder="How should we call you?"
                                            className="border border-gray-200 rounded-xl w-full py-3 px-4 text-sm text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-cast-iron mb-1.5">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="border border-gray-200 rounded-xl w-full py-3 px-4 text-sm text-cast-iron focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-cast-iron mb-1.5">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            id="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Min. 6 characters"
                                            className="border border-gray-200 rounded-xl w-full py-3 px-4 text-sm text-cast-iron placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-cast-iron mb-1.5">
                                            Confirm password
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="border border-gray-200 rounded-xl w-full py-3 px-4 text-sm text-cast-iron focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-light-green text-white py-3 px-4 rounded-xl font-semibold hover:bg-green transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                Creating account...
                                            </>
                                        ) : (
                                            <>
                                                {selectedPlan === 'free' ? 'Create account' : 'Continue to payment'}
                                                <FiArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200" />
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-3 bg-white text-steel">Or continue with</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGoogleSignUp}
                                        className="mt-4 w-full flex items-center justify-center bg-white border border-gray-200 text-cast-iron py-3 px-4 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" className="mr-2">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Sign up with Google
                                    </button>
                                </div>

                                <div className="text-center mt-6 pt-5 border-t border-gray-100">
                                    <p className="text-sm text-steel">
                                        Already have an account?{' '}
                                        <Link href="/login" className="font-semibold text-light-green hover:underline">Sign in</Link>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 3: Payment ── */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            variants={slideVariants}
                            initial="enter" animate="center" exit="exit"
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-md"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <FiLock className="w-3.5 h-3.5 text-light-green" />
                                <span className="text-xs font-semibold text-steel/60 uppercase tracking-wider">Secure checkout</span>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                <h2 className="text-2xl font-bold text-cast-iron mb-1">Set up billing</h2>
                                <p className="text-steel text-sm mb-6">Review your plan and enter payment details.</p>

                                {/* Order summary */}
                                <div className="bg-eggshell rounded-xl p-4 mb-5 border border-gray-100">
                                    <p className="text-xs font-semibold text-steel/50 uppercase tracking-wider mb-3">Order summary</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-cast-iron">Syft Pro</p>
                                            <p className="text-xs text-steel">{selectedPlan === 'monthly' ? 'Billed monthly' : 'Billed yearly'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-cast-iron">{formatPrice(selectedPlan)}</p>
                                            <p className="text-xs text-steel">{selectedPlan === 'monthly' ? '/month' : '/year'}</p>
                                        </div>
                                    </div>
                                    {selectedPlan === 'yearly' && (
                                        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                                            <p className="text-xs text-light-green font-semibold">Annual savings</p>
                                            <p className="text-xs text-light-green font-semibold">~62% off vs monthly</p>
                                        </div>
                                    )}
                                </div>

                                {/* Payment fields — collected by Stripe Checkout */}
                                <div className="space-y-4 mb-6 opacity-40 pointer-events-none select-none" aria-hidden="true">
                                    <div>
                                        <label className="block text-sm font-medium text-cast-iron mb-1.5">Card number</label>
                                        <div className="border border-gray-200 rounded-xl py-3 px-4 flex items-center gap-2 bg-gray-50">
                                            <FiCreditCard className="w-4 h-4 text-steel/50" />
                                            <span className="text-steel/50 text-sm tracking-widest">•••• •••• •••• ••••</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-cast-iron mb-1.5">Expiry</label>
                                            <div className="border border-gray-200 rounded-xl py-3 px-4 bg-gray-50">
                                                <span className="text-steel/50 text-sm">MM / YY</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-cast-iron mb-1.5">CVC</label>
                                            <div className="border border-gray-200 rounded-xl py-3 px-4 bg-gray-50">
                                                <span className="text-steel/50 text-sm">•••</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-cast-iron mb-1.5">Name on card</label>
                                        <div className="border border-gray-200 rounded-xl py-3 px-4 bg-gray-50">
                                            <span className="text-steel/50 text-sm">Full name</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStartSubscription}
                                    disabled={checkoutLoading}
                                    className="w-full bg-light-green text-white py-3 px-4 rounded-xl font-semibold hover:bg-green transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {checkoutLoading ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                            Redirecting to checkout...
                                        </>
                                    ) : (
                                        <>
                                            <FiLock className="w-4 h-4" />
                                            Start subscription
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-xs text-steel/50 mt-4">
                                    You&apos;ll be taken to Stripe&apos;s secure checkout. Cancel anytime.
                                </p>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
