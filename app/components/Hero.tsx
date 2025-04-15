'use client'

import { motion } from 'framer-motion';
import ScrollToTopLink from "./ScrollToTopLink";
import Image from 'next/image';

export default function Hero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-30"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-36 md:py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative order-1 lg:order-2"
                    >
                        <div className="relative w-full max-w-2xl mx-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="relative"
                            >
                                <Image
                                    src="/logo_syft_h.svg"
                                    alt="Syft Logo"
                                    width={400}
                                    height={100}
                                    className="w-full h-auto"
                                    priority
                                />
                            </motion.div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative order-2 lg:order-1"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                            Share Your Favorite Recipes
                        </h1>
                        <p className="text-lg text-gray-600 mb-8">
                            Create, share, and discover delicious recipes with friends and family. 
                            Join our community of food enthusiasts today!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <ScrollToTopLink href="/recipes">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Browse Recipes
                                </motion.button>
                            </ScrollToTopLink>
                            <ScrollToTopLink href="/about">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-full sm:w-auto px-8 py-3 bg-white text-emerald-600 border-2 border-emerald-500 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Learn More
                                </motion.button>
                            </ScrollToTopLink>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}