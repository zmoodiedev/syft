'use client'

import { motion } from "framer-motion";
import ScrollToTopLink from "./ScrollToTopLink";

export default function CTA() {
    return (
        <div className="w-full px-6 py-20 lg:py-32 relative z-1">
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
                    className="relative rounded-2xl overflow-hidden shadow-xl"
                >
                    {/* Background image with overlay */}
                    <div className="absolute inset-0">
                        {/* Background image */}
                        <div 
                            className="absolute inset-0 bg-[url('/images/bg_ingredients.png')] bg-repeat bg-[length:200px_200px]"
                        ></div>
                        
                        {/* Colored overlay */}
                        <div className="absolute inset-0 bg-basil/90"></div>
                    </div>
                    
                    {/* Content container */}
                    <div className="relative p-12 md:p-16 text-white">
                        <motion.h2 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="text-4xl md:text-5xl font-bold mb-6"
                        >
                            Ready to Start Cooking?
                        </motion.h2>
                        
                        <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="text-white/90 max-w-2xl mx-auto text-lg mb-8"
                        >
                            Join thousands of home chefs who are already organizing their favorite recipes with Syft.
                        </motion.p>
                        
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="space-y-4"
                        >
                            <ScrollToTopLink 
                                href="/recipes" 
                                className="inline-block px-8 py-4 bg-white text-basil font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 relative overflow-hidden"
                            >
                                Get Started for Free
                            </ScrollToTopLink>
                            
                            <p className="text-sm text-white/80 mt-4">No credit card required. Start organizing your recipes today.</p>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}