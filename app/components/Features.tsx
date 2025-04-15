'use client'

import FeatureCard from "./FeatureCard";
import { motion } from "framer-motion";

export default function Features() {
    return (
        <div className="w-full px-6 py-20 lg:py-32 relative z-1 bg-white">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-100 to-emerald-100 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-100 to-emerald-100 rounded-full opacity-20 blur-3xl"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="container mx-auto text-center mb-20 relative z-10"
            >
                <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold mb-4 uppercase tracking-wider"
                >
                    Why Use Syft?
                </motion.span>
                <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-4xl md:text-5xl font-bold mb-6 text-cast-iron"
                >
                    Features You{"'"}ll Love
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-gray-500 max-w-2xl mx-auto text-lg"
                >
                    Everything you need to organize your culinary creations in one place.
                </motion.p>
                <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mx-auto mt-8 rounded-full"
                ></motion.div>
            </motion.div>
            
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                id="features" 
                className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10"
            >
                <FeatureCard
                    icon="book"
                    title="Save Recipes from Anywhere"
                    description="Import recipes from around the internet, without the added fluff."
                    index={0}
                    color="from-emerald-500 to-teal-500"
                />
                <FeatureCard
                    icon="filter"
                    title="Organize with Categories"
                    description="Filter and Syft through your recipes with categories based on ingredients or meal types."
                    index={1}
                    color="from-emerald-500 to-teal-500"
                />
                <FeatureCard
                    icon="share"
                    title="Share with Friends"
                    description="Share your recipes with friends, and let them add it to their own. Coming Soon."
                    index={2}
                    color="from-emerald-500 to-teal-500"
                />
            </motion.section>
        </div>
    )
}