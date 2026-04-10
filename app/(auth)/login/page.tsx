'use client';

import Link from 'next/link';
import Image from 'next/image';
import SignIn from '@/app/components/SignIn';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const panelEmojis = [
  { emoji: '🍝', style: { top: '14%', left: '9%' },   rotate: -12, size: 'text-7xl', blur: 0,   opacity: 0.18 },
  { emoji: '🥑', style: { top: '58%', left: '7%' },   rotate: -6,  size: 'text-6xl', blur: 0,   opacity: 0.15 },
  { emoji: '🍋', style: { top: '28%', right: '10%' }, rotate: 14,  size: 'text-5xl', blur: 1,   opacity: 0.12 },
  { emoji: '🌶️', style: { top: '72%', right: '14%' }, rotate: -10, size: 'text-4xl', blur: 0.5, opacity: 0.12 },
  { emoji: '🌿', style: { bottom: '12%', left: '18%' }, rotate: 8, size: 'text-3xl', blur: 2,   opacity: 0.1  },
];

export default function LoginPage() {
    const { user, enterDemoMode } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (user) {
            router.push('/recipes');
        }
    }, [user, router]);

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-eggshell">
                <div className="w-full max-w-md p-8">
                    <div className="h-[36px] w-[100px] mx-auto mb-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-[400px] bg-white rounded-2xl shadow-sm p-8 animate-pulse" />
                </div>
            </div>
        );
    }

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
                        Your recipes,<br />organized.
                    </h2>
                    <ul className="space-y-4">
                        {[
                            { icon: '🔗', text: 'Save from any recipe website' },
                            { icon: '🍳', text: 'Cook ad-free, distraction-free' },
                            { icon: '👥', text: 'Share with friends & family' },
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
                        <h2 className="text-2xl font-bold text-cast-iron mb-1">Welcome back</h2>
                        <p className="text-steel text-sm mb-7">Sign in to your Syft account.</p>

                        <SignIn />

                        <div className="text-center mt-6 pt-6 border-t border-gray-100">
                            <p className="text-sm text-steel">
                                Just want to look around?{' '}
                                <button
                                    onClick={enterDemoMode}
                                    className="font-semibold text-light-green hover:underline transition-colors"
                                >
                                    Try the demo
                                </button>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

        </div>
    );
}
