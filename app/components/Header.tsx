'use client';

import Link from "next/link";
import Image from "next/image";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";

export default function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    };

    return (
        <header className={`p-4 min-h-[var(--header-height)] relative z-2 ${!isHomePage ? 'bg-white' : ''}`}>
            <div className="w-full container mx-auto flex flex-row justify-between items-center">
                <Link href="/">
                    <Image
                        src="/logo_whiisk.svg"
                        alt="Whiisk logo"
                        width={100}
                        height={27}
                        priority
                        className="h-auto"
                    />
                </Link>
                {user && (
                    <ul className="flex flex-row gap-8 text-base font-medium">
                        <li>
                            <Link
                                href="/recipes">Your Recipes</Link></li>
                        <li>
                            <Link
                                href="/add-recipe">Add a Recipe</Link></li>
                    </ul>
                )}
                <nav className="flex flex-row gap-[1rem] items-center">
                    {user ? (
                        <div 
                            className="relative"
                            onMouseEnter={() => setShowDropdown(true)}
                            onMouseLeave={() => setShowDropdown(false)}
                        >
                            <div className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800">
                                    {user.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <span className="text-sm font-medium">{user.email}</span>
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <AnimatePresence>
                                {showDropdown && (
                                    <motion.div 
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-10"
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                        <div className="py-1">
                                            <button 
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 flex items-center gap-2 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 11-2 0V4H5v16h10v-6a1 1 0 112 0v7a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
                                                    <path d="M16.293 9.707a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 12H7a1 1 0 110-2h5.586l-1.293-1.293a1 1 0 111.414-1.414l4 4z" />
                                                </svg>
                                                Logout
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/login')}
                            >
                                Login
                            </Button>
                            {/*<Button
                                variant="secondary"
                                onClick={() => router.push('/signup')}
                                className="bg-accent"
                            >
                                Sign Up
                            </Button>*/}
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}