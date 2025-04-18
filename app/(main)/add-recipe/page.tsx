'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import RecipeForm from '@/app/components/RecipeForm';
import UrlInput from '@/app/components/UrlInput';
import { FiArrowLeft, FiFileText, FiGlobe } from 'react-icons/fi';

export default function AddRecipe() {
    const [selectedOption, setSelectedOption] = useState<'url' | 'manual' | null>(null);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-basil to-emerald-700 bg-clip-text text-transparent mb-4">Add a Recipe</h1>
                        <p className="text-gray-600 text-lg">Choose how you&apos;d like to add your culinary masterpiece to your collection</p>
                    </div>
                    
                    {/* Option Selection */}
                    {!selectedOption && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <motion.div
                                className="group p-8 bg-white rounded-2xl shadow-md border border-gray-100 hover:border-basil hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedOption('url')}
                            >
                                {/* Background decoration */}
                                <div className="absolute -right-10 -top-10 h-40 w-40 bg-basil-50 rounded-full opacity-20 group-hover:bg-basil-100 transition-colors"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-xl bg-basil-50 flex items-center justify-center text-basil group-hover:bg-basil group-hover:text-white transition-all shadow-sm">
                                            <FiGlobe className="w-7 h-7" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-basil transition-colors">Import from URL</h2>
                                    </div>

                                    <div className="ml-2">
                                        <p className="text-gray-600 mb-6 group-hover:text-gray-700 transition-colors">
                                            Paste a URL from your favorite recipe website, and we&apos;ll automatically import all the details for you.
                                        </p>
                                        
                                        <ul className="space-y-2 text-sm text-gray-500 mb-6">
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-basil flex-shrink-0"></span>
                                                <span>Quick and easy recipe import</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-basil flex-shrink-0"></span>
                                                <span>Automatically extracts ingredients and steps</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-basil flex-shrink-0"></span>
                                                <span>Properly credits original source</span>
                                            </li>
                                        </ul>
                                        
                                        <span className="inline-flex items-center text-basil font-medium text-sm group-hover:translate-x-1 transition-transform">
                                            Import recipe <FiArrowLeft className="ml-1 rotate-180 w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="group p-8 bg-white rounded-2xl shadow-md border border-gray-100 hover:border-basil hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedOption('manual')}
                            >
                                {/* Background decoration */}
                                <div className="absolute -right-10 -top-10 h-40 w-40 bg-basil-50 rounded-full opacity-20 group-hover:bg-basil-100 transition-colors"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-xl bg-basil-50 flex items-center justify-center text-basil group-hover:bg-basil group-hover:text-white transition-all shadow-sm">
                                            <FiFileText className="w-7 h-7" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-basil transition-colors">Create Custom Recipe</h2>
                                    </div>

                                    <div className="ml-2">
                                        <p className="text-gray-600 mb-6 group-hover:text-gray-700 transition-colors">
                                            Enter your recipe details manually to create a custom recipe from scratch with full control over every detail.
                                        </p>
                                        
                                        <ul className="space-y-2 text-sm text-gray-500 mb-6">
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-basil flex-shrink-0"></span>
                                                <span>Full control over every detail</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-basil flex-shrink-0"></span>
                                                <span>Perfect for family recipes or original creations</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-basil flex-shrink-0"></span>
                                                <span>Organize with custom categories</span>
                                            </li>
                                        </ul>
                                        
                                        <span className="inline-flex items-center text-basil font-medium text-sm group-hover:translate-x-1 transition-transform">
                                            Create recipe <FiArrowLeft className="ml-1 rotate-180 w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* URL or Form Input */}
                    <AnimatePresence mode="wait">
                        {selectedOption && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className=""
                            >
                                <button
                                    onClick={() => setSelectedOption(null)}
                                    className="mb-8 text-gray-600 hover:text-basil flex items-center gap-2 transition-colors font-medium"
                                >
                                    <FiArrowLeft className="w-5 h-5" />
                                    Back to options
                                </button>

                                {selectedOption === 'url' ? (
                                    <UrlInput />
                                ) : (
                                    <RecipeForm />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
} 