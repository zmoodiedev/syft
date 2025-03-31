'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
    User,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    signInWithRedirect
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Get allowed emails from environment variables
const getAllowedEmails = (): string[] => {
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
    if (!allowedEmailsStr) return [];
    
    // Split by comma and trim whitespace
    return allowedEmailsStr.split(',').map(email => email.trim());
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signUp = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        
        try {
            // Try to use signInWithPopup first
            try {
                const result = await signInWithPopup(auth, provider);
                const userEmail = result.user.email;
                const allowedEmails = getAllowedEmails();
                
                // Check if the user's email is in the allowed list
                if (!userEmail || (allowedEmails.length > 0 && !allowedEmails.includes(userEmail))) {
                    // If not allowed, sign them out and throw an error
                    await signOut(auth);
                    throw new Error('Access denied. Syft is currently in beta and only open to selected users.');
                }
            } catch (popupError: unknown) {
                // If popup fails due to storage issues, try redirect method
                if (popupError instanceof Error && 
                    (popupError.message.includes('missing initial state') || 
                    popupError.message.includes('storage-partitioned'))) {
                    await signInWithRedirect(auth, provider);
                    return; // The redirect will handle the rest
                }
                throw popupError; // Re-throw if it's a different error
            }
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        user,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
} 