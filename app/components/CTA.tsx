'use client'

import { motion } from "framer-motion";
import ScrollToTopLink from "./ScrollToTopLink";

export default function CTA() {
    return (
        <div className="w-full px-6 py-20 lg:py-32 relative z-1 bg-transparent">
            

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="container mx-auto text-center relative z-10"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-white p-12 rounded-2xl shadow-xl relative overflow-hidden"
                >
                    {/* Content */}
                    <div className="relative z-10">
                        <motion.h2 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-4xl md:text-5xl font-bold mb-6 text-cast-iron"
                        >
                            Ready to Start Cooking?
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="text-gray-500 max-w-2xl mx-auto text-lg mb-8"
                        >
                            Be part of a new revolution of home cooks who are already organizing their recipes with Syft.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                        >
                            <ScrollToTopLink 
                                href="/recipes" 
                                className="inline-block px-8 py-4 bg-basil text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
                            >
                                Get Started for Free
                            </ScrollToTopLink>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}