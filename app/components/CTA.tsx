'use client'

import { motion } from "framer-motion";
import ScrollToTopLink from "./ScrollToTopLink";

export default function CTA() {
    return (
        <div className="w-full py-1 lg:py-1 relative z-1 bg-light-grey">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center relative z-10"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative overflow-hidden"
                >
                    
                    {/* Content container */}
                    <div className="container mx-auto relative p-6 md:p-16 text-green flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 text-center md:text-left">
                        <motion.h2 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-3xl md:text-4xl font-bold text-green"
                        >
                            Ready to cook smarter? Get started with Syft today!
                        </motion.h2>
                        
                        
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="space-y-4"
                        >
                            <ScrollToTopLink 
                                href="/recipes" 
                                className="inline-block px-8 py-4 bg-white text-light-green font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 relative overflow-hidden"
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