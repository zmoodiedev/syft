'use client';

import Link from 'next/link';
import Image from 'next/image';
import SignUp from '../../components/SignUp';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const panelEmojis = [
  { emoji: '🍅', style: { top: '12%', right: '11%' },  rotate: 12,  size: 'text-7xl', blur: 0,   opacity: 0.18 },
  { emoji: '🥦', style: { top: '55%', right: '8%' },   rotate: -8,  size: 'text-6xl', blur: 0,   opacity: 0.15 },
  { emoji: '🫙', style: { top: '30%', left: '10%' },   rotate: -14, size: 'text-5xl', blur: 1,   opacity: 0.12 },
  { emoji: '🧅', style: { bottom: '18%', right: '20%'}, rotate: 9,  size: 'text-4xl', blur: 0.5, opacity: 0.12 },
  { emoji: '🍯', style: { bottom: '10%', left: '12%' }, rotate: -6, size: 'text-3xl', blur: 2,   opacity: 0.1  },
];

export default function SignUpPage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/recipes');
        }
    }, [user, router]);

    return (
        <div className="min-h-screen flex">

            {/* Left panel — branding (desktop only) */}
            <div className="hidden lg:flex lg:w-[44%] bg-cast-iron flex-col justify-between p-12 relative overflow-hidden">
                {/* Subtle background food emojis */}
                {panelEmojis.map((item, i) => (
                    <div
                        key={i}
                        className="absolute select-none pointer-events-none"
                        style={{ ...item.style, opacity: item.opacity }}
                    >
                        <span
                            className={`block ${item.size}`}
                            style={{
                                transform: `rotate(${item.rotate}deg)`,
                                filter: item.blur > 0 ? `blur(${item.blur}px)` : undefined,
                            }}
                        >
                            {item.emoji}
                        </span>
                    </div>
                ))}

                {/* Logo */}
                <Link href="/">
                    <Image
                        src="/logo_syft.svg"
                        alt="Syft"
                        width={0}
                        height={0}
                        priority
                        className="h-[36px] w-auto brightness-0 invert"
                    />
                </Link>

                {/* Tagline + features */}
                <div>
                    <h2 className="text-4xl font-bold text-white leading-tight mb-8">
                        Start cooking<br />smarter.
                    </h2>
                    <ul className="space-y-4">
                        {[
                            { icon: '✨', text: 'Free to start, no card needed' },
                            { icon: '📚', text: 'Unlimited recipe imports' },
                            { icon: '🔒', text: 'Private by default, share when ready' },
                        ].map((item) => (
                            <li key={item.icon} className="flex items-center gap-3 text-white/65 text-sm">
                                <span className="text-xl">{item.icon}</span>
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-white/20 text-xs">© {new Date().getFullYear()} Syft. All rights reserved.</p>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 bg-eggshell flex flex-col items-center justify-center p-8">

                {/* Mobile logo */}
                <Link href="/" className="lg:hidden mb-8">
                    <Image
                        src="/logo_syft.svg"
                        alt="Syft"
                        width={0}
                        height={0}
                        priority
                        className="h-[36px] w-auto"
                    />
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <h2 className="text-2xl font-bold text-cast-iron mb-1">Create your account</h2>
                        <p className="text-steel text-sm mb-7">Free to start — no credit card needed.</p>

                        <SignUp />

                        <div className="text-center mt-6 pt-6 border-t border-gray-100">
                            <p className="text-sm text-steel">
                                Already have an account?{' '}
                                <Link href="/login" className="font-semibold text-light-green hover:underline transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

        </div>
    );
}
