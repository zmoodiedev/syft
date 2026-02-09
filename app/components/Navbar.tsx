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

export default function Navbar() {
    const { user, userProfile, logout } = useAuth();
    const { sharedRecipes } = useFriends();
    const router = useRouter();
    const pathname = usePathname();
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    
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
        <nav className="flex flex-row gap-[1rem] items-center">
            {user && (
                <ul className="flex-row gap-10 text-base font-medium hidden md:flex mr-8">
                    <li>
                        <Link
                            href="/recipes"
                            className={`text-cast-iron hover:text-light-green px-3 py-2 transition-colors ${
                                pathname === '/recipes' ? 'border-b-2 border-light-green' : ''
                            }`}
                        >
                            My Recipes
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/add-recipe"
                            className={`text-cast-iron hover:text-light-green px-3 py-2 transition-colors ${
                                pathname === '/add-recipe' ? 'border-b-2 border-light-green' : ''
                            }`}
                        >
                            Add Recipe
                        </Link>
                    </li>
                </ul>
            )}
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
                                            Log Out
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
                                    {(sharedRecipes.length > 0 || unreadNotificationCount > 0) && (
                                        <span className="mr-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-light-green rounded-full">
                                            {sharedRecipes.length + unreadNotificationCount}
                                        </span>
                                    )}
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
                                            Log Out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </>
            ) : (
                <div className="flex items-center">
                    <Button 
                        variant="ghost"
                        href="/login"
                        className="text-sm"
                    >
                        Log In
                    </Button>

                {/* <Button
                    variant="secondary"
                    href="/signup"
                    className="text-sm"
                >
                    Sign Up
                </Button> */}
            </div>
            )}
        </nav>
    );
} 