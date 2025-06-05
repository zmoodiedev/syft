'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionProps {
    question: string;
    answer: string;
}

const ChevronDownIcon = () => (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

export default function Question({ question, answer }: QuestionProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 py-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex justify-between items-center w-full text-left py-2 focus:outline-none focus:ring-2 focus:ring-light-green focus:ring-opacity-50 rounded-lg"
            >
                <h3 className="text-xl font-semibold text-green pr-4">
                    {question}
                </h3>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                >
                    <ChevronDownIcon />
                </motion.div>
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 pb-2">
                            <p className="text-gray-600 leading-relaxed">
                                {answer}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
