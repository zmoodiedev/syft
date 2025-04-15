'use client';

import DevOnlyRoute from '@/app/components/DevOnlyRoute';
import { isProd } from '@/app/lib/env';
import Link from 'next/link';
import Image from 'next/image';
import SignUp from '../../components/SignUp';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function SignUpPage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/recipes');
        }
    }, [user, router]);

    // For production builds, this page will not be included in the bundle
    if (isProd) {
        return null;
    }

    return (
        <DevOnlyRoute>
            <div className="min-h-screen relative">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 bg-[url('/images/bg_ingredients.png')] bg-repeat opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/90"></div>

                {/* Content */}
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
                                    width={160} 
                                    height={43}
                                    priority
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
                                Join Syft Today
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                className="text-gray-600 mb-6 text-center"
                            >
                                Create your account and start organizing your recipes
                            </motion.p>
                            
                            <SignUp />
                            
                            <div className="text-center mt-8">
                                <p className="text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <Link href="/login" className="font-medium text-red-500 hover:text-red-600 transition-colors">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </DevOnlyRoute>
    );
} 