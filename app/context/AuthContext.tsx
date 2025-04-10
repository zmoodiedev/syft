'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
    User,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
    return useContext(AuthContext);
}

const getAllowedEmails = (): string[] => {
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
    if (!allowedEmailsStr) return [];
    return allowedEmailsStr.split(',').map(email => email.trim());
};

const createUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp()
        });
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let mounted = true;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!mounted) return;

            if (user) {
                await createUserProfile(user);
                setUser(user);
                // Only redirect if we're on the login page and not already authenticated
                if (pathname === '/login') {
                    router.push('/recipes');
                }
            } else {
                setUser(null);
                // Only redirect to login if we're not already there and not on a public route
                if (pathname !== '/login' && pathname !== '/') {
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
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const userEmail = result.user.email;
            const allowedEmails = getAllowedEmails();
            
            if (!userEmail || (allowedEmails.length > 0 && !allowedEmails.includes(userEmail))) {
                await signOut(auth);
                throw new Error('Access denied. Syft is currently in beta and only open to selected users.');
            }

            await createUserProfile(result.user);
            // No need to redirect here as onAuthStateChanged will handle it
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        signUp: async (email: string, password: string) => {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await createUserProfile(result.user);
        },
        signIn: async (email: string, password: string) => {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await createUserProfile(result.user);
        },
        signInWithGoogle,
        logout: async () => {
            await signOut(auth);
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}