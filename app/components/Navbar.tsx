'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from './Button';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="bg-white shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
                            Syft
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            href="/recipes"
                            className="text-gray-700 hover:text-basil transition-colors duration-200 relative group"
                        >
                            Recipes
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-basil group-hover:w-full transition-all duration-300"></span>
                        </Link>
                        <Link
                            href="/friends"
                            className="text-gray-700 hover:text-basil transition-colors duration-200 relative group"
                        >
                            Friends
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-basil group-hover:w-full transition-all duration-300"></span>
                        </Link>
                        <Link
                            href="/profile"
                            className="text-gray-700 hover:text-basil transition-colors duration-200 relative group"
                        >
                            Profile
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-basil group-hover:w-full transition-all duration-300"></span>
                        </Link>
                        <Button
                            variant="primary"
                            href="/login"
                        >
                            Sign In
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-gray-600 hover:text-pink-500"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                <motion.div
                    initial={false}
                    animate={{ height: isMenuOpen ? 'auto' : 0 }}
                    className="md:hidden overflow-hidden"
                >
                    <div className="py-4 space-y-4">
                        <Link
                            href="/recipes"
                            className="block text-gray-600 hover:text-pink-500 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Recipes
                        </Link>
                        <Link
                            href="/about"
                            className="block text-gray-600 hover:text-pink-500 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            About
                        </Link>
                        <Button
                            variant="primary"
                            href="/login"
                            className="w-full"
                        >
                            Sign In
                        </Button>
                    </div>
                </motion.div>
            </div>
        </nav>
    );
} 