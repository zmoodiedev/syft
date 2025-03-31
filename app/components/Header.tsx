'use client';

import Link from "next/link";
import Image from "next/image";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";

export default function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    // Close mobile menu when window is resized to desktop size
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen]);
    
    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const handleLogout = async () => {
        try {
            await logout();
            setMobileMenuOpen(false);
            router.push('/');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    };

    return (
        <header className={`p-4 min-h-[var(--header-height)] z-[100] ${!isHomePage ? 'bg-white' : ''} ${isHomePage ? 'absolute' : ''} w-full`}>
            <div className="w-full container mx-auto flex flex-row justify-between items-center">
                <Link href="/">
                    <Image
                        src="/logo_syft_h.svg"
                        alt="Syft Logo"
                        width={100}
                        height={27}
                        priority
                        className={`h-auto ${isHomePage ? 'hidden' : ''}`}
                    />
                </Link>
                
                <nav className="flex flex-row gap-[1rem] items-center">
                    {user && (
                        <ul className="flex-row gap-10 text-base font-medium hidden md:flex mr-8">
                            <li>
                                <Link
                                    href="/recipes" className={`${isHomePage ? 'text-white' : 'text-cast-iron'}`}>My Recipes</Link></li>
                            <li>
                                <Link
                                    href="/add-recipe" className={`${isHomePage ? 'text-white' : 'text-cast-iron'}`}>Add a Recipe</Link></li>
                        </ul>
                    )}
                    {user ? (
                        <>
                            {/* Mobile Burger Menu Button */}
                            <button 
                                className="block md:hidden text-[28px] z-[110]"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Toggle menu"
                            >
                                <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-burger'} ${isHomePage && !mobileMenuOpen ? 'text-white' : 'text-cast-iron'}`}></i>
                            </button>
                            
                            {/* Full Screen Mobile Menu */}
                            <AnimatePresence>
                                {mobileMenuOpen && (
                                    <motion.div 
                                        className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto"
                                        initial={{ x: '100%' }}
                                        animate={{ x: 0 }}
                                        exit={{ x: '100%' }}
                                        transition={{ type: 'tween', duration: 0.3 }}
                                    >
                                        <div className="flex flex-col h-full p-6 pt-20">
                                            <div className="flex items-center mb-8">
                                                {user.photoURL ? (
                                                    <Image
                                                        src={user.photoURL}
                                                        alt="Profile"
                                                        width={48}
                                                        height={48}
                                                        className="rounded-full h-12 w-12 object-cover mr-3"
                                                    />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 text-xl mr-3">
                                                        {user.email?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-lg font-semibold block">
                                                        {user.displayName 
                                                            ? user.displayName.split(' ')[0]
                                                            : user.email}
                                                    </span>
                                                    <span className="text-sm text-gray-500">{user.email}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col space-y-4 text-lg">
                                                <Link 
                                                    href="/recipes"
                                                    className="py-3 border-b border-gray-100 flex items-center"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    <i className="fa-solid fa-book-open mr-3 w-6 text-center"></i>
                                                    My Recipes
                                                </Link>
                                                <Link 
                                                    href="/add-recipe"
                                                    className="py-3 border-b border-gray-100 flex items-center"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    <i className="fa-solid fa-plus mr-3 w-6 text-center"></i>
                                                    Add Recipe
                                                </Link>
                                                <button 
                                                    onClick={handleLogout}
                                                    className="py-3 border-b border-gray-100 flex items-center text-left"
                                                >
                                                    <i className="fa-solid fa-right-from-bracket mr-3 w-6 text-center"></i>
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* Desktop Dropdown */}
                            <div 
                                className="relative hidden md:block"
                                onMouseEnter={() => setShowDropdown(true)}
                                onMouseLeave={() => setShowDropdown(false)}
                            >
                                <div className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg bg-white hover:bg-gray-100 transition-colors">
                                    {user.photoURL ? (
                                        <Image
                                            src={user.photoURL}
                                            alt="Profile"
                                            width={32}
                                            height={32}
                                            className="rounded-full h-8 w-8 object-cover"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800">
                                            {user.email?.charAt(0).toUpperCase() || "U"}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium">
                                        {user.displayName 
                                            ? user.displayName.split(' ')[0] // Get first name
                                            : user.email}
                                    </span>
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
                                            className="absolute right-0 mt-0 w-48 bg-white rounded-md shadow-lg overflow-hidden z-10"
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                        >
                                            <div className="p-4">
                                                <span className="text-sm font-semibold block">
                                                    Hi, {user.displayName 
                                                        ? user.displayName.split(' ')[0] // Get first name
                                                        : user.email}!
                                                </span>
                                                <button 
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-light-grey hover:text-primary-700 flex items-center gap-2 transition-colors"
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
                        </>
                    ) : (
                        <>
                            <Button
                                variant="primary"
                                onClick={() => router.push('/login')}
                            >
                                Login
                            </Button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}