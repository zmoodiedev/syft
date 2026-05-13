'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { UserProfile, DEFAULT_USER_SETTINGS } from '../models/User';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signUp: (email: string, password: string, displayName?: string, tier?: 'Free' | 'Pro', billingCycle?: 'monthly' | 'yearly') => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
    return useContext(AuthContext);
}

const isIOS = () =>
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const getAllowedEmails = (): string[] => {
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
    if (!allowedEmailsStr) return [];
    return allowedEmailsStr.split(',').map(email => email.trim());
};

const createUserProfile = async (
    user: User,
    displayName?: string,
    tier: 'Free' | 'Pro' = 'Free',
    billingCycle?: 'monthly' | 'yearly'
) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileData: Record<string, any> = {
            ...DEFAULT_USER_SETTINGS,
            displayName: displayName || user.displayName || null,
            email: user.email,
            photoURL: user.photoURL || null,
            tier: 'Free', // Always Free until payment confirmed
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Store upgrade intent so we can notify when billing goes live
        if (tier === 'Pro' && billingCycle) {
            profileData.pendingTier = 'Pro';
            profileData.pendingBillingCycle = billingCycle;
        }

        await setDoc(userRef, profileData);
    }
};

// Function to fetch user profile from Firestore
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            return null;
        }
        
        return {
            id: userDoc.id,
            ...userDoc.data(),
            createdAt: userDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: userDoc.data().updatedAt?.toDate() || new Date()
        } as UserProfile;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        getRedirectResult(auth)
            .then(async (result) => {
                if (!result) return;
                const userEmail = result.user.email;
                const allowedEmails = getAllowedEmails();
                if (!userEmail || (allowedEmails.length > 0 && !allowedEmails.includes(userEmail))) {
                    await signOut(auth);
                    return;
                }
                await createUserProfile(result.user);
                const profile = await fetchUserProfile(result.user.uid);
                if (profile) setUserProfile(profile);
            })
            .catch((error) => {
                if ((error as { code?: string }).code !== 'auth/cancelled-popup-request') {
                    console.error('Redirect sign-in error:', error);
                }
            });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let mounted = true;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!mounted) return;

            if (user) {
                await createUserProfile(user);
                setUser(user);
                
                // Fetch user profile from Firestore
                const profile = await fetchUserProfile(user.uid);
                if (profile) {
                    setUserProfile(profile);
                }
                
                // Only redirect if we're on the login page and not already authenticated
                if (pathname === '/login') {
                    router.push('/recipes');
                }
            } else {
                setUser(null);
                setUserProfile(null);
                if (pathname !== '/login' &&
                    pathname !== '/' &&
                    pathname !== '/pricing' &&
                    pathname !== '/about' &&
                    pathname !== '/contact' &&
                    pathname !== '/terms-of-service' &&
                    pathname !== '/privacy-policy' &&
                    pathname !== '/cookie-preferences' &&
                    pathname !== '/roadmap' &&
                    !pathname.includes('/signup') &&
                    !pathname.includes('/recipes/') &&
                    !pathname.includes('/profile/')) {
                    router.push('/login');
                }
            }
            setLoading(false);
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [router, pathname]);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();

        // iOS Safari blocks popups opened during async calls — use redirect instead
        if (isIOS()) {
            await signInWithRedirect(auth, provider);
            return; // page navigates away; result is handled by getRedirectResult on return
        }

        try {
            const result = await signInWithPopup(auth, provider);
            const userEmail = result.user.email;
            const allowedEmails = getAllowedEmails();

            if (!userEmail || (allowedEmails.length > 0 && !allowedEmails.includes(userEmail))) {
                await signOut(auth);
                throw new Error('Access denied. Syft is currently in beta and only open to selected users.');
            }

            await createUserProfile(result.user);
            const profile = await fetchUserProfile(result.user.uid);
            if (profile) setUserProfile(profile);
        } catch (error) {
            // Ignore cancelled-popup-request — fires when a double-click cancels the first popup
            if (
                error instanceof Error &&
                (error as { code?: string }).code === 'auth/cancelled-popup-request'
            ) {
                return;
            }
            console.error('Authentication error:', error);
            throw error;
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        signUp: async (email: string, password: string, displayName?: string, tier?: 'Free' | 'Pro', billingCycle?: 'monthly' | 'yearly') => {
            const allowedEmails = getAllowedEmails();
            if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
                throw new Error('Access denied. Syft is currently in beta and only open to selected users.');
            }
            const result = await createUserWithEmailAndPassword(auth, email, password);
            if (displayName) {
                await updateProfile(result.user, { displayName });
            }
            await sendEmailVerification(result.user);
            await createUserProfile(result.user, displayName, tier, billingCycle);
            const profile = await fetchUserProfile(result.user.uid);
            if (profile) {
                setUserProfile(profile);
            }
        },
        signIn: async (email: string, password: string) => {
            const allowedEmails = getAllowedEmails();
            if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
                throw new Error('Access denied. Syft is currently in beta and only open to selected users.');
            }
            const result = await signInWithEmailAndPassword(auth, email, password);
            if (!result.user.emailVerified) {
                try { await sendEmailVerification(result.user); } catch {}
                await signOut(auth);
                throw new Error('email-not-verified');
            }
            await createUserProfile(result.user);
            const profile = await fetchUserProfile(result.user.uid);
            if (profile) {
                setUserProfile(profile);
            }
        },
        signInWithGoogle,
        logout: async () => {
            await signOut(auth);
            setUserProfile(null);
        },
        resendVerificationEmail: async () => {
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
            }
        },
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}