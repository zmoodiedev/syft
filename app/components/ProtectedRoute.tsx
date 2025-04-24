'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip redirection logic during SSR or when still loading
        if (typeof window === 'undefined' || loading) return;

        // If no user is authenticated and not already on the login page, redirect to login
        // Allow access to public routes: login, signup, home, and recipe detail pages
        if (!user && 
            !pathname.includes('/login') && 
            !pathname.includes('/signup') && 
            pathname !== '/' && 
            !pathname.includes('/recipes/') &&
            !pathname.includes('/profile/')) {
            router.push('/login');
        }
    }, [user, loading, router, pathname]);

    // During loading state, show a simple loading indicator
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
            </div>
        );
    }

    // Show the content if:
    // 1. User is authenticated
    // 2. On login or signup page
    // 3. On a recipe detail page (will be handled by the page component)
    // 4. On a profile page (will be handled by the page component)
    if (user || 
        pathname.includes('/login') || 
        pathname.includes('/signup') || 
        pathname === '/' || 
        pathname.includes('/recipes/') ||
        pathname.includes('/profile/')) {
        return <>{children}</>;
    }

    // This will show briefly during redirection
    return null;
} 