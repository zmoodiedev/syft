'use client';

import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/app/components/Logo';
import SignIn from '@/app/components/SignIn';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const leftFeatures = [
  { icon: 'fa-bookmark',    text: 'Save from any recipe website' },
  { icon: 'fa-scroll',      text: 'Cook ad-free, distraction-free' },
  { icon: 'fa-paper-plane', text: "Share straight to friends' collections" },
];


export default function LoginPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (user) router.push('/recipes');
    }, [user, router]);

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-eggshell">
                <div className="w-full max-w-md p-8">
                    <div className="h-[36px] w-[100px] mx-auto mb-8 bg-stone-200 rounded animate-pulse" />
                    <div className="h-[400px] bg-white rounded-3xl shadow-sm p-8 animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">

            <div className="hidden lg:flex lg:w-[44%] bg-cream flex-col justify-between p-12 relative z-10">

                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <Image
                        src="/images/branding/kitchen.png"
                        alt=""
                        fill
                        className="object-cover opacity-[0.18]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cream/70 to-transparent" />
                </div>

                <div className="absolute bottom-0 -right-14 pointer-events-none z-10">
                    <Image
                        src="/images/branding/chef_ollie.png"
                        alt=""
                        width={300}
                        height={330}
                        className="w-[320px] h-auto"
                    />
                </div>

                <Link href="/" className="relative z-10">
                    <Logo className="h-[36px] w-auto text-cast-iron" />
                </Link>

                <div className="relative z-10">
                    <h2 className="text-4xl font-bold text-cast-iron leading-tight mb-8">
                        A little kitchen,<br />a lot of good eating.
                    </h2>
                    <ul className="space-y-4">
                        {leftFeatures.map(item => (
                            <li key={item.icon} className="flex items-center gap-3 text-steel text-sm">
                                <div className="w-7 h-7 bg-cast-iron/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <i className={`fa-solid ${item.icon} text-cast-iron/60 text-xs`} />
                                </div>
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs text-steel/40 relative z-10">© {new Date().getFullYear()} Syft. All rights reserved.</p>
            </div>

            <div className="flex-1 bg-eggshell flex flex-col items-center justify-center p-4 sm:p-8">

                <Link href="/" className="lg:hidden mb-8">
                    <Logo className="h-[36px] w-auto text-cast-iron" />
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 sm:p-8">
                        <h2 className="text-2xl font-bold text-cast-iron mb-1">Welcome back.</h2>
                        <p className="text-steel text-sm mb-7">Pick up where you left off. Your saved recipes are waiting.</p>

                        <SignIn />

                    </div>
                </motion.div>
            </div>

        </div>
    );
}
