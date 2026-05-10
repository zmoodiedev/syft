'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined' || loading) return;

        if (!user &&
            !pathname.includes('/login') &&
            !pathname.includes('/signup') &&
            pathname !== '/' &&
            !pathname.includes('/recipes/') &&
            !pathname.includes('/profile/')) {
            router.push('/login');
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
            </div>
        );
    }

    if (user ||
        pathname.includes('/login') ||
        pathname.includes('/signup') ||
        pathname === '/' ||
        pathname.includes('/recipes/') ||
        pathname.includes('/profile/')) {
        return <>{children}</>;
    }

    return null;
}
