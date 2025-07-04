'use client'

import { motion } from 'framer-motion';
import ScrollToTopLink from "./ScrollToTopLink";
import Image from 'next/image';

export default function Hero() {
    return (
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-bottom bg-no-repeat" style={{ backgroundImage: 'url(/images/hero_bg.svg)'}}></div>
            <div className="absolute inset-0 bg-white/30"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-30">
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
                                    src="/images/tom_wave.svg"
                                    alt="Tom"
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
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">
                        Find it. Save it.<br/>
                        <span className="text-light-green">Cook it.</span> Share it.
                        </h1>
                        <p className="text-xl mb-8">
                        A smarter way to manage your meals—<br/>
                        organize, cook, and connect from one simple app.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <ScrollToTopLink href="/login">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-light-green text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    Start for free!
                                </motion.button>
                            </ScrollToTopLink>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}