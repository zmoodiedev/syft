'use client';

import Link from 'next/link';
import Image from 'next/image';
import SignIn from '@/app/components/SignIn';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const { user } = useAuth();
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-full max-w-md p-8">
                    <div className="h-[43px] w-[160px] mx-auto mb-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-[400px] bg-white rounded-xl shadow-lg p-8 border border-gray-200 animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            <div className="relative min-h-screen flex items-center justify-center p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block">
                            <Image 
                                src="/logo_syft_h.svg" 
                                alt="Syft Logo" 
                                width={300}
                                height={80}
                                priority
                                className="w-full max-w-[300px] h-auto"
                            />
                        </Link>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="bg-white rounded-xl shadow-lg p-8 border border-gray-200"
                    >
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="text-3xl font-bold text-gray-900 mb-2 text-center"
                        >
                            Welcome to Syft
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="text-gray-600 mb-6 text-center"
                        >
                            Your personal recipe management system.
                        </motion.p>
                        <SignIn />
                        {/* <div className="text-center mt-8">
                            <p className="text-sm text-gray-600">
                                Don&apos;t have an account?{' '}
                                <Link href="/signup" className="font-medium text-red-500 hover:text-red-600 transition-colors">
                                    Sign Up
                                </Link>
                            </p>
                        </div> */}
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
} 