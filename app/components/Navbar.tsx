'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import { useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useFriends } from '@/app/context/FriendsContext';
import { getUnreadNotificationCount } from '../lib/notification';
import { getUserRecipeCount } from '@/app/lib/recipe';
import { TIER_FEATURES } from '@/app/lib/tiers';
import UpgradeModal from './UpgradeModal';

export default function Navbar() {
    const { user, userProfile, logout, isDemo, exitDemoMode } = useAuth();
    const { sharedRecipes } = useFriends();
    const router = useRouter();
    const pathname = usePathname();
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    
    // Handle mounting
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    
    // Fetch unread notification count
    useEffect(() => {
        if (!user) return;
        
        const fetchNotificationCount = async () => {
            try {
                const count = await getUnreadNotificationCount(user.uid);
                setUnreadNotificationCount(count);
            } catch (error) {
                console.error('Error fetching notification count:', error);
            }
        };
        
        fetchNotificationCount();
        
        // You could add a polling mechanism here if needed
        const interval = setInterval(fetchNotificationCount, 60000); // Check every minute
        
        return () => clearInterval(interval);
    }, [user]);
    
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

    const handleAddRecipe = async () => {
        setMobileMenuOpen(false);
        if (userProfile?.tier === 'Free' && user) {
            const count = await getUserRecipeCount(user.uid);
            if (count >= TIER_FEATURES['Free'].maxRecipes) {
                setShowUpgradeModal(true);
                return;
            }
        }
        router.push('/add-recipe');
    };

    const handleLogout = async () => {
        try {
            await logout();
            setMobileMenuOpen(false);
            router.push('/');
        } catch (error) {
            console.error('Failed to log out:', error);
        }
    };

    if (isDemo) {
        return (
            <nav className="flex flex-row items-center flex-1">
                {/* Demo nav links — near logo */}
                <ul className="hidden md:flex items-center gap-1 text-sm font-medium">
                    <li>
                        <Link
                            href="/recipes"
                            className={`text-cast-iron hover:text-light-green px-3 py-2 transition-colors border-b-2 ${
                                pathname === '/recipes' ? 'border-light-green' : 'border-transparent'
                            }`}
                        >
                            Demo Recipes
                        </Link>
                    </li>
                </ul>

                {/* Mobile Burger Menu Button */}
                <button
                    className="block md:hidden text-[28px] z-[110] relative ml-auto"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-burger'}`}></i>
                </button>

                {/* Demo Mobile Menu */}
                <AnimatePresence mode="wait">
                    {mobileMenuOpen && (
                        <motion.div
                            className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                        >
                            <div className="flex flex-col h-full p-6 pt-20">
                                <div className="flex flex-col space-y-4 text-lg">
                                    <Link
                                        href="/recipes"
                                        className="py-3 border-b border-gray-100 flex items-center"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <i className="fa-solid fa-book-open mr-3 w-6 text-center"></i>
                                        Demo Recipes
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            exitDemoMode('/signup');
                                        }}
                                        className="py-3 border-b border-gray-100 flex items-center text-left"
                                    >
                                        <i className="fa-solid fa-user-plus mr-3 w-6 text-center"></i>
                                        Sign up
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            exitDemoMode('/login');
                                        }}
                                        className="py-3 border-b border-gray-100 flex items-center text-left"
                                    >
                                        <i className="fa-solid fa-right-to-bracket mr-3 w-6 text-center"></i>
                                        Sign in
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Desktop demo auth buttons — far right */}
                <div className="hidden md:flex items-center gap-2 ml-auto">
                    <Button
                        variant="ghost"
                        className="text-sm"
                        onClick={() => exitDemoMode()}
                    >
                        Sign in
                    </Button>
                    <Button
                        variant="primary"
                        className="text-sm"
                        onClick={() => exitDemoMode('/signup')}
                    >
                        Sign up
                    </Button>
                </div>
            </nav>
        );
    }

    return (
        <>
        <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            reason="recipe_limit"
        />
        <nav className="flex flex-row items-center flex-1">
            {/* Desktop nav links — near logo */}
            <ul className="hidden md:flex items-center gap-1 text-sm font-medium">
                {user ? (
                    <>
                        <li>
                            <Link
                                href="/recipes"
                                className={`text-cast-iron hover:text-light-green px-3 py-2 transition-colors border-b-2 ${
                                    pathname === '/recipes' ? 'border-light-green' : 'border-transparent'
                                }`}
                            >
                                My Recipes
                            </Link>
                        </li>
                        <li>
                            <button
                                onClick={handleAddRecipe}
                                className={`text-sm font-medium leading-normal text-cast-iron hover:text-light-green px-3 py-2 transition-colors border-b-2 ${
                                    pathname === '/add-recipe' ? 'border-light-green' : 'border-transparent'
                                }`}
                            >
                                Add Recipe
                            </button>
                        </li>
                    </>
                ) : (
                    <>
                        <li>
                            <Link href="/pricing" className={`px-3 py-2 transition-colors ${pathname === '/pricing' ? 'text-cast-iron' : 'text-cast-iron/60 hover:text-cast-iron'}`}>
                                Pricing
                            </Link>
                        </li>
                        <li>
                            <Link href="/about" className={`px-3 py-2 transition-colors ${pathname === '/about' ? 'text-cast-iron' : 'text-cast-iron/60 hover:text-cast-iron'}`}>
                                About
                            </Link>
                        </li>
                    </>
                )}
            </ul>

            {/* Auth / profile — pushed to far right */}
            <div className="ml-auto flex items-center gap-3">
            {user ? (
                <>
                    {/* Mobile Burger Menu Button */}
                    <button 
                        className="block md:hidden text-[28px] z-[110] relative"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                        data-extension-ignore="true"
                    >
                        <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-burger'}`}></i>
                        {(sharedRecipes.length > 0 || unreadNotificationCount > 0) && !mobileMenuOpen && (
                            <span className="absolute -top-1 -right-1 bg-light-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {sharedRecipes.length + unreadNotificationCount}
                            </span>
                        )}
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
                                        {userProfile?.photoURL ? (
                                            <Image
                                                src={userProfile.photoURL}
                                                alt="Profile"
                                                width={48}
                                                height={48}
                                                className="rounded-full h-12 w-12 object-cover mr-3"
                                                data-extension-ignore="true"
                                            />
                                        ) : (
                                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                                                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex items-center">
                                            <Link 
                                                href={`/profile/${user.uid}`} 
                                                className="text-lg font-semibold block hover:text-light-green"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                {userProfile?.displayName || user.email || 'User'}
                                            </Link>
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
                                            My Recipes
                                        </Link>
                                        <button
                                            onClick={handleAddRecipe}
                                            className="py-3 border-b border-gray-100 flex items-center text-left w-full"
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-plus mr-3 w-6 text-center"></i>
                                            Add Recipe
                                        </button>
                                        <Link 
                                            href={`/profile/${user.uid}?tab=friends`}
                                            className="py-3 border-b border-gray-100 flex items-center"
                                            onClick={() => setMobileMenuOpen(false)}
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-users mr-3 w-6 text-center"></i>
                                            Friends
                                        </Link>
                                        <Link 
                                            href={`/profile/${user.uid}`}
                                            className="py-3 border-b border-gray-100 flex items-center"
                                            onClick={() => setMobileMenuOpen(false)}
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-user mr-3 w-6 text-center"></i>
                                            Profile
                                        </Link>
                                        <Link 
                                            href={`/profile/${user.uid}?tab=notifications`}
                                            className="py-3 border-b border-gray-100 flex items-center relative"
                                            onClick={() => setMobileMenuOpen(false)}
                                            data-extension-ignore="true"
                                            aria-label="Notifications"
                                        >
                                            <i className="fa-solid fa-bell mr-3 w-6 text-center"></i>
                                            Notifications
                                            {unreadNotificationCount > 0 && (
                                                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-light-green rounded-full">
                                                    {unreadNotificationCount}
                                                </span>
                                            )}
                                        </Link>
                                        <button 
                                            onClick={handleLogout}
                                            className="py-3 border-b border-gray-100 flex items-center text-left"
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-right-from-bracket mr-3 w-6 text-center"></i>
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* User Profile Dropdown - Desktop */}
                    <div 
                        className="relative hidden md:block"
                        onMouseEnter={() => setShowDropdown(true)}
                        onMouseLeave={() => setShowDropdown(false)}
                    >
                        <div className="relative">
                            {/* User button with notification indicator */}
                            <button 
                                className="flex items-center gap-2 relative"
                                aria-label="User menu"
                                data-extension-ignore="true"
                            >
                                {userProfile?.photoURL ? (
                                    <div className="relative">
                                        <Image 
                                            src={userProfile.photoURL} 
                                            alt="User" 
                                            width={40} 
                                            height={40} 
                                            className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                                            data-extension-ignore="true"
                                        />
                                        {(sharedRecipes.length > 0 || unreadNotificationCount > 0) && (
                                            <span className="absolute -top-1 -right-1 bg-light-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {sharedRecipes.length + unreadNotificationCount}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                                        </div>
                                        {(sharedRecipes.length > 0 || unreadNotificationCount > 0) && (
                                            <span className="absolute -top-1 -right-1 bg-light-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                {sharedRecipes.length + unreadNotificationCount}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center">
                                    <Link href={`/profile/${user.uid}`} className="text-sm font-medium mr-2 hover:underline">
                                        {userProfile?.displayName || user.email}
                                    </Link>
                                    <i className="fa-solid fa-caret-down text-xs" />
                                </div>
                            </button>
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
                                        <Link 
                                            href={`/profile/${user.uid}`}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-light-grey hover:text-primary-700 flex items-center gap-2 transition-colors mb-2"
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-user"></i>
                                            Profile
                                        </Link>
                                        <Link 
                                            href={`/profile/${user.uid}?tab=friends`}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-light-grey hover:text-primary-700 flex items-center gap-2 transition-colors mb-2"
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-users"></i>
                                            Friends
                                        </Link>
                                        <Link 
                                            href={`/profile/${user.uid}?tab=notifications`}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-light-grey hover:text-primary-700 flex items-center gap-2 transition-colors mb-2 relative"
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-bell"></i>
                                            Notifications
                                            {unreadNotificationCount > 0 && (
                                                <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-light-green rounded-full">
                                                    {unreadNotificationCount}
                                                </span>
                                            )}
                                        </Link>
                                        <hr className="my-2" />
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-light-grey hover:text-primary-700 flex items-center gap-2 transition-colors"
                                            data-extension-ignore="true"
                                        >
                                            <i className="fa-solid fa-right-from-bracket"></i>
                                            Sign out
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
                        variant="ghost"
                        href="/login"
                        className="text-sm"
                    >
                        Sign in
                    </Button>
                    <Button
                        variant="primary"
                        href="/signup"
                        className="text-sm"
                    >
                        Sign up
                    </Button>
                </>
            )}
            </div>
        </nav>
        </>
    );
} 