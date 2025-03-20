'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import RecipeForm from '@/app/components/RecipeForm';
import UrlInput from '@/app/components/UrlInput';

export default function AddRecipe() {
    const [selectedOption, setSelectedOption] = useState<'url' | 'manual' | null>(null);

    return (
        <div className="w-full max-w-4xl mx-auto py-20 px-4">
            <h1 className="text-4xl font-bold mb-8">Add a Recipe</h1>
            
            {/* Option Selection */}
            {!selectedOption && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                        className="p-6 border rounded-lg cursor-pointer hover:border-light-blue transition-colors"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedOption('url')}
                    >
                        <h2 className="text-2xl font-semibold mb-3">Import from URL</h2>
                        <p className="text-gray-600">
                            Paste a URL from your favorite recipe website, and we&apos;ll automatically import the details.
                        </p>
                    </motion.div>

                    <motion.div
                        className="p-6 border rounded-lg cursor-pointer hover:border-light-blue transition-colors"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedOption('manual')}
                    >
                        <h2 className="text-2xl font-semibold mb-3">Create Custom Recipe</h2>
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
                    >
                        <button
                            onClick={() => setSelectedOption(null)}
                            className="mb-6 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                            </svg>
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
        </div>
    );
} 