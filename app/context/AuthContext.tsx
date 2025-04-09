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
    signInWithRedirect,
    getRedirectResult
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

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

// Get allowed emails from environment variables
const getAllowedEmails = (): string[] => {
    const allowedEmailsStr = process.env.NEXT_PUBLIC_ALLOWED_EMAILS;
    if (!allowedEmailsStr) return [];
    
    // Split by comma and trim whitespace
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await createUserProfile(user);
            }
            setUser(user);
            setLoading(false);
        });

        // Handle redirect result when the component mounts
        getRedirectResult(auth).then(async (result) => {
            if (result) {
                const userEmail = result.user.email;
                const allowedEmails = getAllowedEmails();
                
                // Check if the user's email is in the allowed list
                if (!userEmail || (allowedEmails.length > 0 && !allowedEmails.includes(userEmail))) {
                    // If not allowed, sign them out
                    await signOut(auth);
                } else {
                    await createUserProfile(result.user);
                }
            }
        }).catch((error) => {
            console.error('Redirect result error:', error);
        });

        return unsubscribe;
    }, []);

    const signUp = async (email: string, password: string) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(result.user);
    };

    const signIn = async (email: string, password: string) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await createUserProfile(result.user);
    };

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        
        try {
            // Check if the browser is Safari
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            if (isSafari) {
                // Use redirect for Safari browsers
                await signInWithRedirect(auth, provider);
                return;
            }

            // For other browsers, try popup first
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

                await createUserProfile(result.user);
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