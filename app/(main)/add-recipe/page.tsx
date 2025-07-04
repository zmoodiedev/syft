'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import RecipeForm from '@/app/components/RecipeForm';
import UrlInput from '@/app/components/UrlInput';
import BulkEntryForm from '@/app/components/BulkEntryForm';
import { FiArrowLeft, FiFileText, FiGlobe, FiCamera, FiList } from 'react-icons/fi';

export default function AddRecipe() {
    const [selectedOption, setSelectedOption] = useState<'url' | 'manual' | 'scan' | 'bulk' | null>(null);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <h1 className="text-4xl md:text-5xl mb-4">Add a Recipe</h1>
                        <p className="text-gray-600 text-lg">Choose how you&apos;d like to add your culinary masterpiece to your collection</p>
                    </div>
                    
                    {/* Option Selection */}
                    {!selectedOption && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            <motion.div
                                className="group p-6 bg-white rounded-2xl shadow-md border border-gray-100 hover:border-light-green hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedOption('url')}
                            >
                                {/* Background decoration */}
                                <div className="absolute -right-10 -top-10 h-40 w-40 bg-light-green-50 rounded-full opacity-20 group-hover:bg-light-green-100 transition-colors"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-light-green-50 flex items-center justify-center text-light-green group-hover:bg-light-green group-hover:text-white transition-all shadow-sm">
                                            <FiGlobe className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-light-green transition-colors">Import from URL</h2>
                                    </div>

                                    <div className="ml-1">
                                        <p className="text-gray-600 mb-4 group-hover:text-gray-700 transition-colors text-sm">
                                            Paste a URL from your favorite recipe website, and we&apos;ll automatically import all the details for you.
                                        </p>
                                        
                                        <ul className="space-y-1 text-xs text-gray-500 mb-4">
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>Quick and easy recipe import</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>Automatically extracts ingredients and steps</span>
                                            </li>
                                        </ul>
                                        
                                        <span className="inline-flex items-center text-light-green font-medium text-sm group-hover:translate-x-1 transition-transform">
                                            Import recipe <FiArrowLeft className="ml-1 rotate-180 w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="group p-6 bg-white rounded-2xl shadow-md border border-gray-100 hover:border-light-green hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedOption('scan')}
                            >
                                {/* Background decoration */}
                                <div className="absolute -right-10 -top-10 h-40 w-40 bg-light-green-50 rounded-full opacity-20 group-hover:bg-light-green-100 transition-colors"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-light-green-50 flex items-center justify-center text-light-green group-hover:bg-light-green group-hover:text-white transition-all shadow-sm">
                                            <FiCamera className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-light-green transition-colors">Scan Recipe Card</h2>
                                    </div>

                                    <div className="ml-1">
                                        <p className="text-gray-600 mb-4 group-hover:text-gray-700 transition-colors text-sm">
                                            Upload a photo of a recipe card or cookbook page and let AI extract the recipe details automatically.
                                        </p>
                                        
                                        <ul className="space-y-1 text-xs text-gray-500 mb-4">
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>AI-powered recipe extraction</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>Perfect for recipe cards and cookbook pages</span>
                                            </li>
                                        </ul>
                                        
                                        <span className="inline-flex items-center text-light-green font-medium text-sm group-hover:translate-x-1 transition-transform">
                                            Scan recipe <FiArrowLeft className="ml-1 rotate-180 w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="group p-6 bg-white rounded-2xl shadow-md border border-gray-100 hover:border-light-green hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedOption('bulk')}
                            >
                                {/* Background decoration */}
                                <div className="absolute -right-10 -top-10 h-40 w-40 bg-light-green-50 rounded-full opacity-20 group-hover:bg-light-green-100 transition-colors"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-light-green-50 flex items-center justify-center text-light-green group-hover:bg-light-green group-hover:text-white transition-all shadow-sm">
                                            <FiList className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-light-green transition-colors">Bulk Entry</h2>
                                    </div>

                                    <div className="ml-1">
                                        <p className="text-gray-600 mb-4 group-hover:text-gray-700 transition-colors text-sm">
                                            Copy and paste ingredients and instructions from another source. Perfect for importing from text sources.
                                        </p>
                                        
                                        <ul className="space-y-1 text-xs text-gray-500 mb-4">
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>Copy and paste from any text source</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>Automatically parses ingredients and instructions</span>
                                            </li>
                                        </ul>
                                        
                                        <span className="inline-flex items-center text-light-green font-medium text-sm group-hover:translate-x-1 transition-transform">
                                            Bulk import <FiArrowLeft className="ml-1 rotate-180 w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="group p-6 bg-white rounded-2xl shadow-md border border-gray-100 hover:border-light-green hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                                whileHover={{ scale: 1.03, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedOption('manual')}
                            >
                                {/* Background decoration */}
                                <div className="absolute -right-10 -top-10 h-40 w-40 bg-light-green-50 rounded-full opacity-20 group-hover:bg-light-green-100 transition-colors"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-light-green-50 flex items-center justify-center text-light-green group-hover:bg-light-green group-hover:text-white transition-all shadow-sm">
                                            <FiFileText className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-light-green transition-colors">Manual Entry</h2>
                                    </div>

                                    <div className="ml-1">
                                        <p className="text-gray-600 mb-4 group-hover:text-gray-700 transition-colors text-sm">
                                            Enter your recipe details manually to create a custom recipe from scratch with full control over every detail.
                                        </p>
                                        
                                        <ul className="space-y-1 text-xs text-gray-500 mb-4">
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>Full control over every detail</span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-light-green flex-shrink-0"></span>
                                                <span>Perfect for family recipes or original creations</span>
                                            </li>
                                        </ul>
                                        
                                        <span className="inline-flex items-center text-light-green font-medium text-sm group-hover:translate-x-1 transition-transform">
                                            Create recipe <FiArrowLeft className="ml-1 rotate-180 w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* URL, Scan, or Form Input */}
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
                                    className="mb-8 text-gray-600 hover:text-light-green flex items-center gap-2 transition-colors font-medium"
                                >
                                    <FiArrowLeft className="w-5 h-5" />
                                    Back to options
                                </button>

                                {selectedOption === 'url' ? (
                                    <UrlInput />
                                ) : selectedOption === 'scan' ? (
                                    <RecipeForm scanMode={true} />
                                ) : selectedOption === 'bulk' ? (
                                    <BulkEntryForm />
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