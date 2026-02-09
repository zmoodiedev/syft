'use client'

import FeatureCard from "./FeatureCard";
import { motion } from "framer-motion";

export default function Features() {
    return (
        <div className="w-full px-6 py-20 lg:py-32 relative z-1 bg-white">

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="container mx-auto text-center mb-20 relative z-10"
            >
                <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-4xl md:text-5xl font-bold mb-6"
                >
                    So Many Reasons to Love Syft
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
                    className="w-16 h-1 bg-light-green mx-auto mt-8 rounded-full"
                ></motion.div>
            </motion.div>
            
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                id="features" 
                className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-8 relative z-10"
            >
                <FeatureCard
                    icon="ribbon"
                    title="Save Recipes Instantly"
                    description=""
                    index={0}
                    color="green"
                />
                <FeatureCard
                    icon="chef"
                    title="Organize Your Cookbook"
                    description=""
                    index={1}
                    color="green"
                />
                <FeatureCard
                    icon="share"
                    title="Share with Friends"
                    description=""
                    index={2}
                    color="green"
                />
                <FeatureCard
                    icon="phone"
                    title="Cook Without Distractions"
                    description=""
                    index={2}
                    color="green"
                />
            </motion.section>
        </div>
    )
}