'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Button from './Button';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { signUp, signInWithGoogle } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        try {
            await signUp(email, password);
            setError('');
            router.push('/recipes');
        } catch (_) {
            setError('Failed to create an account.');
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            setError('');
            router.push('/recipes');
        } catch (error) {
            console.error('Google sign-in error:', error);
            setError('Failed to sign in with Google.');
        }
    };

    return (
        <div className="bg-white shadow-md rounded px-8 pt-10 pb-8 m-4 w-full max-w-sm">
            <h2 className="text-3xl mb-6 text-center">Create Account</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
                        required
                    />
                </div>
                <Button
                    variant='primary'
                >Sign Up</Button>
            </form>
            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or</span>
                    </div>
                </div>
                <div className="mt-6">
                    <Button
                        text="Sign up with Google"
                        className="w-full bg-light-grey text-foreground py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer"
                        onClick={handleGoogleSignIn}
                    />
                </div>
            </div>
        </div>
    );
} 