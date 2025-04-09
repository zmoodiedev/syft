'use client';

import Link from "next/link";
import Image from "next/image";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFriends } from '@/app/context/FriendsContext';

export default function Header() {
    const { user, logout } = useAuth();
    const { sharedRecipes } = useFriends();
    const router = useRouter();
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Handle mounting
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    
    // Close mobile menu when window is resized to desktop size
    useEffect(() => {
        if (!mounted) return;
        
        const handleResize = () => {
            if (window.innerWidth >= 768 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen, mounted]);
    
    // Prevent scrolling when mobile menu is open
    useEffect(() => {
        if (!mounted) return;
        
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen, mounted]);

    const handleLogout = async () => {
        try {
            await logout();
            setMobileMenuOpen(false);
            router.push('/');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    };

    // Don't render anything until mounted
    if (!mounted) {
        return (
            <header className={`w-full h-[var(--header-height)] p-4 z-[100] ${!isHomePage ? 'bg-white' : ''} ${isHomePage ? 'absolute' : ''}`}>
                <div className="w-full container mx-auto flex flex-row justify-between items-center h-full">
                    <div className="h-[57px] w-[100px]" />
                    <div className="h-[40px] w-[100px]" />
                </div>
            </header>
        );
    }
    

    return (
        <header className={`w-full h-[var(--header-height)] p-4 z-[100] ${!isHomePage ? 'bg-white' : ''} ${isHomePage ? 'absolute' : ''}`}>
            <div className="w-full container mx-auto flex flex-row justify-between items-center h-full">
                <Link href="/" className="flex items-center">
                    <div className="relative h-[57px] w-[100px]">
                        <Image
                            src="/logo_syft_h.svg"
                            alt="Syft Logo"
                            width={100}
                            height={57}
                            priority
                            className={`h-[57px] w-auto ${isHomePage ? 'hidden' : ''}`}
                            style={{ contain: 'paint' }}
                            aria-label="Syft Logo"
                            data-extension-ignore="true"
                        />
                    </div>
                </Link>

                <nav className="flex flex-row gap-[1rem] items-center">
                    {user && (
                        <ul className="flex-row gap-10 text-base font-medium hidden md:flex mr-8">
                            <li>
                                <Link
                                    href="/recipes"
                                    className={`${isHomePage ? 'text-white' : 'text-cast-iron'}  hover:text-tomato px-3 py-2 rounded-lg transition-colors ${
                                        pathname === '/recipes' ? 'bg-gray-100' : ''
                                    }`}
                                >
                                    Your Recipes
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/add-recipe"
                                    className={`${isHomePage ? 'text-white' : 'text-cast-iron'} hover:text-tomato px-3 py-2 rounded-lg transition-colors ${
                                        pathname === '/add-recipe' ? 'bg-gray-100' : ''
                                    }`}
                                >
                                    Add Recipe
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/friends"
                                    className={`${isHomePage ? 'text-white' : 'text-cast-iron'} hover:text-tomato px-3 py-2 rounded-lg transition-colors ${
                                        pathname === '/friends' ? 'bg-gray-100' : ''
                                    } relative`}
                                >
                                    Friends
                                    {sharedRecipes.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                            {sharedRecipes.length}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        </ul>
                    )}
                    {user ? (
                        <>
                            {/* Mobile Burger Menu Button */}
                            <button 
                                className="block md:hidden text-[28px] z-[110]"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Toggle menu"
                                data-extension-ignore="true"
                            >
                                <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-burger'} ${isHomePage && !mobileMenuOpen ? 'text-white' : 'text-cast-iron'}`}></i>
                            </button>
                            
                            {/* Full Screen Mobile Menu */}
                            <AnimatePresence mode="wait">
                                {mobileMenuOpen && (
                                    <motion.div 
                                        className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto"
                                        initial={{ x: '100%' }}
                                        animate={{ x: 0 }}
                                        exit={{ x: '100%' }}
                                        transition={{ type: 'tween', duration: 0.3 }}
                                        data-extension-ignore="true"
                                    >
                                        <div className="flex flex-col h-full p-6 pt-20">
                                            <div className="flex items-center mb-8">
                                                {user.photoURL && (
                                                    <Image
                                                        src={user.photoURL}
                                                        alt="Profile"
                                                        width={48}
                                                        height={48}
                                                        className="rounded-full h-12 w-12 object-cover mr-3"
                                                        data-extension-ignore="true"
                                                    />
                                                )}
                                                <div>
                                                    <span className="text-lg font-semibold block">
                                                        {user.displayName || user.email || 'User'}
                                                    </span>
                                                    <span className="text-sm text-gray-500">{user.email || 'No email'}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col space-y-4 text-lg">
                                                <Link 
                                                    href="/recipes"
                                                    className="py-3 border-b border-gray-100 flex items-center"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    data-extension-ignore="true"
                                                >
                                                    <i className="fa-solid fa-book-open mr-3 w-6 text-center"></i>
                                                    Your Recipes
                                                </Link>
                                                <Link 
                                                    href="/add-recipe"
                                                    className="py-3 border-b border-gray-100 flex items-center"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    data-extension-ignore="true"
                                                >
                                                    <i className="fa-solid fa-plus mr-3 w-6 text-center"></i>
                                                    Add Recipe
                                                </Link>
                                                <Link 
                                                    href="/friends"
                                                    className="py-3 border-b border-gray-100 flex items-center"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    data-extension-ignore="true"
                                                >
                                                    <i className="fa-solid fa-user-group mr-3 w-6 text-center"></i>
                                                    <div className="relative">
                                                        Friends
                                                        {sharedRecipes.length > 0 && (
                                                            <span className="absolute -top-1 -right-6 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                                {sharedRecipes.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                                <button 
                                                    onClick={handleLogout}
                                                    className="py-3 border-b border-gray-100 flex items-center text-left"
                                                    data-extension-ignore="true"
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
                                data-extension-ignore="true"
                            >
                                <div className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg bg-white hover:bg-gray-100 transition-colors">
                                    {user.photoURL && (
                                        <Image
                                            src={user.photoURL}
                                            alt="Profile"
                                            width={32}
                                            height={32}
                                            className="rounded-full h-8 w-8 object-cover"
                                            data-extension-ignore="true"
                                        />
                                    )}
                                    <span className="text-sm font-medium">
                                        {user.displayName || user.email || 'User'}
                                    </span>
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                                        viewBox="0 0 20 20" 
                                        fill="currentColor"
                                        aria-hidden="true"
                                        data-extension-ignore="true"
                                    >
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <AnimatePresence mode="wait">
                                    {showDropdown && (
                                        <motion.div 
                                            className="absolute right-0 mt-0 w-48 bg-white rounded-md shadow-lg overflow-hidden z-10"
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            data-extension-ignore="true"
                                        >
                                            <div className="p-4">
                                                <button 
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-light-grey hover:text-primary-700 flex items-center gap-2 transition-colors"
                                                    data-extension-ignore="true"
                                                >
                                                    <i className="fa-solid fa-right-from-bracket"></i>
                                                    Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <div className="flex gap-4">
                            <Link href="/login">
                                <Button variant="primary">Login</Button>
                            </Link>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
}