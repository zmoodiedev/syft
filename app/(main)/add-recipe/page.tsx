'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import RecipeForm from '@/app/components/RecipeForm';
import UrlInput from '@/app/components/UrlInput';
import { FiLink, FiEdit2, FiArrowLeft } from 'react-icons/fi';

export default function AddRecipe() {
    const [selectedOption, setSelectedOption] = useState<'url' | 'manual' | null>(null);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            <div className="w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Add a Recipe</h1>
                    <p className="text-gray-600 mb-8">Choose how you'd like to add your recipe</p>
                    
                    {/* Option Selection */}
                    {!selectedOption && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <motion.div
                                className="group p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-red-500 transition-all cursor-pointer"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedOption('url')}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                        <FiLink className="w-6 h-6 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-semibold text-gray-900">Import from URL</h2>
                                </div>
                                <p className="text-gray-600">
                                    Paste a URL from your favorite recipe website, and we&apos;ll automatically import the details.
                                </p>
                            </motion.div>

                            <motion.div
                                className="group p-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-red-500 transition-all cursor-pointer"
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedOption('manual')}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                        <FiEdit2 className="w-6 h-6 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-semibold text-gray-900">Create Custom Recipe</h2>
                                </div>
                                <p className="text-gray-600">
                                    Enter your recipe details manually to create a custom recipe from scratch.
                                </p>
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
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
                            >
                                <button
                                    onClick={() => setSelectedOption(null)}
                                    className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
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