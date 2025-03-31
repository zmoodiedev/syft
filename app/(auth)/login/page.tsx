'use client';

import Link from 'next/link';
import Image from 'next/image';
import SignIn from '@/app/components/SignIn';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/recipes');
        }
    }, [user, router]);

    return (
        <div className="flex flex-col items-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-100 to-red-200 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-red-100 to-red-200 rounded-full translate-y-1/3 -translate-x-1/3 opacity-50"></div>
            
            {/* Decorative dots pattern */}
            <div className="absolute top-1/4 left-10 grid grid-cols-3 gap-2">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-red-300 rounded-full"></div>
                ))}
            </div>
            <div className="absolute bottom-1/4 right-10 grid grid-cols-3 gap-2">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-red-300 rounded-full"></div>
                ))}
            </div>
            
            <div className="z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <Image 
                            src="/logo_syft_h.svg" 
                            alt="Syft Logo" 
                            width={160} 
                            height={43}
                            priority
                            className="h-auto" 
                        />
                    </Link>
                </div>
                
                <SignIn />
                
                {/*<div className="text-center mt-8">
                    <p className="text-sm text-gray-600">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="font-medium text-red-500 hover:text-red-600 transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>*/}
            </div>
        </div>
    );
} 